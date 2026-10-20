/**
 * 引入方式体积实测 —— 用 rollup（生产构建同款）测量三种引入方式的真实产物
 * 目的：用数据决定"全量引入 vs 按需引入"，不靠猜
 */
import { rollup } from 'rollup'
import { gzipSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LIB = resolve(__dirname, '../../dmk-loading/dist/index.js')
const OUT = resolve(__dirname, '.out')
mkdirSync(OUT, { recursive: true })

const CASES = [
  { id: 'full', label: '全量引入（import * as）', code: `import * as ALL from 'lib'\nconsole.log(Object.keys(ALL).length)` },
  { id: 'all-named', label: '具名全量（引全部 API）', code: null },
  { id: 'on-demand', label: '按需两个（open + close）', code: `import { openLoading, closeLoading } from 'lib'\nconsole.log(openLoading, closeLoading)` },
  { id: 'single', label: '按需一个（只要 open）', code: `import { openLoading } from 'lib'\nconsole.log(openLoading)` },
  { id: 'core-only', label: 'core-only（只要状态机）', code: `import { openLoading } from 'lib/core'\nconsole.log(openLoading)` }
]

// 具名全量：从真实导出列表里抓
const allNames = [
  'openLoading','closeLoading','closeAllLoading','setLoadingText','updateLoading',
  'isLoading','hasLoading','withLoading','withLoadingOn','setDefaultOptions',
  'getDefaultOptions','buildCtx','findSlotByToken','preset','presets','LoadingPreset',
  'TransitionLoading','mountLoadingHost','createLoading','vLoading','LoadingMask','LoadingHost'
]
CASES[1].code = `import { ${allNames.join(', ')} } from 'lib'\nconsole.log(${allNames.map(n=>n).join(',')})`

function kb(n) { return (n / 1024).toFixed(2) }

console.log('\n=== 引入方式体积实测（rollup 生产级 tree-shaking）===\n')

const rows = []
for (const c of CASES) {
  const entry = resolve(OUT, `${c.id}.entry.js`)
  writeFileSync(entry, c.code.replace("'lib'", `'${LIB}'`).replace("'lib/core'", `'${LIB.replace('/index.js', '/core.js')}'`))

  const bundle = await rollup({
    input: entry,
    treeshake: true,
    onwarn(w) { if (w.code !== 'EMPTY_BUNDLE') console.warn(`  [warn:${w.code}]`, w.message) }
  })
  const { output } = await bundle.generate({ format: 'esm' })
  const code = output[0].code
  const raw = Buffer.byteLength(code)
  const gz = gzipSync(Buffer.from(code)).length

  rows.push({ ...c, raw, gz })
  console.log(`${c.label.padEnd(26)} 原始 ${kb(raw).padStart(7)} KB   gzip ${kb(gz).padStart(6)} KB`)
}

console.log('\n=== 差异分析 ===\n')
const full = rows.find(r => r.id === 'full')
const single = rows.find(r => r.id === 'single')
const onDemand = rows.find(r => r.id === 'on-demand')

console.log(`全量 vs 只引 openLoading：多 ${kb(full.gz - single.gz)} KB gzip (${((1 - single.gz / full.gz) * 100).toFixed(1)}% 可省)`)
console.log(`全量 vs 引 open+close：  多 ${kb(full.gz - onDemand.gz)} KB gzip (${((1 - onDemand.gz / full.gz) * 100).toFixed(1)}% 可省)`)
console.log(`\n结论：全量 gzip 约 ${kb(full.gz)} KB —— ` +
  (full.gz < 10240
    ? '小于 10KB，属于"一次下载、全站共享、浏览器缓存一次"的量级。'
    : '超过 10KB，需认真评估。'))

writeFileSync(resolve(OUT, 'report.json'), JSON.stringify(rows, null, 2))
