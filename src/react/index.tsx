/**
 * dmk-loading · React 适配层
 * --------------------------------------------------------------------------
 * 这是「框架矩阵」里 core 之后的第二棒（Vue 已就绪）。
 * 设计原则与 Vue 适配层一致：
 *   - 状态机全部在框架无关的 core（src/lib/core），本文件零状态逻辑。
 *   - 只负责把 core 状态接到 React 渲染系统：
 *       · useLoadingVersion()  订阅 core 通知 → 触发组件重渲染
 *       · <LoadingProvider>    在应用根部挂载一次，渲染「全局 + 所有局部遮罩」
 *       · <Mask>               单个遮罩（全局/局部共用），复刻 Vue LoadingMask 的全部能力
 *   - 指示器/过渡/无障碍的视觉全部复用全局 style.css 的 .vtl-* 类，不重写样式。
 *
 * 入口：import { LoadingProvider, useLoading } from 'dmk-loading/react'
 * 样式：import 'dmk-loading/style.css'  （与 Vue 一致，需自行引入一次）
 */
import {
  Children,
  cloneElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode
} from 'react'
import { createPortal } from 'react-dom'
import {
  closeAllLoading,
  closeLoading,
  evalValue,
  getDefaultOptions,
  getState,
  hasLoading,
  isLoading,
  localSlots,
  openLoading,
  preset,
  presets,
  setDefaultOptions,
  subscribe,
  updateLoading,
  withLoading,
  withLoadingOn,
  type LoadingContext,
  type LoadingSlot,
  type LoadingTarget
} from '../core/standalone'

/**
 * 订阅 core 状态变化，返回一个自增版本号触发重渲染。
 * 用 useState + useEffect 而非 useSyncExternalStore，兼容 React 17+。
 */
function useLoadingVersion(): void {
  const [, force] = useState(0)
  useEffect(() => {
    const unsubscribe = subscribe(null, () => force((n) => n + 1))
    return unsubscribe
  }, [])
}

/** 命令式 API —— 与 Vue 适配层 createApi() 完全对齐 */
export interface LoadingReactApi {
  open: typeof openLoading
  close: typeof closeLoading
  closeAll: typeof closeAllLoading
  update: typeof updateLoading
  isLoading: typeof isLoading
  hasLoading: typeof hasLoading
  withLoading: typeof withLoading
  withLoadingOn: typeof withLoadingOn
  preset: typeof preset
  presets: typeof presets
  setDefaults: typeof setDefaultOptions
  getDefaults: typeof getDefaultOptions
}

export function useLoading(): LoadingReactApi {
  return {
    open: openLoading,
    close: closeLoading,
    closeAll: closeAllLoading,
    update: updateLoading,
    isLoading,
    hasLoading,
    withLoading,
    withLoadingOn,
    preset,
    presets,
    setDefaults: setDefaultOptions,
    getDefaults: getDefaultOptions
  }
}

export interface LoadingProviderProps {
  children?: ReactNode
  /** 全局遮罩挂载节点，默认 document.body */
  appendTo?: HTMLElement
}

/**
 * 遮罩宿主 —— 在应用根部渲染一次。
 * 自动渲染「全局遮罩」+ 所有「已连接 DOM 的局部遮罩」（局部用 Portal 挂到目标元素内）。
 */
export function LoadingProvider({ children, appendTo }: LoadingProviderProps): ReactElement {
  useLoadingVersion()

  if (typeof document === 'undefined') {
    return <>{children}</>
  }

  const globalTarget = appendTo || document.body
  const globalSlot = getState().global as LoadingSlot
  const locals = localSlots().filter((s) => !!s.el && s.el.isConnected)

  return (
    <>
      {children}
      {createPortal(<Mask slot={globalSlot} />, globalTarget)}
      {locals.map((s) => createPortal(<Mask key={s.key} slot={s} />, s.el as HTMLElement))}
    </>
  )
}

/** 单个遮罩：复刻 Vue LoadingMask.vue 的全部行为 */
function Mask({ slot }: { slot: LoadingSlot }): ReactElement {
  const isGlobal = slot.el === null
  const [reduceMotion, setReduceMotion] = useState(false)

  // 动效敏感用户降级（JS 侧挂 class，CSS @media 还有一层兜底）
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches)
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange)
    else if (typeof (mq as any).addListener === 'function') (mq as any).addListener(onChangeListener)
    function onChangeListener(e: any) {
      setReduceMotion(!!e?.matches)
    }
    return () => {
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onChange)
      else if (typeof (mq as any).removeListener === 'function') (mq as any).removeListener(onChangeListener)
    }
  }, [])

  // 局部：给宿主改 relative / overflow hidden + 打 aria-busy；全局：body 滚动锁
  useEffect(() => {
    const el = slot.el
    if (!el) {
      if (isGlobal && typeof document !== 'undefined' && slot.visible && slot.options.lockScroll) {
        document.body.style.setProperty('overflow', 'hidden')
      } else if (isGlobal && typeof document !== 'undefined') {
        document.body.style.removeProperty('overflow')
      }
      return
    }
    if (slot.visible) {
      const pos = getComputedStyle(el).position
      if (pos === 'static') el.style.position = 'relative'
      if (getComputedStyle(el).overflow === 'visible') el.style.overflow = 'hidden'
      el.setAttribute('aria-busy', 'true')
      el.setAttribute('data-vtl-loading', '')
    } else {
      el.style.position = slot.originPosition
      el.style.overflow = ''
      el.removeAttribute('aria-busy')
      el.removeAttribute('data-vtl-loading')
    }
  }, [slot.visible, slot.key, isGlobal, slot.options.lockScroll])

  // 订阅 core 通知，保证运行中 updateLoading / 函数式配置能重算
  useLoadingVersion()

  const ctx: LoadingContext =
    slot.ctx ??
    ({
      token: slot.tokens[slot.tokens.length - 1] || '',
      scope: isGlobal ? 'global' : 'local',
      target: slot.el,
      options: slot.options,
      payload: slot.payload
    } as LoadingContext)

  const raw = (slot.raw || {}) as Record<string, unknown>
  const opt = <T,>(key: keyof LoadingSlot['options'], fallback: T): T => {
    if (raw[key as string] !== undefined) {
      return evalValue(raw[key as string] as any, ctx, slot.options[key] as any) as T
    }
    return slot.options[key] as unknown as T
  }

  const text = opt('text', '')
  const spinner = opt('spinner', 'ring')
  const transition = opt('transition', 'fade')
  const maskStyle = opt('maskStyle', 'soft')
  const size = opt('size', 'default')
  const textPosition = opt('textPosition', 'center')
  const color = opt('color', '')
  const textColor = opt('textColor', '')
  const maskColor = opt('maskColor', '')

  const rootStyle: CSSProperties = {
    position: isGlobal ? 'fixed' : 'absolute',
    inset: 0,
    ['--vtl-color' as any]: color || undefined,
    ['--vtl-text-color' as any]: textColor || undefined
  }
  if (maskColor) rootStyle.background = maskColor
  else if (maskStyle === 'solid') rootStyle.background = 'rgba(15, 23, 42, 0.72)'
  else if (maskStyle === 'soft') rootStyle.background = 'rgba(15, 23, 42, 0.42)'
  else rootStyle.background = 'transparent'

  const motionClass = reduceMotion ? 'vtl-reduce-motion' : ''

  return (
    <TransitionMount active={slot.visible} transition={transition}>
      <div
        className={`vtl-mask vtl-size-${size} vtl-text-${textPosition} vtl-mask-${maskStyle} ${motionClass}`}
        style={rootStyle}
        role="status"
        aria-live="polite"
        aria-busy={slot.visible}
        aria-label={text || undefined}
      >
        <div className="vtl-inner">
          <div className={`vtl-spinner vtl-spinner-${spinner}`} aria-hidden="true">
            <Spinner kind={spinner} />
          </div>
          {text ? <p className="vtl-text">{text}</p> : null}
        </div>
      </div>
    </TransitionMount>
  )
}

/** 六种指示器（与 Vue 模板一一对应） */
function Spinner({ kind }: { kind: string }): ReactElement {
  switch (kind) {
    case 'ring':
      return <span className="vtl-ring" />
    case 'dots':
      return (
        <>
          {[0, 1, 2].map((i) => (
            <span key={i} className="vtl-dot" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </>
      )
    case 'bars':
      return (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="vtl-bar" style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </>
      )
    case 'pulse':
      return <span className="vtl-pulse" />
    case 'wave':
      return (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="vtl-wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </>
      )
    case 'orbit':
      return (
        <span className="vtl-orbit">
          {[0, 1, 2].map((i) => (
            <i key={i} style={{ transform: `rotate(${i * 120}deg) translateY(-8px)` }} />
          ))}
        </span>
      )
    default:
      return <span className="vtl-ring" />
  }
}

/**
 * 进出场过渡 —— 复刻 Vue <Transition> 的类名时序（enter-from → enter-to / leave-from → leave-to），
 * 从而直接复用 style.css 里 vtl-fade-* / vtl-zoom-* 等过渡类，不必重写过渡样式。
 * 无 window（SSR）时直接按 active 显隐，不做动画。
 */
function TransitionMount({
  active,
  transition,
  children
}: {
  active: boolean
  transition: string
  children: ReactNode
}): ReactElement | null {
  const [phase, setPhase] = useState<'none' | 'enter-from' | 'enter-to' | 'leave-from' | 'leave-to'>('none')
  const [mounted, setMounted] = useState(active)
  const timers = useRef<number[]>([])

  useEffect(() => {
    const w = typeof window !== 'undefined' ? window : undefined
    if (!w) {
      setMounted(active)
      setPhase('none')
      return
    }
    timers.current.forEach((t) => w.clearTimeout(t))
    timers.current = []

    if (active) {
      setMounted(true)
      setPhase('enter-from')
      const r1 = w.requestAnimationFrame(() => {
        const r2 = w.requestAnimationFrame(() => setPhase('enter-to'))
        timers.current.push(r2)
      })
      timers.current.push(r1)
      return () => timers.current.forEach((t) => w.cancelAnimationFrame(t))
    }

    setPhase('leave-from')
    const r1 = w.requestAnimationFrame(() => {
      const r2 = w.requestAnimationFrame(() => setPhase('leave-to'))
      timers.current.push(r2)
    })
    timers.current.push(r1)
    const t = w.setTimeout(() => {
      setMounted(false)
      setPhase('none')
    }, 320)
    timers.current.push(t)
    return () => timers.current.forEach((id) => w.clearTimeout(id))
  }, [active])

  if (!mounted) return null
  const child = Children.only(children) as ReactElement
  const cls =
    phase === 'enter-from'
      ? `${transition}-enter-active ${transition}-enter-from`
      : phase === 'enter-to'
        ? `${transition}-enter-active ${transition}-enter-to`
        : phase === 'leave-from'
          ? `${transition}-leave-active ${transition}-leave-from`
          : phase === 'leave-to'
            ? `${transition}-leave-active ${transition}-leave-to`
            : ''
  const merged = `${child.props.className ?? ''} ${cls}`.trim()
  return cloneElement(child, { className: merged } as any)
}

export { openLoading, closeLoading, closeAllLoading, updateLoading, isLoading, hasLoading, withLoading, withLoadingOn, preset, presets, setDefaultOptions, getDefaultOptions }
export type { LoadingTarget, LoadingSlot, LoadingContext }
export default { LoadingProvider, useLoading, Mask }
