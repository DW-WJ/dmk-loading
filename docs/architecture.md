# 架构设计说明

## 一、为什么这样设计

目标：**页面零 loading 变量 + 零模板绑定**。

市面方案的问题：
- 组件式（每个页面自己引入遮罩组件）→ 重复代码、易漏
- 指令式（v-loading）→ 仍需一个变量驱动，不达标
- 手动 teleport → 模板啰嗦

本方案：**全局方法调用 + 单一宿主 + 自动 Teleport**。

## 二、三层架构

```
┌─────────────────────────────────────────────┐
│  第 1 层 · API 层（业务只接触这层）           │
│  openLoading / closeLoading / withLoading     │
│  v-loading 指令 / $loading 全局属性            │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  第 2 层 · 状态层  core/manager.ts            │
│  reactive store：global slot + locals 表       │
│  token 计数 / delay / minDuration / 定时器     │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  第 3 层 · 渲染层  components/                │
│  LoadingHost（挂载一次）→ LoadingMask（N 个） │
│  全局遮罩 Teleport→body；局部 Teleport→slot.el│
└─────────────────────────────────────────────┘
```

## 三、关键设计决策

### 1. 为什么用「token 计数」而不是 boolean

```ts
// ✗ boolean：并发时先返回的请求会把后一个的遮罩关掉
loading.value = true; await a(); loading.value = false
await b(); // 这期间遮罩已被关掉

// ✓ token：每个 open 一个令牌，全部关闭才隐藏
const { token } = openLoading()
await a()
closeLoading(token)
```

### 2. 为什么局部遮罩用 Teleport 而不是 Vue 渲染到业务模板

业务页面写 `<LoadingOverlay target="#box" />` 就又回到了"每页都要改模板"。
Teleport 让 `LoadingHost` 一个组件渲染全部遮罩，局部遮罩挂到目标元素内部，
**业务模板真正零改动**。

### 3. 为什么宿主独立 createApp

如果宿主写在业务 layout 里，业务页面 `v-if` 切走或路由销毁时遮罩会跟着消失。
独立 `createApp` 挂到 body，与业务生命周期解耦，路由 `afterEach` 统一 `closeAllLoading()` 兜底。

### 4. 定位自动化

局部遮罩 `position:absolute` 要求祖先有定位上下文。`LoadingMask` 挂载时检测
`getComputedStyle(el).position === 'static'` 则自动设为 `relative`，卸载时还原。
表格、卡片直接可用，无需业务侧写样式。

### 5. 防闪烁的两道闸

| 参数 | 作用 | 场景 |
| --- | --- | --- |
| `delay` | 延迟显示 | 缓存命中、100ms 快请求 → 遮罩根本不出现 |
| `minDuration` | 最短显示 | 强制"我加载了"的感知，避免一闪而过 |

## 四、状态机

```
openLoading()
   └─ 生成 token → push 到 global.tokens
      └─ 长度 1？ → scheduleVisible(true) → delay 后 visible=true

closeLoading()
   └─ releaseOne('global') → 取出最后一个 token → releaseToken
      └─ tokens.length === 0？ → scheduleVisible(false)
         ├─ t.show 还挂着？ → 直接取消（从未显示过）
         └─ minDuration 未满？ → 延迟 (minDuration - elapsed) 后关闭
            否则 → visible=false
```

## 五、失败兜底策略

| 情况 | 处理 |
| --- | --- |
| 选择器找不到元素 | `console.warn` + 降级为全局遮罩（宁可视不可卡死） |
| 局部槽位 token 清空 | 400ms 后自动删除槽位，防内存泄漏 |
| 路由切换 | `afterEach` 触发 `closeAllLoading()` |
| 组件卸载 | 自动还原宿主的 position / overflow |
| 请求抛异常 | `withLoading` 用 try/finally 保证关闭 |

## 六、可扩展点

- **自定义指示器**：在 `LoadingMask.vue` 的 spinner 分支加 `v-else-if`，配一段 CSS keyframes。
- **主题定制**：`setDefaultOptions({ color, textColor, maskColor })`，或直接覆盖 `.vtl-*` 类。
- **进度条模式**：给 slot 加 `progress` 字段，进度条组件订阅即可（骨架已预留 slot.options 扩展位）。
- **SSR**：`install` 内已判 `typeof document`，SSR 环境不挂宿主；客户端 hydration 后可调 `mountLoadingHost()`。

## 七、验证

```bash
npm run build                        # vue-tsc 类型检查 + vite 打包
node scripts/verify-core.mjs         # 13 组 / 29 项核心状态机断言
```