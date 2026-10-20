<script setup lang="ts">
import { ref } from 'vue'
import { preset, withLoading, withLoadingOn } from '../../lib/index'

/**
 * 场景 8：防闪烁策略 —— delay 与 minDuration 的实际效果对比
 * 这是"加载动画该不该出现"的关键决策
 */
const emit = defineEmits<{ (e: 'log', s: string): void }>()

const timing = ref<{ name: string; shown: boolean; total: number }[]>([])

function mock(ms: number) {
  return new Promise((r) => setTimeout(() => r('ok'), ms))
}

/** 测量：某方案下遮罩是否真的出现过 */
async function measure(name: string, plan: any, reqMs: number) {
  const t = Date.now()
  let shown = false

  // 监听真实 DOM 判断遮罩是否渲染过
  const observer = new MutationObserver(() => {
    const el = document.querySelector('body > .vtl-mask')
    if (el && getComputedStyle(el).display !== 'none') shown = true
  })
  observer.observe(document.body, { childList: true, subtree: true, attributes: true })

  await withLoading(mock(reqMs), plan)
  await new Promise((r) => setTimeout(r, 700))
  observer.disconnect()

  const total = Date.now() - t
  timing.value.unshift({ name, shown, total })
  emit('log', `${name}：请求 ${reqMs}ms，遮罩${shown ? '出现' : '未出现'}，总耗时 ${total}ms`)
}

/* ===== 对比组 ===== */

// A. 无策略：请求快也闪一下
const NO_STRATEGY = preset('加载中...').delay(0).minDuration(0)

// B. delay=300：快请求遮罩根本不出现
const DELAY_STRATEGY = preset('加载中...').delay(300).minDuration(0)

// C. delay=300 + minDuration=600：慢请求不闪断
const FULL_STRATEGY = preset('加载中...').delay(300).minDuration(600)

// D. 局部：只有局部闪
const LOCAL_QUICK = preset('局部加载').delay(0).target('#s08-zone')
</script>

<template>
  <div class="scn">
    <div class="scn-btns">
      <span class="grp">快请求 150ms：</span>
      <button @click="measure('A 无策略', NO_STRATEGY, 150)">无策略</button>
      <button @click="measure('B delay=300', DELAY_STRATEGY, 150)">delay=300</button>
      <button @click="measure('C delay+minDur', FULL_STRATEGY, 150)">delay+minDur</button>
    </div>
    <div class="scn-btns">
      <span class="grp">慢请求 2500ms：</span>
      <button @click="measure('A 无策略', NO_STRATEGY, 2500)">无策略</button>
      <button @click="measure('B delay=300', DELAY_STRATEGY, 2500)">delay=300</button>
      <button @click="measure('C delay+minDur', FULL_STRATEGY, 2500)">delay+minDur</button>
    </div>
    <div class="scn-btns">
      <span class="grp">局部：</span>
      <button @click="withLoadingOn('#s08-zone', mock(1200), LOCAL_QUICK).then(() => emit('log', '局部加载完成'))">
        局部 1.2s
      </button>
    </div>
    <pre class="code"><code>// ① 不设策略：120ms 的请求也会闪一下遮罩（用户觉得"卡了一下"）
await withLoading(api.get(), preset('加载中').delay(0).minDuration(0))

// ② delay=300：300ms 内返回的请求，遮罩完全不出现（干净）
await withLoading(api.get(), preset('加载中').delay(300))

// ③ minDuration=600：慢请求至少显示 600ms，不会"闪断"
await withLoading(api.get(), preset('加载中').delay(300).minDuration(600))

// 推荐组合：delay=150~300 + minDuration=300~600</code></pre>
    <div v-if="timing.length" class="box">
      <table class="cmp">
        <thead><tr><th>方案</th><th>遮罩是否出现</th><th>总耗时</th></tr></thead>
        <tbody>
          <tr v-for="t in timing" :key="t.name + t.total">
            <td>{{ t.name }}</td>
            <td><span :class="t.shown ? 'tag yes' : 'tag no'">{{ t.shown ? '出现' : '未出现' }}</span></td>
            <td>{{ t.total }}ms</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div id="s08-zone" class="box zone-inline">局部加载测试区（只遮这里）</div>
  </div>
</template>