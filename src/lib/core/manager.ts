/**
 * 状态核心 —— 框架无关
 * --------------------------------------------------------------------------
 * 本文件不依赖任何框架运行时，可直接用于 Vue / React / UniApp / ArkTS 等宿主。
 * 响应式由 core/reactive.ts 的 60 行微型实现提供。
 */
import { reactive, readonly, computed, subscribe, notifyAll, type Listener } from './reactive'
import type {
  LoadingContext,
  LoadingHooks,
  LoadingOptionValue,
  LoadingOptions,
  LoadingSlot,
  LoadingText,
  ResolvedOptions
} from './types'

const DEFAULT_OPTIONS: ResolvedOptions = {
  text: '加载中...',
  textPosition: 'center',
  spinner: 'ring',
  transition: 'fade',
  maskStyle: 'soft',
  color: '#3b82f6',
  textColor: '#ffffff',
  maskColor: '',
  size: 'default',
  delay: 120,
  minDuration: 0,
  lockScroll: true,
  appendTo: null
}

let seed = 0
const uid = () => `vtl-${Date.now().toString(36)}-${(seed++).toString(36)}`

/** 全局配置，可通过 install 参数或 setDefaultOptions 修改 */
let defaults: ResolvedOptions = { ...DEFAULT_OPTIONS }

function emptyCtx(): LoadingContext {
  return { token: '', scope: 'global', target: null, options: { ...defaults }, payload: undefined }
}

/** 求值单个字段：静态值 或 函数 */
export function evalValue<T>(value: LoadingOptionValue<T> | undefined, ctx: LoadingContext, fallback: T): T {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'function') {
    try {
      return (value as (c: LoadingContext) => T)(ctx)
    } catch (e) {
      console.warn('[dmk-loading] 配置函数求值失败，已回退默认值：', e)
      return fallback
    }
  }
  return value as T
}

/** 合并配置并完成函数求值 */
export function mergeOptions(
  options: LoadingOptions | undefined,
  base: ResolvedOptions = DEFAULT_OPTIONS,
  ctx: LoadingContext = emptyCtx()
): ResolvedOptions {
  const next: ResolvedOptions = { ...base }
  if (!options) return next

  const c: LoadingContext = { ...ctx, options: next }

  next.text = evalValue<LoadingText>(options.text, c, base.text) as string
  next.textPosition = evalValue(options.textPosition, c, base.textPosition)
  next.spinner = evalValue(options.spinner, c, base.spinner)
  next.transition = evalValue(options.transition, c, base.transition)
  next.maskStyle = evalValue(options.maskStyle, c, base.maskStyle)
  next.color = evalValue(options.color, c, base.color)
  next.textColor = evalValue(options.textColor, c, base.textColor)
  next.maskColor = evalValue(options.maskColor, c, base.maskColor)
  next.size = evalValue(options.size, c, base.size)

  // 以下字段不做函数求值
  if (options.delay !== undefined) next.delay = options.delay
  if (options.minDuration !== undefined) next.minDuration = options.minDuration
  if (options.lockScroll !== undefined) next.lockScroll = options.lockScroll
  if (options.appendTo !== undefined) next.appendTo = options.appendTo ?? null

  return next
}

export function setDefaultOptions(options: LoadingOptions) {
  defaults = mergeOptions(options, defaults, emptyCtx())
}

export function getDefaultOptions(): Readonly<ResolvedOptions> {
  return { ...defaults }
}

/** 兼容旧签名：resolveOptions(options, base) */
export function resolveOptions(options: LoadingOptions | undefined, base: ResolvedOptions = DEFAULT_OPTIONS): ResolvedOptions {
  return mergeOptions(options, base, emptyCtx())
}

/* ------------------------------------------------------------------ *
 * 状态：全局槽位 + 局部槽位（按元素索引）
 * ------------------------------------------------------------------ */

interface StoreState {
  global: LoadingSlot
  /** key -> slot */
  locals: Record<string, LoadingSlot>
  /** token -> { key } 用于按令牌精确关闭 */
  tokens: Record<string, string>
}

const state = reactive<StoreState>({
  global: {
    key: 'global',
    el: null,
    visible: false,
    options: { ...defaults },
    tokens: [],
    originPosition: '',
    shownAt: 0,
    raw: {},
    payload: undefined,
    hooks: {},
    ctx: null
  },
  locals: {},
  tokens: {}
})

/**
 * 订阅状态变化 —— 框架适配层的统一接入点
 *
 * Vue：组件内 watch / onMounted 清理
 * React：useSyncExternalStore 的 subscribe 参数
 * UniApp：小程序框架内部事件总线
 * ArkTS：鸿蒙侧 UI 状态观察者
 */
export function subscribeState(fn: Listener): () => void {
  // 订阅全局通道：notifyAll() 会唤醒所有订阅者，
  // 这样无论状态变的是全局槽位还是局部槽位，宿主都能收到通知。
  return subscribe(null, fn)
}

/** 当前全局状态快照（非响应式，适合在适配层主动读取） */
export function getSnapshot(): StoreState {
  return state
}

export function getState(): Readonly<StoreState> {
  return readonly(state) as Readonly<StoreState>
}

export const isGlobalLoading = computed(() => state.global.visible)

export function isLoading(target?: string | HTMLElement | null): boolean {
  const el = resolveElement(target)
  if (!el) return state.global.visible
  const slot = findSlot(el)
  return slot ? slot.visible : false
}

let localSeq = 0
const elementKeys = new WeakMap<HTMLElement, string>()

function keyOf(el: HTMLElement): string {
  let k = elementKeys.get(el)
  if (!k) {
    k = `local-${localSeq++}`
    elementKeys.set(el, k)
  }
  return k
}

export function resolveElement(target?: string | HTMLElement | null): HTMLElement | null {
  if (!target) return null
  if (typeof target === 'string') {
    if (typeof document === 'undefined') return null
    const sel = target.trim()
    if (!sel) return null
    // 直接当选择器查
    const direct = document.querySelector<HTMLElement>(sel)
    if (direct) return direct
    // 宽容处理：用户常把 id 写成 'my-box' 而忘了 '#'，
    // 或者把选择器写成 '.box' / 'my-box' 混用。
    // 直接查失败时按「id → class → 标签」顺序再试一次，
    // 避免因为少写一个 '#' 就静默降级成全局遮罩（用户完全看不出发生了什么）。
    const bare = sel.replace(/^[#.]/, '')
    if (bare !== sel) {
      const byId = document.getElementById(bare)
      if (byId) return byId
      const byClass = document.querySelector<HTMLElement>(`.${CSS_escape(bare)}`)
      if (byClass) return byClass
    } else {
      const byId = document.getElementById(bare)
      if (byId) return byId
      // 纯文本且像 id（含 - _ : 数字等 id 常见字符）→ 补 # 再试
      if (/^[A-Za-z][\w\-:.]*$/.test(bare)) {
        const byHash = document.querySelector<HTMLElement>(`#${CSS_escape(bare)}`)
        if (byHash) return byHash
      }
    }
    return null
  }
  if ((target as HTMLElement).nodeType === 1) return target as HTMLElement
  // 组件实例 / vnode
  const anyTarget = target as { $el?: HTMLElement; value?: unknown }
  if (anyTarget.$el && anyTarget.$el.nodeType === 1) return anyTarget.$el
  if (anyTarget.value !== undefined) return resolveElement(anyTarget.value as HTMLElement | null)
  return null
}

/** CSS 标识符转义（id 里可能有 : . # 等特殊字符） */
function CSS_escape(s: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(s)
  return s.replace(/([^\w-])/g, '\\$1')
}

function findSlot(el: HTMLElement): LoadingSlot | undefined {
  const key = keyOf(el)
  return state.locals[key]
}

function findSlotBySelector(selector: string): LoadingSlot | undefined {
  const el = resolveElement(selector)
  return el ? findSlot(el) : undefined
}

/* ------------------------------------------------------------------ *
 * 定时器（延迟显示 / 最短时长）
 * ------------------------------------------------------------------ */

const timers = new WeakMap<LoadingSlot, { show?: number; hide?: number }>()

function getTimers(slot: LoadingSlot) {
  let t = timers.get(slot)
  if (!t) {
    t = {}
    timers.set(slot, t)
  }
  return t
}

function clearTimers(slot: LoadingSlot) {
  const t = timers.get(slot)
  if (!t) return
  if (t.show) window.clearTimeout(t.show)
  if (t.hide) window.clearTimeout(t.hide)
  timers.set(slot, {})
}

type HookName = 'onShow' | 'onHide' | 'onSuccess' | 'onError' | 'onFinally'

function fireHook(slot: LoadingSlot, name: HookName, arg?: unknown) {
  const fn = slot.hooks?.[name] as ((...a: unknown[]) => void) | undefined
  if (typeof fn !== 'function') return
  const ctx = buildCtx(slot)
  try {
    if (name === 'onSuccess' || name === 'onError') fn(arg, ctx)
    else fn(ctx)
  } catch (e) {
    console.warn(`[dmk-loading] ${name} 钩子执行失败：`, e)
  }
}

/** 构造当前上下文（供钩子与函数式配置读取） */
export function buildCtx(slot: LoadingSlot): LoadingContext {
  return (
    slot.ctx || {
      token: slot.tokens[slot.tokens.length - 1] || '',
      scope: slot.el ? 'local' : 'global',
      target: slot.el,
      options: slot.options,
      payload: slot.payload
    }
  )
}

/** 触发成功/失败/收尾钩子（供 withLoading 调用） */
export function notify(slot: LoadingSlot, name: 'onSuccess' | 'onError' | 'onFinally', arg?: unknown) {
  fireHook(slot, name, arg)
}

function scheduleVisible(slot: LoadingSlot, visible: boolean) {
  const t = getTimers(slot)
  if (visible) {
    if (t.show) window.clearTimeout(t.show)
    const delay = slot.options.delay
    if (delay > 0) {
      t.show = window.setTimeout(() => {
        // 关键：触发后必须清空标记，否则后续关闭会被误判为"尚未显示"而跳过
        t.show = undefined
        slot.visible = true
        slot.shownAt = performance.now()
        fireHook(slot, 'onShow')
        notifyAll() // 通知宿主框架重渲染
      }, delay)
    } else {
      slot.visible = true
      slot.shownAt = performance.now()
      fireHook(slot, 'onShow')
      notifyAll()
    }
  } else {
    if (t.show) {
      // 延迟期内就关闭了：从未真正显示，直接结束，避免闪烁
      window.clearTimeout(t.show)
      t.show = undefined
      return
    }
    if (t.hide) {
      window.clearTimeout(t.hide)
      t.hide = undefined
    }

    const finish = () => {
      t.hide = undefined
      slot.visible = false
      slot.shownAt = 0
      fireHook(slot, 'onHide')
      notifyAll() // 通知宿主框架重渲染
    }

    // 最短显示时长：避免快速接口"一闪而过"
    const min = slot.options.minDuration
    const elapsed = slot.shownAt ? performance.now() - slot.shownAt : Infinity
    if (min > 0 && elapsed < min) {
      t.hide = window.setTimeout(finish, min - elapsed)
      return
    }
    finish()
  }
}

/* ------------------------------------------------------------------ *
 * 开启 / 关闭
 * ------------------------------------------------------------------ */

export interface OpenHandle {
  token: string
  key: string
}

/**
 * 开启加载。
 * - openLoading()                          全局遮罩（用默认配置）
 * - openLoading(opts)                      全局遮罩（配置对象）
 * - openLoading(() => opts)                全局遮罩（配置工厂函数，运行时求值）
 * - openLoading('#box', opts)              局部遮罩
 * - openLoading(el | ref, opts)            局部遮罩
 */
export function openLoading(options?: LoadingOptions | ((ctx: any) => LoadingOptions)): OpenHandle
export function openLoading(target: string | HTMLElement, options?: LoadingOptions | ((ctx: any) => LoadingOptions)): OpenHandle
export function openLoading(targetOrOptions?: any, maybeOptions?: any): OpenHandle {
  // 兼容两种签名
  let target: string | HTMLElement | null = null
  let options: LoadingOptions | ((ctx: any) => LoadingOptions) | undefined

  if (typeof targetOrOptions === 'string' || (targetOrOptions && targetOrOptions.nodeType === 1)) {
    target = targetOrOptions
    options = maybeOptions
  } else {
    options = targetOrOptions || maybeOptions
    // Preset 实例 → 取其配置
    if (options && typeof options === 'object' && typeof (options as any).toOptions === 'function') {
      options = (options as any).toOptions()
    }
    // 方案对象里可能带 target
    if (typeof options === 'object' && options?.target) {
      target = options.target as string | HTMLElement
    }
  }

  const token = uid()

  // 方案工厂：此刻先求值一次拿到 target/文案，其余字段留到渲染时再求值
  let plan: LoadingOptions = {}
  if (typeof options === 'function') {
    try {
      plan = options({ token, scope: target ? 'local' : 'global', target, options: { ...defaults } }) || {}
    } catch (e) {
      console.warn('[dmk-loading] 方案工厂执行失败，已使用默认配置：', e)
      plan = {}
    }
    if (!target && plan.target) target = plan.target as string | HTMLElement
  } else if (options) {
    plan = options
  }

  const hooksSource = plan as LoadingOptions & LoadingHooks
  const hooks: LoadingHooks = {
    onShow: hooksSource.onShow,
    onHide: hooksSource.onHide,
    onSuccess: hooksSource.onSuccess,
    onError: hooksSource.onError,
    onFinally: hooksSource.onFinally
  }

  const baseCtx: LoadingContext = {
    token,
    scope: target ? 'local' : 'global',
    target,
    options: { ...defaults },
    payload: plan.payload
  }

  const merged = mergeOptions(plan, defaults, baseCtx)

  const attach = (slot: LoadingSlot, el: HTMLElement | null, key: string): OpenHandle => {
    slot.options = merged
    slot.raw = plan
    slot.payload = plan.payload
    slot.hooks = hooks
    slot.ctx = { ...baseCtx, scope: el ? 'local' : 'global', options: merged }
    notifyAll() // 配置已写入，通知宿主渲染
    slot.tokens.push(token)
    state.tokens[token] = key
    if (slot.tokens.length === 1) scheduleVisible(slot, true)
    else {
      slot.visible = true
      notifyAll() // 并发叠加时也要通知宿主
    }
    return { token, key }
  }

  if (!target) {
    return attach(state.global, null, 'global')
  }

  const el = resolveElement(target)
  if (!el) {
    if (typeof console !== 'undefined') {
      console.warn('[dmk-loading] 未找到局部遮罩目标，已降级为全局：', target)
    }
    return attach(state.global, null, 'global')
  }

  const key = keyOf(el)
  let slot = state.locals[key]
  if (!slot) {
    slot = reactive({
      key,
      el,
      visible: false,
      options: merged,
      tokens: [],
      originPosition: el.style.position || '',
      shownAt: 0,
      raw: plan,
      payload: plan.payload,
      hooks,
      ctx: null
    }) as LoadingSlot
    state.locals[key] = slot
  }
  return attach(slot, el, key)
}

/**
 * 关闭加载。
 * - closeLoading()             关闭全局一个令牌
 * - closeLoading('#box')       关闭指定区域一个令牌
 * - closeLoading(token)        按令牌精确关闭
 */
export function closeLoading(token?: string | number): void
export function closeLoading(target: string | HTMLElement): void
export function closeLoading(targetOrToken?: string | HTMLElement | number): void {
  // 无参：关闭全局最后一个令牌
  if (targetOrToken === undefined || targetOrToken === null || typeof targetOrToken === 'number') {
    releaseOne('global')
    return
  }
  if (typeof targetOrToken === 'string') {
    // 先当令牌
    if (state.tokens[targetOrToken]) {
      releaseToken(targetOrToken)
      return
    }
    // 否则当选择器
    const slot = findSlotBySelector(targetOrToken)
    if (slot) {
      releaseOne(slot.key)
      return
    }
    releaseOne('global')
    return
  }
  const slot = findSlot(targetOrToken)
  if (slot) {
    releaseOne(slot.key)
    return
  }
  releaseOne('global')
}

/** 按槽位 key 释放最后一个令牌（无 token 时兜底释放） */
function releaseOne(key: string) {
  const slot = key === 'global' ? state.global : state.locals[key]
  if (!slot || slot.tokens.length === 0) return
  releaseToken(slot.tokens[slot.tokens.length - 1])
}

function releaseToken(token?: string) {
  if (!token) return
  const key = state.tokens[token]
  delete state.tokens[token]
  if (!key) return

  if (key === 'global') {
    const slot = state.global
    const idx = slot.tokens.indexOf(token)
    if (idx > -1) slot.tokens.splice(idx, 1)
    if (slot.tokens.length === 0) scheduleVisible(slot, false)
    return
  }

  const slot = state.locals[key]
  if (!slot) return
  const idx = slot.tokens.indexOf(token)
  if (idx > -1) slot.tokens.splice(idx, 1)
  if (slot.tokens.length === 0) {
    scheduleVisible(slot, false)
    window.setTimeout(() => {
      const current = state.locals[key]
      if (current && current.tokens.length === 0) {
        delete state.locals[key]
      }
    }, 400)
  }
}

/** 强制全部关闭 */
export function closeAllLoading(): void {
  state.global.tokens.splice(0, state.global.tokens.length)
  clearTimers(state.global)
  state.global.visible = false
  Object.keys(state.tokens).forEach((t) => delete state.tokens[t])
  Object.keys(state.locals).forEach((k) => {
    const slot = state.locals[k]
    slot.tokens.splice(0, slot.tokens.length)
    clearTimers(slot)
    slot.visible = false
    delete state.locals[k]
  })
  // 必须通知：core 抽离后 UI 层靠订阅通道感知变化，
  // 漏掉这行会导致 closeAllLoading() 对局部遮罩完全无效（状态变了但遮罩不消失）
  notifyAll()
}

/**
 * 运行中更新遮罩配置（文案/指示器等），无需关闭重开。
 * 支持传对象或函数；不传 target/token 时作用于全局。
 *
 *   updateLoading({ text: '已加载 3/10' })
 *   updateLoading(ctx => ({ text: `第 ${ctx.payload?.page} 页` }))
 */
export function updateLoading(patch?: LoadingOptions | ((ctx: LoadingContext) => LoadingOptions)): void
export function updateLoading(token: string, patch?: LoadingOptions | ((ctx: LoadingContext) => LoadingOptions)): void
export function updateLoading(
  a?: string | LoadingOptions | ((ctx: LoadingContext) => LoadingOptions),
  b?: LoadingOptions | ((ctx: LoadingContext) => LoadingOptions)
): void {
  let token: string | undefined
  let patch: LoadingOptions | ((ctx: LoadingContext) => LoadingOptions) | undefined

  if (typeof a === 'string') {
    token = a
    patch = b
  } else {
    patch = a
  }

  const slot = token ? findSlotByToken(token) : state.global
  if (!slot) return

  const ctx = buildCtx(slot)
  const incoming = typeof patch === 'function' ? patch(ctx) : patch
  if (!incoming) return

  slot.options = mergeOptions(incoming, slot.options, ctx)
  slot.raw = { ...slot.raw, ...incoming }
  if (slot.ctx) slot.ctx = { ...slot.ctx, options: slot.options }
  notifyAll() // 通知宿主重渲染
}

/** 更新当前遮罩文案（全局），简写形式 */
export function setLoadingText(text: LoadingText): void {
  updateLoading({ text })
}

/** 当前是否正在加载（全局或任意局部） */
export function hasLoading(): boolean {
  if (state.global.visible) return true
  return Object.values(state.locals).some((s) => s.visible)
}

export function localSlots(): LoadingSlot[] {
  return Object.values(state.locals)
}

/** 按 token 查找槽位 */
export function findSlotByToken(token: string): LoadingSlot | undefined {
  const key = state.tokens[token]
  if (!key) return undefined
  return key === 'global' ? state.global : state.locals[key]
}