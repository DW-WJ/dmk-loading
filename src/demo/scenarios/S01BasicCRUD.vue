<script setup lang="ts">
import { ref } from 'vue'
import { openLoading, closeLoading, withLoading } from '../../lib/index'

/**
 * 场景 1：CRUD 页面最标准写法
 * 页面里没有任何 loading 变量，只在请求前后"喊一声"
 */
const emit = defineEmits<{ (e: 'log', s: string): void }>()

const users = ref<string[]>([])

function mockApi(ms = 1400, data?: string[]): Promise<string[]> {
  return new Promise((r) => setTimeout(() => r(data ?? ['张三', '李四', '王五', '赵六']), ms))
}

/** 【写法一】手动开关 —— 最直白，控制力最强 */
async function loadManual() {
  openLoading({ text: '加载用户列表...', spinner: 'ring' })
  try {
    users.value = await mockApi()
    emit('log', '手动开关：请求完成')
  } finally {
    closeLoading()
  }
}

/** 【写法二】一行包裹 —— 最简洁，推荐 */
async function loadWrapped() {
  users.value = await withLoading(mockApi(), { text: '加载用户列表...', spinner: 'dots' })
  emit('log', 'withLoading：自动开关联动')
}

/** 【写法三】函数式 —— 文案按数据量动态生成 */
async function loadFunctional() {
  users.value = await withLoading(mockApi(1600), {
    payload: { module: '用户管理', count: 4 },
    text: (ctx) => `正在加载${ctx.payload?.module}（${ctx.payload?.count} 条）...`,
    spinner: 'wave',
    color: '#0ea5e9'
  })
  emit('log', '函数式文案：按 payload 生成')
}
</script>

<template>
  <div class="scn">
    <div class="scn-btns">
      <button @click="loadManual">写法一 · 手动 open/close</button>
      <button @click="loadWrapped">写法二 · withLoading 一行</button>
      <button @click="loadFunctional">写法三 · 函数式文案</button>
    </div>
    <pre class="code"><code>// 写法二（推荐）
users.value = await withLoading(api.getUsers(), {
  text: '加载用户列表...'
})

// 写法三（文案随数据变化）
users.value = await withLoading(api.getUsers(), {
  payload: { module: '用户管理' },
  text: (ctx) => `正在加载${ctx.payload?.module}...`
})</code></pre>
    <div class="box list-box">
      <div v-if="!users.length" class="empty">点击上方按钮加载数据</div>
      <div v-for="u in users" :key="u" class="row">· {{ u }}</div>
    </div>
  </div>
</template>