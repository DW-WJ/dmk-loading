<script setup lang="ts">
import { ref } from 'vue'
import { openLoading, closeLoading, withLoadingOn } from '../../lib/index'

/**
 * 场景 11：局部遮罩的三种定位方式 —— id / ref / 组件实例
 */
const emit = defineEmits<{ (e: 'log', s: string): void }>()

const zoneA = ref<HTMLElement | null>(null)
const zoneB = ref<HTMLElement | null>(null)
const data = ref('')

function mock(ms = 1300, v = '数据') {
  return new Promise<string>((r) => setTimeout(() => r(v), ms))
}

/** ① id 选择器 —— 最简单，写死字符串 */
async function byId() {
  data.value = await withLoadingOn('#s11-id-zone', mock(1300, '通过 id 选择器加载'), {
    text: 'id 选择器',
    spinner: 'dots'
  })
  emit('log', "withLoadingOn('#s11-id-zone', ...) —— 不需要 import ref，最直观")
}

/** ② ref —— 类型安全，元素可能被 v-if 销毁 */
async function byRef() {
  if (!zoneA.value) return
  data.value = await withLoadingOn(zoneA.value, mock(1300, '通过 ref 加载'), {
    text: 'ref 引用',
    spinner: 'bars'
  })
  emit('log', 'withLoadingOn(ref.value, ...) —— TypeScript 类型安全')
}

/** ③ 手动开关 + token，便于中途改配置 */
async function byManual() {
  if (!zoneB.value) return
  const h = openLoading(zoneB.value, { text: '手动开关中...', spinner: 'wave' })
  await mock(700)
  h && emit('log', `局部 handle: key="${h.key}"（局部 slot id）`)
  await mock(600)
  closeLoading(h.token)
}

/** ④ 嵌套局部 —— 局部里再开局部 */
async function byNested() {
  await withLoadingOn('#s11-id-zone', async () => {
    await mock(600)
    // 外层还没关，内层再开一个局部（另一个区域）
    await withLoadingOn(zoneA.value!, mock(1000, '嵌套完成'), { text: '嵌套局部', spinner: 'orbit' })
  }, { text: '外层先开...', spinner: 'dots' })
  data.value = '嵌套加载完成'
  emit('log', '外层局部未关时开内层局部 —— 各自独立计时')
}

/** ⑤ 组件实例作为 target */
async function byInstance() {
  const el = document.querySelector('#s11-id-zone') as HTMLElement
  if (!el) return
  data.value = await withLoadingOn(el, mock(1300, '通过 DOM 实例加载'), {
    text: 'DOM / 组件实例',
    spinner: 'pulse'
  })
  emit('log', 'withLoadingOn(document.querySelector(...)) —— 兼容 DOM 与组件实例')
}
</script>

<template>
  <div class="scn">
    <div class="scn-btns">
      <button @click="byId">① id 选择器</button>
      <button @click="byRef">② ref 引用</button>
      <button @click="byManual">③ 手动 open/close</button>
      <button @click="byNested">④ 嵌套局部</button>
      <button @click="byInstance">⑤ DOM 实例</button>
    </div>
    <pre class="code"><code>// ① id —— 最直观，适合固定区域
await withLoadingOn('#table', api.get(), { text: '加载中' })

// ② ref —— 类型安全，适合动态/条件渲染的区域
const box = ref&lt;HTMLElement | null&gt;(null)
await withLoadingOn(box.value!, api.get(), { text: '加载中' })

// ③ 手动 —— 需要中途改配置时
const h = openLoading(box.value!, { text: '开始' })
updateLoading(h.token, { text: '更新中' })
closeLoading(h.token)

// ④ 嵌套 —— 局部里再开局部，各自独立
await withLoadingOn('#outer', async () =&gt; {
  await withLoadingOn('#inner', api.get())
})

// ⑤ DOM / 组件实例 —— 运行时查找
await withLoadingOn(document.querySelector('#x'), api.get())</code></pre>

    <div class="grid3">
      <div id="s11-id-zone" class="box zone">
        <h4>① id 定位区</h4>
        <div class="empty">id="s11-id-zone"</div>
      </div>
      <div ref="zoneA" class="box zone">
        <h4>② ref 定位区</h4>
        <div class="empty">ref="zoneA"</div>
      </div>
      <div ref="zoneB" class="box zone">
        <h4>③ 手动开关区</h4>
        <div class="empty">ref="zoneB"</div>
      </div>
    </div>
    <div class="box result">结果：{{ data || '（点击上方按钮）' }}</div>
  </div>
</template>