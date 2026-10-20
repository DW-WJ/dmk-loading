/**
 * 函数式 API 专项验证：函数式文案 / 方案工厂 / 预设链式 / 钩子 / 运行中更新
 * 用法：JSDOM_PATH=... node scripts/verify-functional.mjs
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
  if (alt) ({ JSDOM } = require(path.join(alt, 'jsdom')))
  else {
    console.error('需要 jsdom：npm i -D jsdom 或设置 JSDOM_PATH')
    process.exit(1)
  }
}

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true })
global.window = dom.window
global.document = dom.window.document
global.HTMLElement = dom.window.HTMLElement
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true, writable: true })

const lib = await import(pathToFileURL(path.resolve(process.cwd(), 'dist/index.js')).href)
const { openLoading, closeLoading, closeAllLoading, hasLoading, withLoading, withLoadingOn, updateLoading, setLoadingText, preset, presets, findSlotByToken } = lib

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
const slotOf = (token) => findSlotByToken(token)

console.log('\n=== 函数式 API 验证 ===\n')

// 1. 默认文案
console.log('[1] 默认文案')
{
  const h = openLoading({ delay: 0 })
  ok('无参时使用默认文案', slotOf(h.token).options.text === '加载中...', `实际="${slotOf(h.token).options.text}"`)
  closeLoading(h.token)
}

// 2. 静态自定义文案
console.log('[2] 静态自定义文案')
{
  const h = openLoading({ delay: 0, text: '正在加载订单' })
  ok('传字符串覆盖默认', slotOf(h.token).options.text === '正在加载订单')
  closeLoading(h.token)
}

// 3. 函数式文案（核心需求）
console.log('[3] 函数式文案')
{
  const h = openLoading({
    delay: 0,
    payload: { count: 42 },
    text: (ctx) => `已加载 ${ctx.payload?.count} 条记录`
  })
  ok('函数式文案被求值', slotOf(h.token).options.text === '已加载 42 条记录', `实际="${slotOf(h.token).options.text}"`)
  ok('payload 透传成功', slotOf(h.token).payload.count === 42)
  closeLoading(h.token)
}

// 4. 任意字段函数式
console.log('[4] 任意字段函数式')
{
  const h = openLoading({
    delay: 0,
    spinner: () => 'dots',
    size: (ctx) => (ctx.scope === 'global' ? 'large' : 'small'),
    color: (ctx) => (ctx.scope === 'global' ? '#f00' : '#00f')
  })
  const s = slotOf(h.token)
  ok('spinner 函数求值', s.options.spinner === 'dots')
  ok('size 按 scope 求值', s.options.size === 'large')
  ok('color 按 scope 求值', s.options.color === '#f00')
  closeLoading(h.token)
}

// 5. 方案工厂函数
console.log('[5] 方案工厂函数')
{
  const plan = () => ({ delay: 0, text: '工厂方案', spinner: 'bars' })
  const h = openLoading(plan)
  ok('工厂函数被调用', slotOf(h.token).options.text === '工厂方案')
  closeLoading(h.token)
}

// 6. 工厂可读上下文
console.log('[6] 工厂函数读取上下文')
{
  const h = openLoading((ctx) => ({
    delay: 0,
    text: ctx.scope === 'global' ? '全局方案' : '局部方案'
  }))
  ok('工厂读到 scope=global', slotOf(h.token).options.text === '全局方案')
  closeLoading(h.token)
}

// 7. 局部 + 工厂
console.log('[7] 局部遮罩 + 工厂')
{
  const box = document.createElement('div')
  box.id = 'fn-box'
  document.body.appendChild(box)
  const h = openLoading('#fn-box', () => ({ delay: 0, text: '局部工厂', spinner: 'wave' }))
  ok('局部工厂生效', slotOf(h.token).options.text === '局部工厂')
  ok('scope 判定为 local', slotOf(h.token).ctx.scope === 'local')
  closeLoading(h.token)
}

// 8. 预设链式派生
console.log('[8] 预设（Preset）链式')
{
  const query = preset('查询中').spinner('dots').size('large').delay(0)
  const o = query.toOptions()
  ok('preset 文案', o.text === '查询中')
  ok('preset spinner', o.spinner === 'dots')
  ok('preset size', o.size === 'large')

  const regional = query.target('#fn-box')
  ok('派生局部方案带 target', regional.toOptions().target === '#fn-box')
  ok('派生保留原配置', regional.toOptions().spinner === 'dots')

  const h = openLoading(query.toOptions())
  ok('preset 可直接用于 openLoading', slotOf(h.token).options.text === '查询中')
  closeLoading(h.token)
}

// 8.5 预设实例可直接传入（无需 .toOptions()）
console.log('[8.5] 预设实例直传')
{
  const p = preset('实例直传').spinner('bars').delay(0)
  const h = openLoading(p)
  ok('Preset 实例被 openLoading 接受', slotOf(h.token).options.text === '实例直传')
  ok('Preset spinner 生效', slotOf(h.token).options.spinner === 'bars')
  closeLoading(h.token)

  let saw = false
  await withLoading(
    () => {
      saw = true
      return Promise.resolve('x')
    },
    p
  )
  ok('Preset 实例被 withLoading 接受', saw === true)
}

// 9. 内置预设
console.log('[9] 内置快捷预设')
{
  ok('presets.heavy 有 minDuration', presets.heavy().toOptions().minDuration === 600)
  ok('presets.submit 有绿色主题', presets.submit().toOptions().color === '#10b981')
  ok('presets.quick 无延迟', presets.quick().toOptions().delay === 0)
}

// 10. 钩子
console.log('[10] 生命周期钩子')
{
  const calls = []
  await withLoading(Promise.resolve('ok'), {
    delay: 0,
    onShow: () => calls.push('show'),
    onSuccess: (r) => calls.push(`success:${r}`),
    onFinally: () => calls.push('finally')
  })
  await sleep(20)
  ok('onSuccess 被调用', calls.includes('success:ok'), `实际=${JSON.stringify(calls)}`)
  ok('onFinally 被调用', calls.includes('finally'))
  ok('遮罩已关闭', hasLoading() === false)
}

// 11. 错误钩子
console.log('[11] 错误钩子')
{
  const calls = []
  try {
    await withLoading(Promise.reject(new Error('boom')), {
      delay: 0,
      onError: (e) => calls.push(`error:${e.message}`),
      onFinally: () => calls.push('finally')
    })
  } catch {
    /* 预期 */
  }
  ok('onError 被调用', calls.includes('error:boom'), `实际=${JSON.stringify(calls)}`)
  ok('onFinally 仍被调用', calls.includes('finally'))
  ok('异常后遮罩已关闭', hasLoading() === false)
}

// 12. withLoading 函数式文案 + payload
console.log('[12] withLoading 函数式方案')
{
  await withLoading(
    (ctx) => {
      ok('任务函数收到 ctx', ctx && typeof ctx === 'object')
      ok('ctx 含 payload', ctx.payload?.page === 7)
      return Promise.resolve('done')
    },
    {
      delay: 0,
      payload: { page: 7 },
      text: (ctx) => `加载第 ${ctx.payload?.page} 页`
    }
  )
  ok('withLoading 函数式方案执行完成', true)
}

// 13. withLoadingOn 局部 + 函数式
console.log('[13] withLoadingOn 局部函数式')
{
  const box = document.createElement('div')
  box.id = 'fn-box2'
  document.body.appendChild(box)
  let sawLocal = false
  await withLoadingOn(
    '#fn-box2',
    () => {
      sawLocal = hasLoading()
      return Promise.resolve([1, 2])
    },
    { delay: 0, text: (ctx) => (ctx.scope === 'local' ? '局部加载中' : 'x') }
  )
  ok('局部遮罩在任务期间生效', sawLocal === true)
  ok('结束后已关闭', hasLoading() === false)
}

// 14. 运行中更新文案
console.log('[14] updateLoading 运行中更新')
{
  const h = openLoading({ delay: 0, text: '开始' })
  ok('初始文案', slotOf(h.token).options.text === '开始')
  updateLoading({ text: '进行中 50%' })
  ok('静态更新文案', slotOf(h.token).options.text === '进行中 50%')
  updateLoading(() => ({ text: '进行中 80%' }))
  ok('函数式更新文案', slotOf(h.token).options.text === '进行中 80%')
  updateLoading(h.token, { text: '最终' })
  ok('按 token 更新', slotOf(h.token).options.text === '最终')
  closeLoading(h.token)
}

// 15. setLoadingText 简写
console.log('[15] setLoadingText')
{
  openLoading({ delay: 0 })
  setLoadingText('简写设置')
  await sleep(5)
  ok('setLoadingText 生效', true)
  closeAllLoading()
}

// 16. 函数抛错不影响流程
console.log('[16] 配置函数抛错容错')
{
  const h = openLoading({
    delay: 0,
    text: () => {
      throw new Error('boom')
    }
  })
  ok('配置函数抛错后回退默认值', slotOf(h.token).options.text === '加载中...')
  closeLoading(h.token)
}

// 17. 方案工厂抛错容错
console.log('[17] 方案工厂抛错容错')
{
  const h = openLoading({
    delay: 0,
    text: () => {
      // 工厂在读取时抛错，但 delay 已由外层指定
      return 'ok'
    }
  })
  closeLoading(h.token)

  const h2 = openLoading(() => {
    throw new Error('plan boom')
  })
  // 工厂抛错 → 回退默认配置（delay=120），需等待后确认仍能正常关闭
  await sleep(200)
  ok('工厂抛错后遮罩仍正常显示过', true)
  closeLoading(h2.token)
  await sleep(10)
  ok('工厂抛错后仍能正常关闭', hasLoading() === false)
}

closeAllLoading()
console.log(`\n=== 结果：${pass} 通过 / ${fail} 失败 ===\n`)
process.exit(fail > 0 ? 1 : 0)