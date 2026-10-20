/**
 * 订阅桥 —— 框架无关
 * --------------------------------------------------------------------------
 * 背景：core 层要能在 Vue / React / UniApp / ArkTS 里跑，所以不能 import 框架。
 * 但 UI 层需要「状态变了要重渲染」的通知机制，而这件事各框架做法不同。
 *
 * 解决：core 只负责发出通知（订阅 + 触发），
 * 由各框架适配层决定「收到通知后怎么重渲染」。
 *
 * Vue 适配层  → 收到通知翻转一个 shallowRef，模板依赖它自动重渲染
 * React 适配层 → 收到通知后 setState / 走 useSyncExternalStore
 * ArkTS 适配层 → 收到通知后更新 @State
 *
 * 这样 core 零框架依赖，UI 层各自用最地道的机制，两边都不将就。
 */
/** 订阅者 */
export type Listener = () => void;
/**
 * 订阅状态变化
 *
 * @param target 被观察的对象；传 null 表示订阅「任意状态变化」
 * @param fn 变更回调
 * @returns 取消订阅函数
 */
export declare function subscribe(target: object | null, fn: Listener): () => void;
/** 触发指定对象的订阅者 */
export declare function notify(target: object | null): void;
/** 触发全部订阅者（状态机里任何变更都调这个） */
export declare function notifyAll(target?: object): void;
/**
 * 浅层「响应式」占位
 *
 * core 层只需要一个可变对象容器，不需要依赖追踪。
 * 真正的重渲染由适配层通过 subscribe + 自己的机制完成。
 * 这里保留 reactive 这个名字，让 core 代码读起来仍然自然，
 * 同时明确它「不追依赖、只做数据容器」。
 */
export declare function reactive<T extends object>(target: T): T;
/** 判断是否已标记（占位实现，保持 API 兼容） */
export declare function isReactive(_v: unknown): boolean;
/** 只读包装（类型层面约束） */
export declare function readonly<T extends object>(target: T): Readonly<T>;
/** 简单 ref 占位（core 内部仅用于日志计数等非渲染场景） */
export declare function ref<T>(value: T): {
    value: T;
};
/** computed 占位：core 内部不用它做渲染，只做一次求值缓存 */
export declare function computed<T>(getter: () => T): {
    readonly value: T;
};
/** 手动触发 */
export declare function trigger(target: object | null): void;
