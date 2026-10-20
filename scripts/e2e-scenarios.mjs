/**
 * 12 场景冒烟测试：逐个切换场景并点击关键按钮，确认无报错
 * 用法：PW_PATH=... node scripts/e2e-scenarios.mjs [baseUrl]
 */
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW_PATH || 'playwright')

const BASE = process.argv[2] || 'http://127.0.0.1:5180/'
const CHROME =
  process.env.BROWSER_PATH ||
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let pass = 0
let fail = 0
const failures = []
function ok(name, cond, extra = '') {
  if (cond) {
    pass++
    console.log(`  ✅ ${name}`)
  } else {
    fail++
    failures.push(name)
    console.log(`  ❌ ${name} ${extra}`)
  }
}

const browser = await chromium.launch({ headless: true, executablePath: CHROME, timeout: 30000 })
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })

const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`))

console.log(`\n=== 12 场景冒烟测试 ===\n`)
await page.goto(BASE, { waitUntil: 'networkidle' })
await sleep(600)

// ---------- 基础布局 ----------
console.log('[0] 页面骨架')
const navCount = await page.locator('.nav-item').count()
ok('场景导航已就绪（≥12）', navCount >= 12, `实际=${navCount}`)
ok('自由试验台渲染', (await page.locator('.lab').count()) === 1)
ok('日志面板渲染', (await page.locator('.logs').count()) === 1)

/** 精确判定：遮罩真实可见（display 非 none + 有尺寸 + opacity > 0） */
const maskVisible = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('body > .vtl-mask, #lab-zone .vtl-mask, #s02-table .vtl-mask')].filter((e) => {
      const cs = getComputedStyle(e)
      const r = e.getBoundingClientRect()
      return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.01 && r.width > 0 && r.height > 0
    }).length
  )

// ---------- 逐场景测试 ----------
const SCENES = [
  { idx: 0, name: '01 基础 CRUD', clicks: ['写法一 · 手动 open/close'], wait: 1600 },
  { idx: 1, name: '02 表格区域', clicks: ['第 1 页'], wait: 1800, check: async () => {
      const localMask = await page.locator('#s02-table .vtl-mask').count()
      return { ok: localMask >= 1, msg: `局部遮罩数=${localMask}` }
    } },
  { idx: 2, name: '03 预设方案', clicks: ['查询预设'], wait: 1700 },
  { idx: 3, name: '04 进度任务', clicks: ['分块上传（4 个文件）'], wait: 900, check: async () => {
      const t = await page.locator('body > .vtl-mask .vtl-text').first().textContent().catch(() => '')
      return { ok: /上传中 \d+%/.test(String(t)), msg: `文案="${t}"` }
    } },
  { idx: 4, name: '05 并发控制', clicks: ['✅ 正确：Promise.all + withLoading'], wait: 600, check: async () => {
      const n = await maskVisible()
      return { ok: n >= 1, msg: `遮罩数=${n}` }
    } },
  { idx: 5, name: '06 异常处理', clicks: ['失败路径（异常也关）'], wait: 1500, check: async () => {
      const err = await page.locator('.err-box').count()
      const mask = (await maskVisible())
      return { ok: err >= 1 && mask === 0, msg: `错误态=${err} 遮罩=${mask}（应无残留）` }
    } },
  { idx: 6, name: '07 多区域', clicks: ['三区并行加载'], wait: 600, check: async () => {
      const zones = await page.locator('.zone .vtl-mask').count()
      return { ok: zones >= 2, msg: `同时转圈的区域数=${zones}` }
    } },
  { idx: 7, name: '08 防闪烁', clicks: ['delay=300'], wait: 1800, check: async () => {
      const rows = await page.locator('.cmp tbody tr').count()
      return { ok: rows >= 1, msg: `对比表行数=${rows}` }
    } },
  { idx: 8, name: '09 组件封装', clicks: ['加载数据'], wait: 600, check: async () => {
      const n = await maskVisible()
      return { ok: n >= 1, msg: `遮罩数=${n}` }
    } },
  { idx: 9, name: '11 局部定位', clicks: ['① id 选择器'], wait: 600, check: async () => {
      const m = await page.locator('#s11-id-zone .vtl-mask').count()
      return { ok: m >= 1, msg: `局部遮罩=${m}` }
    } },
  { idx: 10, name: '12 生产模式', clicks: ['5. 分步骤'], wait: 700, check: async () => {
      const t = await page.locator('body > .vtl-mask .vtl-text').first().textContent().catch(() => '')
      return { ok: /步骤 \d\/3/.test(String(t)), msg: `文案="${t}"` }
    } },
  { idx: 11, navText: 'API 全景', name: '10 API 全景', clicks: ['openLoading / closeLoading'], wait: 500, check: async () => {
      const t = await page.locator('body > .vtl-mask .vtl-text').first().textContent().catch(() => '')
      return { ok: String(t).includes('token'), msg: `文案="${t}"` }
    } }
]

for (const s of SCENES) {
  console.log(`[${s.name}]`)
  // 按文本定位（稳定）；无 navText 时才回退索引
  if (s.navText) {
    await page.locator('.nav-item', { hasText: s.navText }).first().click()
  } else {
    await page.locator('.nav-item').nth(s.idx).click()
  }
  await sleep(400)

  const heading = await page.locator('.content').innerText()
  const btnCount = await page.locator('.content button').count()
  ok('场景内容已渲染', heading.length > 60 && btnCount >= 2, `内容长度=${heading.length} 按钮数=${btnCount}`)

  if (s.clicks) {
    for (const label of s.clicks) {
      const btn = page.getByRole('button', { name: label }).first()
      if (await btn.count()) {
        await btn.click()
      } else {
        ok(`按钮存在：${label}`, false, '未找到')
      }
    }
    await sleep(s.wait)
    if (s.check) {
      const r = await s.check()
      ok(s.name + ' 行为正确', r.ok, r.msg)
    }
  }

  // 清理残留遮罩
  await sleep(600)
  await page.evaluate(() => {
    // @ts-ignore
    if (window.__closeAll) window.__closeAll()
  })
  await sleep(300)
}

// ---------- 全局无残留 ----------
console.log('[13] 收尾检查')
await sleep(1500)
ok('无残留全局遮罩', ((await maskVisible())) === 0, `实际=${(await maskVisible())}`)
const bodyOverflow = await page.evaluate(() => document.body.style.overflow)
ok('body 滚动未锁死', bodyOverflow !== 'hidden', `overflow="${bodyOverflow}"`)

const realErrors = errors.filter((e) => !e.includes('favicon') && !e.includes('未找到局部遮罩目标'))
ok('无 JS 报错', realErrors.length === 0, `\n     ${realErrors.slice(0, 6).join('\n     ')}`)

// 截图
await page.locator('.nav-item').nth(0).click()
await sleep(400)
await page.screenshot({ path: 'docs/screenshot-demo.png' })

await browser.close()
console.log(`\n=== 场景冒烟结果：${pass} 通过 / ${fail} 失败 ===`)
if (fail) console.log(`失败项：${failures.join(' | ')}`)
console.log('')
process.exit(fail > 0 ? 1 : 0)