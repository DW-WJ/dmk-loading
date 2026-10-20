import type { LoadingHooks, LoadingOptions, LoadingPlan, LoadingText } from './types';
/**
 * 方案（Preset）：把一组配置固化成可复用的"加载方案"
 * 支持链式派生，天然函数式。
 *
 *   const query = preset('查询中').spinner('dots').size('large')
 *   await withLoading(api.get(), query)
 *   await withLoading(api.get(), query.target('#box'))   // 派生局部版
 */
export declare class LoadingPreset {
    private opts;
    private hks;
    constructor(options?: LoadingOptions, hooks?: LoadingHooks);
    /** 合并配置 */
    with(patch: LoadingOptions | ((ctx: any) => LoadingOptions)): LoadingPreset;
    /** 覆盖文案 */
    text(t: LoadingText): LoadingPreset;
    /** 指定指示器 */
    spinner(s: LoadingOptions['spinner']): LoadingPreset;
    /** 指定过渡动画 */
    transition(t: LoadingOptions['transition']): LoadingPreset;
    /** 遮罩底色风格 */
    maskStyle(m: LoadingOptions['maskStyle']): LoadingPreset;
    /** 尺寸 */
    size(s: LoadingOptions['size']): LoadingPreset;
    /** 主题色 */
    color(c: string): LoadingPreset;
    /** 文案位置 */
    textPosition(p: LoadingOptions['textPosition']): LoadingPreset;
    /** 出现延迟 */
    delay(ms: number): LoadingPreset;
    /** 最短显示时长 */
    minDuration(ms: number): LoadingPreset;
    /** 指定局部目标，派生新方案 */
    target(t: LoadingOptions['target']): LoadingPreset;
    /** 透传数据，供函数式文案读取 */
    payload(p: Record<string, unknown>): LoadingPreset;
    /** 绑定生命周期钩子 */
    hooks(h: LoadingHooks): LoadingPreset;
    /** 成功回调 */
    onSuccess(fn: (result: unknown, ctx: any) => void): LoadingPreset;
    /** 失败回调 */
    onError(fn: (error: unknown, ctx: any) => void): LoadingPreset;
    /** 收尾回调 */
    onFinally(fn: (ctx: any) => void): LoadingPreset;
    /** 显示回调 */
    onShow(fn: (ctx: any) => void): LoadingPreset;
    /** 隐藏回调 */
    onHide(fn: (ctx: any) => void): LoadingPreset;
    /** 导出为纯配置对象 */
    toOptions(): LoadingOptions & LoadingHooks;
    /** 导出为方案工厂函数（延迟求值） */
    toPlan(): LoadingPlan;
}
/** 创建加载方案 */
export declare function preset(initial?: string | LoadingOptions): LoadingPreset;
/** 常用方案快捷方式 */
export declare const presets: {
    /** 快速操作：短延迟、不闪烁 */
    quick: (text?: string) => LoadingPreset;
    /** 常规请求 */
    normal: (text?: string) => LoadingPreset;
    /** 耗时操作：更长的最短显示，避免闪烁 */
    heavy: (text?: string) => LoadingPreset;
    /** 表格查询：局部常用 */
    table: (text?: string) => LoadingPreset;
    /** 表单提交 */
    submit: (text?: string) => LoadingPreset;
    /** 删除等危险操作 */
    danger: (text?: string) => LoadingPreset;
    /** 局部区域：卡片等 */
    region: (text?: string) => LoadingPreset;
};
