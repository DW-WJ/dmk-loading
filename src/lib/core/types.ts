import type { ComponentPublicInstance, Ref } from 'vue'
import type { GlobalInjectOptions } from './global'

/** 局部遮罩的定位目标：CSS 选择器 / DOM 元素 / 组件实例 / ref */
export type LoadingTarget =
  | string
  | HTMLElement
  | ComponentPublicInstance
  | Ref<HTMLElement | null | undefined>
  | { $el: HTMLElement }
  | null
  | undefined

/** 入场过渡动画 */
export type LoadingTransition = 'fade' | 'zoom' | 'slide-down' | 'slide-up' | 'blur' | 'none'

/** 加载指示器样式 */
export type LoadingSpinner = 'ring' | 'dots' | 'bars' | 'pulse' | 'wave' | 'orbit'

/** 遮罩底色风格 */
export type LoadingMaskStyle = 'solid' | 'soft' | 'transparent'

/**
 * 加载上下文：传给函数式文案 / 方案使用
 * 让用户可以基于真实上下文动态生成文案与配置
 */
export interface LoadingContext {
  /** 本次加载的唯一标识 */
  token: string
  /** 'global' 表示全局遮罩，'local' 表示局部 */
  scope: 'global' | 'local'
  /** 局部遮罩的目标（选择器或元素） */
  target: LoadingTarget
  /** 本次加载的最终生效配置 */
  options: ResolvedOptions
  /** 自定义透传数据 */
  payload?: Record<string, unknown>
}

/** 文案可以是字符串，也可以是函数（接收上下文动态生成） */
export type LoadingText = string | ((ctx: LoadingContext) => string)

/**
 * 函数式配置：所有字段都可写成函数，由库在渲染时求值
 * 例：{ text: ctx => `加载第 ${ctx.payload?.page} 页` }
 */
export type LoadingOptionValue<T> = T | ((ctx: LoadingContext) => T)

export interface LoadingOptions {
  /** 遮罩文案（支持函数） */
  text?: LoadingText
  /** 文案位置 */
  textPosition?: LoadingOptionValue<'center' | 'bottom' | 'top'>
  /** 指示器样式 */
  spinner?: LoadingOptionValue<LoadingSpinner>
  /** 入场过渡动画 */
  transition?: LoadingOptionValue<LoadingTransition>
  /** 遮罩底色风格 */
  maskStyle?: LoadingOptionValue<LoadingMaskStyle>
  /** 主色 */
  color?: LoadingOptionValue<string>
  /** 文案颜色 */
  textColor?: LoadingOptionValue<string>
  /** 遮罩背景色（覆盖 maskStyle） */
  maskColor?: LoadingOptionValue<string>
  /** 尺寸：small / default / large */
  size?: LoadingOptionValue<'small' | 'default' | 'large'>
  /** 出现延迟 ms，避免快速请求闪烁 */
  delay?: number
  /** 最短显示时长 ms，避免一闪而过 */
  minDuration?: number
  /** 全局遮罩时锁定 body 滚动 */
  lockScroll?: boolean
  /** 局部遮罩时目标选择器 */
  target?: LoadingTarget
  /** 全局遮罩挂载节点，默认 document.body */
  appendTo?: HTMLElement
  /** 自定义透传数据，回调函数可通过 ctx.payload 读取 */
  payload?: Record<string, unknown>
}

/**
 * 加载方案：既可直接传配置对象，也可传"配置工厂函数"
 * 例：const plan = (ctx) => ({ spinner: 'dots', text: '查询中' })
 * 工厂接收调用上下文（token 为空占位，真实 token 在 openLoading 时回填）
 */
export type LoadingPlan = LoadingOptions | ((ctx: LoadingContext) => LoadingOptions | LoadingHooks | string)

/** 生命周期钩子 */
export interface LoadingHooks {
  /** 遮罩真正显示后 */
  onShow?: (ctx: LoadingContext) => void
  /** 遮罩隐藏后 */
  onHide?: (ctx: LoadingContext) => void
  /** 请求成功 */
  onSuccess?: (result: unknown, ctx: LoadingContext) => void
  /** 请求失败 */
  onError?: (error: unknown, ctx: LoadingContext) => void
  /** 无论成败 */
  onFinally?: (ctx: LoadingContext) => void
}

/** 预设对象形态（LoadingPreset 实例的鸭子类型，避免循环依赖） */
export interface PresetLike {
  toOptions(): LoadingOptions & LoadingHooks
  toPlan(): LoadingPlan
}

/**
 * withLoading 接受的参数形态（统一入口）
 *   - 配置对象（可内联钩子、target）
 *   - 方案工厂函数
 *   - 预设实例
 *   - 包装形态 { plan, target, hooks }
 */
export type WithLoadingArgs =
  | (LoadingOptions & LoadingHooks)
  | PresetLike
  | ((ctx: LoadingContext) => LoadingOptions | LoadingHooks | string | void)
  | { plan?: WithLoadingArgs; target?: LoadingTarget; hooks?: LoadingHooks }

export type { LoadingPlan as LoadingConfig }

export interface ResolvedOptions {
  text: string
  textPosition: 'center' | 'bottom' | 'top'
  spinner: LoadingSpinner
  transition: LoadingTransition
  maskStyle: LoadingMaskStyle
  color: string
  textColor: string
  maskColor: string
  size: 'small' | 'default' | 'large'
  delay: number
  minDuration: number
  lockScroll: boolean
  appendTo: HTMLElement | null
}

/** app.use(TransitionLoading, {...}) 的配置 */
export interface PluginOptions extends LoadingOptions {
  /**
   * 是否自动注入 window 全局方法（$loading.open()）。
   * 默认 true —— 这是「页面零 import」的关键。
   * 想保持完全模块化（只用具名导入）时设为 false。
   */
  global?: boolean
  /**
   * 是否额外注册 `v-loading` 兼容别名。
   *
   * 默认 false —— 不注册。`v-loading` 是 ElementUI / Naive UI / Ant Design Vue
   * 的通用名，同 app 内会互相覆盖（后注册者赢且不报错），极易排查困难。
   * 只有在「本库是项目里唯一的 loading 方案」时才建议开。
   */
  legacyDirective?: boolean
  /** window 全局注入细节（变量名、是否覆盖） */
  inject?: GlobalInjectOptions
}

export interface LoadingSlot {
  /** 'global' 或元素级唯一 id */
  key: string
  /** null 表示全局遮罩 */
  el: HTMLElement | null
  visible: boolean
  options: ResolvedOptions
  tokens: string[]
  /** 原始 position，用于卸载时还原 */
  originPosition: string
  /** 实际显示时刻，用于 minDuration 计算 */
  shownAt: number
  /** 未求值的原始配置（含函数） */
  raw: LoadingOptions
  /** 本次加载的自定义数据 */
  payload: Record<string, unknown> | undefined
  /** 生命周期钩子 */
  hooks: LoadingHooks
  /** 渲染期请求的上下文 */
  ctx: LoadingContext | null
}

export interface OpenResult {
  /** 关闭令牌，closeLoading(token) 可精确关闭 */
  token: string
}