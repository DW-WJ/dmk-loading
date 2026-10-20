# dmk-loading

框架无关的全局/局部加载遮罩库。**装完即用，页面不再维护任何 loading 变量和模板绑定** —— 请求开始 `openLoading()`，请求结束 `closeLoading()`，完事。

内核是纯 TypeScript，零框架运行时依赖 —— 同一套逻辑直接跑在 Vue / React / UniApp / 鸿蒙 ArkTS 上。

## 📚 文档

| 文档 | 内容 |
| --- | --- |
| [实战示例大全](docs/examples.md) | **21 个可直接抄的生产级例子** |
| [架构设计](docs/architecture.md) | 三层架构、设计决策、状态机 |
| [使用指南](docs/usage.md) | API 说明与边界情况 |
| 演示页 | `npm run dev` → 12 个可交互场景 |

## 设计目标

| 市面常见痛点 | 本库方案 |
| --- | --- |
| 每个页面 `const loading = ref(false)` + 模板 `v-if` 绑定 | 全局方法调用，页面零变量 |
| 遮罩组件每页重复 import | 遮罩宿主根部挂载一次，自动 Teleport |
| 区域/表格加载各写一套 | id / ref / 指令 三种粒度，一套 API |
| 并发请求时开关错乱 | 令牌（token）计数 + delay/minDuration 防闪烁 |
| 配置样式各处硬编码 | 函数式配置 + Preset 预设沉淀团队规范 |

## 安装

```bash
npm i dmk-loading
```

```ts
// main.ts
import { createApp } from 'vue'
import TransitionLoading from 'dmk-loading'
import 'dmk-loading/style.css' // 库内样式已随组件注入，按需保留

createApp(App).use(TransitionLoading).mount('#app')
```

可传全局默认配置：

```ts
createApp(App).use(TransitionLoading, {
  text: '加载中...',
  spinner: 'ring',      // ring | dots | bars | pulse | wave | orbit
  transition: 'fade',   // fade | zoom | slide-down | slide-up | blur | none
  maskStyle: 'soft',    // solid | soft | transparent
  delay: 120,           // 出现延迟，防快速请求闪烁
  lockScroll: true
}).mount('#app')
```

## 核心用法：请求 → 开启 → 更新 → 关闭

```vue
<script setup lang="ts">
import { openLoading, closeLoading } from 'dmk-loading'

// 页面里没有任何 loading 变量
async function loadOrders() {
  openLoading({ text: '正在加载订单...' })
  try {
    orders.value = await api.getOrders()   // 数据更新
  } finally {
    closeLoading()                          // 关
  }
}
</script>

<template>
  <button @click="loadOrders">刷新</button>
  <ul><li v-for="o in orders" :key="o.id">{{ o.name }}</li></ul>
</template>
```

## 三种局部控制方式

```ts
import { openLoading, closeLoading } from 'dmk-loading'

// ① id 选择器
openLoading('#table-box', { text: '查询中', spinner: 'dots' })
closeLoading('#table-box')

// ② ref / DOM / 组件实例
const box = ref<HTMLElement | null>(null)
openLoading(box.value!, { spinner: 'bars' })
closeLoading(box.value!)

// ③ 自定义指令 v-loading（组件自己管状态时用）
```

```vue
<div v-loading></div>
<div v-loading="{ text: '加载中', spinner: 'dots' }"></div>
<div v-loading.fade.solid.large></div>
```

## 最简：一行包裹

```ts
import { withLoading, withLoadingOn } from 'dmk-loading'

// 全局
const list = await withLoading(api.getList(), { text: '加载中' })
// 局部
const list = await withLoadingOn('#box', () => api.getList(), { spinner: 'dots' })
```

支持传 Promise 或函数，函数式更安全（同步抛错也会被捕获）。

## 函数式调用方案（核心能力）

### 1. 默认文案 + 调用时传参覆盖

```ts
openLoading()                                          // '加载中...'
openLoading({ text: '正在加载订单' })                   // 覆盖默认
openLoading({ text: '订单加载中', spinner: 'dots' })    // 多项一起传
```

### 2. 函数式文案 —— 基于上下文动态生成

所有配置项都可以写成函数，接收 `LoadingContext`：

```ts
interface LoadingContext {
  token: string                       // 本次加载标识
  scope: 'global' | 'local'           // 全局 / 局部
  target: LoadingTarget               // 局部目标
  options: ResolvedOptions            // 最终生效配置
  payload?: Record<string, unknown>   // 自定义透传数据
}
```

```ts
await withLoading(api.getList(), {
  payload: { page: 7, total: 23 },
  text: (ctx) => `正在加载第 ${ctx.payload?.page} / ${ctx.payload?.total} 页...`
})
```

不只 `text`，所有视觉字段都能函数化：

```ts
openLoading({
  spinner: () => 'dots',
  size: (ctx) => (ctx.scope === 'global' ? 'large' : 'small'),
  color: (ctx) => (ctx.scope === 'global' ? '#f00' : '#00f')
})
```

### 3. 方案工厂 —— 整份配置由函数决定

```ts
// 传函数 = 方案工厂，运行时执行
await withLoading(api.getList(), (ctx) => ({
  text: ctx.scope === 'global' ? '全局加载中' : '局部加载中',
  spinner: 'wave' as const,
  transition: 'slide-up' as const
}))

// openLoading 同样支持
openLoading(() => ({ text: '按上下文决定', color: '#8b5cf6' }))
```

### 4. 预设（Preset）—— 链式派生、可复用

```ts
import { preset, presets } from 'dmk-loading'

const queryPlan = preset('查询中').spinner('dots').size('large').delay(0).minDuration(300)

// 可直接传入，无需 .toOptions()
await withLoading(api.getList(), queryPlan)

// 派生局部版，保留原配置
await withLoading(api.getList(), queryPlan.target('#table-box'))

// 带钩子
await withLoading(api.save(data), queryPlan.onSuccess((r) => toast('成功')))
```

内置预设：

| 预设 | 特点 |
| --- | --- |
| `presets.quick('处理中')` | 短延迟，不闪烁 |
| `presets.normal()` | 常规请求（delay 120 / min 200） |
| `presets.heavy('处理中')` | 耗时操作，最长显示 600ms |
| `presets.table('查询中')` | 表格查询风格 |
| `presets.submit('提交中')` | 绿色主题 |
| `presets.danger('处理中')` | 红色危险操作 |
| `presets.region('加载中')` | 局部区域风格 |

Preset 可用方法：`.text() .spinner() .transition() .maskStyle() .size() .color() .textPosition() .delay() .minDuration() .target() .payload() .onShow() .onHide() .onSuccess() .onError() .onFinally() .toOptions() .toPlan()`

### 5. 生命周期钩子

```ts
await withLoading(api.getList(), {
  onShow: (ctx) => console.log('遮罩显示', ctx.token),
  onSuccess: (result, ctx) => console.log('成功', result),
  onError: (err, ctx) => console.error('失败', err),
  onFinally: (ctx) => console.log('收尾', ctx.token)
})
```

`try/finally` 保证 `onError` / `onFinally` 一定触发。

### 6. 运行中更新（进度场景）

```ts
const { token } = openLoading({ text: '上传中 0%', spinner: 'bars' })

for (const pct of [25, 50, 75, 100]) {
  await uploadChunk()
  updateLoading(token, { text: `上传中 ${pct}%` })
}
closeLoading(token)

// 也支持函数式
updateLoading((ctx) => ({ text: `第 ${ctx.payload?.page} 页` }))
```

### 7. 任务函数可接收上下文

```ts
await withLoading(
  (ctx) => {
    // ctx.payload 在这里可用，可做动态逻辑
    return ctx.payload?.page === 1 ? api.getFirst() : api.getPage(ctx.payload.page)
  },
  { payload: { page: 3 }, text: (ctx) => `加载第 ${ctx.payload.page} 页` }
)
```

### 8. 参数归一化 —— 五种写法都吃

```ts
withLoading(task)                                       // ① 无参
withLoading(task, { text: 'x', onSuccess: fn })        // ② 配置对象
withLoading(task, (ctx) => ({ text: 'x' }))             // ③ 方案工厂
withLoading(task, queryPlan)                            // ④ 预设实例
withLoading(task, { plan: queryPlan, target: '#box', hooks: { onSuccess: fn } })  // ⑤ 包装形态
```

配置函数抛错不会导致遮罩开不出来，会 `console.warn` 并回退默认值。

---

## 并发安全

同一区域多次 `openLoading` 不会被提前关闭（内部令牌计数），最后全部关闭才隐藏。也可按令牌精确关：

```ts
const { token } = openLoading()
closeLoading(token)
```

## 其他 API

| 方法 | 说明 |
| --- | --- |
| `openLoading(plan?)` / `openLoading(target, plan?)` | 开启，返回 `{ token, key }` |
| `closeLoading(token?)` / `closeLoading(target)` | 关闭 |
| `closeAllLoading()` | 关闭全部（路由切换自动调用） |
| `updateLoading(patch)` / `updateLoading(token, patch)` | 运行中更新配置 |
| `setLoadingText(text)` | 简写，仅改全局文案 |
| `isLoading(target?)` | 查询指定区域是否在加载 |
| `hasLoading()` | 是否存在任何加载中 |
| `findSlotByToken(token)` | 按 token 取内部槽位 |
| `buildCtx(slot)` | 构造上下文 |
| `setDefaultOptions(opts)` / `getDefaultOptions()` | 读写全局默认 |

## Options

| 字段 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| text | `string \| (ctx) => string` | '加载中...' | 遮罩文案（函数式） |
| textPosition | center/bottom/top | center | 文案位置 |
| spinner | ring/dots/bars/pulse/wave/orbit | ring | 指示器样式 |
| transition | fade/zoom/slide-down/slide-up/blur/none | fade | 进出场过渡 |
| maskStyle | solid/soft/transparent | soft | 遮罩底色风格 |
| color | `string \| (ctx) => string` | #3b82f6 | 指示器主色 |
| textColor | `string \| (ctx) => string` | #ffffff | 文案颜色 |
| maskColor | `string \| (ctx) => string` | '' | 自定义遮罩背景色 |
| size | small/default/large | default | 尺寸 |
| delay | number | 120 | 出现延迟 ms（防闪烁） |
| minDuration | number | 0 | 最短显示 ms |
| lockScroll | boolean | true | 全局遮罩时锁定滚动 |
| target | string \| HTMLElement | - | 局部遮罩目标 |
| appendTo | HTMLElement | document.body | 全局遮罩挂载点 |
| payload | object | - | 自定义透传数据 |

> 除 `delay / minDuration / lockScroll / target / appendTo / payload` 外，所有字段都支持函数式写法。

## 目录结构

```
src/lib/
├── index.ts                 # 出口：插件 + 全局方法 + 预设 + 组件 + 指令 + 类型
├── plugin.ts                # install：挂载宿主、注册指令、注入 $loading
├── core/
│   ├── manager.ts           # 状态核心：令牌计数、函数求值、delay/minDuration、钩子
│   ├── withLoading.ts       # 一行包裹式 API + 五种参数形态归一化
│   ├── preset.ts            # 预设（Preset）链式派生 + 内置快捷预设
│   └── types.ts             # 全部类型定义（LoadingContext / LoadingPlan / LoadingHooks）
├── components/
│   ├── LoadingHost.vue      # 遮罩宿主（根部挂载一次，Teleport 到各目标）
│   └── LoadingMask.vue      # 单个遮罩层：6 指示器 + 5 过渡 + 渲染期函数求值
├── directives/
│   └── vLoading.ts          # v-loading 指令，支持布尔/对象/修饰符
└── styles/                  # 预留独立样式出口
```

## 实现思路

1. **状态集中**：`manager.ts` 用一个 `reactive` store 管「全局槽位 + 局部槽位表（key→slot）」，slot 内 `tokens[]` 做引用计数，`visible` 为唯一渲染依据。
2. **函数求值**：`mergeOptions()` 统一对每个字段做「静态值 or 函数」求值；`LoadingMask` 渲染期优先读 `slot.raw`（未求值原配置）再求值，保证 `updateLoading` 后函数立即生效。
3. **上下文贯通**：`LoadingContext` 同时喂给配置函数、钩子、任务函数，三者共享 `payload`。
4. **渲染集中**：只挂载一个 `LoadingHost`，全局遮罩 Teleport 到 body，所有局部遮罩 Teleport 到各自 `slot.el`，页面不写任何遮罩模板。
5. **定位自动化**：`LoadingMask` 在挂载时把宿主 `position: static` 自动改为 `relative`，卸载时还原。
6. **闪烁防护**：`delay` 未到不显示；`minDuration` 保证最短可见时长。
7. **清理兜底**：路由 `afterEach` 自动 `closeAllLoading()`；配置函数抛错回退默认值而非崩溃。

## 验证

五层测试，共 **157 项断言全部通过**：

```bash
npm run build        # vue-tsc 类型检查 + vite 打包（0 错误 / 0 警告）
npm test             # SFC 结构 15 + 核心 29 + 函数式 42（无需浏览器）
npm run dev          # 另开终端
npm run test:e2e     # 12 场景真实浏览器 28 项
```

| 层次 | 脚本 | 覆盖 | 结果 |
| --- | --- | --- | --- |
| SFC 结构 | `check-sfc.mjs` | `<style>` 未误入 template、标签闭合 | 15/15 |
| 类型 | `vue-tsc --noEmit` | 全量 | 0 错误 |
| 状态机 | `verify-core.mjs` | 并发令牌、异常安全、delay/minDuration 时序、目标降级 | 29/29 |
| 函数式 | `verify-functional.mjs` | 函数求值、方案工厂、Preset、钩子、运行中更新、容错 | 42/42 |
| **真实渲染** | `e2e-scenarios.mjs` | 12 场景遍历 + 遮罩真实 DOM/CSS | 28/28 |

E2E 验证的是 jsdom 测不到的东西：

- 全局遮罩 `position:fixed` 且宽高 = 视口尺寸
- 局部遮罩 `position:absolute` 且宽高 ≈ 目标元素（±3px）
- `z-index ≥ 2000`、背景色已应用、指示器 `animation-name ≠ none`
- 全局遮罩时 `body.overflow=hidden`，关闭后自动解锁
- 函数式 `color` 真实生效（`#8b5cf6` → `rgb(139, 92, 246)`）
- `minDuration=600` 时请求结束后遮罩仍保留
- 异常路径遮罩正常关闭，无残留
- 指令遮罩与全局/局部遮罩互不干扰
- 控制台零 JS 报错

> E2E 依赖 playwright-core；若本机已缓存 chromium，脚本会自动探测可用浏览器（`BROWSER_PATH` 可手动指定）。

## 无障碍

### 动效敏感用户（prefers-reduced-motion）

系统开启「减弱动态效果」时自动降级 —— **旋转 / 位移 / 缩放动画停止，只保留静态指示器**。
前庭功能障碍者看到旋转动画会眩晕，这是硬需求不是加分项。

- CSS 层 `@media (prefers-reduced-motion: reduce)` 兜底
- JS 层挂 `.vtl-reduce-motion` class，方便业务按需判断

### ARIA 语义

```html
<div class="vtl-mask" role="status" aria-live="polite" aria-busy="true" aria-label="加载订单中">
```

- `role="status"` + `aria-live="polite"`：文案变更会被礼貌播报
- `aria-busy="true"`：屏幕阅读器知道"正在加载"而非"这里没内容"
- 动画图形 `aria-hidden`，**但加载文案必须留在可读区域**
  （早期版本误把文案也放进 aria-hidden 容器，E2E 跑出来才发现屏读器读不到）

局部遮罩会给**宿主元素**打标记：

```html
<!-- 加载中 -->
<table aria-busy="true" data-vtl-loading>...</table>
```

### z-index 冲突

默认 `2000`，可能与 AntD Modal（1050）/ Element Dialog（2000+）撞车。
**令牌化后可整体覆盖，不用改库源码**：

```css
:root { --vtl-z-mask: 3000; }
```

### 暗色模式

`prefers-color-scheme: dark` 时自动加深遮罩底色
（默认的半透明深色在深色背景下几乎不可见，这是实测发现的问题）。

---

## License

MIT