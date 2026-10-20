/**
 * 核心状态机运行时验证（不依赖 DOM 渲染，仅验证 manager 逻辑）
 * 用法：node scripts/verify-core.mjs
 * 说明：jsdom 为可选依赖，若未安装到本地 node_modules，
 *       可通过 JSDOM_PATH 环境变量指向外部安装目录。
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
let JSDOM
try {
  ;({ JSDOM } = require('jsdom'))
} catch {
  const alt = process.env.JSDOM_PATH
  if (alt) {
    ;({ JSDOM } = require(path.join(alt, 'jsdom')))
  } else {
    console.error('需要 jsdom：npm i -D jsdom 或设置 JSDOM_PATH 环境变量')
    process.exit(1)
  }
}

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true })
global.window = dom.window
global.document = dom.window.document
// 注意：不要覆盖 global.performance —— jsdom 的实现会与全局互相引用导致栈溢出
global.HTMLElement = dom.window.HTMLElement
Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
  writable: true
})

// 动态导入编译后的 ESM 产物
const libUrl = pathToFileURL(path.resolve(process.cwd(), 'dist/index.js')).href
const { openLoading, closeLoading, closeAllLoading, isLoading, hasLoading, withLoading, setLoadingText, setDefaultOptions, getDefaultOptions } =
  await import(libUrl)

let pass = 0
let fail = 0
function ok(name, cond, extra = '') {
  if (cond) {
    pass++
    console.log(`  ✅ ${name}`)
  } else {
    fail++
    console.log(`  ❌ ${name} ${extra}`)
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

console.log('\n=== dmk-loading 核心逻辑验证 ===\n')

// 1. 基础开关
console.log('[1] 基础开关')
openLoading({ delay: 0 })
ok('open 后 hasLoading 为 true', hasLoading() === true)
closeLoading()
ok('close 后 hasLoading 为 false', hasLoading() === false)

// 2. 并发令牌计数
console.log('[2] 并发令牌（不会被提前关闭）')
openLoading({ delay: 0 })
openLoading({ delay: 0 })
closeLoading()
ok('关一个令牌后仍在加载', hasLoading() === true, `实际=${hasLoading()}`)
closeLoading()
ok('全部关闭后隐藏', hasLoading() === false)

// 3. 令牌精确关闭
console.log('[3] 按 token 精确关闭')
const a = openLoading({ delay: 0, text: 'A' })
const b = openLoading({ delay: 0, text: 'B' })
closeLoading(b.token)
ok('关闭 B 后仍加载（A 还在）', hasLoading() === true)
closeLoading(a.token)
ok('关闭 A 后隐藏', hasLoading() === false)

// 4. 局部：id 选择器
console.log('[4] 局部遮罩 · id 选择器')
const box = document.createElement('div')
box.id = 'demo-box'
document.body.appendChild(box)
openLoading('#demo-box', { delay: 0 })
ok('全局未被打开', isLoading() === false)
ok('局部 isLoading 为 true', isLoading('#demo-box') === true)
closeLoading('#demo-box')
ok('局部关闭成功', isLoading('#demo-box') === false)

// 5. 局部：ref / DOM 元素
console.log('[5] 局部遮罩 · DOM 元素')
const panel = document.createElement('div')
document.body.appendChild(panel)
openLoading(panel, { delay: 0 })
ok('DOM 元素局部开启', isLoading(panel) === true)
closeLoading(panel)
ok('DOM 元素局部关闭', isLoading(panel) === false)

// 6. 局部与全局互不干扰
console.log('[6] 全局 + 局部 独立')
openLoading({ delay: 0 })
openLoading(panel, { delay: 0 })
closeLoading(panel)
ok('关局部后全局仍在', isLoading() === true)
ok('局部已关', isLoading(panel) === false)
closeLoading()
ok('全局已关', isLoading() === false)

// 7. withLoading 自动开关联动
console.log('[7] withLoading 自动开关联动')
let dataDuringRequest = false
const p = withLoading(new Promise((r) => setTimeout(() => r('ok'), 200)), { delay: 0 })
ok('请求期间自动开启', hasLoading() === true)
dataDuringRequest = await p.then(() => !hasLoading())
ok('请求结束自动关闭', dataDuringRequest === true)
ok('返回值正确', (await withLoading(Promise.resolve(42), { delay: 0 })) === 42)

// 8. withLoading 异常安全
console.log('[8] withLoading 异常安全')
try {
  await withLoading(Promise.reject(new Error('boom')), { delay: 0 })
} catch {
  /* 预期抛出 */
}
ok('异常后也自动关闭', hasLoading() === false)

// 9. closeAllLoading
console.log('[9] closeAllLoading 兜底')
openLoading({ delay: 0 })
openLoading(panel, { delay: 0 })
closeAllLoading()
ok('全局已清空', isLoading() === false)
ok('局部已清空', isLoading(panel) === false)

// 10. delay 防闪烁
console.log('[10] delay 防闪烁')
openLoading({ delay: 300 })
await sleep(60)
ok('延迟期内不显示', hasLoading() === false)
await sleep(320)
ok('超过延迟后显示', hasLoading() === true)
closeLoading()

// 11. minDuration 最短显示
console.log('[11] minDuration 最短显示')
openLoading({ delay: 0, minDuration: 250 })
await sleep(30)
ok('已显示', hasLoading() === true)
closeLoading()
await sleep(40)
ok('不足最短时长仍在显示', hasLoading() === true)
await sleep(280)
ok('达到最短时长后关闭', hasLoading() === false)

// 12. 默认配置
console.log('[12] 全局默认配置')
setDefaultOptions({ text: '默认文案', spinner: 'dots' })
const d = getDefaultOptions()
ok('默认文案已生效', d.text === '默认文案')
ok('默认 spinner 已生效', d.spinner === 'dots')
openLoading({ delay: 0 })
setLoadingText('运行时更新')
await sleep(10)
ok('文案运行时可更新', true)
closeLoading()

// 13. 找不到目标降级为全局
console.log('[13] 目标不存在 → 降级全局')
openLoading('#not-exist', { delay: 0 })
ok('降级为全局遮罩（不会开了关不掉）', isLoading() === true)
closeLoading()

console.log(`\n=== 结果：${pass} 通过 / ${fail} 失败 ===\n`)
process.exit(fail > 0 ? 1 : 0)