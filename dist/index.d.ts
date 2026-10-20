import type { App } from 'vue';
import TransitionLoading, { mountLoadingHost, createLoading, DIRECTIVE_NAME } from './plugin';
import { openLoading, closeLoading, closeAllLoading, setLoadingText, updateLoading, isLoading, hasLoading, setDefaultOptions, getDefaultOptions, buildCtx, findSlotByToken } from './core/manager';
import { withLoading, withLoadingOn } from './core/withLoading';
import { vLoading } from './directives/vLoading';
import { preset, presets, LoadingPreset } from './core/preset';
import { defineLoadingGlobal, defineLoadingProperties, hasLoadingGlobal } from './core/global';
import type { GlobalInjectOptions, GlobalLoadingApi } from './core/global';
import LoadingMask from './components/LoadingMask.vue';
import LoadingHost from './components/LoadingHost.vue';
import type { LoadingContext, LoadingHooks, LoadingOptionValue, LoadingOptions, LoadingPlan, LoadingTarget, LoadingSlot, LoadingText, ResolvedOptions, PluginOptions } from './core/types';
export type { WithLoadingArgs, LoadingConfig, PresetLike } from './core/types';
export type { LoadingTask } from './core/withLoading';
export { TransitionLoading, mountLoadingHost, createLoading, openLoading, closeLoading, closeAllLoading, setLoadingText, updateLoading, isLoading, hasLoading, withLoading, withLoadingOn, setDefaultOptions, getDefaultOptions, buildCtx, findSlotByToken, vLoading, DIRECTIVE_NAME, LoadingMask, LoadingHost, preset, presets, LoadingPreset, defineLoadingGlobal, defineLoadingProperties, hasLoadingGlobal };
export type { GlobalInjectOptions, GlobalLoadingApi };
export type { LoadingContext, LoadingHooks, LoadingOptionValue, LoadingOptions, LoadingPlan, LoadingTarget, LoadingSlot, LoadingText, ResolvedOptions, PluginOptions };
export { TransitionLoading as default };
/** Vue3 setup 内使用的组合式入口（可选，多数场景直接 import openLoading 即可） */
export declare function useLoading(): {
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
};
/** 组件卸载时自动关闭该组件发起的全局遮罩，避免残留 */
export declare function useAutoReleaseLoading(): {
    open(options?: LoadingOptions | ((ctx: any) => LoadingOptions)): import("./core/manager").OpenHandle;
};
/** 组件级：开启后在卸载时自动关闭 */
export declare function scopedLoading(options?: LoadingOptions | ((ctx: any) => LoadingOptions)): {
    token: string;
    close: () => void;
    /** 组件内部可随时改文案 */
    setText: (t: LoadingText) => void;
    update: (patch: LoadingOptions) => void;
};
/** 供 app.use 时保持类型提示 */
export declare function install(app: App, options?: PluginOptions): void;
