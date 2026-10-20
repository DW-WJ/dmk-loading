import type { Directive, DirectiveBinding } from 'vue'
import { openLoading, closeLoading } from '../core/manager'
import type { LoadingOptions } from '../core/types'

/**
 * v-vtl-loading 用法：
 *   <div v-vtl-loading="isLoading"></div>                          // 布尔
 *   <div v-vtl-loading="{ text: '加载中', spinner: 'dots' }"></div> // 对象
 *   <div v-vtl-loading></div>                                      // 常驻（懒加载/首次进入）
 *   <div v-vtl-loading.spinner-dots></div>                         // 参数简写
 *
 * 注意：指令方式适合"组件自己管状态"的场景；
 *      页面级请求加载建议直接用 openLoading()/closeLoading() 全局方法，无需任何变量。
 */
type DirectiveModifiers = Partial<Record<string, boolean>>

type Value = boolean | LoadingOptions | null | undefined

interface Parsed {
  visible: boolean
  options: LoadingOptions
}

function parse(value: Value, modifiers: DirectiveModifiers): Parsed {
  if (typeof value === 'boolean') {
    return { visible: value, options: {} }
  }
  if (value && typeof value === 'object') {
    const obj = value as LoadingOptions & { visible?: boolean }
    const options: LoadingOptions = { ...obj }
    const visible = obj.visible !== undefined ? obj.visible : true
    delete (options as any).visible
    return { visible, options }
  }
  return { visible: value !== null && value !== undefined, options: {} }
}

function normalizeOptions(options: LoadingOptions, modifiers: DirectiveModifiers): LoadingOptions {
  const next = { ...options }
  const spinnerKeys = ['ring', 'dots', 'bars', 'pulse', 'wave', 'orbit']
  for (const key of spinnerKeys) {
    if (modifiers[key]) next.spinner = key as LoadingOptions['spinner']
  }
  const transitionKeys = ['fade', 'zoom', 'slideDown', 'slideUp', 'blur']
  for (const key of transitionKeys) {
    if (modifiers[key]) next.transition = key as LoadingOptions['transition']
  }
  if (modifiers.solid) next.maskStyle = 'solid'
  if (modifiers.soft) next.maskStyle = 'soft'
  if (modifiers.transparent) next.maskStyle = 'transparent'
  if (modifiers.small) next.size = 'small'
  if (modifiers.large) next.size = 'large'
  if (modifiers.top) next.textPosition = 'top'
  if (modifiers.bottom) next.textPosition = 'bottom'
  return next
}

function setup(el: HTMLElement, binding: DirectiveBinding) {
  const { visible, options } = parse(binding.value as Value, binding.modifiers)
  const opts = normalizeOptions(options, binding.modifiers)
  if (!visible) return
  const handle = openLoading(el, opts)
  ;(el as any).__vtl_token__ = handle.token
}

function teardown(el: HTMLElement) {
  const token = (el as any).__vtl_token__
  if (token) {
    closeLoading(token)
    delete (el as any).__vtl_token__
  }
}

export const vLoading: Directive<HTMLElement, Value> = {
  mounted(el, binding) {
    setup(el, binding)
  },
  updated(el, binding) {
    if (binding.value === binding.oldValue) return
    const prevVisible = parse(binding.oldValue as Value, binding.modifiers).visible
    const { visible } = parse(binding.value as Value, binding.modifiers)
    if (prevVisible === visible) return
    if (visible) setup(el, binding)
    else teardown(el)
  },
  unmounted(el) {
    teardown(el)
  }
}

export default vLoading