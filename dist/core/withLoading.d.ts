import type { LoadingContext, WithLoadingArgs } from './types';
/**
 * 任务可以是：
 *   - Promise
 *   - 无参函数（最常见）
 *   - 接收 LoadingContext 的函数（可读 payload 做动态逻辑）
 */
export type LoadingTask<T> = Promise<T> | (() => T | Promise<T>) | ((ctx: LoadingContext) => T | Promise<T>);
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
export declare function withLoading<T>(task: LoadingTask<T>, options?: WithLoadingArgs): Promise<T>;
/**
 * 局部 withLoading：
 *   await withLoadingOn('#box', api.getList())
 *   await withLoadingOn('#box', api.getList(), { text: '查询中', spinner: 'dots' })
 */
export declare function withLoadingOn<T>(target: string | HTMLElement, task: LoadingTask<T>, options?: WithLoadingArgs): Promise<T>;
