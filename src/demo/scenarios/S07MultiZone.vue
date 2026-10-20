<script setup lang="ts">
import { ref } from 'vue'
import { withLoading, withLoadingOn } from '../../lib/index'

/**
 * 场景 7：一页多区域 —— 每个模块独立 loading，互不干扰
 * 这是仪表盘/详情页的典型布局
 */
const emit = defineEmits<{ (e: 'log', s: string): void }>()

const kpi = ref<string[]>([])
const chart = ref<string[]>([])
const list = ref<string[]>([])

function mock(data: string[], ms: number) {
  return new Promise<string[]>((r) => setTimeout(() => r(data), ms))
}

/** 三个区域同时加载，各自独立 */
async function loadAll() {
  const t = Date.now()
  await Promise.all([
    withLoadingOn('#s07-kpi', mock(['GMV: ￥128,450', '订单: 1,284', '转化: 3.2%'], 1200), { text: '加载指标', spinner: 'dots' }),
    withLoadingOn('#s07-chart', mock(['▁▃▅▂▇▃▁▅▇▂▃', '▂▅▇▃▁▃▅▂▇▃▅'], 2000), { text: '加载图表', spinner: 'wave' }),
    withLoadingOn('#s07-list', mock(['消息 1', '消息 2', '消息 3'], 700), { text: '加载消息', spinner: 'bars' })
  ])
  emit('log', `三区加载完成（${Date.now() - t}ms，等最慢的 2000ms）`)
}

/** 单独刷新某一区 */
async function loadOne(zone: 'kpi' | 'chart' | 'list') {
  const map = {
    kpi: { id: '#s07-kpi', data: ['GMV: ￥128,450', '订单: 1,284', '转化: 3.2%'], text: '刷新指标' },
    chart: { id: '#s07-chart', data: ['▇▅▃▁▇▃▅▇▁▅▃', '▁▇▅▃▇▁▅▃▇▅▁'], text: '刷新图表' },
    list: { id: '#s07-list', data: ['消息 1', '消息 2', '消息 3'], text: '刷新消息' }
  }
  const m = map[zone]
  await withLoadingOn(m.id, mock(m.data, 1200), { text: m.text, spinner: 'dots' })
  emit('log', `${zone} 区已刷新（其他区不受影响）`)
}

/** 全局：整页统一 loading */
async function loadGlobalAll() {
  const t = Date.now()
  await withLoading(
    Promise.all([mock(['GMV'], 1000), mock(['chart'], 1800), mock(['msg'], 900)]),
    { text: '整页加载中...', maskStyle: 'solid' }
  )
  emit('log', `整页加载完成（${Date.now() - t}ms）`)
}

</script>

<template>
  <div class="scn">
    <div class="scn-btns">
      <button class="primary" @click="loadAll">三区并行加载</button>
      <button @click="loadGlobalAll">整页全局加载</button>
      <button @click="loadOne('kpi')">只刷 KPI</button>
      <button @click="loadOne('chart')">只刷图表</button>
      <button @click="loadOne('list')">只刷消息</button>
    </div>
    <pre class="code"><code>// 三区并行：各自独立，互不阻塞
await Promise.all([
  withLoadingOn('#kpi',   api.getKpi(),   { spinner: 'dots' }),
  withLoadingOn('#chart', api.getChart(), { spinner: 'wave' }),
  withLoadingOn('#list',  api.getList(),  { spinner: 'bars' })
])

// 用户在 A 区加载时，B 区按钮依然可点、状态独立</code></pre>
    <div class="grid3">
      <div id="s07-kpi" class="box zone">
        <h4>核心指标</h4>
        <div v-if="!kpi.length" class="empty">未加载</div>
        <div v-for="k in kpi" :key="k" class="row">{{ k }}</div>
      </div>
      <div id="s07-chart" class="box zone">
        <h4>趋势图</h4>
        <div v-if="!chart.length" class="empty">未加载</div>
        <div v-for="c in chart" :key="c" class="chart">{{ c }}</div>
      </div>
      <div id="s07-list" class="box zone">
        <h4>最新消息</h4>
        <div v-if="!list.length" class="empty">未加载</div>
        <div v-for="l in list" :key="l" class="row">· {{ l }}</div>
      </div>
    </div>
    <p class="tip">💡 试试：点「三区并行加载」，观察三个框的指示器不同、加载时长不同（700/1200/2000ms）</p>
  </div>
</template>