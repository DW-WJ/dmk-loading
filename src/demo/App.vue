<script setup lang="ts">
import { ref } from 'vue'
import {
  openLoading,
  closeLoading,
  closeAllLoading,
  withLoading,
  withLoadingOn,
  updateLoading,
  presets
} from '../lib/index'

import S01BasicCRUD from './scenarios/S01BasicCRUD.vue'
import S02TableRegion from './scenarios/S02TableRegion.vue'
import S03Preset from './scenarios/S03Preset.vue'
import S04Progress from './scenarios/S04Progress.vue'
import S05Concurrent from './scenarios/S05Concurrent.vue'
import S06Error from './scenarios/S06Error.vue'
import S07MultiZone from './scenarios/S07MultiZone.vue'
import S08AntiFlicker from './scenarios/S08AntiFlicker.vue'
import S09ComponentWrapper from './scenarios/S09ComponentWrapper.vue'
import S10ApiReference from './scenarios/S10ApiReference.vue'
import S11LocalPositioning from './scenarios/S11LocalPositioning.vue'
import S12ProductionPatterns from './scenarios/S12ProductionPatterns.vue'
import S13ZeroImport from './scenarios/S13ZeroImport.vue'
import S14Directive from './scenarios/S14Directive.vue'

/* ---------- 日志 ---------- */
const logs = ref<string[]>([])
function onLog(s: string) {
  logs.value.unshift(`[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] ${s}`)
  if (logs.value.length > 40) logs.value.pop()
}

/* ---------- 导航 ---------- */
interface Scenario {
  id: string
  no: number
  title: string
  desc: string
  comp: any
}

const scenarios: Scenario[] = [
  { id: 'basic', no: 1, title: '基础 CRUD 三种写法', desc: '手动开关 / withLoading 一行 / 函数式文案', comp: S01BasicCRUD },
  { id: 'table', no: 2, title: '表格区域加载', desc: 'withLoadingOn + id 选择器，表格外不受影响', comp: S02TableRegion },
  { id: 'preset', no: 3, title: '预设方案沉淀', desc: 'preset 链式 + 内置 7 种快捷预设', comp: S03Preset },
  { id: 'progress', no: 4, title: '进度型任务', desc: '上传/下载进度，updateLoading 实时更新', comp: S04Progress },
  { id: 'concurrent', no: 5, title: '并发控制（含反例）', desc: 'Promise.all 正确写法 vs forEach 错误写法', comp: S05Concurrent },
  { id: 'error', no: 6, title: '异常与钩子', desc: 'onError/onFinally 必定触发，异常也关遮罩', comp: S06Error },
  { id: 'multizone', no: 7, title: '一页多区域', desc: '仪表盘场景，各区独立互不干扰', comp: S07MultiZone },
  { id: 'antiflicker', no: 8, title: '防闪烁策略实测', desc: 'delay / minDuration 效果对比', comp: S08AntiFlicker },
  { id: 'component', no: 9, title: '组件化封装范式', desc: 'AsyncDataBox：父组件零 loading 代码', comp: S09ComponentWrapper },
  { id: 'localpos', no: 11, title: '局部定位 5 种方式', desc: 'id / ref / 手动 / 嵌套 / DOM 实例', comp: S11LocalPositioning },
  { id: 'production', no: 12, title: '生产级模式 8 例', desc: 'axios 拦截器 / 路由守卫 / 防重复提交…', comp: S12ProductionPatterns },
  { id: 'zeroimport', no: 13, title: '零 import 全局调用', desc: '页面顶部无任何 import，直接写 openLoading()', comp: S13ZeroImport },
  { id: 'directive', no: 14, title: 'v-vtl-loading 指令', desc: '命名空间前缀，不与 ElementUI 等库冲突', comp: S14Directive },
  { id: 'api', no: 10, title: 'API 全景活体文档', desc: '所有导出方法逐个点一遍', comp: S10ApiReference }
]

const activeId = ref('basic')
const active = () => scenarios.find((s) => s.id === activeId.value)!

/* ---------- 顶部自由试验台 ---------- */
const spinners = ['ring', 'dots', 'bars', 'pulse', 'wave', 'orbit'] as const
const transitions = ['fade', 'zoom', 'slide-down', 'slide-up', 'blur', 'none'] as const
const curSpinner = ref<(typeof spinners)[number]>('ring')
const curTransition = ref<(typeof transitions)[number]>('fade')

const trialList = ref<string[]>([])
function mockRequest(ms = 1500): Promise<string[]> {
  return new Promise((r) => setTimeout(() => r(['订单 001', '订单 002', '订单 003', '订单 004']), ms))
}

async function trialGlobal() {
  openLoading({ text: '正在加载订单...', spinner: curSpinner.value, transition: curTransition.value })
  try {
    trialList.value = await mockRequest()
  } finally {
    closeLoading()
  }
}

async function trialProgress() {
  const { token } = openLoading({ text: '上传中 0%', spinner: 'bars', color: '#10b981', minDuration: 800 })
  for (const pct of [20, 40, 60, 80, 100]) {
    await new Promise((r) => setTimeout(r, 350))
    updateLoading(token, { text: `上传中 ${pct}%` })
  }
  closeLoading(token)
}

async function trialPreset() {
  trialList.value = await withLoading(mockRequest(1400), presets.heavy('正在处理，请稍候'))
}
</script>

<template>
  <div class="page">
    <header class="hero">
      <div class="hero-main">
        <h1>dmk-loading</h1>
        <p>框架无关内核 · 安装即用 · 全局/局部双粒度 · 页面零 loading 变量</p>
      </div>
      <div class="hero-cta">
        <code>npm i dmk-loading</code>
      </div>
    </header>

    <!-- 顶部自由试验台 -->
    <section class="lab">
      <h3>🎛 自由试验台</h3>
      <div class="ctrl">
        <label>spinner</label>
        <select v-model="curSpinner">
          <option v-for="s in spinners" :key="s" :value="s">{{ s }}</option>
        </select>
        <label>transition</label>
        <select v-model="curTransition">
          <option v-for="t in transitions" :key="t" :value="t">{{ t }}</option>
        </select>
        <button class="primary" @click="trialGlobal">全局遮罩</button>
        <button @click="trialProgress">进度更新</button>
        <button @click="trialPreset">内置预设 heavy</button>
        <button @click="withLoadingOn('#lab-zone', mockRequest(1300), { text: '只遮这个框', spinner: 'dots' })">
          局部（下方蓝框）
        </button>
        <button class="danger" @click="closeAllLoading">强制关闭全部</button>
      </div>
      <div id="lab-zone" class="lab-zone">
        局部遮罩测试区 · 只遮这里
        <div class="lab-data">
          <span v-for="i in trialList" :key="i" class="chip">{{ i }}</span>
          <span v-if="!trialList.length" class="empty">加载后此处显示数据</span>
        </div>
      </div>
    </section>

    <div class="layout">
      <!-- 左侧导航 -->
      <aside class="nav">
        <h4>12 个场景</h4>
        <button
          v-for="s in scenarios"
          :key="s.id"
          class="nav-item"
          :class="{ active: activeId === s.id }"
          @click="activeId = s.id"
        >
          <span class="nav-no">{{ String(s.no).padStart(2, '0') }}</span>
          <span class="nav-body">
            <span class="nav-title">{{ s.title }}</span>
            <span class="nav-desc">{{ s.desc }}</span>
          </span>
        </button>
      </aside>

      <!-- 右侧场景 -->
      <main class="content">
        <component :is="active().comp" @log="onLog" />
      </main>
    </div>

    <!-- 运行日志 -->
    <section class="logs">
      <div class="logs-hd">
        <h4>📋 运行日志（{{ logs.length }}）</h4>
        <button class="mini" @click="logs = []">清空</button>
      </div>
      <div class="logs-body">
        <div v-if="!logs.length" class="empty">点击任意场景的按钮，这里会输出执行轨迹</div>
        <div v-for="(l, i) in logs" :key="i" class="log-line">{{ l }}</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  max-width: 1240px;
  margin: 0 auto;
  padding: 28px 20px 80px;
  font-family: system-ui, -apple-system, 'PingFang SC';
  color: #0f172a;
}
.hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 26px 30px;
  border-radius: 18px;
  background: linear-gradient(135deg, #1d4ed8, #7c3aed);
  color: #fff;
  margin-bottom: 18px;
}
.hero h1 { margin: 0 0 6px; font-size: 27px; letter-spacing: -0.5px; }
.hero p { margin: 0; opacity: .92; font-size: 14px; }
.hero-cta code {
  background: rgba(255,255,255,.16);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  backdrop-filter: blur(6px);
}

/* 试验台 */
.lab { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 22px; margin-bottom: 20px; }
.lab h3 { margin: 0 0 12px; font-size: 15px; }
.ctrl { display: flex; flex-wrap: wrap; gap: 9px; align-items: center; margin-bottom: 14px; }
.ctrl label { font-size: 12.5px; color: #475569; }
select { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; font-size: 13px; }
button { padding: 7px 14px; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; font-size: 13px; transition: .15s; }
button:hover { border-color: #94a3b8; transform: translateY(-1px); }
button.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
button.danger { background: #fff1f2; border-color: #fda4af; color: #be123c; }
button.mini { padding: 3px 10px; font-size: 12px; }

.lab-zone { border: 2px dashed #93c5fd; border-radius: 12px; padding: 16px; background: #eff6ff; font-size: 13px; color: #1e40af; }
.lab-data { margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; }
.chip { background: #fff; padding: 4px 10px; border-radius: 6px; font-size: 12px; border: 1px solid #bfdbfe; }

/* 布局 */
.layout { display: grid; grid-template-columns: 260px 1fr; gap: 18px; align-items: start; }
@media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }

.nav { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; position: sticky; top: 20px; }
.nav h4 { margin: 0 0 10px; font-size: 13px; color: #64748b; }
.nav-item { display: flex; gap: 10px; width: 100%; text-align: left; padding: 9px 10px; margin-bottom: 4px; border: 1px solid transparent; border-radius: 9px; background: transparent; }
.nav-item:hover { background: #f8fafc; transform: none; }
.nav-item.active { background: #eff6ff; border-color: #bfdbfe; }
.nav-no { font-family: ui-monospace, monospace; font-size: 11px; color: #94a3b8; padding-top: 2px; }
.nav-body { display: flex; flex-direction: column; gap: 2px; }
.nav-title { font-size: 13px; font-weight: 600; color: #1e293b; }
.nav-desc { font-size: 11.5px; color: #64748b; line-height: 1.4; }

.content { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 22px; min-height: 400px; }

/* 日志 */
.logs { margin-top: 20px; background: #0f172a; border-radius: 14px; padding: 16px 20px; }
.logs-hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.logs-hd h4 { margin: 0; color: #e2e8f0; font-size: 13px; }
.logs-body { max-height: 240px; overflow-y: auto; }
.log-line { color: #86efac; font-size: 12.5px; font-family: ui-monospace, monospace; padding: 3px 0; line-height: 1.6; }

/* 场景内部通用样式（穿透） */
.content :deep(.scn-btns) { display: flex; flex-wrap: wrap; gap: 9px; margin-bottom: 14px; }
.content :deep(.code) {
  background: #0f172a; color: #e2e8f0; padding: 14px 16px; border-radius: 10px;
  font-size: 12px; line-height: 1.7; overflow-x: auto; margin: 0 0 16px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.content :deep(.box) { border: 1px dashed #cbd5e1; border-radius: 11px; padding: 16px; background: #f8fafc; margin-bottom: 12px; }
.content :deep(.box:last-child) { margin-bottom: 0; }
.content :deep(.empty) { color: #94a3b8; font-size: 13px; }
.content :deep(.row) { padding: 4px 0; font-size: 13px; color: #334155; }
.content :deep(.tip) { font-size: 12.5px; color: #64748b; background: #fffbeb; padding: 9px 12px; border-radius: 8px; border-left: 3px solid #f59e0b; margin: 12px 0 0; }
.content :deep(table) { width: 100%; border-collapse: collapse; font-size: 13px; }
.content :deep(th), .content :deep(td) { padding: 9px 12px; text-align: left; border-bottom: 1px solid #eef2f7; }
.content :deep(th) { background: #f1f5f9; font-weight: 600; }
.content :deep(.grid3) { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
@media (max-width: 720px) { .content :deep(.grid3) { grid-template-columns: 1fr; } }
.content :deep(.zone) { min-height: 110px; }
.content :deep(.zone h4) { margin: 0 0 8px; font-size: 13px; color: #475569; }
.content :deep(.zone-inline) { border: 2px dashed #93c5fd; background: #eff6ff; color: #1e40af; }
.content :deep(.ok-box) { border-color: #86efac; background: #f0fdf4; color: #166534; }
.content :deep(.err-box) { border-color: #fca5a5; background: #fef2f2; color: #991b1b; }
.content :deep(.warn-box) { border-color: #fcd34d; background: #fffbeb; color: #92400e; }
.content :deep(.trace-box) { font-family: ui-monospace, monospace; font-size: 12px; }
.content :deep(.trace) { color: #0369a1; }
.content :deep(.chart) { font-family: ui-monospace, monospace; color: #3b82f6; font-size: 15px; letter-spacing: 1px; }
.content :deep(.grp) { font-size: 12.5px; color: #64748b; font-weight: 600; margin-right: 4px; }
.content :deep(.tag) { padding: 2px 8px; border-radius: 5px; font-size: 12px; }
.content :deep(.tag.yes) { background: #dcfce7; color: #166534; }
.content :deep(.tag.no) { background: #fee2e2; color: #991b1b; }
.content :deep(.cmp) { font-size: 12.5px; }
.content :deep(.status) { font-family: ui-monospace, monospace; font-size: 12px; }
.content :deep(.status code) { background: #f1f5f9; padding: 1px 6px; border-radius: 4px; color: #0369a1; }
.content :deep(.result) { border-color: #86efac; background: #f0fdf4; font-size: 13px; color: #166534; }
.content :deep(.log-box) { max-height: 380px; overflow-y: auto; }
.content :deep(.log-item) {
  padding: 8px 12px; margin-bottom: 6px; background: #f8fafc;
  border-left: 3px solid #3b82f6; border-radius: 0 6px 6px 0;
  font-size: 12.5px; line-height: 1.6; color: #334155;
  white-space: pre-wrap; font-family: ui-monospace, monospace;
}
</style>