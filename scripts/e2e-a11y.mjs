/**
 * 无障碍能力真实浏览器验证
 *
 * jsdom 测不出 CSS media query 和 aria 属性在真实渲染下的行为，
 * 所以这组断言必须在 chromium 里跑。
 */
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW_PATH || 'playwright')

let pass = 0, fail = 0
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name}${extra ? ' → ' + extra : ''}`) }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const BROWSER = process.env.BROWSER_PATH ||
  '/Users/duanmk/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const BASE = process.argv[2] || 'http://127.0.0.1:5180/'

console.log('\n=== 无障碍能力验证 ===\n')

const browser = await chromium.launch({ headless: true, executablePath: BROWSER })

// ---------- ① 动效降级 ----------
console.log('[1] prefers-reduced-motion 降级')
{
  // 开启"减弱动态效果"再开新 context（media emulation 必须在建页面前设）
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce'
  })
  const page = await ctx.newPage()
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await sleep(800)

  const mq = await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  ok('系统偏好已被识别（reduce）', mq === true)

  // 触发一个遮罩
  await page.evaluate(async () => {
    const m = await import('/src/lib/index.ts')
    const h = m.openLoading({ delay: 0, spinner: 'ring', transition: 'zoom', text: 'A11y' })
    await new Promise((r) => setTimeout(r, 300))
    m.closeLoading(h.token)
  })
  await sleep(150)

  const r = await page.evaluate(() => {
    const mask = document.querySelector('body > .vtl-mask')
    if (!mask) return { found: false }
    const cs = getComputedStyle(mask)
    const ring = mask.querySelector('.vtl-ring')
    return {
      found: true,
      hasClass: mask.className.includes('vtl-reduce-motion'),
      transitionDur: cs.transitionDuration,
      ringAnim: ring ? getComputedStyle(ring).animationName : 'no-ring',
      ringDur: ring ? getComputedStyle(ring).animationDuration : ''
    }
  })
  ok('遮罩挂 reduce class', r.hasClass === true, JSON.stringify(r))
  ok('过渡时长归零（≤1ms）', parseFloat(r.transitionDur) <= 0.002, r.transitionDur)
  ok('旋转动画已停止', r.ringAnim === 'none', `${r.ringAnim} / ${r.ringDur}`)

  await ctx.close()
}

// ---------- ② 正常模式下不受影响 ----------
console.log('\n[2] 默认模式动画正常（没被误降级）')
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await sleep(800)
  const r = await page.evaluate(async () => {
    const m = await import('/src/lib/index.ts')
    m.openLoading({ delay: 0, spinner: 'ring', text: 'X' })
    await new Promise((r) => setTimeout(r, 300))
    const mask = document.querySelector('body > .vtl-mask')
    const ring = mask?.querySelector('.vtl-ring')
    const out = {
      hasClass: mask?.className.includes('vtl-reduce-motion') ?? true,
      ringAnim: ring ? getComputedStyle(ring).animationName : 'none',
      ringDur: ring ? getComputedStyle(ring).animationDuration : ''
    }
    m.closeAllLoading()
    return out
  })
  ok('未挂 reduce class', r.hasClass === false, JSON.stringify(r))
  ok('旋转动画正常运行', r.ringAnim !== 'none', `${r.ringAnim}`)
  ok('动画时长 > 0', parseFloat(r.ringDur) > 0, r.ringDur)
  await page.close()
}

// ---------- ③ aria 属性 ----------
console.log('\n[3] ARIA 语义')
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await sleep(800)
  const r = await page.evaluate(async () => {
    const m = await import('/src/lib/index.ts')
    m.openLoading({ delay: 0, spinner: 'dots', text: '加载订单中' })
    await new Promise((r) => setTimeout(r, 300))
    const mask = document.querySelector('body > .vtl-mask')
    const out = {
      role: mask?.getAttribute('role'),
      live: mask?.getAttribute('aria-live'),
      busy: mask?.getAttribute('aria-busy'),
      label: mask?.getAttribute('aria-label'),
      // 文案必须对屏幕阅读器可见（不能被 aria-hidden 挡住）
      textInsideHidden: !!mask?.querySelector('.vtl-inner[aria-hidden="true"] .vtl-text')
    }
    m.closeAllLoading()
    return out
  })
  ok('role="status"', r.role === 'status', r.role)
  ok('aria-live="polite"', r.live === 'polite', r.live)
  ok('aria-busy="true"', r.busy === 'true', r.busy)
  ok('aria-label 是加载文案', r.label === '加载订单中', r.label)
  ok('⚠️ 文案被 aria-hidden 包住（屏幕阅读器读不到）', r.textInsideHidden === false,
    r.textInsideHidden ? '文案在 aria-hidden 容器内' : '已修正')
  await page.close()
}

// ---------- ④ 局部遮罩的 aria-busy 标记 ----------
console.log('\n[4] 局部遮罩：宿主 aria-busy')
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await sleep(800)
  // 先切到「表格区域加载」场景（它有 #s02-table 容器），否则测不到局部路径
  await page.locator('.nav-item', { hasText: '表格区域' }).first().click()
  await sleep(500)

  const r = await page.evaluate(async () => {
    const m = await import('/src/lib/index.ts')
    const el = document.querySelector('#s02-table')
    if (!el) return { skipped: true }
    m.openLoading('#s02-table', { delay: 0, text: '局部' })
    await new Promise((r) => setTimeout(r, 300))
    const during = {
      busy: el.getAttribute('aria-busy'),
      marker: el.hasAttribute('data-vtl-loading'),
      maskInside: !!el.querySelector('.vtl-mask')
    }
    m.closeAllLoading()
    await new Promise((r) => setTimeout(r, 300))
    return {
      during,
      after: {
        busy: el.getAttribute('aria-busy'),
        marker: el.hasAttribute('data-vtl-loading')
      }
    }
  })
  if (r.skipped) {
    console.log('  ⏭  跳过（#s02-table 未渲染）')
    fail++
  } else {
    ok('加载时宿主 aria-busy="true"', r.during.busy === 'true', String(r.during.busy))
    ok('加载时有 data-vtl-loading 标记', r.during.marker === true)
    ok('遮罩确实在宿主内部', r.during.maskInside === true)
    ok('关闭后 aria-busy 已清除', r.after.busy === null, String(r.after.busy))
    ok('关闭后标记已清除', r.after.marker === false)
  }
  await page.close()
}

// ---------- ⑤ z-index 令牌可覆盖 ----------
console.log('\n[5] z-index 令牌化')
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await sleep(800)
  const r = await page.evaluate(async () => {
    const read = () => {
      const m = document.querySelector('body > .vtl-mask')
      return m ? getComputedStyle(m).zIndex : null
    }
    const m = await import('/src/lib/index.ts')
    m.openLoading({ delay: 0, text: 'Z' })
    await new Promise((r) => setTimeout(r, 250))
    const def = read()
    m.closeAllLoading()
    await new Promise((r) => setTimeout(r, 250))

    // 业务侧覆盖令牌（真实痛点：AntD Modal z-index 是 1050）
    document.documentElement.style.setProperty('--vtl-z-mask', '3500')
    m.openLoading({ delay: 0, text: 'Z2' })
    await new Promise((r) => setTimeout(r, 250))
    const custom = read()
    m.closeAllLoading()
    document.documentElement.style.removeProperty('--vtl-z-mask')
    return { def, custom }
  })
  ok('默认 z-index = 2000', r.def === '2000', r.def)
  ok('令牌覆盖生效（--vtl-z-mask: 3500）', r.custom === '3500', r.custom)
  await page.close()
}

// ---------- ⑥ 暗色模式 ----------
console.log('\n[6] 暗色模式适配')
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: 'dark'
  })
  const page = await ctx.newPage()
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await sleep(800)
  const r = await page.evaluate(async () => {
    const m = await import('/src/lib/index.ts')
    m.openLoading({ delay: 0, text: 'Dark' })
    await new Promise((r) => setTimeout(r, 300))
    const mask = document.querySelector('body > .vtl-mask')
    const cs = mask ? getComputedStyle(mask) : null
    const out = { bg: cs?.backgroundColor || '', text: mask?.querySelector('.vtl-text')?.style.color || '' }
    m.closeAllLoading()
    return out
  })
  // 暗色下底色应该比浅色模式更深（alpha 更高或亮度更低）
  const alpha = (bg) => {
    const m = bg.match(/rgba?\(([^)]+)\)/)
    if (!m) return -1
    const p = m[1].split(',').map((s) => parseFloat(s))
    return p.length >= 4 ? p[3] : 1
  }
  ok('暗色模式底色已加深（alpha ≥ 0.6）', alpha(r.bg) >= 0.6, `${r.bg} alpha=${alpha(r.bg)}`)
  await ctx.close()
}

await browser.close()
console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
