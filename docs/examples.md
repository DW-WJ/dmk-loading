# 实战示例大全

> 全部代码可在演示页 `npm run dev` → http://127.0.0.1:5180 对照点击验证

---

## 1. 最基础：请求 → 开启 → 更新 → 关闭

```vue
<script setup lang="ts">
import { openLoading, closeLoading } from 'dmk-loading'

const orders = ref<Order[]>([])

// 页面里没有任何 loading 变量
async function loadOrders() {
  openLoading({ text: '正在加载订单...' })
  try {
    orders.value = await api.getOrders()
  } finally {
    closeLoading()
  }
}
</script>

<template>
  <button @click="loadOrders">刷新订单</button>
  <OrderTable :data="orders" />
</template>
```

---

## 2. 推荐写法：一行包裹

```ts
import { withLoading } from 'dmk-loading'

const orders = await withLoading(api.getOrders(), {
  text: '正在加载订单...',
  spinner: 'dots'
})
// 异常安全：请求失败也会关闭遮罩并把异常抛给你
```

---

## 3. 表格区域加载（最常见）

```vue
<script setup>
import { withLoadingOn } from 'dmk-loading'

async function loadPage(p: number) {
  rows.value = await withLoadingOn(
    '#table-box',      // 目标元素选择器
    api.getPage(p),
    { text: `加载第 ${p} 页...`, spinner: 'dots', transition: 'zoom' }
  )
}
</script>

<template>
  <!-- 筛选栏、按钮都不受影响，只有表格区域转圈 -->
  <FilterBar />
  <button @click="loadPage(1)">第 1 页</button>
  <div id="table-box"><MyTable :data="rows" /></div>
</template>
```

---

## 4. 用 ref 定位（类型安全）

```vue
<script setup>
import { ref } from 'vue'
import { withLoadingOn } from 'dmk-loading'

const panel = ref<HTMLElement | null>(null)

async function loadDetail() {
  await withLoadingOn(panel.value!, api.getDetail(), { spinner: 'bars' })
}
</script>

<template>
  <div ref="panel"><Detail /></div>
</template>
```

> `target` 支持：CSS 选择器 / HTMLElement / 组件实例 / Ref

---

## 5. 函数式文案（按数据动态生成）

```ts
await withLoading(api.getList(), {
  payload: { page: 7, total: 23 },
  text: (ctx) => `正在加载第 ${ctx.payload?.page} / ${ctx.payload?.total} 页...`
})
```

不只是 `text`，**所有配置项**都能写函数：

```ts
openLoading({
  spinner: () => 'dots',
  size: (ctx) => (ctx.scope === 'global' ? 'large' : 'small'),
  color: (ctx) => (ctx.scope === 'global' ? '#f00' : '#00f')
})
```

> 不参与函数求值的字段：`delay` / `minDuration` / `lockScroll` / `target` / `appendTo` / `payload`

---

## 6. 方案工厂：整份配置由函数决定

```ts
await withLoading(api.getList(), (ctx) => ({
  text: ctx.scope === 'global' ? '全局加载中' : '局部加载中',
  spinner: 'wave',
  transition: 'slide-up'
}))
```

---

## 7. 预设方案：团队规范沉淀

```ts
import { preset, presets } from 'dmk-loading'

// 自定义预设，链式派生
const QUERY = preset('查询中...').spinner('dots').delay(100).minDuration(300)
const SUBMIT = preset('提交中...').spinner('bars').color('#10b981').delay(0)
const DELETE = preset('删除中...').spinner('pulse').color('#ef4444').delay(0)

// 直接用（实例可传，不用 .toOptions()）
await withLoading(api.getList(), QUERY)

// 派生局部版（保留原配置，只加 target）
await withLoading(api.getList(), QUERY.target('#table'))

// 挂钩子
await withLoading(api.save(form), SUBMIT.onSuccess((r) => toast('成功')))

// 内置预设
presets.quick('处理中')      // 短延迟，不闪烁
presets.normal()            // 常规（delay 120 / min 200）
presets.heavy('处理中')     // 耗时操作（min 600）
presets.table('查询中')     // 表格风格
presets.submit('提交中')    // 绿色主题
presets.danger('处理中')    // 红色危险操作
presets.region('加载中')    // 局部区域
```

---

## 8. 进度型任务（上传/下载）

```ts
const { token } = openLoading({
  text: '准备上传...',
  spinner: 'bars',
  color: '#10b981',
  minDuration: 800          // 防止最后一点进度一闪而过
})

try {
  for (const [i, file] of files.entries()) {
    await uploadChunk(file)
    updateLoading(token, {
      text: `上传中 ${Math.round((i + 1) / files.length * 100)}%（${i + 1}/${files.length}）`
    })
  }
} finally {
  closeLoading(token)        // 异常也会关
}
```

`updateLoading` 也支持函数：

```ts
updateLoading((ctx) => ({ text: `第 ${ctx.payload?.page} 页` }))
updateLoading(token, { text: '自定义' })
```

---

## 9. 分步骤任务

```ts
const { token } = openLoading({ text: '步骤 1/3：校验参数' })
await validate()
updateLoading(token, { text: '步骤 2/3：上传数据', spinner: 'bars' })
await upload()
updateLoading(token, { text: '步骤 3/3：生成报告', spinner: 'orbit' })
await generate()
closeLoading(token)
```

---

## 10. 并发控制

### ✅ 正确：Promise.all 包在 withLoading 里

```ts
const [user, perm, config] = await withLoading(
  Promise.all([api.getUser(), api.getPerm(), api.getConfig()]),
  { text: '加载中...' }
)
// 自动等所有 Promise 完成才关遮罩
```

### ❌ 错误：forEach + async

```ts
;[api.a(), api.b(), api.c()].forEach(async (p) => {
  openLoading()
  await p
  closeLoading()    // 先完成的会抢先关闭！
})
```

### ✅ 手动：一次开关

```ts
const { token } = openLoading({ text: '加载 3 个模块' })
await Promise.all([api.a(), api.b(), api.c()])
closeLoading(token)
```

---

## 11. 一页多区域（仪表盘）

```ts
await Promise.all([
  withLoadingOn('#kpi', api.getKpi(), { spinner: 'dots' }),
  withLoadingOn('#chart', api.getChart(), { spinner: 'wave' }),
  withLoadingOn('#list', api.getList(), { spinner: 'bars' })
])
// 用户在 A 区加载时，B 区按钮依然可点，状态完全独立
```

---

## 12. 异常处理与钩子

```ts
try {
  const res = await withLoading(api.getData(), {
    text: '加载中...',
    onShow: (ctx) => console.log('遮罩显示', ctx.token),
    onSuccess: (r, ctx) => console.log('成功', r, ctx.token),
    onError: (e) => console.error('失败', e),   // 异常时也触发
    onFinally: (ctx) => console.log('收尾')      // 一定触发
  })
  setState({ type: 'ok', data: res })
} catch (e) {
  setState({ type: 'error', msg: e.message })   // 遮罩已关，这里只管 UI
}
```

带重试：

```ts
let attempt = 0
while (attempt < 3) {
  attempt++
  try {
    await withLoading(api.call(), { text: `第 ${attempt} 次尝试...`, delay: 0 })
    break
  } catch {
    // 继续重试
  }
}
```

---

## 13. 防闪烁策略

| 策略 | 效果 | 适用 |
| --- | --- | --- |
| `delay: 300` | 300ms 内返回的请求，遮罩**完全不出现** | 缓存命中、快接口 |
| `minDuration: 600` | 慢请求至少显示 600ms，**不会闪断** | 耗时操作 |
| 两者组合 | 兼顾"干净"与"稳定" | **推荐默认** |

```ts
// 全局设置（推荐）
createApp(App).use(TransitionLoading, {
  delay: 200,        // 快请求不闪
  minDuration: 400   // 慢请求不闪断
})
```

实测对比见演示页场景 8。

---

## 14. 组件化封装范式

把「请求 + loading + 渲染」封成一个组件，父组件零 loading 代码：

```vue
<!-- AsyncDataBox.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { withLoading, withLoadingOn, presets } from 'dmk-loading'

const props = defineProps<{
  fetcher: (params: any) => Promise<any>
  text?: string
  target?: string     // 传了就是局部模式
  params?: any
}>()

const data = ref<any>(null)

async function reload() {
  const plan = presets.table(props.text || '加载中...')
  data.value = props.target
    ? await withLoadingOn(props.target, () => props.fetcher(props.params), plan)
    : await withLoading(() => props.fetcher(props.params), plan)
}
defineExpose({ reload, data })
</script>

<template>
  <div :id="target || undefined">
    <slot :data="data" :reload="reload" />
  </div>
</template>
```

```vue
<!-- 父组件：只给数据源 -->
<AsyncDataBox :fetcher="fetchUser" text="加载用户..." :params="{ id: 1 }">
  <template #default="{ data, reload }">
    <UserCard :user="data" @refresh="reload" />
  </template>
</AsyncDataBox>
```

---

## 15. axios 拦截器全局接管（一处接入全站）

```ts
// main.ts
import axios from 'axios'
import { openLoading, closeLoading } from 'dmk-loading'

axios.interceptors.request.use((config) => {
  // 可以根据请求配置决定文案
  openLoading({
    text: config.method === 'get' ? '查询中...' : '提交中...',
    delay: 200
  })
  return config
})

axios.interceptors.response.use(
  (res) => { closeLoading(); return res },
  (err) => { closeLoading(); return Promise.reject(err) }
)
```

之后业务代码里**不需要任何 loading 逻辑**：

```ts
const res = await axios.get('/api/users')   // 遮罩自动开关联动
```

> 注意：并发请求时每个请求各开关，但内部有 token 计数，不会提前关闭。

---

## 16. 路由守卫（已内置）

插件 install 时会自动检测 `app.$router` 并注册：

```ts
router.afterEach(() => closeAllLoading())
```

效果：用户快速切页时，遮罩不会"卡"在新页面上。**无需手写**。

---

## 17. 静默加载（只防重复点击）

```ts
const { token } = openLoading({
  text: '',                    // 无文案
  maskStyle: 'transparent',    // 透明遮罩
  delay: 0
})
await submit()
closeLoading(token)
// 用户看不到遮罩，但无法重复点击
```

---

## 18. 骨架屏风格（透明遮罩）

```ts
await withLoading(api.get(), {
  maskStyle: 'transparent',    // 只显示指示器，不挡内容
  spinner: 'pulse',
  color: '#94a3b8'
})
```

配合骨架屏组件使用，让内容可见但暗示"还在加载"。

---

## 19. 防重复提交

```ts
let inflight = false

async function submit() {
  if (inflight) return
  inflight = true
  const { token } = openLoading({
    text: '提交中，请勿重复操作...',
    delay: 0,                  // 立刻显示，让用户马上有反馈
    lockScroll: true
  })
  try {
    await api.submit()
  } finally {
    closeLoading(token)
    inflight = false
  }
}
```

---

## 20. 组合式 API（setup 内）

```ts
import { useLoading } from 'dmk-loading'

export default defineComponent({
  setup() {
    const { open, close, withLoading, update, preset } = useLoading()
    // ...用法同全局方法
  }
})
```

其他：
```ts
import { scopedLoading, useAutoReleaseLoading } from 'dmk-loading'

// 组件卸载自动关闭
const loading = scopedLoading({ text: '加载中' })
onUnmounted(() => loading.close())   // 已自动调用，这里是提前关闭

// 手动追踪多个 token
const { open } = useAutoReleaseLoading()
const h = open({ text: 'x' })       // 组件卸载时自动关闭
```

---

## 21. 非 Vue 环境（纯 JS 业务）

```ts
import { createLoading } from 'dmk-loading'

const loading = createLoading()   // 手动挂载宿主
loading.open({ text: '加载中' })
loading.close()
```

---

## API 速查

| 方法 | 说明 |
| --- | --- |
| `openLoading(plan?)` | 开启全局，返回 `{ token, key }` |
| `openLoading(target, plan?)` | 开启局部 |
| `closeLoading()` | 关闭全局一个令牌 |
| `closeLoading(token)` | 按令牌精确关闭 |
| `closeLoading(target)` | 关闭指定区域 |
| `closeAllLoading()` | 全部关闭（路由切换自动调用） |
| `updateLoading(patch)` | 更新全局配置 |
| `updateLoading(token, patch)` | 按令牌更新 |
| `setLoadingText(text)` | 简写：只改全局文案 |
| `isLoading(target?)` | 查询指定区域是否在加载 |
| `hasLoading()` | 是否存在任何加载中 |
| `setDefaultOptions(opts)` | 设置全局默认配置 |
| `getDefaultOptions()` | 读取全局默认配置 |
| `findSlotByToken(token)` | 按令牌取内部槽位（高级） |
| `buildCtx(slot)` | 构造 LoadingContext（高级） |
| `withLoading(task, plan?)` | 一行包裹（全局） |
| `withLoadingOn(target, task, plan?)` | 一行包裹（局部） |
| `preset(text \| options?)` | 创建预设方案 |
| `presets.*` | 内置 7 种快捷预设 |
| `useLoading()` | 组合式 API |
| `scopedLoading(options?)` | 组件级，卸载自动关 |
| `useAutoReleaseLoading()` | 追踪多个 token |
| `createLoading()` | 非 Vue 环境手动挂载 |

## 指令 `v-loading`

```vue
<template>
  <!-- 布尔 -->
  <div v-loading="loading"></div>

  <!-- 对象 -->
  <div v-loading="{ text: '加载中', spinner: 'dots' }"></div>

  <!-- 修饰符简写 -->
  <div v-loading.fade.solid.large></div>

  <!-- 受控写法 -->
  <div v-loading="{ visible: loading, text: '查询中' }"></div>
</template>
```

修饰符：`ring dots bars pulse wave orbit` · `fade zoom slideDown slideUp blur` · `solid soft transparent` · `small large` · `top bottom`

> 页面级请求请优先用 `openLoading/closeLoading`，指令仍需一个变量驱动，不符合"零变量"目标。