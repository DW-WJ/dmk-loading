import type { App } from 'vue'
import { getCurrentInstance, onMounted, onUnmounted } from 'vue'
import TransitionLoading, { mountLoadingHost, createLoading, install as installPlugin, DIRECTIVE_NAME } from './plugin'
import {
  openLoading,
  closeLoading,
  closeAllLoading,
  setLoadingText,
  updateLoading,
  isLoading,
  hasLoading,
  setDefaultOptions,
  getDefaultOptions,
  buildCtx,
  findSlotByToken
} from './core/manager'
import { withLoading, withLoadingOn } from './core/withLoading'
import { vLoading } from './directives/vLoading'
import { preset, presets, LoadingPreset } from './core/preset'
import {
  defineLoadingGlobal,
  defineLoadingProperties,
  hasLoadingGlobal
} from './core/global'
import type { GlobalInjectOptions, GlobalLoadingApi } from './core/global'
import LoadingMask from './components/LoadingMask.vue'
import LoadingHost from './components/LoadingHost.vue'
import type {
  LoadingContext,
  LoadingHooks,
  LoadingOptionValue,
  LoadingOptions,
  LoadingPlan,
  LoadingTarget,
  LoadingSlot,
  LoadingText,
  ResolvedOptions,
  PluginOptions
} from './core/types'

export type { WithLoadingArgs, LoadingConfig, PresetLike } from './core/types'
export type { LoadingTask } from './core/withLoading'

export {
  TransitionLoading,
  mountLoadingHost,
  createLoading,
  openLoading,
  closeLoading,
  closeAllLoading,
  setLoadingText,
  updateLoading,
  isLoading,
  hasLoading,
  withLoading,
  withLoadingOn,
  setDefaultOptions,
  getDefaultOptions,
  buildCtx,
  findSlotByToken,
  vLoading,
  DIRECTIVE_NAME,
  LoadingMask,
  LoadingHost,
  preset,
  presets,
  LoadingPreset,
  // 免 import 全局方法
  defineLoadingGlobal,
  defineLoadingProperties,
  hasLoadingGlobal
}
export type { GlobalInjectOptions, GlobalLoadingApi }
export type {
  LoadingContext,
  LoadingHooks,
  LoadingOptionValue,
  LoadingOptions,
  LoadingPlan,
  LoadingTarget,
  LoadingSlot,
  LoadingText,
  ResolvedOptions,
  PluginOptions
}
export { TransitionLoading as default }

/** Vue3 setup 内使用的组合式入口（可选，多数场景直接 import openLoading 即可） */
export function useLoading() {
  return {
    open: openLoading,
    close: closeLoading,
    closeAll: closeAllLoading,
    setText: setLoadingText,
    update: updateLoading,
    isLoading,
    hasLoading,
    withLoading,
    withLoadingOn,
    preset
  }
}

/** 组件卸载时自动关闭该组件发起的全局遮罩，避免残留 */
export function useAutoReleaseLoading() {
  const tokens: string[] = []
  getCurrentInstance()
  onMounted(() => {
    /* 挂载即就绪 */
  })
  onUnmounted(() => {
    tokens.splice(0).forEach((t) => closeLoading(t))
  })
  return {
    open(options?: LoadingOptions | ((ctx: any) => LoadingOptions)) {
      const handle = openLoading(options)
      tokens.push(handle.token)
      return handle
    }
  }
}

/** 组件级：开启后在卸载时自动关闭 */
export function scopedLoading(options?: LoadingOptions | ((ctx: any) => LoadingOptions)) {
  const handle = openLoading(options)
  onUnmounted(() => closeLoading(handle.token))
  return {
    token: handle.token,
    close: () => closeLoading(handle.token),
    /** 组件内部可随时改文案 */
    setText: (t: LoadingText) => updateLoading(handle.token, { text: t }),
    update: (patch: LoadingOptions) => updateLoading(handle.token, patch)
  }
}

/** 供 app.use 时保持类型提示 */
export function install(app: App, options?: PluginOptions) {
  installPlugin(app, options)
}