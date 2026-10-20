/**
 * core 层统一出口 —— 框架无关
 * --------------------------------------------------------------------------
 * 这个文件是"多框架"的契约：它不 import 任何框架，只导出纯逻辑。
 *
 * 消费方：
 *   Vue 3   → src/lib/index.ts（Vue 适配层）
 *   React   → react 包（useLoading / <LoadingOverlay />）
 *   UniApp  → uniapp 包（uni.showLoading 桥接）
 *   鸿蒙     → ArkTS 包（ArkUI 状态观察者）
 *
 * 想加新框架？只需要写一个适配层，core 一行都不用改。
 */

// ---------- 响应式（框架无关的最小实现） ----------
export { reactive, readonly, ref, computed, subscribe, notify, notifyAll, trigger, isReactive } from './reactive'
export type { Listener } from './reactive'

// ---------- 类型 ----------
export type {
  LoadingTarget,
  LoadingTransition,
  LoadingSpinner,
  LoadingMaskStyle,
  LoadingContext,
  LoadingOptionValue,
  LoadingOptions,
  LoadingPlan,
  LoadingText,
  LoadingHooks,
  LoadingSlot,
  ResolvedOptions,
  PresetLike,
  PluginOptions,
  WithLoadingArgs
} from './types'

// ---------- 状态核心 ----------
export {
  openLoading,
  closeLoading,
  closeAllLoading,
  updateLoading,
  setLoadingText,
  isLoading,
  hasLoading,
  setDefaultOptions,
  getDefaultOptions,
  getState,
  getSnapshot,
  subscribeState,
  resolveElement,
  resolveOptions,
  mergeOptions,
  buildCtx,
  findSlotByToken,
  localSlots
} from './manager'

export type { OpenHandle } from './manager'

// ---------- 异步包装 ----------
export { withLoading, withLoadingOn } from './withLoading'
export type { LoadingTask } from './withLoading'

// ---------- 预设方案 ----------
export { preset, presets, LoadingPreset } from './preset'

// ---------- 非 Vue 环境的开箱即用入口 ----------
import { openLoading as _open } from './manager'
import { closeAllLoading as _closeAll } from './manager'
import { getState as _getState } from './manager'
import { setDefaultOptions as _setDefaults } from './manager'
import { subscribeState as _subscribe } from './manager'

/**
 * 框架无关的挂载入口
 * 宿主需要提供一个渲染函数把状态画出来（Vue/React/ArkTS 各有自己的做法）
 *
 * @param render 接收当前状态快照，返回清理函数
 * @returns 卸载函数
 */
export function createLoadingCore(render: (snapshot: ReturnType<typeof _getState>) => void): () => void {
  const renderOnce = () => render(_getState())
  renderOnce()
  const unsubscribe = _subscribe(renderOnce)
  return () => {
    unsubscribe()
    _closeAll()
  }
}

export const core = {
  open: _open,
  closeAll: _closeAll,
  getState: _getState,
  setDefaults: _setDefaults
}
// ---------- 免import 全局方法 ----------
export { defineLoadingGlobal, defineLoadingProperties, hasLoadingGlobal } from './global'
export type { GlobalInjectOptions, GlobalLoadingApi } from './global'
