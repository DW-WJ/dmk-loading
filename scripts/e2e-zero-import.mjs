/**
 * 场景 13「零 import 全局调用」真实浏览器验证
 *
 * 验证的不只是"点按钮有反应"，而是这套方案的三个核心承诺：
 *   ① 页面源码里真的没有 import
 *   ② 构建产物里真的被注入了 import（不是靠 window 全局蒙对的）
 *   ③ window.$loading 真的可用（.js 文件场景）
 */
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW_PATH || 'playwright')
const __dirname = dirname(fileURLToPath(import.meta.url))

let pass = 0, fail = 0
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name}${extra ? ' → ' + extra : ''}`) }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const maskVisible = (page) =>
  page.evaluate(() => {
    const els = [...document.querySelectorAll('body > .vtl-mask')]
    return els.filter((e) => {
      const cs = getComputedStyle(e)
      const r = e.getBoundingClientRect()
      return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.01 && r.width > 0
    }).length
  })
const globalMaskText = (page) =>
  page.evaluate(() => {
    const els = [...document.querySelectorAll('body > .vtl-mask')]
    const vis = els.find((e) => getComputedStyle(e).display !== 'none')
    return vis?.querySelector('.vtl-text')?.textContent ?? ''
  })

const BROWSER = process.env.BROWSER_PATH ||
  '/Users/duanmk/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const BASE = process.argv[2] || 'http://127.0.0.1:5180/'

console.log(`\n=== 零 import 方案真实浏览器验证 (${BASE}) ===\n`)

console.log('[1] 源码层：页面确实没有 import')
{
  const src = readFileSync(resolve(__dirname, '../src/demo/scenarios/S13ZeroImport.vue'), 'utf8')
  const script = src.slice(src.indexOf('<script setup'), src.indexOf('</script>'))
  const importLines = script.split('\n').filter((l) => l.trim().startsWith('import '))
  ok('脚本块里只有 1 行 import（vue 的 ref）', importLines.length === 1, `实际 ${importLines.length} 行：${importLines.join(' | ')}`)
  ok('没有任何 loading 库的 import',
    !importLines.some((l) => /transition-loading|\.\.\/\.\.\/lib/.test(l)))
  ok('但代码里用了 openLoading/closeLoading/withLoading',
    /openLoading\(/.test(script) && /closeLoading\(/.test(script) && /withLoading\(/.test(script))
}

const browser = await chromium.launch({ headless: true, executablePath: BROWSER })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

await page.goto(BASE, { waitUntil: 'networkidle' })
await sleep(800)

console.log('\n[2] 构建层：自动注入真的生效了')
{
  // 直接请求 S13 模块，看 vite 返回的编译产物里有没有被插入 import
  const res = await page.request.get(`${BASE}src/demo/scenarios/S13ZeroImport.vue`)
  const code = await res.text()
  const injected = /import\s*\{[^}]*\bopenLoading\b[^}]*\}\s*from/.test(code)
  ok('编译产物含注入的 import 语句', injected,
    code.split('\n').filter((l) => l.includes('openLoading') && l.includes('import')).slice(0, 2).join(' | ') || '(未找到)')
  // 注入来源：可能是原始别名 '@/lib/index'（未被 vite 改写），
  // 也可能被 vite 解析成绝对路径 '/src/lib/index.ts'，
  // dev 下 HMR 还会追加 '?t=<时间戳>'。所以只比对路径主体，忽略 query。
  // 注意：要匹配"含 openLoading 的具名导入语句"，不能匹配整行
  //（第一行的 vite/client import 也含字符串 'S13ZeroImport' 等干扰）。
  const injectRe = /import\s*\{[^}]*\bopenLoading\b[^}]*\}\s*from\s*["']([^"']+)["']/
  const srcPath = (code.match(injectRe) || [])[1] || ''
  ok('注入来源指向库入口',
    /(\/src\/lib\/index|@\/lib\/index|dmk-loading)/.test(srcPath),
    `实际来源: ${srcPath || '(未找到注入语句)'}`)
  ok('没注多余的函数（只注用到的）',
    injected && !/import\s*\{[^}]*\bpreset\b/.test(code))
}

console.log('\n[3] 页面加载到场景 13')
{
  await page.locator('.nav-item', { hasText: '零 import' }).first().click()
  await sleep(500)
  ok('场景标题正确', (await page.locator('.scn-title').textContent())?.includes('零 import'))
  const btnCount = await page.locator('.scn-btns button').count()
  ok('5 个按钮就绪', btnCount === 5, `实际 ${btnCount}`)
  ok('初始无遮罩', (await maskVisible(page)) === 0)
}

console.log('\n[4] 全局手动开关（零 import 的 openLoading）')
{
  await page.locator('.scn-btns button', { hasText: '全局手动开关' }).click()
  await sleep(450)
  ok('遮罩出现', (await maskVisible(page)) >= 1)
  ok('文案正确', (await globalMaskText(page)) === '正在加载订单...', await globalMaskText(page))
  ok('body 滚动被锁', await page.evaluate(() => document.body.style.overflow === 'hidden'))
  await sleep(1600)
  ok('请求结束自动关闭', (await maskVisible(page)) === 0)
  ok('滚动解锁', await page.evaluate(() => document.body.style.overflow !== 'hidden'))
}

console.log('\n[5] 全局 withLoading（零 import 的一行包裹）')
{
  await page.locator('.scn-btns button', { hasText: '全局 withLoading' }).click()
  await sleep(450)
  ok('遮罩出现', (await maskVisible(page)) >= 1)
  ok('文案正确', (await globalMaskText(page)) === '自动开关联动', await globalMaskText(page))
  await sleep(1700)
  ok('自动关闭', (await maskVisible(page)) === 0)
  const listItems = await page.locator('.z-list li').count()
  ok('数据已更新（3 条订单）', listItems === 3, `实际 ${listItems}`)
}

console.log('\n[6] 局部遮罩：只有目标区被遮（对照未受影响区）')
{
  // 前置确认：局部目标元素必须已挂载，否则库会按设计降级为全局遮罩
  // （找不到元素时降级是正确行为 —— 宁可遮全屏也不让"请求结束但没关闭"）
  const hasRegion = await page.locator('#s13-region').count()
  ok('局部目标元素已挂载', hasRegion === 1, `实际 ${hasRegion}`)

  const targetBefore = await page.locator('.z-target').boundingBox()
  const otherBefore = await page.locator('.z-box').first().boundingBox()

  await page.locator('.scn-btns button', { hasText: '局部 · id' }).click()
  await sleep(450)

  // 局部遮罩挂在 #s13-region 内部，不在 body 下
  const localMask = await page.evaluate(() => {
    const el = document.querySelector('#s13-region .vtl-mask')
    if (!el) return null
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    const host = document.querySelector('#s13-region').getBoundingClientRect()
    return {
      position: cs.position,
      visible: cs.display !== 'none' && Number(cs.opacity) > 0.01,
      w: Math.round(r.width), h: Math.round(r.height),
      hostW: Math.round(host.width), hostH: Math.round(host.height)
    }
  })
  ok('局部遮罩已挂到目标元素内', !!localMask)
  ok('遮罩可见', !!localMask?.visible)
  ok('position: absolute（局部语义正确）', localMask?.position === 'absolute', localMask?.position)
  // 宽度允许 8px 容差：遮罩自身有 1px 描边 + inset:0 会略微溢出宿主 content-box
  ok('尺寸贴合目标区（宽 ±8px）', !!localMask && Math.abs(localMask.w - localMask.hostW) <= 8,
    localMask ? `mask ${localMask.w} vs host ${localMask.hostW}` : '')
  ok('文案正确', (await page.locator('#s13-region .vtl-text').textContent()) === '只遮这个区域')

  // 关键：未受影响的框完全没变
  const otherAfter = await page.locator('.z-box').first().boundingBox()
  const targetAfter = await page.locator('.z-target').boundingBox()
  ok('未受影响区位置不变', Math.abs(otherAfter.y - otherBefore.y) < 1)
  ok('目标区位置不变', Math.abs(targetAfter.y - targetBefore.y) < 1)
  ok('页面无全局遮罩（只有局部）', (await maskVisible(page)) === 0)

  // 局部场景的请求耗时 1400ms，等到 2s 足够（还要留出 zoom 过渡时间）
  await sleep(2000)
  const localClosed = await page.evaluate(() => {
    const el = document.querySelector('#s13-region .vtl-mask')
    if (!el) return true
    const cs = getComputedStyle(el)
    return cs.display === 'none' || Number(cs.opacity) < 0.02
  })
  ok('局部遮罩自动关闭', localClosed)
}

console.log('\n[7] window.$loading（.js 文件里也能用）')
{
  ok('window.$loading 存在', await page.evaluate(() => typeof window.$loading?.open === 'function'))
  await page.locator('.scn-btns button', { hasText: 'window.$loading' }).click()
  await sleep(450)
  ok('遮罩出现', (await maskVisible(page)) >= 1)
  ok('文案正确', (await globalMaskText(page)) === '通过 window.$loading 调用', await globalMaskText(page))
  await sleep(1500)
  ok('自动关闭', (await maskVisible(page)) === 0)
}

console.log('\n[8] 其余场景未受影响（回归）')
{
  await page.locator('.nav-item', { hasText: '基础 CRUD' }).first().click()
  await sleep(400)
  await page.locator('.scn-btns button').first().click()
  await sleep(450)
  ok('场景 1 遮罩正常', (await maskVisible(page)) >= 1)
  await sleep(1600)
  ok('场景 1 自动关闭', (await maskVisible(page)) === 0)
}

console.log('\n[9] 健康检查')
{
  const real = errors.filter((e) => !/favicon|\.map$/.test(e))
  ok('控制台零报错', real.length === 0, real.slice(0, 2).join(' | '))
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
await page.screenshot({ path: resolve(__dirname, '../docs/shot-zero-import.png') })
await browser.close()
process.exit(fail ? 1 : 0)
