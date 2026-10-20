import { openLoading, closeLoading, resolveElement, notify, buildCtx, findSlotByToken } from './manager'
import type { LoadingContext, LoadingHooks, LoadingOptions, PresetLike, WithLoadingArgs } from './types'

/**
 * 任务可以是：
 *   - Promise
 *   - 无参函数（最常见）
 *   - 接收 LoadingContext 的函数（可读 payload 做动态逻辑）
 */
export type LoadingTask<T> = Promise<T> | (() => T | Promise<T>) | ((ctx: LoadingContext) => T | Promise<T>)

/** 统一的内部参数形态 */
interface Normalized {
  options: LoadingOptions
  hooks: LoadingHooks
  target: unknown
}

function isPreset(v: unknown): v is PresetLike {
  return !!v && typeof v === 'object' && typeof (v as PresetLike).toOptions === 'function'
}

function isHookKey(k: string): boolean {
  return k === 'onShow' || k === 'onHide' || k === 'onSuccess' || k === 'onError' || k === 'onFinally'
}

/**
 * 把任意形态的入参归一化为 { options, hooks, target }
 * 支持：
 *   - undefined                       → 全默认
 *   - LoadingOptions（含内联钩子）      → 对象
 *   - () => LoadingOptions            → 方案工厂
 *   - LoadingPreset 实例              → .toOptions()
 *   - { plan, target, hooks }         → 包装形态
 */
function normalize(input: WithLoadingArgs | undefined): Normalized {
  const out: Normalized = { options: {}, hooks: {}, target: undefined }

  if (input === undefined || input === null) return out

  // ① Preset 实例
  if (isPreset(input)) {
    const o = (input as PresetLike).toOptions()
    return normalize(o as WithLoadingArgs)
  }

  // ② 函数（方案工厂）
  if (typeof input === 'function') {
    try {
      const produced = (input as (ctx: any) => WithLoadingArgs)({
        token: '',
        scope: 'global',
        target: null
      } as unknown as LoadingContext)
      if (produced && typeof produced === 'object') return normalize(produced)
      if (typeof produced === 'string') out.options.text = produced
    } catch (e) {
      console.warn('[dmk-loading] 方案工厂执行失败，使用默认配置：', e)
    }
    return out
  }

  // ③ 对象
  const obj = input as Record<string, unknown>

  // 包装形态：{ plan, target, hooks }
  if ('plan' in obj || 'hooks' in obj) {
    const plan = obj.plan as WithLoadingArgs | undefined
    if (plan !== undefined && plan !== null) {
      const inner = normalize(plan)
      Object.assign(out.options, inner.options)
      Object.assign(out.hooks, inner.hooks)
    }
    if (obj.target !== undefined) out.target = obj.target
    if (obj.hooks && typeof obj.hooks === 'object') Object.assign(out.hooks, obj.hooks)
    return out
  }

  // 扁平形态：直接内联 hooks 与 target
  for (const [k, v] of Object.entries(obj)) {
    if (isHookKey(k)) {
      ;(out.hooks as Record<string, unknown>)[k] = v
    } else if (k === 'target') {
      out.target = v
    } else {
      ;(out.options as Record<string, unknown>)[k] = v
    }
  }
  return out
}

function run<T>(task: LoadingTask<T>, ctx: LoadingContext): T | Promise<T> {
  if (typeof task !== 'function') return task as T
  // 无参函数按普通调用执行，兼容 () => api.get()
  if (task.length === 0) return (task as () => T | Promise<T>)()
  return (task as (c: LoadingContext) => T | Promise<T>)(ctx)
}

/** 执行体：开启 → 执行 → 钩子 → 关闭（异常安全） */
async function execute<T>(
  task: LoadingTask<T>,
  normalized: Normalized,
  opener: (cfg: LoadingOptions & LoadingHooks) => { token: string }
): Promise<T> {
  const cfg = { ...normalized.options, target: normalized.target as any, ...normalized.hooks } as LoadingOptions & LoadingHooks
  const handle = opener(cfg)

  try {
    const slot = findSlotByToken(handle.token)
    const ctx = slot ? buildCtx(slot) : ({ token: handle.token } as LoadingContext)
    const result = await run(task, ctx)
    notifyByToken(handle.token, 'onSuccess', result)
    return result
  } catch (err) {
    notifyByToken(handle.token, 'onError', err)
    throw err
  } finally {
    notifyByToken(handle.token, 'onFinally')
    closeLoading(handle.token)
  }
}

/**
 * 最常用的形态：一行包住请求，自动开/关，异常安全。
 *
 *   await withLoading(api.getList())
 *   await withLoading(api.getList(), { text: '加载中' })
 *   await withLoading(api.getList(), () => ({ text: '查询中', spinner: 'dots' }))
 *   await withLoading(api.getList(), plan)                       // 预设实例
 *   await withLoading(api.getList(), {
 *     payload: { page: 7 },
 *     text: (ctx) => `加载第 ${ctx.payload?.page} 页`,
 *     onSuccess: (r, ctx) => console.log('完成', r, ctx.token)
 *   })
 */
export async function withLoading<T>(task: LoadingTask<T>, options?: WithLoadingArgs): Promise<T> {
  return execute(task, normalize(options), (cfg) => openLoading(cfg))
}

/**
 * 局部 withLoading：
 *   await withLoadingOn('#box', api.getList())
 *   await withLoadingOn('#box', api.getList(), { text: '查询中', spinner: 'dots' })
 */
export async function withLoadingOn<T>(
  target: string | HTMLElement,
  task: LoadingTask<T>,
  options?: WithLoadingArgs
): Promise<T> {
  if (!resolveElement(target)) {
    // 目标不存在时降级为全局，行为保持一致
    return withLoading(task, options)
  }
  const normalized = normalize(options)
  normalized.target = target
  return execute(task, normalized, (cfg) => openLoading(cfg))
}

function notifyByToken(token: string, name: 'onSuccess' | 'onError' | 'onFinally', arg?: unknown) {
  const slot = findSlotByToken(token)
  if (slot) notify(slot, name, arg)
}