<script setup lang="ts">
/**
 * 单个遮罩层 —— Vue 3 适配层（全局 / 局部共用同一实现）
 * 全局：固定定位铺满视口；局部：绝对定位铺满宿主元素
 */
import { computed, onMounted, onBeforeUnmount, watch, shallowRef, ref } from 'vue'
import { evalValue } from '../core/manager'
import { subscribe } from '../core/reactive'
import type { LoadingSlot } from '../core/types'

const props = defineProps<{
  slot: LoadingSlot
}>()

const emit = defineEmits<{ (e: 'closed', key: string): void }>()

/**
 * 桥接信号灯：core 状态变化 → 翻转 → 本组件重渲染
 * （slot 是普通对象，Vue 不会自动追踪其属性变化，需显式订阅）
 */
const signal = shallowRef(0)
let unsubscribe: (() => void) | null = null

onMounted(() => {
  unsubscribe = subscribe(null, () => {
    signal.value++
  })
})

onBeforeUnmount(() => {
  unsubscribe?.()
  unsubscribe = null
})

// 模板里读 signal 以建立依赖（不渲染任何东西）
const signalRef = computed(() => ({ "data-vtl-signal": signal.value }))

const isGlobal = computed(() => {
  void signal.value // 建立依赖
  return props.slot.el === null
})

/** 渲染期上下文：让函数式配置能读到 token / payload */
const ctx = computed(() => {
  void signal.value // 依赖信号灯：core 变更时重算上下文
  return (
    props.slot.ctx ?? {
      token: props.slot.tokens[props.slot.tokens.length - 1] || '',
      scope: isGlobal.value ? ('global' as const) : ('local' as const),
      target: props.slot.el,
      options: props.slot.options,
      payload: props.slot.payload
    }
  )
})

/**
 * 配置求值：优先用未求值的 raw 配置（支持函数），
 * 求值失败或无 raw 时退回已解析的 options。
 */
function opt<K extends keyof typeof props.slot.options>(key: K) {
  void signal.value // 依赖信号灯：core 变更时重算
  const raw = props.slot.raw as Record<string, unknown>
  if (raw && raw[key] !== undefined) {
    return evalValue(raw[key] as any, ctx.value, props.slot.options[key] as any)
  }
  return props.slot.options[key]
}

const text = computed(() => opt('text') as string)
const spinner = computed(() => opt('spinner') as any)
const transition = computed(() => opt('transition') as any)
const maskStyle = computed(() => opt('maskStyle') as any)
const size = computed(() => opt('size') as any)
const textPosition = computed(() => opt('textPosition') as any)
const color = computed(() => opt('color') as string)
const textColor = computed(() => opt('textColor') as string)

const rootStyle = computed(() => {
  const maskColor = opt('maskColor') as string
  const style: Record<string, string> = {
    position: isGlobal.value ? 'fixed' : 'absolute',
    inset: '0',
    '--vtl-color': color.value,
    '--vtl-text-color': textColor.value
  }
  if (maskColor) {
    style.background = maskColor
  } else if (maskStyle.value === 'solid') {
    style.background = 'rgba(15, 23, 42, 0.72)'
  } else if (maskStyle.value === 'soft') {
    style.background = 'rgba(15, 23, 42, 0.42)'
  } else {
    style.background = 'transparent'
  }
  return style
})

const sizeClass = computed(() => `vtl-size-${size.value}`)
const textPosClass = computed(() => `vtl-text-${textPosition.value}`)

/** 局部遮罩需要给宿主加 relative，否则 absolute 会跑飞 */
onMounted(() => {
  const el = props.slot.el
  if (el) {
    const pos = getComputedStyle(el).position
    if (pos === 'static') el.style.position = 'relative'
    if (getComputedStyle(el).overflow === 'visible') el.style.overflow = 'hidden'
  }
})

onBeforeUnmount(() => {
  const el = props.slot.el
  if (el) {
    el.style.position = props.slot.originPosition
    el.style.overflow = ''
  }
  // 移除可能挂上的无障碍属性，避免目标元素残留
  if (el) {
    el.removeAttribute('aria-busy')
    el.removeAttribute('data-vtl-loading')
  }
  emit('closed', props.slot.key)
})

/**
 * 局部遮罩：给宿主打 aria-busy 标记
 * --------------------------------------------------------------------------
 * 屏幕阅读器用户浏览到正在加载的表格/区域时，
 * 需要知道"这块在加载"而不是"这里没内容"。
 */
watch(
  () => signal.value,
  () => {
    const el = props.slot.el
    if (!el) return
    if (props.slot.visible) {
      el.setAttribute('aria-busy', 'true')
      el.setAttribute('data-vtl-loading', '')
    } else {
      el.removeAttribute('aria-busy')
      el.removeAttribute('data-vtl-loading')
    }
  },
  { immediate: true }
)

/**
 * 滚动锁 / 解锁
 * --------------------------------------------------------------------------
 * 依赖源必须是 signal（Vue ref）而不是 props.slot.visible —— 后者是普通对象属性，
 * Vue 不会追踪它的变化。
 */
watch(
  () => signal.value,
  () => {
    const on = props.slot.visible
    if (typeof document === 'undefined') return
    if (!isGlobal.value) return
    if (!props.slot.options.lockScroll) return
    if (on) {
      document.body.style.setProperty('overflow', 'hidden')
    } else {
      document.body.style.removeProperty('overflow')
    }
  },
  { immediate: true }
)

/**
 * 动效敏感用户降级
 * --------------------------------------------------------------------------
 * 前庭功能障碍者看到旋转 / 缩放 / 位移动画会眩晕。
 * 系统开了「减弱动态效果」时：
 *   - 过渡时长归零（直接出现/消失，不做位移缩放）
 *   - 旋转类动画停止（保留静态指示器，语义不丢）
 * CSS 里还有一层 @media (prefers-reduced-motion) 兜底，这里是 JS 侧
 * 加 class，方便业务按需判断。
 */
const reduceMotion = ref(false)

if (typeof window !== 'undefined' && window.matchMedia) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  reduceMotion.value = mq.matches
  const onChange = (e: MediaQueryListEvent) => {
    reduceMotion.value = e.matches
  }
  if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange)
  else if (typeof mq.addListener === 'function') mq.addListener(onChange)
}

/** 遮罩根节点 class：降级时挂 reduce 类 */
const motionClass = computed(() => (reduceMotion.value ? 'vtl-reduce-motion' : ''))

</script>

<template>
  <Transition :name="`vtl-${transition}`">
    <div
      v-show="slot.visible"
      v-bind="signalRef"
      class="vtl-mask"
      :class="[sizeClass, textPosClass, `vtl-mask-${maskStyle}`, motionClass]"
      :style="rootStyle"
      role="status"
      aria-live="polite"
      :aria-busy="slot.visible"
      :aria-label="text || undefined"
    >
      <!-- 只让动画图形对屏幕阅读器隐藏，文案必须留在可读区域 -->
      <div class="vtl-inner">
        <div class="vtl-spinner" :class="`vtl-spinner-${spinner}`" aria-hidden="true">
          <template v-if="spinner === 'ring'">
            <span class="vtl-ring" />
          </template>
          <template v-else-if="spinner === 'dots'">
            <span v-for="i in 3" :key="i" class="vtl-dot" :style="{ animationDelay: `${(i - 1) * 0.15}s` }" />
          </template>
          <template v-else-if="spinner === 'bars'">
            <span v-for="i in 5" :key="i" class="vtl-bar" :style="{ animationDelay: `${(i - 1) * 0.12}s` }" />
          </template>
          <template v-else-if="spinner === 'pulse'">
            <span class="vtl-pulse" />
          </template>
          <template v-else-if="spinner === 'wave'">
            <span v-for="i in 5" :key="i" class="vtl-wave-bar" :style="{ animationDelay: `${(i - 1) * 0.1}s` }" />
          </template>
          <template v-else-if="spinner === 'orbit'">
            <span class="vtl-orbit">
              <i v-for="i in 3" :key="i" :style="{ transform: `rotate(${i * 120}deg) translateY(-8px)` }" />
            </span>
          </template>
        </div>
        <p v-if="text" class="vtl-text">{{ text }}</p>
      </div>
    </div>
  </Transition>
</template>

<style>
.vtl-mask {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 层级令牌化：默认 2000，但允许业务整体覆盖。
     真实痛点 —— 某些 UI 框架（AntD Modal=1050 / Element Dialog=2000+）
     会盖住固定 2000 的遮罩，业务只需：
       :root { --vtl-z-mask: 3000 }
     或按主题分别设置，不用改库源码。 */
  z-index: var(--vtl-z-mask, 2000);
  backdrop-filter: blur(1.5px);
  -webkit-backdrop-filter: blur(1.5px);
}

.vtl-mask-transparent {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.vtl-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-radius: 12px;
}

.vtl-text-bottom .vtl-inner {
  flex-direction: column-reverse;
}
.vtl-text-top .vtl-inner {
  flex-direction: column-reverse;
  transform: rotate(180deg);
}
.vtl-text-top .vtl-text,
.vtl-text-top .vtl-spinner {
  transform: rotate(180deg);
}

.vtl-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  color: var(--vtl-text-color, #fff);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  white-space: nowrap;
}

/* ---------- 尺寸 ---------- */
.vtl-size-small .vtl-ring { width: 22px; height: 22px; border-width: 2.5px; }
.vtl-size-small .vtl-dot { width: 6px; height: 6px; }
.vtl-size-small .vtl-bar { width: 3px; height: 16px; }
.vtl-size-small .vtl-wave-bar { width: 3px; height: 16px; }
.vtl-size-small .vtl-text { font-size: 12px; }
.vtl-size-small .vtl-pulse { width: 22px; height: 22px; }

.vtl-size-large .vtl-ring { width: 44px; height: 44px; border-width: 4px; }
.vtl-size-large .vtl-dot { width: 12px; height: 12px; }
.vtl-size-large .vtl-bar { width: 5px; height: 28px; }
.vtl-size-large .vtl-wave-bar { width: 5px; height: 28px; }
.vtl-size-large .vtl-text { font-size: 16px; }
.vtl-size-large .vtl-pulse { width: 44px; height: 44px; }

/* ---------- ring ---------- */
.vtl-ring {
  display: block;
  width: 32px;
  height: 32px;
  border: 3px solid var(--vtl-color, #3b82f6);
  border-top-color: transparent;
  border-radius: 50%;
  animation: vtl-spin 0.9s linear infinite;
}

/* ---------- dots ---------- */
.vtl-spinner-dots {
  display: flex;
  gap: 6px;
}
.vtl-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--vtl-color, #3b82f6);
  animation: vtl-bounce 1.05s ease-in-out infinite;
}

/* ---------- bars ---------- */
.vtl-spinner-bars {
  display: flex;
  gap: 4px;
  align-items: flex-end;
  height: 30px;
}
.vtl-bar {
  width: 4px;
  height: 24px;
  border-radius: 2px;
  background: var(--vtl-color, #3b82f6);
  animation: vtl-stretch 1.1s ease-in-out infinite;
}

/* ---------- pulse ---------- */
.vtl-pulse {
  display: block;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--vtl-color, #3b82f6);
  animation: vtl-pulse 1.3s ease-in-out infinite;
}

/* ---------- wave ---------- */
.vtl-spinner-wave {
  display: flex;
  gap: 4px;
  align-items: center;
  height: 30px;
}
.vtl-wave-bar {
  width: 4px;
  height: 22px;
  border-radius: 2px;
  background: var(--vtl-color, #3b82f6);
  animation: vtl-wave 1s ease-in-out infinite;
}

/* ---------- orbit ---------- */
.vtl-orbit {
  position: relative;
  display: block;
  width: 32px;
  height: 32px;
  animation: vtl-spin 1.4s linear infinite;
}
.vtl-orbit i {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  margin: -4px 0 0 -4px;
  border-radius: 50%;
  background: var(--vtl-color, #3b82f6);
}

/* ---------- 过渡动画 ---------- */
.vtl-fade-enter-active,
.vtl-fade-leave-active {
  transition: opacity 0.24s ease;
}
.vtl-fade-enter-from,
.vtl-fade-leave-to {
  opacity: 0;
}

.vtl-zoom-enter-active,
.vtl-zoom-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.vtl-zoom-enter-from,
.vtl-zoom-leave-to {
  opacity: 0;
  transform: scale(0.94);
}

.vtl-blur-enter-active,
.vtl-blur-leave-active {
  transition: opacity 0.26s ease, backdrop-filter 0.26s ease;
}
.vtl-blur-enter-from,
.vtl-blur-leave-to {
  opacity: 0;
  backdrop-filter: blur(0);
  -webkit-backdrop-filter: blur(0);
}

.vtl-slide-down-enter-active,
.vtl-slide-down-leave-active {
  transition: opacity 0.24s ease, transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}
.vtl-slide-down-enter-from,
.vtl-slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.vtl-slide-up-enter-active,
.vtl-slide-up-leave-active {
  transition: opacity 0.24s ease, transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}
.vtl-slide-up-enter-from,
.vtl-slide-up-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.vtl-none-enter-active,
.vtl-none-leave-active {
  transition: none;
}
.vtl-none-enter-from,
.vtl-none-leave-to {
  opacity: 0;
}

/* ---------- keyframes ---------- */
@keyframes vtl-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes vtl-bounce {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes vtl-stretch {
  0%,
  100% {
    transform: scaleY(0.4);
  }
  50% {
    transform: scaleY(1);
  }
}
@keyframes vtl-pulse {
  0% {
    transform: scale(0.7);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.15);
    opacity: 1;
  }
  100% {
    transform: scale(0.7);
    opacity: 0.7;
  }
}
@keyframes vtl-wave {
  0%,
  100% {
    transform: scaleY(0.35);
  }
  50% {
    transform: scaleY(1);
  }
}
/* ==========================================================================
   无障碍：动效敏感用户降级
   ==========================================================================
   前庭功能障碍者看到旋转 / 缩放 / 位移动画会眩晕甚至呕吐。
   系统「减弱动态效果」开启时：
     1. 过渡动画直接取消（不位移、不缩放、不淡入）
     2. 旋转 / 脉冲 / 闪烁类动画停止，保留静态指示器（语义不丢）
     3. 骨架类动画降为最低频

   两层保障：
     - CSS @media（本段）—— 即使 JS 没跑到也生效
     - JS .vtl-reduce-motion class —— 便于业务自己判断并进一步处理
   ========================================================================== */
@media (prefers-reduced-motion: reduce) {
  .vtl-mask,
  .vtl-mask * {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }

  /* 旋转 / 脉冲类指示器：停在小图标可见状态 */
  .vtl-ring,
  .vtl-orbit,
  .vtl-orbit i,
  .vtl-pulse,
  .vtl-dot,
  .vtl-bar,
  .vtl-wave-bar {
    animation: none !important;
  }

  /* 静态降级形态：保留可辨识的视觉提示 */
  .vtl-ring {
    border-top-color: transparent !important;
    opacity: 0.7;
  }

  .vtl-pulse {
    transform: scale(0.85);
    opacity: 0.7;
  }

  .vtl-dot,
  .vtl-bar,
  .vtl-wave-bar {
    opacity: 0.45;
  }

  .vtl-dot:first-child,
  .vtl-bar:first-child,
  .vtl-wave-bar:first-child {
    opacity: 1;
  }
}

/* JS 侧同款降级（.vtl-reduce-motion 由 matchMedia 检测后挂上） */
.vtl-reduce-motion,
.vtl-reduce-motion * {
  animation-duration: 0.001ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.001ms !important;
}

.vtl-reduce-motion .vtl-ring,
.vtl-reduce-motion .vtl-orbit,
.vtl-reduce-motion .vtl-orbit i,
.vtl-reduce-motion .vtl-pulse,
.vtl-reduce-motion .vtl-dot,
.vtl-reduce-motion .vtl-bar,
.vtl-reduce-motion .vtl-wave-bar {
  animation: none !important;
}

.vtl-reduce-motion .vtl-ring {
  border-top-color: transparent !important;
  opacity: 0.7;
}

.vtl-reduce-motion .vtl-pulse {
  transform: scale(0.85);
  opacity: 0.7;
}

/* ==========================================================================
   暗色模式
   ==========================================================================
   遮罩底色默认是半透明深色（rgba(15,23,42,.42)），在深色背景下几乎不可见。
   这里在系统偏好深色时加深底色、降低文字对比刺激。
   ========================================================================== */
@media (prefers-color-scheme: dark) {
  .vtl-mask-soft {
    background: rgba(3, 6, 12, 0.62) !important;
  }

  .vtl-mask-solid {
    background: rgba(0, 0, 0, 0.78) !important;
  }

  .vtl-text {
    color: #e2e8f0;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  }
}
</style>