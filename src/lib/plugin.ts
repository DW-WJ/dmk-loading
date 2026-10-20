import type { App, Plugin } from 'vue'
import { createApp } from 'vue'
import LoadingHost from './components/LoadingHost.vue'
import { vLoading } from './directives/vLoading'
import {
  openLoading,
  closeLoading,
  closeAllLoading,
  setLoadingText,
  updateLoading,
  isLoading,
  hasLoading,
  setDefaultOptions,
  getDefaultOptions
} from './core/manager'
import { withLoading, withLoadingOn } from './core/withLoading'
import { preset, presets } from './core/preset'
import { defineLoadingGlobal } from './core/global'
import type { PluginOptions } from './core/types'

export interface TransitionLoadingApi {
  open: typeof openLoading
  close: typeof closeLoading
  closeAll: typeof closeAllLoading
  setText: typeof setLoadingText
  update: typeof updateLoading
  isLoading: typeof isLoading
  hasLoading: typeof hasLoading
  withLoading: typeof withLoading
  withLoadingOn: typeof withLoadingOn
  preset: typeof preset
  presets: typeof presets
  setDefaults: typeof setDefaultOptions
  getDefaults: typeof getDefaultOptions
}

/**
 * 指令注册名（带命名空间前缀，避免与 ElementUI 等库的 `v-loading` 冲突）
 * 模板里用：<div v-vtl-loading="loading"> 或 <div v-vtl-loading.lazy>
 */
export const DIRECTIVE_NAME = 'vtl-loading'

let hostApp: App | null = null

/** 手动挂载遮罩宿主（一般无需调用，install 已自动挂载；SSR/按需场景可用） */
export function mountLoadingHost(container?: HTMLElement): App {
  if (hostApp) return hostApp
  const el = container || document.createElement('div')
  if (!container) {
    el.setAttribute('data-vtl-host', '')
    document.body.appendChild(el)
  }
  hostApp = createApp(LoadingHost)
  hostApp.mount(el)
  return hostApp
}

export const TransitionLoading: Plugin & { install: (app: App, options?: PluginOptions) => void } = {
  install(app: App, options: PluginOptions = {}) {
    installPlugin(app, options)
  }
}

function installPlugin(app: App, options: PluginOptions = {}) {
  if (options && Object.keys(options).length) {
    setDefaultOptions(options)
  }

  if (typeof document !== 'undefined') {
    mountLoadingHost()
  }

  // ---------------------------------------------------------------------------
  // 指令注册 —— 用命名空间前缀避免与其它库冲突
  //
  // 为什么默认不叫 v-loading：
  //   ElementUI / Element Plus / Naive UI / Ant Design Vue 都注册了 `v-loading`，
  //   同名指令在同一个 app 上会互相覆盖（后注册的赢），
  //   表现为「用了本库的指令却渲染成别的库的样式」，且不报错 —— 极难排查。
  //
  // 默认注册 v-vtl-loading（vtl = vue-transition-loading 缩写）。
  // 需要时可通过 options.legacyDirective 额外注册 `v-loading` 兼容别名。
  // ---------------------------------------------------------------------------
  app.directive(DIRECTIVE_NAME, vLoading)
  if (options.legacyDirective) {
    app.directive('loading', vLoading)
  }

  // 组合式 API
  app.provide('vtl', createApi())

  // 全局方法：this.$loading.open() / this.$vtl.close() ...
  const api = createApi()
  app.config.globalProperties.$loading = api
  app.config.globalProperties.$vtl = api

  // 免 import 全局注入：$loading.open() 在任意文件可直接调用
  // 默认开启，业务侧 page/组件里再也不用写 import
  if (options.global !== false) {
    defineLoadingGlobal(options.inject ?? {})
  }

  // 路由切换自动关闭，避免遮罩残留
  installRouterGuard(app)
}

function createApi(): TransitionLoadingApi {
  return {
    open: openLoading,
    close: closeLoading,
    closeAll: closeAllLoading,
    setText: setLoadingText,
    update: updateLoading,
    isLoading: isLoading,
    hasLoading,
    withLoading,
    withLoadingOn,
    preset,
    presets,
    setDefaults: setDefaultOptions,
    getDefaults: getDefaultOptions
  }
}

function installRouterGuard(app: App) {
  try {
    const router = (app.config.globalProperties as any).$router
    if (!router) return
    const rawAfter = router.afterEach
    router.afterEach((...args: any[]) => {
      closeAllLoading()
      if (typeof rawAfter === 'function') rawAfter.apply(router, args)
    })
  } catch {
    /* 无 router 环境忽略 */
  }
}

/** 供非 Vue 环境（如纯 JS 业务）使用的挂载函数 */
export function createLoading() {
  if (typeof document !== 'undefined') mountLoadingHost()
  return createApi()
}

export { installPlugin as install }
export default TransitionLoading