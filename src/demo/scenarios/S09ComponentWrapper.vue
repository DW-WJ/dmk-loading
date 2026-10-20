<script setup lang="ts">
/**
 * 场景 9：组件化封装 —— 业务组件内部自管 loading
 * 父组件只给"数据源"，完全不知道 loading 存在
 */
import { ref, h, defineComponent } from 'vue'
import { withLoading, withLoadingOn, presets } from '../../lib/index'

const emit = defineEmits<{ (e: 'log', s: string): void }>()

/**
 * 【核心范式】AsyncDataBox
 * 把「请求 + loading + 渲染」封装成组件，父组件零感知
 */
const AsyncDataBox = defineComponent({
  name: 'AsyncDataBox',
  props: {
    /** 请求函数：父组件只给数据源，不给 loading 逻辑 */
    fetcher: { type: Function, required: true },
    /** 遮罩文案 */
    text: { type: String, default: '加载中...' },
    /** 传给 fetcher 的参数 */
    params: { type: Object as () => Record<string, unknown>, default: () => ({}) },
    /** 局部模式：组件根元素选择器（为空则用全局） */
    target: { type: String, default: '' }
  },
  emits: ['loaded'],
  setup(props, { emit: e }) {
    const data = ref<any>(null)

    async function reload() {
      const plan = presets.table(props.text)
      if (props.target) {
        data.value = await withLoadingOn(props.target, () => props.fetcher(props.params), plan)
      } else {
        data.value = await withLoading(() => props.fetcher(props.params), plan)
      }
      e('loaded', data.value)
    }

    return () =>
      h('div', { class: 'async-box', id: props.target || undefined }, [
        h('div', { class: 'async-hd' }, [
          h('span', props.target ? `局部模式（${props.target}）` : '全局模式'),
          h('button', { class: 'mini', onClick: () => void reload() }, '加载数据')
        ]),
        h(
          'div',
          { class: 'async-body' },
          data.value ? JSON.stringify(data.value) : '点击右上角"加载数据"，父组件无需写任何 loading 代码'
        )
      ])
  }
})

/* ---------- 演示用的数据源 ---------- */
const fetchUser = (p: Record<string, unknown>) =>
  new Promise((r) => setTimeout(() => r({ id: 1, name: '张三', dept: '研发', ...p }), 1500))

const fetchConfig = (p: Record<string, unknown>) =>
  new Promise((r) => setTimeout(() => r({ theme: 'dark', lang: 'zh-CN', ...p }), 1000))

const fetchStats = (p: Record<string, unknown>) =>
  new Promise((r) => setTimeout(() => r({ total: 1284, today: 56, ...p }), 700))

function onLoaded(v: unknown) {
  emit('log', `AsyncDataBox 加载完成：${JSON.stringify(v).slice(0, 40)}...`)
}
</script>

<template>
  <div class="scn">
    <div class="scn-btns">
      <button class="primary" @click="emit('log', '⬇️ 点下面三个卡片各自的按钮试试')">提示</button>
    </div>
    <pre class="code"><code>// 父组件用法：只给数据源，不写任何 loading 代码
&lt;AsyncDataBox :fetcher="fetchUser" text="加载用户..." @loaded="onUserLoaded" /&gt;
&lt;AsyncDataBox :fetcher="fetchConfig" text="加载配置..." /&gt;

// 组件内部（唯一一处 loading 逻辑）
const data = ref(null)
async function reload() {
  data.value = await withLoading(() =&gt; props.fetcher(props.params), {
    text: props.text, spinner: 'dots'
  })
}
// 甚至可以传 target 切换成局部模式：
// &lt;AsyncDataBox :fetcher="fetchUser" target="#box-1" /&gt;</code></pre>
    <AsyncDataBox :fetcher="fetchUser" text="加载用户..." :params="{ dept: '研发部' }" @loaded="onLoaded" />
    <AsyncDataBox :fetcher="fetchConfig" text="加载配置..." :params="{ version: '2.1' }" @loaded="onLoaded" />
    <AsyncDataBox :fetcher="fetchStats" text="加载统计..." :params="{ range: '今日' }" @loaded="onLoaded" />
  </div>
</template>

<style scoped>
.async-box {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 12px;
}
.async-hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
  font-size: 13px;
  font-weight: 600;
}
.async-body {
  padding: 16px;
  font-size: 12.5px;
  font-family: ui-monospace, monospace;
  color: #334155;
  min-height: 46px;
  display: flex;
  align-items: center;
}
.mini {
  padding: 3px 10px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #fff;
  cursor: pointer;
}
.mini:hover {
  background: #f8fafc;
}
</style>