/**
 * 状态核心 —— 框架无关
 * --------------------------------------------------------------------------
 * 本文件不依赖任何框架运行时，可直接用于 Vue / React / UniApp / ArkTS 等宿主。
 * 响应式由 core/reactive.ts 的 60 行微型实现提供。
 */
import { type Listener } from './reactive';
import type { LoadingContext, LoadingOptionValue, LoadingOptions, LoadingSlot, LoadingText, ResolvedOptions } from './types';
/** 求值单个字段：静态值 或 函数 */
export declare function evalValue<T>(value: LoadingOptionValue<T> | undefined, ctx: LoadingContext, fallback: T): T;
/** 合并配置并完成函数求值 */
export declare function mergeOptions(options: LoadingOptions | undefined, base?: ResolvedOptions, ctx?: LoadingContext): ResolvedOptions;
export declare function setDefaultOptions(options: LoadingOptions): void;
export declare function getDefaultOptions(): Readonly<ResolvedOptions>;
/** 兼容旧签名：resolveOptions(options, base) */
export declare function resolveOptions(options: LoadingOptions | undefined, base?: ResolvedOptions): ResolvedOptions;
interface StoreState {
    global: LoadingSlot;
    /** key -> slot */
    locals: Record<string, LoadingSlot>;
    /** token -> { key } 用于按令牌精确关闭 */
    tokens: Record<string, string>;
}
/**
 * 订阅状态变化 —— 框架适配层的统一接入点
 *
 * Vue：组件内 watch / onMounted 清理
 * React：useSyncExternalStore 的 subscribe 参数
 * UniApp：小程序框架内部事件总线
 * ArkTS：鸿蒙侧 UI 状态观察者
 */
export declare function subscribeState(fn: Listener): () => void;
/** 当前全局状态快照（非响应式，适合在适配层主动读取） */
export declare function getSnapshot(): StoreState;
export declare function getState(): Readonly<StoreState>;
export declare const isGlobalLoading: {
    readonly value: boolean;
};
export declare function isLoading(target?: string | HTMLElement | null): boolean;
export declare function resolveElement(target?: string | HTMLElement | null): HTMLElement | null;
/** 构造当前上下文（供钩子与函数式配置读取） */
export declare function buildCtx(slot: LoadingSlot): LoadingContext;
/** 触发成功/失败/收尾钩子（供 withLoading 调用） */
export declare function notify(slot: LoadingSlot, name: 'onSuccess' | 'onError' | 'onFinally', arg?: unknown): void;
export interface OpenHandle {
    token: string;
    key: string;
}
/**
 * 开启加载。
 * - openLoading()                          全局遮罩（用默认配置）
 * - openLoading(opts)                      全局遮罩（配置对象）
 * - openLoading(() => opts)                全局遮罩（配置工厂函数，运行时求值）
 * - openLoading('#box', opts)              局部遮罩
 * - openLoading(el | ref, opts)            局部遮罩
 */
export declare function openLoading(options?: LoadingOptions | ((ctx: any) => LoadingOptions)): OpenHandle;
export declare function openLoading(target: string | HTMLElement, options?: LoadingOptions | ((ctx: any) => LoadingOptions)): OpenHandle;
/**
 * 关闭加载。
 * - closeLoading()             关闭全局一个令牌
 * - closeLoading('#box')       关闭指定区域一个令牌
 * - closeLoading(token)        按令牌精确关闭
 */
export declare function closeLoading(token?: string | number): void;
export declare function closeLoading(target: string | HTMLElement): void;
/** 强制全部关闭 */
export declare function closeAllLoading(): void;
/**
 * 运行中更新遮罩配置（文案/指示器等），无需关闭重开。
 * 支持传对象或函数；不传 target/token 时作用于全局。
 *
 *   updateLoading({ text: '已加载 3/10' })
 *   updateLoading(ctx => ({ text: `第 ${ctx.payload?.page} 页` }))
 */
export declare function updateLoading(patch?: LoadingOptions | ((ctx: LoadingContext) => LoadingOptions)): void;
export declare function updateLoading(token: string, patch?: LoadingOptions | ((ctx: LoadingContext) => LoadingOptions)): void;
/** 更新当前遮罩文案（全局），简写形式 */
export declare function setLoadingText(text: LoadingText): void;
/** 当前是否正在加载（全局或任意局部） */
export declare function hasLoading(): boolean;
export declare function localSlots(): LoadingSlot[];
/** 按 token 查找槽位 */
export declare function findSlotByToken(token: string): LoadingSlot | undefined;
export {};
