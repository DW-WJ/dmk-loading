<script setup lang="ts">
/**
 * 遮罩宿主组件 —— Vue 3 适配层
 * --------------------------------------------------------------------------
 * 在应用根部挂载一次，自动渲染「全局遮罩 + 所有局部遮罩」。
 * 局部遮罩通过 Teleport 挂到目标元素内部，业务页面零模板改动。
 *
 * 这一层是「Vue 特有」的：把框架无关的 core 状态接到 Vue 渲染系统。
 * React / ArkTS 适配层只需重写本文件 + 一个宿主组件，core 一行不改。
 */
import { shallowRef, onMounted, onUnmounted, computed } from 'vue'
import LoadingMask from './LoadingMask.vue'
import { getState, localSlots } from '../core/manager'
import { subscribe } from '../core/reactive'

const state = getState()

/**
 * 桥接信号灯
 * --------------------------------------------------------------------------
 * core 是框架无关的，它只负责发出「状态变了」的通知，
 * 至于怎么重渲染由各框架决定 —— 这是 core / adapter 分层的关键。
 *
 * Vue 的做法：翻转一个 shallowRef，模板读它就会自动重渲染。
 */
const signal = shallowRef(0)
let unsubscribe: (() => void) | null = null

onMounted(() => {
  unsubscribe = subscribe(null, () => {
    signal.value++
  })
  // 首次挂载后主动拉一次，确保与 core 同步
  signal.value++
})

onUnmounted(() => {
  unsubscribe?.()
  unsubscribe = null
})

const globalTarget = computed(
  () => state.global.options.appendTo || (typeof document !== 'undefined' ? document.body : null)
)

const locals = computed(() => {
  void signal.value // 建立 Vue 依赖：signal 变化时重算
  return localSlots().filter((s) => !!s.el && s.el.isConnected)
})
</script>

<template>
  <Teleport v-if="globalTarget" :to="globalTarget">
    <LoadingMask :slot="state.global as any" />
  </Teleport>

  <Teleport v-for="item in locals" :key="item.key" :to="item.el as any">
    <LoadingMask :slot="item as any" />
  </Teleport>
</template>