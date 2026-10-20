<script setup lang="ts">
import { ref } from 'vue'
import { withLoading, preset, presets } from '../../lib/index'

/**
 * 场景 3：预设方案 —— 把重复的加载样式沉淀成团队规范
 * 改一处，全站生效
 */
const emit = defineEmits<{ (e: 'log', s: string): void }>()

const result = ref('')

/* ---------- 自定义预设：团队规范 ---------- */
const QUERY = preset('查询中...').spinner('dots').delay(100).minDuration(300)
const SUBMIT = preset('提交中...').spinner('bars').color('#10b981').delay(0)
const DELETE = preset('删除中...').spinner('pulse').color('#ef4444').delay(0)
const DETAIL = preset('加载详情...').spinner('orbit').maskStyle('soft')

/* ---------- 派生：局部版 ---------- */
const QUERY_LOCAL = QUERY.target('#s03-box')

function mock(ms = 1500) {
  return new Promise<string>((r) => setTimeout(() => r('done'), ms))
}

async function run(plan: any, label: string) {
  const t = Date.now()
  result.value = await withLoading(mock(), plan)
  emit('log', `${label} 完成（${Date.now() - t}ms）`)
}
</script>

<template>
  <div class="scn">
    <div class="scn-btns">
      <button @click="run(QUERY, 'QUERY')">查询预设</button>
      <button @click="run(SUBMIT, 'SUBMIT')">提交预设（绿）</button>
      <button @click="run(DELETE, 'DELETE')">删除预设（红）</button>
      <button @click="run(presets.heavy('耗时操作中...'), 'heavy')">内置 heavy</button>
      <button @click="run(presets.submit('保存中'), 'presets.submit')">内置 submit</button>
      <button @click="run(QUERY_LOCAL, 'QUERY 局部版')">查询预设 · 局部版</button>
      <button @click="run(DETAIL, 'DETAIL')">详情预设（orbit）</button>
    </div>
    <pre class="code"><code>// ① 定义团队预设
const QUERY = preset('查询中...').spinner('dots').delay(100)
const SUBMIT = preset('提交中...').spinner('bars').color('#10b981')

// ② 直接用
await withLoading(api.getList(), QUERY)
await withLoading(api.save(form), SUBMIT)

// ③ 派生局部版（保留原配置，只加 target）
await withLoading(api.getList(), QUERY.target('#table'))

// ④ 挂全局预设，随时改
setDefaultOptions({ spinner: 'dots', delay: 100 })
await withLoading(api.getList())   // 不传参也走这套规范</code></pre>
    <div id="s03-box" class="box">
      <div v-if="!result" class="empty">点击上方按钮（最后一个只在下面这个框内转圈）</div>
      <div v-else class="ok">✅ {{ result }}</div>
    </div>
  </div>
</template>