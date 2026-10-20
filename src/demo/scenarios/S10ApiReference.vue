<script setup lang="ts">
import { ref } from 'vue'
import {
  openLoading,
  closeLoading,
  withLoadingOn,
  updateLoading,
  setLoadingText,
  setDefaultOptions,
  getDefaultOptions,
  isLoading,
  hasLoading,
  closeAllLoading,
  buildCtx,
  findSlotByToken,
  useLoading
} from '../../lib/index'

/**
 * 场景 10：API 全景 —— 所有导出方法的活体文档
 * 每个按钮演示一个 API，左侧实时显示当前状态
 */
const emit = defineEmits<{ (e: 'log', s: string): void }>()

const status = ref<Record<string, any>>({})

function refresh() {
  status.value = {
    hasLoading: hasLoading(),
    globalLoading: isLoading(),
    defaults: getDefaultOptions().spinner + ' / delay=' + getDefaultOptions().delay
  }
}

function mock(ms = 1000) {
  return new Promise((r) => setTimeout(() => r('ok'), ms))
}

/* --- 演示各 API --- */

async function apiOpenClose() {
  const h1 = openLoading({ text: 'openLoading 返回值里有 token', spinner: 'ring' })
  status.value.token = h1.token
  status.value.key = h1.key
  await mock(1200)
  closeLoading(h1.token)
  emit('log', `openLoading 返回 { token: "${h1.token.slice(0, 18)}...", key: "${h1.key}" }`)
  refresh()
}

async function apiSetText() {
  const h = openLoading({ text: '初始文案', spinner: 'dots' })
  await new Promise((r) => setTimeout(r, 400))
  setLoadingText('setLoadingText 改的文案')
  await new Promise((r) => setTimeout(r, 400))
  updateLoading({ text: 'updateLoading 改的文案' })
  await new Promise((r) => setTimeout(r, 400))
  updateLoading(h.token, { text: 'updateLoading(token) 改的文案' })
  await new Promise((r) => setTimeout(r, 400))
  closeLoading(h.token)
  emit('log', 'setLoadingText / updateLoading 三种写法演示完毕')
  refresh()
}

async function apiUpdateFunc() {
  const h = openLoading({ text: '开始', spinner: 'wave' })
  await new Promise((r) => setTimeout(r, 300))
  // 函数式更新
  updateLoading((ctx) => ({
    text: `函数式更新：scope=${ctx.scope}，el=${ctx.target || 'body'}`,
    spinner: 'orbit'
  }))
  await new Promise((r) => setTimeout(r, 900))
  closeLoading(h.token)
  emit('log', 'updateLoading 传函数：可读 ctx.scope / ctx.target / ctx.payload')
  refresh()
}

function apiDefaults() {
  const before = getDefaultOptions()
  setDefaultOptions({ spinner: 'pulse', color: '#f59e0b', delay: 200 })
  const after = getDefaultOptions()
  status.value.before = `${before.spinner} / ${before.color}`
  status.value.after = `${after.spinner} / ${after.color}`
  emit('log', 'setDefaultOptions：改全局默认，之后不传参的调用也用这套')
  refresh()
}

async function apiQuery() {
  const h = openLoading({ text: '查询中', delay: 0 })
  status.value['isLoading()'] = isLoading()
  status.value['hasLoading()'] = hasLoading()
  const slot = findSlotByToken(h.token)
  if (slot) {
    const ctx = buildCtx(slot)
    status.value['ctx.scope'] = ctx.scope
    status.value['ctx.options.spinner'] = ctx.options.spinner
    status.value['ctx.token'] = ctx.token.slice(0, 18) + '...'
  }
  await new Promise((r) => setTimeout(r, 900))
  closeLoading(h.token)
  emit('log', 'isLoading / hasLoading / buildCtx / findSlotByToken 状态查询')
  refresh()
}

async function apiUseLoading() {
  const { open, close, withLoading: wl } = useLoading()
  const h = open({ text: '来自 useLoading() 的 API', spinner: 'bars' })
  await new Promise((r) => setTimeout(r, 800))
  close(h.token)
  await wl(mock(800), { text: 'useLoading().withLoading', spinner: 'dots' })
  emit('log', 'useLoading()：setup 内拿到的组合式 API')
  refresh()
}

function apiCloseAll() {
  openLoading({ text: 'A', delay: 0 })
  openLoading({ text: 'B', delay: 0 })
  withLoadingOn('#s10-zone', mock(5000), { text: '局部 C', delay: 0 })
  setTimeout(() => {
    closeAllLoading()
    emit('log', 'closeAllLoading()：一次性关掉全部（路由切换时库会自动调）')
    refresh()
  }, 600)
}

function apiReset() {
  setDefaultOptions({ spinner: 'ring', color: '#3b82f6', delay: 120 })
  status.value = {}
  refresh()
  emit('log', '已重置默认配置')
}
</script>

<template>
  <div class="scn">
    <div class="scn-btns">
      <button @click="apiOpenClose">openLoading / closeLoading</button>
      <button @click="apiSetText">setLoadingText / updateLoading</button>
      <button @click="apiUpdateFunc">updateLoading(函数)</button>
      <button @click="apiDefaults">setDefaultOptions / getDefaultOptions</button>
      <button @click="apiQuery">isLoading / buildCtx</button>
      <button @click="apiUseLoading">useLoading()</button>
      <button @click="apiCloseAll">closeAllLoading()</button>
      <button @click="apiReset">重置</button>
    </div>
    <pre class="code"><code>// 全部导出
openLoading(plan?) / openLoading(target, plan?)   // 开启，返回 { token, key }
closeLoading(token?) / closeLoading(target)       // 关闭
closeAllLoading()                                  // 全部关闭（路由切换自动触发）
updateLoading(patch) / updateLoading(token, patch) // 运行中更新（支持函数）
setLoadingText(text)                               // 简写：只改全局文案
isLoading(target?) / hasLoading()                  // 状态查询
setDefaultOptions(opts) / getDefaultOptions()      // 全局默认配置
findSlotByToken(token) / buildCtx(slot)            // 内部状态读取
preset() / presets.*                                // 预设方案
withLoading / withLoadingOn                         // 一行包裹
scopedLoading() / useLoading() / useAutoReleaseLoading()</code></pre>

    <div v-if="Object.keys(status).length" class="box">
      <h4>当前状态</h4>
      <div v-for="(v, k) in status" :key="k" class="row status">
        <code>{{ k }}</code> → <b>{{ v }}</b>
      </div>
    </div>

    <div id="s10-zone" class="box zone-inline">closeAllLoading 会同时关掉这里的局部遮罩</div>
  </div>
</template>