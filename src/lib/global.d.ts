/**
 * 全局类型声明 —— 让「零 import」写法在 TypeScript 里也成立
 *
 * 原理：构建期自动注入 import，但 TS 的类型检查发生在构建之前，
 *       所以要在类型层面"提前"告诉 TS 这些名字全局可用。
 *
 * 接入方式（三选一）：
 *   ① 在项目 src 下建 `vtl.d.ts`，内容 `/// <reference types="dmk-loading/global" />`
 *   ② tsconfig.json 的 compilerOptions.types 里加 "dmk-loading/global"
 *   ③ 直接 import 本文件（适合不想动 tsconfig 的项目）
 */

// ---------- window 全局 ----------
declare global {
  interface Window {
    /** 全局加载 API（app.use(TransitionLoading) 后自动注入） */
    $loading: import('./core/global').GlobalLoadingApi
  }

  /** Options API：this.$loading.open() */
  interface ComponentCustomProperties {
    $loading: import('./core/global').GlobalLoadingApi
    $vtl: import('./core/global').GlobalLoadingApi
  }
}

// ---------- 免 import 的裸函数 ----------
// 这些名字在 .vue / .ts 文件里可以直接写，构建期由插件补 import
declare global {
  const openLoading: typeof import('./index').openLoading
  const closeLoading: typeof import('./index').closeLoading
  const closeAllLoading: typeof import('./index').closeAllLoading
  const updateLoading: typeof import('./index').updateLoading
  const setLoadingText: typeof import('./index').setLoadingText
  const isLoading: typeof import('./index').isLoading
  const hasLoading: typeof import('./index').hasLoading
  const withLoading: typeof import('./index').withLoading
  const withLoadingOn: typeof import('./index').withLoadingOn
  const setDefaultOptions: typeof import('./index').setDefaultOptions
  const getDefaultOptions: typeof import('./index').getDefaultOptions
  const preset: typeof import('./index').preset
  const presets: typeof import('./index').presets
  const LoadingPreset: typeof import('./index').LoadingPreset
}

export {}
