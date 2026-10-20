<script setup lang="ts">
import { ref } from 'vue'
import { openLoading, closeLoading, withLoading } from '../../lib/index'

/**
 * 场景 5：并发控制 —— 最容易出 bug 的地方
 * 三个请求同时发出，必须等全部完成才能关遮罩
 */
const emit = defineEmits<{ (e: 'log', s: string): void }>()

const result = ref<string[]>([])

function mock(name: string, ms: number): Promise<string> {
  return new Promise((r) => setTimeout(() => r(`${name}(${ms}ms)`), ms))
}

/**
 * 【正确】withLoading + Promise.all —— 库自动等所有请求结束
 * 这是最推荐的并发写法
 */
async function parallelOk() {
  result.value = await withLoading(
    Promise.all([mock('用户', 1200), mock('权限', 2200), mock('配置', 800)]),
    { text: '并行加载 3 个模块...' }
  )
  emit('log', '全部完成（等最慢的 2200ms）')
}

/**
 * 【常见错误】forEach + async —— 每个请求各自开关，会提前关闭
 * 这里用 delay=1200 强制暴露问题：第一个请求 800ms 结束就把遮罩关了
 */
const wrongLog = ref<string[]>([])
async function parallelWrong() {
  wrongLog.value = []
  wrongLog.value.push('开始 3 个并发请求...')

  const tasks = [mock('A', 800), mock('B', 2400), mock('C', 1200)]
  tasks.forEach((t, i) => {
    void withLoading(t, { text: `错误写法：遮罩被第 ${i + 1} 个请求抢先关闭`, delay: 1500 })
      .then(() => wrongLog.value.push(`请求${i + 1}完成`))
  })
  emit('log', '看日志：遮罩在第 1 个请求结束时就没了，后面还在转但没遮罩')
}

/**
 * 【正确·手动】手动计数 —— 需要精确控制时用
 */
async function parallelManual() {
  const { token } = openLoading({ text: '手动计数：3 个请求', delay: 0 })
  let done = 0
  const total = 3

  await Promise.all(
    [mock('X', 1000), mock('Y', 1800), mock('Z', 600)].map((t) =>
      t.then((v) => {
        done++
        emit('log', `手动计数：${done}/${total}`)
        return v
      })
    )
  )
  closeLoading(token)
  emit('log', '手动计数：全部完成')
}

/** 重置 */
function reset() {
  result.value = []
  wrongLog.value = []
}
</script>

<template>
  <div class="scn">
    <div class="scn-btns">
      <button class="primary" @click="parallelOk">✅ 正确：Promise.all + withLoading</button>
      <button @click="parallelWrong">❌ 错误：forEach 各自开关</button>
      <button @click="parallelManual">✅ 手动计数</button>
      <button @click="reset">重置</button>
    </div>
    <pre class="code"><code>// ✅ 正确：Promise.all 包在 withLoading 里
data.value = await withLoading(
  Promise.all([api.getUser(), api.getPerm(), api.getConfig()]),
  { text: '加载中...' }
)
// 库自动等所有 Promise 完成才关遮罩

// ❌ 错误：forEach + async —— 每个请求各自开关
[api.a(), api.b(), api.c()].forEach(async p => {
  openLoading(); await p; closeLoading()   // 先完成的会抢先关闭！
})

// ✅ 手动：一次开关，自己计数
const { token } = openLoading()
await Promise.all([...])
closeLoading(token)</code></pre>
    <div v-if="result.length" class="box ok-box">
      <div v-for="r in result" :key="r" class="row">✅ {{ r }}</div>
    </div>
    <div v-if="wrongLog.length" class="box warn-box">
      <div v-for="(l, i) in wrongLog" :key="i" class="row">{{ l }}</div>
    </div>
  </div>
</template>