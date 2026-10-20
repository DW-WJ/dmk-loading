<script setup lang="ts">
import { ref } from 'vue'
import { withLoadingOn } from '../../lib/index'

/**
 * 场景 2：表格/列表区域加载
 * 关键：只有表格区域转圈，页面其他部分（筛选栏、按钮）完全可点
 */
const emit = defineEmits<{ (e: 'log', s: string): void }>()

const rows = ref<{ id: string; name: string; amount: number }[]>([])
const page = ref(1)

function mockPage(p: number, ms = 1500): Promise<typeof rows.value> {
  return new Promise((r) =>
    setTimeout(
      () =>
        r(
          Array.from({ length: 4 }, (_, i) => ({
            id: `NO-${p}${i + 1}`,
            name: `客户${(p - 1) * 4 + i + 1}`,
            amount: 1000 + ((p * 4 + i) % 9) * 320
          }))
        ),
      ms
    )
  )
}

/** 局部 + 一行包裹：最常见的表格加载写法 */
async function loadPage(p: number) {
  page.value = p
  rows.value = await withLoadingOn(
    '#s02-table',
    mockPage(p),
    { text: `加载第 ${p} 页...`, spinner: 'dots', transition: 'zoom' }
  )
  emit('log', `第 ${p} 页加载完成`)
}

/** 刷新当前页 */
async function refresh() {
  rows.value = await withLoadingOn('#s02-table', mockPage(page.value, 1200), {
    text: '刷新中...',
    spinner: 'bars'
  })
  emit('log', '当前页已刷新')
}
</script>

<template>
  <div class="scn">
    <div class="scn-btns">
      <button @click="loadPage(1)">第 1 页</button>
      <button @click="loadPage(2)">第 2 页</button>
      <button @click="loadPage(3)">第 3 页</button>
      <button class="primary" @click="refresh">刷新当前页</button>
    </div>
    <pre class="code"><code>// 表格区域加载：只有表格被遮罩
rows.value = await withLoadingOn(
  '#table',          // 目标元素
  api.getPage(p),
  { text: `加载第 ${p} 页...`, spinner: 'dots' }
)</code></pre>
    <div id="s02-table" class="box">
      <table>
        <thead>
          <tr><th>订单号</th><th>客户</th><th>金额</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>{{ r.id }}</td>
            <td>{{ r.name }}</td>
            <td>￥{{ r.amount }}</td>
          </tr>
          <tr v-if="!rows.length"><td colspan="3" class="empty">点击分页按钮加载</td></tr>
        </tbody>
      </table>
    </div>
    <p class="tip">💡 试试：加载表格时点击上方按钮 —— 分页按钮仍可点击，说明遮罩只作用于表格区域</p>
  </div>
</template>