# 引入方式：按需 vs 全量 —— 实测结论与落地方案

> 结论先行：**用全量引入 + 页面零 import**。
> 这不是拍脑袋，是用 rollup 生产级 tree-shaking 实测 + 真实浏览器验证得出的。

---

## 一、实测数据（不猜）

### 1.1 单文件视角：按需确实更小

用 rollup（与 vite 生产构建同款 tree-shaking）实测 `scripts/measure-imports.mjs`：

| 引入方式 | 原始体积 | gzip |
| --- | --- | --- |
| 全量（`import * as`） | 22.86 KB | **7.12 KB** |
| 具名全量（引全部 API） | 21.58 KB | 6.79 KB |
| 按需两个（open + close） | 6.99 KB | 2.51 KB |
| 按需一个（只要 open） | 5.40 KB | 2.12 KB |

按需比全量小 **5.01 KB gzip（省 70%）**。看到这里似乎该选按需 —— 但下面这个发现推翻了它。

### 1.2 致命发现：按需引入会**静默失效**

把「只引 `openLoading` / `closeLoading` / `withLoading`」的产物拆开看：

```
✅ 状态机 manager（含遮罩可见性）
✅ openLoading 实现
✅ withLoading 实现
❌ LoadingHost 组件（渲染遮罩）    ← 被 tree-shaking 删了
❌ LoadingMask 组件                 ← 被 tree-shaking 删了
❌ 挂载宿主 mount()                 ← 被 tree-shaking 删了
❌ Teleport 到目标元素              ← 被 tree-shaking 删了
```

**后果**：调 `openLoading()` 会正确改变状态，但**没有任何东西被渲染出来**。控制台不报错、类型检查通过、测试可能也过 —— 用户只会看到「遮罩不生效」。

**根因**：`openLoading`（纯状态操作）和 `LoadingHost`（UI 渲染）在打包器眼里是**两个独立模块**，没有代码引用关系。只 import 前者，打包器就有理由删掉后者。

这是**组件库 + 命令式 API** 组合的固有陷阱，和 lodash（按函数引入安全）完全不同 —— lodash 的函数是纯计算，不需要渲染器；遮罩类库的状态和视图是**运行时耦合**的。

---

## 二、多页面真实成本（20 个页面）

`scripts/measure-multi-page.mjs` 模拟 20 个页面的后台管理系统：

| 维度 | 方案 A · 每页各自 import | 方案 B · 入口全量 + 页面零 import |
| --- | --- | --- |
| 总 gzip | 3.44 KB | 6.66 KB |
| chunk 数 | 2（vendor 共享） | 2（vendor 共享） |
| **样板代码** | **20 页 × 1 行 = 20 行** | **入口 1 行，页面 0 行** |
| 新增第 21 个页面 | 要再写 1 行 import | 什么都不用加 |
| 忘记 import 的后果 | 编译报错（可发现） | —— |

体积差 **3.2 KB gzip**，换来 20 行样板 + 20 次「我需要引哪个函数」的决策。

按现代性能标准：
- 3 KB gzip 是一次性下载、浏览器永久缓存的成本
- 20 行 import 是**永久的、每个新页面都要付的**认知成本

---

## 三、三条引入通道

### 通道 ① · 全局方法（window）—— 任何文件都能用

```ts
// 入口装一次
app.use(TransitionLoading)   // 默认就会调 defineLoadingGlobal()

// 任意 .js / .ts / .vue / 第三方回调里
$loading.open({ text: '加载中' })
await $loading.withLoading(api.get())
$loading.close()
```

- 变量名 `$loading` 短，业务侧少打字
- 默认**不覆盖**已有同名全局（`overwrite: false`），避免踩到别的库
- 可自定义：`defineLoadingGlobal({ keys: ['$ld', '$busy'] })`

### 通道 ② · Options API（this.$loading）

```ts
export default {
  methods: {
    async load() {
      this.$loading.open()
      try { this.data = await api.get() } finally { this.$loading.close() }
    }
  }
}
```

### 通道 ③ · 构建期自动注入 —— `<script setup>` 里直接写裸函数 ★推荐

```vue
<script setup lang="ts">
import { ref } from 'vue'
// ↑ 只有 vue 自己的 ref。没有 loading 库的 import。

async function load() {
  openLoading({ text: '加载中' })   // 直接写，构建期自动补 import
  try {
    orders.value = await api.getOrders()
  } finally {
    closeLoading()
  }
}
</script>
```

**接入只需 vite.config.ts 一行：**

```ts
import { TransitionLoadingAutoImport } from 'dmk-loading/vite'

export default defineConfig({
  plugins: [
    vue(),
    TransitionLoadingAutoImport()    // ← 这一行
  ]
})
```

插件行为：
- 只注入**本页真正用到**的函数（`openLoading` + `closeLoading` 就只注这两个）
- 页面上已有 import → **不重复注入**（支持相对路径 / 别名 / 裸包名 / 动态 import / 带扩展名共 7 种写法）
- 库自身源码 → 跳过（防自引用循环）
- `node_modules` / `dist` / `.d.ts` / 自定义 `exclude` → 跳过
- 只在有「调用形态」（`openLoading(`）时才判定为使用中，避免注释里的字面量误触发

---

## 四、TypeScript 支持

自动注入是**构建期**行为，TS 检查在构建之前，所以要额外给类型：

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "types": ["dmk-loading/global"]   // ← 加这一行
  }
}
```

或在建一个 `src/vtl.d.ts` 写：

```ts
/// <reference types="dmk-loading/global" />
```

声明内容（`dist/global.d.ts`）覆盖：
- `Window.$loading` → `window.$loading.open()`
- `ComponentCustomProperties.$loading` → `this.$loading.open()`
- 12 个裸函数（`openLoading` / `closeLoading` / `withLoading` / ...）

### ⚠️ 一个必须知道的边界

**Vue `<script setup>` 的模板里，`$loading` 会被解析成「组件实例属性」，不是 window 全局。**

```vue
<!-- ❌ 模板里这样不行 -->
<button @click="demoPreset('heavy', $loading.presets.heavy('...'))">heavy</button>
<!--    TS2551: Property '$loading' does not exist on type ... -->

<!-- ✅ 在 script 里预置，模板只引用 -->
<script setup>
const PRESET_HEAVY = window.$loading.presets.heavy('耗时操作中...')
</script>
<template>
  <button @click="demoPreset('heavy', PRESET_HEAVY)">heavy</button>
</template>
```

原因：Vue 模板里 `$` 开头的标识符一律走组件实例（`globalProperties`），模板沙箱也不暴露 `window`。
这是 Vue 框架机制，不是本库的限制 —— 记住「模板里用 script 预置的常量」即可。

---

## 五、体积实测（最终产物）

| 产物 | 原始 | gzip |
| --- | --- | --- |
| `dist/index.js`（库本体，含 Vue 组件 + 指令） | 23.4 KB | 7.5 KB |
| `dist/core.js`（框架无关内核） | 20.6 KB | 6.1 KB |
| `dist/vite.js`（构建期自动注入插件） | 5.7 KB | 2.4 KB |
| `dist/style.css` | 3.9 KB | 1.1 KB |

**核心 + 样式总共 7.2 KB gzip**，全站共享一份、浏览器缓存一次。

---

## 六、什么时候才该用按需引入

按需引入不是永远错的，这几种情况适用：

| 场景 | 原因 |
| --- | --- |
| **微前端 / qiankun 子应用** | 各子应用独立打包，避免重复下载同一份库 |
| **Library Mode 二次封装** | 你要发布一个自己的组件库给下游用，让下游能 tree-shake |
| **超大体积的通用工具库** | lodash / moment 这类（但注意：需要渲染器的库不适用） |
| **core-only 场景** | 只用状态机不用 UI（如 Node 端预取、SSR 数据编排），引 `@factory/core` |

**判断标准**：库的状态层和视图层是否运行时耦合？
- 解耦（纯计算）→ 按需安全
- 耦合（命令式 API 驱动渲染）→ **全量引入**

遮罩类库属于后者。这条结论可以直接复用到未来的数据缓存、全局通信、表单引擎插件。

---

## 七、验证

| 层次 | 脚本 | 断言 | 结果 |
| --- | --- | --- | --- |
| 引入体积实测 | `scripts/measure-imports.mjs` | 5 组 rollup 打包 | 数据见上 |
| 多页面成本 | `scripts/measure-multi-page.mjs` | 20 页 A/B 对比 | 差 3.2 KB |
| 自动注入单测 | `scripts/verify-auto-import.mjs` | **29 项** | ✅ |
| **零 import 浏览器 E2E** | `scripts/e2e-zero-import.mjs` | **35 项** | ✅ 三连跑稳定 |

E2E 验证的不只是「有反应」，而是三层承诺：
1. **源码层** —— `.vue` 文件里真的没有库的 import
2. **构建层** —— 请求编译产物，确认注入真的发生了、来源正确、没注多余的
3. **运行时** —— 全局/局部/window 三种写法各自真实开遮罩、锁滚动、自动关闭、尺寸贴合

真实项目验证：博客站 `frontend-factory` 的 `LoadingDemo.vue` 已**完全删除库的 import**，36 项 E2E + 49 项主题 E2E 全通过，功能无损。

---

## 八、过程中修掉的 4 个真 bug

### ① 自动注入对 `.vue` 完全无效（白屏级）
`enforce: 'pre'` 让插件跑在 `@vitejs/plugin-vue` **之前**，此时拿到的是原始 SFC。注入到 `<script>` 标签外的 import 被 Vue 编译器直接丢弃 —— **页面里用 `openLoading()` 但编译产物里没有 import，运行时报 `openLoading is not defined`**。

**修法**：改 `enforce: 'post'`。post 阶段拿到的是 vue 编译好的 JS，注入的才是有效顶层语句。

**教训**：写 Vue 生态的构建插件，`enforce` 不是随便选的 —— 依赖「源码形态」的插件必须 post。

### ② 部分导入时误判为「未导入」→ 重复声明
`import { openLoading } from 'dmk-loading'` + 页面里用了 `closeLoading`，被判定为「closeLoading 缺失」→ 追加一条 import → `Identifier 'closeLoading' has already been declared`，**整站白屏**。

import 语句是整体的，只要文件里已有任意一条本库的 import，就不能再注。

### ③ 库把自己 import 了自己 → 循环引用
`baseName` 判定太宽（`index.ts` 和任意 `xxx/index` 都算同一个），导致 `src/lib/index.ts` 本身被注入 → 库 import 自己。

**修法**：加 `libDir` 选项（默认从插件文件位置反推 `src/lib`），该目录下的文件一律跳过。已用 5 个文件做回归测试钉住。

### ④ 选择器漏写 `#` → 静默降级成全局遮罩
`openLoading('s13-region')` 里 `s13-region` 没有 `#` 前缀，`document.querySelector('s13-region')` 把它当**标签名**选择器 → 找不到 → 降级为全局遮罩。用户会看到「我只写了局部，结果遮住了整个页面」。

**修法**：`resolveElement` 增强为宽容模式 —— 直接查失败时按「id → class → 标签」再试一轮（CSS 标识符做转义）。少写一个 `#` 不该导致行为突变。

### 另外两个测试自身的坑

- **`page.locator('.nav-item').nth(idx)`**：新增场景 13 后索引错位 → 5 个断言假失败。**这是第五次踩**，已改成按文本定位（`hasText`），断言改为动态（`>= 12` 而非 `=== 12`）。
- **探针脚本用 `await import('/src/lib/index.ts')`**：在页面里额外 import 一份库，会与组件内那份形成**两个模块实例、两份状态**（`resolveElement` 在副本里查到 null）。导致我一度误判「局部遮罩失效」是产品 bug。**教训：不要在测试页面里额外 import 被测库本身**。
