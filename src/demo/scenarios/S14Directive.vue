<script setup lang="ts">
/**
 * 场景 14：v-vtl-loading 指令
 *
 * 为什么叫 v-vtl-loading 而不是 v-loading：
 *   ElementUI / Element Plus / Naive UI / Ant Design Vue 全都注册了 v-loading。
 *   同名指令在同一个 app 上会互相覆盖（后注册的赢），
 *   表现是「用了本库的指令却渲染成别的库的样式」—— 且不报错，极难排查。
 *   所以本库用 vtl（vue-transition-loading）做命名空间前缀。
 *
 * 三种写法都在下面，可以直接点按钮对比。
 */
import { ref } from 'vue'

/* ① 布尔绑定：跟着变量显示/隐藏 */
const loadingA = ref(false)

async function runA() {
  loadingA.value = true
  await new Promise((r) => setTimeout(r, 1800))
  loadingA.value = false
}

/* ② 对象绑定：直接传配置，不需要额外变量 */
const boxBLoading = ref(false)

async function runB() {
  boxBLoading.value = true
  await new Promise((r) => setTimeout(r, 1800))
  boxBLoading.value = false
}

/* ③ 常驻：值就是 true，加载完手动改回去 */
const busyC = ref(true)
const logC = ref<string[]>([])

async function runC() {
  busyC.value = true
  logC.value = []
  for (let i = 1; i <= 4; i++) {
    logC.value.push(`第 ${i}/4 步完成`)
    await new Promise((r) => setTimeout(r, 600))
  }
  busyC.value = false
}

/* 指令参数简写（.spinner-dots / .mask-soft / .size-large） */
const busyD = ref(false)
async function runD() {
  busyD.value = true
  await new Promise((r) => setTimeout(r, 1800))
  busyD.value = false
}
</script>

<template>
  <div class="scn">
    <div class="scn-hd">
      <h3 class="scn-title">场景 14 · v-vtl-loading 指令</h3>
      <span class="scn-tag">命名空间前缀，不与任何库冲突</span>
    </div>

    <div class="why">
      <div class="why-item">
        <span class="why-k">Element Plus</span>
        <span class="why-v">v-loading</span>
        <span class="why-note">← 撞名</span>
      </div>
      <div class="why-item">
        <span class="why-k">Naive UI</span>
        <span class="why-v">v-loading</span>
        <span class="why-note">← 撞名</span>
      </div>
      <div class="why-item ok">
        <span class="why-k">本库</span>
        <span class="why-v">v-vtl-loading</span>
        <span class="why-note">命名空间隔离</span>
      </div>
    </div>

    <p class="why-desc">
      同名指令在同一个 app 上会<strong>互相覆盖</strong>（后注册的赢），
      表现为「用了本库的指令却渲染出别的库的样式」—— 而且<strong>不报错</strong>，极难排查。
      所以用 <code>vtl</code> 做前缀。
    </p>

    <div class="scn-btns">
      <button @click="runA">① 布尔绑定</button>
      <button @click="runB">② 对象配置</button>
      <button @click="runC">③ 常驻 + 分步</button>
      <button @click="runD">④ 参数简写</button>
    </div>

    <!-- ① 布尔 -->
    <div class="box" v-vtl-loading="loadingA">
      <b>① 布尔绑定</b>
      <code class="code-inline">v-vtl-loading="loadingA"</code>
      <p>{{ loadingA ? '遮罩覆盖中' : '点上方「布尔绑定」按钮' }}</p>
    </div>

    <!-- ② 对象 -->
    <div class="box" v-vtl-loading="boxBLoading ? { text: '查询中...', spinner: 'dots' } : false">
      <b>② 对象配置</b>
      <code class="code-inline">v-vtl-loading="cond ? { text, spinner } : false"</code>
      <p>{{ boxBLoading ? '遮罩覆盖中' : '文案和指示器写在指令里' }}</p>
    </div>

    <!-- ③ 常驻 + 分步 -->
    <div class="box" v-vtl-loading="busyC">
      <b>③ 常驻 + 分步进度</b>
      <code class="code-inline">v-vtl-loading="busy"</code>
      <ul v-if="logC.length" class="steps">
        <li v-for="(l, i) in logC" :key="i">{{ l }}</li>
      </ul>
      <p v-else>点「常驻 + 分步」看多步流程</p>
    </div>

    <!-- ④ 参数简写 -->
    <div
      class="box"
      v-vtl-loading.spinner-wave.mask-soft.size-large="busyD"
    >
      <b>④ 参数简写</b>
      <code class="code-inline">v-vtl-loading.spinner-wave.mask-soft.size-large</code>
      <p>修饰符直接写配置，不用对象</p>
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

/* 撞名对照 */
.why {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: var(--vtl-space-3, 10px);
}

.why-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 9px 12px;
  border-radius: var(--vtl-radius-sm, 4px);
  background: var(--vtl-color-surface);
  border: 1px solid var(--vtl-color-border-subtle);
}

.why-item.ok {
  border-color: var(--vtl-color-success);
  background: var(--vtl-color-success-subtle, var(--vtl-alpha-success-10));
}

.why-k {
  font-size: 10.5px;
  color: var(--vtl-color-text-faint);
  letter-spacing: 0.3px;
}

.why-v {
  font-family: var(--vtl-font-mono, monospace);
  font-size: 12.5px;
  color: var(--vtl-color-text);
}

.why-item.ok .why-v {
  color: var(--vtl-color-success);
  font-weight: 600;
}

.why-note {
  font-size: 10.5px;
  color: var(--vtl-color-danger);
}

.why-item.ok .why-note {
  color: var(--vtl-color-success);
}

.why-desc {
  margin: 0 0 var(--vtl-space-4, 12px);
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--vtl-color-text-secondary);
}

.why-desc code {
  font-family: var(--vtl-font-mono, monospace);
  font-size: 11.5px;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--vtl-color-surface-hover);
  color: var(--vtl-color-primary);
}

/* 演示框 */
.box {
  position: relative;
  min-height: 78px;
  padding: 12px 14px;
  margin-bottom: 10px;
  border: 1px solid var(--vtl-color-border);
  border-radius: var(--vtl-radius-sm, 4px);
  background: var(--vtl-color-surface);
  overflow: hidden;
}

.box b {
  display: block;
  font-size: 12.5px;
  color: var(--vtl-color-text);
  margin-bottom: 3px;
}

.box p {
  margin: 0;
  font-size: 12px;
  color: var(--vtl-color-text-muted);
}

.code-inline {
  display: inline-block;
  font-family: var(--vtl-font-mono, monospace);
  font-size: 11px;
  padding: 1px 6px;
  margin-bottom: 5px;
  border-radius: 3px;
  background: var(--vtl-color-bg-sunken, var(--vtl-color-surface-hover));
  color: var(--vtl-color-text-secondary);
  word-break: break-all;
}

.steps {
  margin: 0;
  padding-left: 16px;
}

.steps li {
  font-size: 11.5px;
  line-height: 1.8;
  color: var(--vtl-color-text-secondary);
  font-family: var(--vtl-font-mono, monospace);
}

@media (max-width: 640px) {
  .why {
    grid-template-columns: 1fr;
  }
}
</style>
