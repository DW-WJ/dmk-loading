import type { LoadingHooks, LoadingOptions, LoadingPlan, LoadingText } from './types'

/**
 * 方案（Preset）：把一组配置固化成可复用的"加载方案"
 * 支持链式派生，天然函数式。
 *
 *   const query = preset('查询中').spinner('dots').size('large')
 *   await withLoading(api.get(), query)
 *   await withLoading(api.get(), query.target('#box'))   // 派生局部版
 */
export class LoadingPreset {
  private opts: LoadingOptions
  private hks: LoadingHooks

  constructor(options: LoadingOptions = {}, hooks: LoadingHooks = {}) {
    this.opts = { ...options }
    this.hks = { ...hooks }
  }

  /** 合并配置 */
  with(patch: LoadingOptions | ((ctx: any) => LoadingOptions)): LoadingPreset {
    const resolved = typeof patch === 'function' ? patch({} as any) : patch
    return new LoadingPreset({ ...this.opts, ...resolved }, this.hks)
  }

  /** 覆盖文案 */
  text(t: LoadingText): LoadingPreset {
    return this.with({ text: t })
  }

  /** 指定指示器 */
  spinner(s: LoadingOptions['spinner']): LoadingPreset {
    return this.with({ spinner: s })
  }

  /** 指定过渡动画 */
  transition(t: LoadingOptions['transition']): LoadingPreset {
    return this.with({ transition: t })
  }

  /** 遮罩底色风格 */
  maskStyle(m: LoadingOptions['maskStyle']): LoadingPreset {
    return this.with({ maskStyle: m })
  }

  /** 尺寸 */
  size(s: LoadingOptions['size']): LoadingPreset {
    return this.with({ size: s })
  }

  /** 主题色 */
  color(c: string): LoadingPreset {
    return this.with({ color: c })
  }

  /** 文案位置 */
  textPosition(p: LoadingOptions['textPosition']): LoadingPreset {
    return this.with({ textPosition: p })
  }

  /** 出现延迟 */
  delay(ms: number): LoadingPreset {
    return this.with({ delay: ms })
  }

  /** 最短显示时长 */
  minDuration(ms: number): LoadingPreset {
    return this.with({ minDuration: ms })
  }

  /** 指定局部目标，派生新方案 */
  target(t: LoadingOptions['target']): LoadingPreset {
    return this.with({ target: t })
  }

  /** 透传数据，供函数式文案读取 */
  payload(p: Record<string, unknown>): LoadingPreset {
    return this.with({ payload: p })
  }

  /** 绑定生命周期钩子 */
  hooks(h: LoadingHooks): LoadingPreset {
    return new LoadingPreset(this.opts, { ...this.hks, ...h })
  }

  /** 成功回调 */
  onSuccess(fn: (result: unknown, ctx: any) => void): LoadingPreset {
    return this.hooks({ onSuccess: fn })
  }

  /** 失败回调 */
  onError(fn: (error: unknown, ctx: any) => void): LoadingPreset {
    return this.hooks({ onError: fn })
  }

  /** 收尾回调 */
  onFinally(fn: (ctx: any) => void): LoadingPreset {
    return this.hooks({ onFinally: fn })
  }

  /** 显示回调 */
  onShow(fn: (ctx: any) => void): LoadingPreset {
    return this.hooks({ onShow: fn })
  }

  /** 隐藏回调 */
  onHide(fn: (ctx: any) => void): LoadingPreset {
    return this.hooks({ onHide: fn })
  }

  /** 导出为纯配置对象 */
  toOptions(): LoadingOptions & LoadingHooks {
    return { ...this.opts, ...this.hks }
  }

  /** 导出为方案工厂函数（延迟求值） */
  toPlan(): LoadingPlan {
    const snapshot = this.toOptions()
    return () => snapshot
  }
}

/** 创建加载方案 */
export function preset(initial?: string | LoadingOptions): LoadingPreset {
  if (typeof initial === 'string') return new LoadingPreset({ text: initial })
  return new LoadingPreset({ ...(initial || {}) })
}

/** 常用方案快捷方式 */
export const presets = {
  /** 快速操作：短延迟、不闪烁 */
  quick: (text = '处理中') => preset(text).delay(0),
  /** 常规请求 */
  normal: (text = '加载中...') => preset(text).delay(120).minDuration(200),
  /** 耗时操作：更长的最短显示，避免闪烁 */
  heavy: (text = '处理中，请稍候') => preset(text).delay(200).minDuration(600).spinner('wave'),
  /** 表格查询：局部常用 */
  table: (text = '查询中') => preset(text).spinner('dots').maskStyle('soft').delay(100),
  /** 表单提交 */
  submit: (text = '提交中') => preset(text).spinner('bars').color('#10b981').delay(0),
  /** 删除等危险操作 */
  danger: (text = '处理中') => preset(text).spinner('pulse').color('#ef4444').delay(0),
  /** 局部区域：卡片等 */
  region: (text = '加载中') => preset(text).spinner('orbit').maskStyle('soft')
}