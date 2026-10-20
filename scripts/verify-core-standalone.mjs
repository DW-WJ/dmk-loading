/**
 * 框架无关核心层的独立验证 —— 不依赖 Vue，直接在 Node 里跑
 * 证明 core 逻辑真的可以脱离 Vue 复用（这是多框架的基础）
 */
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { JSDOM } = require(process.env.JSDOM_PATH ? process.env.JSDOM_PATH + '/jsdom' : 'jsdom')

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true })
global.window = dom.window
global.document = dom.window.document
global.HTMLElement = dom.window.HTMLElement
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true, writable: true })

const path = await import('node:path')
const { pathToFileURL } = await import('node:url')

// 直接 import 源码 TS 编译后的 core（不经 Vue 组件层）
const mod = await import(pathToFileURL(path.resolve('dist/core/index.js')).href)
const { openLoading, closeLoading, hasLoading, isLoading, subscribeState, getSnapshot, closeAllLoading } = mod

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

console.log('\n=== 核心层脱离 Vue 独立验证 ===\n')

// 1. 基础开关
console.log('[1] 基础逻辑')
openLoading({ delay: 0 })
ok('open 后 hasLoading=true', hasLoading() === true)
closeLoading()
ok('close 后 hasLoading=false', hasLoading() === false)

// 2. 并发令牌
openLoading({ delay: 0 })
openLoading({ delay: 0 })
closeLoading()
ok('并发：关一个仍在加载', hasLoading() === true)
closeLoading()
ok('并发：全关才隐藏', hasLoading() === false)

// 3. 局部（不依赖 DOM API 之外的框架能力）
console.log('[2] 局部遮罩')
const box = document.createElement('div')
box.id = 'core-box'
document.body.appendChild(box)
openLoading('#core-box', { delay: 0 })
ok('局部已开启', isLoading('#core-box') === true)
ok('局部不影响全局', isLoading() === false)
closeLoading('#core-box')
ok('局部已关闭', isLoading('#core-box') === false)

// 4. 订阅机制（React 适配层的接入点）
console.log('[3] 订阅机制')
let notified = 0
const unsubscribe = subscribeState(() => notified++)
openLoading({ delay: 0 })
await sleep(50)
ok('状态变化时通知订阅者', notified > 0, `notified=${notified}`)
closeLoading()
await sleep(50)
unsubscribe()
const before = notified
openLoading({ delay: 0 })
await sleep(50)
ok('取消订阅后不再收到通知', notified === before, `before=${before} now=${notified}`)
closeAllLoading()

// 5. 快照 API
console.log('[4] 快照 API')
const snap = getSnapshot()
ok('快照包含 global 槽位', !!snap && !!snap.global)
ok('快照字段正确', typeof snap.global.visible === 'boolean' && Array.isArray(snap.global.tokens))
closeAllLoading()

// 6. 无 Vue 依赖验证
console.log('[5] 框架无关性')
const src = await import('node:fs').then(fs => fs.readFileSync('dist/core/index.js', 'utf8'))
ok('产物中无 import vue', !/from\s*["']vue["']/.test(src), '发现 vue 引用')
ok('产物中无 require vue', !/require\(["']vue["']\)/.test(src), '发现 vue 引用')
ok('产物体积小于 30KB', src.length < 30000, `实际 ${(src.length / 1024).toFixed(1)}KB`)

console.log(`\n=== 结果：${pass} 通过 / ${fail} 失败 ===\n`)
process.exit(fail > 0 ? 1 : 0)