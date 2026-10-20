/**
 * 发布前验证 —— 拦截「能 build 但发出去用不了」的问题
 *
 * 背景：踩过两次 —— 博客站 import 报 TS7016（dist 缺 .d.ts）、
 *      vite 子入口没构建（import 'xxx/vite' 404）。
 *      都是构建成功但包不完整，npm publish 之后才发现。
 *
 * 用法：node scripts/verify-package.mjs
 */
import { existsSync, statSync, readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

let pass = 0, fail = 0
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name}${extra ? ' → ' + extra : ''}`) }
}
const kb = (p) => (statSync(p).size / 1024).toFixed(1)

console.log('\n=== 发布前验证 ===\n')

// ---------- ① package.json 必备字段 ----------
console.log('[1] package.json 元信息')
const pj = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
;['name', 'version', 'description', 'license', 'author', 'keywords', 'repository', 'homepage', 'bugs']
  .forEach((k) => ok(`${k} 已声明`, pj[k] !== undefined))
ok('engines.node 已声明', !!pj.engines?.node)
ok('files 字段限制发布范围', Array.isArray(pj.files) && pj.files.length > 0,
  JSON.stringify(pj.files))
ok('publishConfig.access = public', pj.publishConfig?.access === 'public')
ok('version 是合法 semver', /^\d+\.\d+\.\d+/.test(pj.version || ''), pj.version)

// ---------- ② 入口文件齐全 ----------
console.log('\n[2] 入口与产物')
const EXPORTS = Object.keys(pj.exports || {})
EXPORTS.forEach((key) => {
  const entry = pj.exports[key]
  const paths = typeof entry === 'string' ? [entry] : Object.values(entry)
  paths.forEach((p) => {
    ok(`exports["${key}"] → ${p}`, existsSync(join(root, p)))
  })
})
;[pj.main, pj.module, pj.types].filter(Boolean).forEach((p) => {
  ok(`顶层字段 ${p}`, existsSync(join(root, p)))
})

// ---------- ③ 声明文件内容有效 ----------
console.log('\n[3] 类型声明有效性')
const dts = join(root, 'dist/index.d.ts')
if (existsSync(dts)) {
  const content = readFileSync(dts, 'utf8')
  ok('index.d.ts 非空', content.length > 100, `${content.length} 字符`)
  ok('声明了核心 API', /openLoading|closeLoading/.test(content))
  // 声明里的相对 import 必须能解析。
  // 注意：TS 解析模块时会自动补 .d.ts / .d.mts 等后缀，
  // 所以 './core/manager' 对应的物理文件是 './core/manager.d.ts'。
  // 验证时要按 TS 的规则试完所有候选后缀，不能只查原样路径。
  const rels = [...content.matchAll(/from\s+['"](\.[^'"]+)['"]/g)].map((m) => m[1])
  const CANDIDATES = ['', '.d.ts', '.d.mts', '/index.d.ts', '.vue.d.ts']
  const bad = rels.filter((r) => {
    const base = r.replace(/\.vue$/, '') // .vue 声明物理名是 xxx.vue.d.ts
    return !CANDIDATES.some((ext) => existsSync(resolve(dirname(dts), base + ext)))
  })
  ok('声明内相对引用可解析（按 TS 后缀规则）', bad.length === 0,
    bad.length ? bad.join(', ') : `共 ${rels.length} 个引用全部可解析`)
} else {
  ok('index.d.ts 存在', false, '缺失')
}

// ---------- ④ 关键子路径 ----------
console.log('\n[4] 关键子路径（消费方会用到）')
;[
  ['dist/vite.js', '构建期自动注入插件'],
  ['dist/vite.d.ts', '插件类型声明'],
  ['dist/style.css', '样式'],
  ['dist/global.d.ts', '零 import 全局类型']
].forEach(([p, desc]) => {
  ok(`${desc} (${p})`, existsSync(join(root, p)))
})

// ---------- ⑤ core 独立产物无框架依赖 ----------
console.log('\n[5] core 产物框架无关性')
const corePath = join(root, 'dist/core/index.js')
if (existsSync(corePath)) {
  const code = readFileSync(corePath, 'utf8')
  const imports = [...code.matchAll(/from\s*["']([^"']+)["']/g)].map((m) => m[1])
  const frameworkDeps = imports.filter((i) => /^(vue|react|react-dom|@arkui|@vue)/.test(i))
  ok('core 无框架依赖', frameworkDeps.length === 0, frameworkDeps.join(', '))
  ok('core 体积合理 (<40KB)', statSync(corePath).size < 40 * 1024, `${kb(corePath)} KB`)
} else {
  ok('core 独立产物存在', false, '缺失（npm run build:core）')
}

// ---------- ⑥ 无障碍特性在产物里 ----------
console.log('\n[6] 无障碍特性')
const css = join(root, 'dist/style.css')
if (existsSync(css)) {
  const s = readFileSync(css, 'utf8')
  ok('prefers-reduced-motion 降级', /prefers-reduced-motion/.test(s))
  ok('prefers-color-scheme 暗色', /prefers-color-scheme/.test(s))
  ok('z-index 令牌化', /--vtl-z-mask/.test(s))
}
const js = join(root, 'dist/index.js')
if (existsSync(js)) {
  const s = readFileSync(js, 'utf8')
  ok('aria-busy 标记', /aria-busy|ariaBusy/.test(s))
  ok('aria-live 播报', /aria-live|ariaLive/.test(s))
  ok('reduce-motion class', /vtl-reduce-motion/.test(s))
}

// ---------- ⑦ 附带文件 ----------
console.log('\n[7] 仓库附带文件')
;['README.md', 'LICENSE', 'CHANGELOG.md'].forEach((f) => {
  ok(`${f} 存在${pj.files?.includes(f) ? ' 且在发布范围' : ''}`,
    existsSync(join(root, f)) && (pj.files?.includes(f) || f === 'README.md'))
})

// ---------- ⑧ dist 不该有 demo ----------
console.log('\n[8] 发布产物纯净度')
if (existsSync(join(root, 'dist'))) {
  const files = readdirSync(join(root, 'dist'))
  const suspicious = files.filter((f) => /demo|scenario|test|spec/i.test(f))
  ok('dist 无 demo/测试文件', suspicious.length === 0, suspicious.join(', '))
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
if (fail) {
  console.log('\n❌ 存在发布阻断项，请修完再 npm publish')
  process.exit(1)
}
console.log('\n✅ 可以发布')
