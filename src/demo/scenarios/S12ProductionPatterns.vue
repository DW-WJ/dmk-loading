<script setup lang="ts">
import { ref } from 'vue'
import { openLoading, closeLoading, updateLoading, setDefaultOptions, getDefaultOptions, withLoading } from '../../lib/index'

/**
 * 场景 12：实战模式 —— 8 个生产级模式
 */
const emit = defineEmits<{ (e: 'log', s: string): void }>()

const out = ref<string[]>([])
const log = (s: string) => {
  out.value.unshift(s)
  emit('log', s)
}
function clear() {
  out.value = []
}

function mock(ms = 1200) {
  return new Promise((r) => setTimeout(() => r('ok'), ms))
}

/** 模式 1：axios 拦截器全局接管 —— 一处接入，全站生效 */
async function p1Axios() {
  // 伪代码演示
  const code = `// main.ts —— 一处接入，全站所有请求自动带 loading
axios.interceptors.request.use((config) => {
  openLoading({ text: config.method === 'get' ? '查询中...' : '提交中...' })
  return config
})
axios.interceptors.response.use(
  (res) => { closeLoading(); return res },
  (err) => { closeLoading(); return Promise.reject(err) }
)

// 业务代码从此不需要任何 loading 逻辑
const res = await axios.get('/api/users')   // 遮罩自动开关联动`
  log('模式1：axios 拦截器全局接管 —— 一处接入全站生效')
  await mock(1400)
  out.value.unshift(code)
}

/** 模式 2：路由守卫自动关闭 —— 防止切换页面遮罩残留 */
async function p2Router() {
  const code = `// 插件已内置，无需手写
// install 时自动检测 app.$router 并注册
router.afterEach(() => closeAllLoading())

// 效果：用户快速切页时，遮罩不会"卡"在新页面上`
  log('模式2：路由守卫自动 closeAllLoading —— 插件已内置')
  await mock(1000)
  out.value.unshift(code)
}

/** 模式 3：按钮防重复提交 */
async function p3Debounce() {
  let inflight = false
  const { token } = openLoading({ text: '提交中，禁止重复点击...', delay: 0, lockScroll: true })
  inflight = true
  await mock(1300)
  closeLoading(token)
  inflight = false
  log(`模式3：防重复提交 —— inflight=${inflight}，配合 delay:0 让用户立刻看到反馈`)
}

/** 模式 4：骨架屏风格局部 loading（transparent 遮罩） */
async function p4Skeleton() {
  await withLoading(mock(1400), {
    text: '透明遮罩 + 骨架效果',
    maskStyle: 'transparent',
    spinner: 'pulse',
    color: '#94a3b8',
    transition: 'fade'
  })
  log('模式4：maskStyle: "transparent" —— 只显示指示器，不挡内容（适合骨架屏）')
}

/** 模式 5：分步骤任务 —— 多阶段文案切换 */
async function p5Steps() {
  const { token } = openLoading({ text: '步骤 1/3：校验参数', spinner: 'ring' })
  await mock(700)
  updateLoading(token, { text: '步骤 2/3：上传数据', spinner: 'bars' })
  await mock(800)
  updateLoading(token, { text: '步骤 3/3：生成报告', spinner: 'orbit' })
  await mock(700)
  updateLoading(token, { text: '全部完成！', spinner: 'ring', color: '#10b981' })
  await mock(400)
  closeLoading(token)
  log('模式5：分步骤任务 —— updateLoading 逐阶段切换文案与指示器')
}

/** 模式 6：静默加载（无文案无遮罩，仅禁用交互） */
async function p6Silent() {
  const { token } = openLoading({
    text: '',           // 空文案
    maskStyle: 'transparent',
    spinner: 'none' as any,
    delay: 0
  })
  await mock(1100)
  closeLoading(token)
  log('模式6：静默加载 —— text:"" + transparent，用于"防重复点击"但不给视觉干扰')
}

/** 模式 7：团队规范全局配置 */
async function p7Global() {
  const before = getDefaultOptions()
  setDefaultOptions({
    text: '处理中...',
    spinner: 'dots',
    color: '#3b82f6',
    delay: 200,
    minDuration: 400
  })
  const after = getDefaultOptions()
  await withLoading(mock(1200))
  log(`模式7：全局规范 —— spinner ${before.spinner}→${after.spinner}, delay ${before.delay}→${after.delay}，之后所有调用零参数`)
  setDefaultOptions({ spinner: 'ring', color: '#3b82f6', delay: 120, minDuration: 0, text: '加载中...' })
}

/** 模式 8：局部 + 全局协作 —— 全局兜底，局部细化 */
async function p8Mixed() {
  log('模式8：局部+全局协作 —— 全局做兜底防卡死，局部做精细化反馈')
  await mock(300)
  await withLoading(mock(1600), {
    text: '主流程加载中（全局）',
    spinner: 'ring',
    payload: { stage: 'main' }
  })
}
</script>

<template>
  <div class="scn">
    <div class="scn-btns">
      <button @click="p1Axios">1. axios 拦截器</button>
      <button @click="p2Router">2. 路由守卫</button>
      <button @click="p3Debounce">3. 防重复提交</button>
      <button @click="p4Skeleton">4. 骨架屏风格</button>
      <button @click="p5Steps">5. 分步骤</button>
      <button @click="p6Silent">6. 静默加载</button>
      <button @click="p7Global">7. 团队规范</button>
      <button @click="p8Mixed">8. 局部+全局</button>
      <button @click="clear">清空</button>
    </div>
    <div class="box log-box">
      <div v-if="!out.length" class="empty">点击上方按钮，逐个体验生产级模式</div>
      <div v-for="(o, i) in out" :key="i" class="log-item">{{ o }}</div>
    </div>
  </div>
</template>

<style scoped>
.log-box { max-height: 380px; overflow-y: auto; }
.log-item {
  padding: 8px 12px;
  margin-bottom: 6px;
  background: #f8fafc;
  border-left: 3px solid #3b82f6;
  border-radius: 0 6px 6px 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: #334155;
  white-space: pre-wrap;
  font-family: ui-monospace, monospace;
}
</style>