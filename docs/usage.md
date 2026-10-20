# 使用指南（dmk-loading）

## 一、核心心智模型

```
install(TransitionLoading)        ← 根部挂载一次遮罩宿主（自动，业务无感）
       ↓
业务页面：不声明任何 loading 变量
       ↓
请求开始 → openLoading(...)       ← 全局/局部二选一
请求结束 → closeLoading(...)      ← 关掉
```

遮罩的显示与否完全由**内部状态**驱动，页面只负责"喊开始、喊结束"。

---

## 二、四种调用方式

### 1. 全局遮罩（最常用）

```ts
import { openLoading, closeLoading } from 'dmk-loading'

async function loadData() {
  openLoading({ text: '加载中...' })   // 不传参数 = 全局
  try {
    const data = await fetchData()
    render(data)
  } finally {
    closeLoading()
  }
}
```

### 2. 局部遮罩 · id 选择器

```ts
openLoading('#user-table', { spinner: 'dots' })
closeLoading('#user-table')
```

### 3. 局部遮罩 · ref / DOM / 组件实例

```ts
const panel = ref<HTMLElement | null>(null)
openLoading(panel.value!, { spinner: 'bars', text: '详情加载中' })
closeLoading(panel.value!)
```

### 4. 一行包裹（最省事）

```ts
import { withLoading, withLoadingOn } from 'dmk-loading'

const list = await withLoading(api.getList(), { text: '加载中' })       // 全局
const rows = await withLoadingOn('#box', api.getRows(), { spinner: 'dots' }) // 局部
```

---

## 三、指令式 `v-loading`（组件自管状态时用）

```vue
<template>
  <!-- 布尔 -->
  <div v-loading="loading"></div>

  <!-- 对象 -->
  <div v-loading="{ text: '加载中', spinner: 'dots', maskStyle: 'soft' }"></div>

  <!-- 修饰符简写 -->
  <div v-loading.fade.solid.large></div>

  <!-- 带 visible 字段的受控写法 -->
  <div v-loading="{ visible: loading, text: '查询中' }"></div>
</template>
```

修饰符：`ring dots bars pulse wave orbit` · `fade zoom slideDown slideUp blur` · `solid soft transparent` · `small large` · `top bottom`

> 页面级请求请优先用 `openLoading/closeLoading`，指令仍需一个变量驱动，不符合"零变量"目标。

---

## 四、并发安全

内部为每次 `openLoading` 分配 token 并计数，**同一区域多次开启不会被提前关闭**：

```ts
openLoading({ text: '请求A' })
openLoading({ text: '请求B' })
closeLoading()   // 只关掉一个（A）
closeLoading()   // 才真正隐藏
```

也可以按 token 精确关闭：

```ts
const { token } = openLoading()
// ...别的逻辑...
closeLoading(token)
```

---

## 五、防闪烁

- `delay`：延迟多少毫秒才真正显示。请求很快时（如 100ms），遮罩根本不出现 → 视觉干净。
- `minDuration`：最短显示时长。请求很快时也至少显示 N 毫秒 → 不会出现"闪一下"。

```ts
createApp(App).use(TransitionLoading, { delay: 150, minDuration: 300 })
```

---

## 六、路由/卸载兜底

- 路由 `afterEach` 自动 `closeAllLoading()`，切换页面不会残留遮罩。
- 局部遮罩在 Token 清空后 400ms 自动清理槽位。
- 组件卸载自动还原宿主元素的 `position` / `overflow`。

---

## 七、干扰最小化

- 遮罩宿主用 `createApp` 独立挂载到 body，**不依赖业务根组件**，不会被业务 layout 的 `v-if` 干掉。
- 局部遮罩通过 `<Teleport :to="el">` 挂到目标内部，业务模板零改动。
- 找不到目标元素时降级为全局遮罩并 `console.warn`，不会"开了关不掉"。