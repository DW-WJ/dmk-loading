/**
 * 全局方法注入 —— 解决「每个页面都要写一次 import」的痛点
 *
 * 目标：
 *   页面里不写任何 import，直接调用 openLoading() / $loading.open()
 *
 * 三种注入通道（可同时开，互不冲突）：
 *   ① window 裸全局      —— 任何文件、任何框架、CDN 引入都能用
 *   ② Vue globalProperties —— Options API 里 this.$loading.open()
 *   ③ 自动 import 插件     —— <script setup> 里直接写 openLoading()，
 *                             由构建期注入 import，代码零改动
 */
import type { App } from 'vue';
import { openLoading, closeLoading, closeAllLoading, isLoading, hasLoading } from './manager';
import { withLoading, withLoadingOn } from './withLoading';
import { preset, presets } from './preset';
export interface GlobalLoadingApi {
    open: typeof openLoading;
    close: typeof closeLoading;
    closeAll: typeof closeAllLoading;
    isLoading: typeof isLoading;
    hasLoading: typeof hasLoading;
    withLoading: typeof withLoading;
    withLoadingOn: typeof withLoadingOn;
    preset: typeof preset;
    presets: typeof presets;
}
/** 注入到 window 的全局变量名（可用一个短名，业务侧写起来最省事） */
export interface GlobalInjectOptions {
    /**
     * window 上的属性名，数组形式可同时注入多个别名。
     * 默认 ['$loading'] —— 业务侧写 $loading.open() 而不是 window.$loading.open()
     */
    keys?: string[];
    /** 是否覆盖已有的同名全局（默认 false，避免踩到别的库） */
    overwrite?: boolean;
}
/**
 * 注入 window 全局。
 *
 * 调用一次之后，全项目任意位置（含 .js/.ts/.vue/第三方回调）都能直接用：
 *
 * ```js
 * $loading.open({ text: '加载中' })
 * $loading.close()
 * await $loading.withLoading(api.get())
 * ```
 *
 * @returns 便于测试：是否真的注入成功
 */
export declare function defineLoadingGlobal(options?: GlobalInjectOptions): boolean;
/** Vue 的 globalProperties 注入（Options API 里 this.$loading.*） */
export declare function defineLoadingProperties(app: App, key?: string): void;
/** 判断全局是否已注入（调试 / 兜底用） */
export declare function hasLoadingGlobal(key?: string): boolean;
