# Changelog

本文件记录本库的重要变更。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.0]

### 架构

- **core / adapter 分层**：核心层抽为纯 TS 零运行时依赖（`@factory/core` 思路），
  各框架用自己最地道的响应式消费订阅通道（Vue `shallowRef` / React `useSyncExternalStore` / ArkTS `@State`）
- core 独立产物 20.57 KB（gzip 6.08 KB），实测无 `import vue`
- 放弃自研响应式：跨框架组件库硬造"通用响应式"两边都不好使，改为订阅通道

### 引入方式

- **页面零 import**：新增构建期自动注入插件 `dmk-loading/vite`
  - 业务页面里直接写 `openLoading()` / `closeLoading()`，无需任何 import
  - 接入只需 `vite.config.ts` 一行：`TransitionLoadingAutoImport()`
- **window 全局方法**：`app.use()` 后自动注入 `$loading.open()`，任意 `.js` 文件可用
- **Options API**：`this.$loading.open()`
- **实测证明按需引入会静默失效**：只 import `openLoading` 时，tree-shaking 会把
  `LoadingHost` / `LoadingMask` / `mount` / `Teleport` 全删掉 —— 状态变了但遮罩不渲染且不报错。
  因此命令式 API 类插件一律全量引入（详见 `docs/import-strategy.md`）

### 能力

- 全局 / 局部双粒度：局部支持 `id` 选择器、ref、DOM 实例、组件实例
- 令牌计数：并发请求先返回的不会关掉后一个的遮罩
- `delay`（防闪烁） + `minDuration`（最短展示）双闸
- 函数式配置：文案、颜色、整个方案都可传函数；支持方案工厂与 `preset` 链式
- 运行中更新：`updateLoading(token, { text: '上传中 45%' })`
- 生命周期钩子：`onShow` / `onHide` / `onSuccess` / `onError` / `onFinally`
- 6 种指示器（ring / dots / bars / pulse / wave / orbit）× 5 种过渡
- 局部定位自动化：宿主 `position: static` 自动改 `relative`，卸载还原

### 无障碍

- `prefers-reduced-motion` 降级：动效敏感用户关闭旋转/位移/缩放，保留静态指示器
  （CSS `@media` + JS `.vtl-reduce-motion` class 双层保障）
- `aria-busy`：局部遮罩加载时给宿主打标记，屏幕阅读器知道"这块在加载"而非"这里没内容"
- `role="status"` + `aria-live="polite"` + `aria-label`：加载文案可被播报
- 暗色模式适配：`prefers-color-scheme: dark` 时加深遮罩底色

### 可配置

- `z-index` 令牌化：`:root { --vtl-z-mask: 3000 }` 即可覆盖，
  解决 AntD Modal / Element Dialog 层级冲突问题

### 兼容性

- SSR 安全：所有 DOM 操作有 `typeof document` 守卫
- 组件卸载自动关闭：`useAutoReleaseLoading` / `scopedLoading`
- 路由切换自动 `closeAllLoading()`，避免遮罩残留
- 找不到局部目标时降级为全局遮罩（宁可遮全屏也不让"请求结束但没关闭"）

## [0.1.0]

- 初始版本：全局方法 + `v-loading` 指令 + 局部遮罩
