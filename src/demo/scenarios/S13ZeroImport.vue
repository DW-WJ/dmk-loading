<script setup lang="ts">
/**
 * 场景 13：零 import 全局调用
 *
 * ★ 本文件顶部没有任何一行 import ★
 *   - 没有 `import { openLoading } from '.../dmk-loading'`
 *   - 只有 vue 自己的 ref（那是框架 API，不是我们库的）
 *   - openLoading / closeLoading / withLoading 直接写，构建期由
 *     TransitionLoadingAutoImport 插件自动补 import
 *
 * 这就是「全量引入」的最终形态：
 *   新写一个页面 → 打开文件 → 写 openLoading() → 完事
 *   不需要先想"我要不要引这个函数"、不需要查文档抄 import 路径
 */
import { ref } from 'vue'

const rows = ref<string[]>([])
const scopedText = ref('')

function mock(ms = 1600): Promise<string[]> {
  return new Promise((r) =>
    setTimeout(
      () => r(['NO-2026-001 · 张三 · ￥1,280', 'NO-2026-002 · 李四 · ￥860', 'NO-2026-003 · 王五 · ￥2,150']),
      ms
    )
  )
}

/** ① 全局：手动开/关 —— 零 import */
async function loadGlobal() {
  openLoading({ text: '正在加载订单...', spinner: 'dots' })
  try {
    rows.value = await mock()
  } finally {
    closeLoading()
  }
}

/** ② 全局：一行包裹 —— 零 import */
async function loadAuto() {
  const r = await withLoading(mock(), { text: '自动开关联动', spinner: 'wave' })
  rows.value = r
}

/** ③ 局部：id 选择器 —— 零 import */
const regionId = 's13-region'
async function loadLocal() {
  openLoading('#' + regionId, { text: '只遮这个区域', spinner: 'bars', transition: 'zoom' })
  try {
    scopedText.value = `拿到 ${(await mock(1400)).length} 条`
  } finally {
    closeLoading('#' + regionId)
  }
}

/** ④ 局部一行包裹 —— 零 import */
async function loadLocalAuto() {
  scopedText.value = `局部自动开关：${(await withLoadingOn('#' + regionId, mock(1400), { spinner: 'pulse' })).length} 条`
}

/** ⑤ window 全局对象写法（在 .js 文件里也这么用）—— 零 import */
async function loadViaWindow() {
  window.$loading.open({ text: '通过 window.$loading 调用', spinner: 'orbit', delay: 0 })
  try {
    rows.value = await mock(1400)
  } finally {
    window.$loading.close()
  }
}
</script>

<template>
  <div class="scn">
    <div class="scn-hd">
      <h3 class="scn-title">场景 13 · 零 import 全局调用</h3>
      <span class="scn-tag">本页顶部无任何 loading import</span>
    </div>

    <div class="zero-note">
      <p><strong>本文件第一行是</strong> <code>&lt;script setup lang="ts"&gt;</code>，紧接着只有 <code>import &#123; ref &#125; from 'vue'</code>。</p>
      <p>
        下面五个函数里的 <code>openLoading</code> / <code>closeLoading</code> /
        <code>withLoading</code> 全部<b>没有 import</b> —— 由
        <code>TransitionLoadingAutoImport</code> 在构建期自动补上。
      </p>
    </div>

    <div class="scn-btns">
      <button @click="loadGlobal">全局手动开关</button>
      <button @click="loadAuto">全局 withLoading</button>
      <button @click="loadLocal">局部 · id</button>
      <button @click="loadLocalAuto">局部 withLoadingOn</button>
      <button @click="loadViaWindow">window.$loading</button>
    </div>

    <div class="z-demo">
      <div class="z-box">
        <b>不受影响区</b>
        <p>局部遮罩时这个框依然可点、背景不变</p>
      </div>
      <div :id="regionId" class="z-box z-target">
        <b>局部遮罩目标区</b>
        <p>{{ scopedText || '点左侧按钮，这个区域才会被遮罩' }}</p>
      </div>
    </div>

    <div class="z-list">
      <p class="z-list-hd">订单列表（全局遮罩加载结果）</p>
      <p v-if="!rows.length" class="z-empty">点上方任意按钮加载</p>
      <ul v-else>
        <li v-for="(r, i) in rows" :key="i">{{ r }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.scn-title {
  margin: 0;
  font-size: 15px;
  color: var(--vtl-color-text);
}

.scn-tag {
  font-size: 11.5px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--vtl-color-primary-subtle);
  color: var(--vtl-color-primary);
  border: 1px solid var(--vtl-color-border-focus);
  white-space: nowrap;
}

.scn-hd {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: var(--vtl-space-4, 12px);
}

.zero-note {
  background: var(--vtl-color-bg-sunken, var(--vtl-color-surface));
  border: 1px solid var(--vtl-color-border-subtle);
  border-left: 3px solid var(--vtl-color-success);
  border-radius: var(--vtl-radius-sm, 4px);
  padding: 10px 13px;
  margin-bottom: var(--vtl-space-4, 12px);
}

.zero-note p {
  margin: 0 0 5px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--vtl-color-text-secondary);
}

.zero-note p:last-child {
  margin-bottom: 0;
}

.zero-note code {
  font-family: var(--vtl-font-mono, monospace);
  font-size: 11.5px;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--vtl-color-surface-hover);
  color: var(--vtl-color-primary);
}

.z-demo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.z-box {
  min-height: 96px;
  padding: 13px 15px;
  border: 1px dashed var(--vtl-color-border);
  border-radius: var(--vtl-radius-sm, 4px);
  background: var(--vtl-color-surface);
}

.z-box b {
  display: block;
  font-size: 13px;
  color: var(--vtl-color-text);
  margin-bottom: 5px;
}

.z-box p {
  margin: 0;
  font-size: 12.5px;
  color: var(--vtl-color-text-muted);
  line-height: 1.65;
}

.z-target {
  border-style: solid;
  border-color: var(--vtl-color-border-focus);
}

.z-list {
  border: 1px solid var(--vtl-color-border-subtle);
  border-radius: var(--vtl-radius-sm, 4px);
  padding: 11px 13px;
  background: var(--vtl-color-surface);
}

.z-list-hd {
  margin: 0 0 7px;
  font-size: 12.5px;
  color: var(--vtl-color-text-secondary);
  font-weight: 600;
}

.z-empty {
  margin: 0;
  font-size: 12.5px;
  color: var(--vtl-color-text-faint);
}

.z-list ul {
  margin: 0;
  padding-left: 18px;
}

.z-list li {
  font-size: 12.5px;
  color: var(--vtl-color-text-muted);
  font-family: var(--vtl-font-mono, monospace);
  line-height: 1.9;
}

@media (max-width: 640px) {
  .z-demo {
    grid-template-columns: 1fr;
  }
}
</style>
