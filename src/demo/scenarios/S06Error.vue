<script setup lang="ts">
import { ref } from 'vue'
import { withLoading } from '../../lib/index'

/**
 * 场景 6：异常处理 —— 出错也要关遮罩，还要给用户看错误态
 */
const emit = defineEmits<{ (e: 'log', s: string): void }>()

const status = ref<{ type: 'idle' | 'ok' | 'error'; msg: string }>({ type: 'idle', msg: '' })
const hookTrace = ref<string[]>([])

function mockOk(ms = 1200) {
  return new Promise((r) => setTimeout(() => r({ data: ['A', 'B', 'C'] }), ms))
}
function mockFail(ms = 1200) {
  return new Promise((_, rej) => setTimeout(() => rej(new Error('服务器开小差了(500)')), ms))
}

/** 成功路径：钩子全链路 */
async function loadSuccess() {
  status.value = { type: 'idle', msg: '' }
  hookTrace.value = []
  const t = Date.now()
  try {
    const res: any = await withLoading(mockOk(), {
      text: '加载数据...',
      spinner: 'ring',
      onShow: () => hookTrace.value.push(`onShow  遮罩显示 (${Date.now() - t}ms)`),
      onSuccess: (r: any) => hookTrace.value.push(`onSuccess 拿到 ${r.data.length} 条 (${Date.now() - t}ms)`),
      onFinally: () => hookTrace.value.push(`onFinally 收尾 (${Date.now() - t}ms)`)
    })
    status.value = { type: 'ok', msg: `成功：${res.data.join('、')}` }
    emit('log', '成功路径：钩子依次触发')
  } catch (e: any) {
    status.value = { type: 'error', msg: e.message }
  }
}

/**
 * 失败路径：异常时 onError + onFinally 仍会触发，遮罩正常关闭
 * try/catch 里更新错误态 UI
 */
async function loadError() {
  status.value = { type: 'idle', msg: '' }
  hookTrace.value = []
  const t = Date.now()
  try {
    await withLoading(mockFail(), {
      text: '加载数据...',
      spinner: 'dots',
      onShow: () => hookTrace.value.push(`onShow  遮罩显示 (${Date.now() - t}ms)`),
      onError: (e: any) => hookTrace.value.push(`onError  ${e.message} (${Date.now() - t}ms)`),
      onFinally: () => hookTrace.value.push(`onFinally 收尾 (${Date.now() - t}ms)`)
    })
  } catch (e: any) {
    // 错误态由业务自己处理，遮罩库只负责"关"
    status.value = { type: 'error', msg: e.message }
    emit('log', '失败路径：遮罩正常关闭，业务显示错误态')
  }
}

/** 带重试的操作 */
async function loadWithRetry(max = 2) {
  status.value = { type: 'idle', msg: '' }
  let attempt = 0
  while (attempt < max) {
    attempt++
    try {
      const r: any = await withLoading(mockOk(1000), {
        text: `第 ${attempt} 次尝试...`,
        spinner: 'bars',
        delay: 0
      })
      status.value = { type: 'ok', msg: `第 ${attempt} 次成功：${r.data.length} 条` }
      return
    } catch {
      emit('log', `第 ${attempt} 次失败，准备重试`)
    }
  }
  status.value = { type: 'error', msg: `已重试 ${max} 次仍失败` }
}
</script>

<template>
  <div class="scn">
    <div class="scn-btns">
      <button class="primary" @click="loadSuccess">成功路径（钩子链）</button>
      <button @click="loadError">失败路径（异常也关）</button>
      <button @click="loadWithRetry()">带重试</button>
    </div>
    <pre class="code"><code>try {
  const res = await withLoading(api.getData(), {
    text: '加载数据...',
    onShow:     () => console.log('遮罩显示'),
    onSuccess:  (r) => console.log('成功', r),
    onError:    (e) => console.error('失败', e),   // 异常时也会触发
    onFinally:  ()  => console.log('收尾')          // 一定触发
  })
  setState({ type: 'ok', data: res })
} catch (e) {
  setState({ type: 'error', msg: e.message })   // 遮罩库已关闭，这里只管 UI
}</code></pre>
    <div v-if="hookTrace.length" class="box trace-box">
      <div v-for="(t, i) in hookTrace" :key="i" class="row trace">{{ t }}</div>
    </div>
    <div v-if="status.type === 'ok'" class="box ok-box">✅ {{ status.msg }}</div>
    <div v-if="status.type === 'error'" class="box err-box">❌ {{ status.msg }}</div>
  </div>
</template>