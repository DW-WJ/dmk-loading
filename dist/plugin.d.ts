import type { App, Plugin } from 'vue';
import { openLoading, closeLoading, closeAllLoading, setLoadingText, updateLoading, isLoading, hasLoading, setDefaultOptions, getDefaultOptions } from './core/manager';
import { withLoading, withLoadingOn } from './core/withLoading';
import { preset, presets } from './core/preset';
import type { PluginOptions } from './core/types';
export interface TransitionLoadingApi {
    open: typeof openLoading;
    close: typeof closeLoading;
    closeAll: typeof closeAllLoading;
    setText: typeof setLoadingText;
    update: typeof updateLoading;
    isLoading: typeof isLoading;
    hasLoading: typeof hasLoading;
    withLoading: typeof withLoading;
    withLoadingOn: typeof withLoadingOn;
    preset: typeof preset;
    presets: typeof presets;
    setDefaults: typeof setDefaultOptions;
    getDefaults: typeof getDefaultOptions;
}
/**
 * 指令注册名（带命名空间前缀，避免与 ElementUI 等库的 `v-loading` 冲突）
 * 模板里用：<div v-vtl-loading="loading"> 或 <div v-vtl-loading.lazy>
 */
export declare const DIRECTIVE_NAME = "vtl-loading";
/** 手动挂载遮罩宿主（一般无需调用，install 已自动挂载；SSR/按需场景可用） */
export declare function mountLoadingHost(container?: HTMLElement): App;
export declare const TransitionLoading: Plugin & {
    install: (app: App, options?: PluginOptions) => void;
};
declare function installPlugin(app: App, options?: PluginOptions): void;
/** 供非 Vue 环境（如纯 JS 业务）使用的挂载函数 */
export declare function createLoading(): TransitionLoadingApi;
export { installPlugin as install };
export default TransitionLoading;
