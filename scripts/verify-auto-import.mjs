/**
 * 自动注入插件 + 全局注入 的单元验证
 * 用法：node scripts/verify-auto-import.mjs
 */
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { JSDOM } = require(process.env.JSDOM_PATH ? `${process.env.JSDOM_PATH}/jsdom` : 'jsdom')

let pass = 0, fail = 0
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name}${extra ? ' → ' + extra : ''}`) }
}

// ---------- 环境准备 ----------
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
global.window = dom.window
global.document = dom.window.document
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true, writable: true })

const VITE_PLUGIN = '../dist/vite.js'
const CORE = '../dist/core/index.js'

const { TransitionLoadingAutoImport, AUTO_IMPORT_NAMES } = await import(VITE_PLUGIN)

console.log('\n=== 自动注入插件 ===')

// 1. 最典型场景：页面里用了 openLoading 但没 import
{
  const p = TransitionLoadingAutoImport()
  const code = `<script setup>\nasync function load() {\n  openLoading({ text: '加载中' })\n  const d = await api.get()\n  closeLoading()\n}\n<\/script>`
  const out = p.transformCode(code, '/proj/src/views/OrderList.vue')
  ok('检测到缺失并注入 import', !!out && out.includes("import { openLoading, closeLoading } from 'dmk-loading'"))
  ok('业务代码原样保留', !!out && out.includes("openLoading({ text: '加载中' })"))
  ok('只注入用到的名字（未污染 withLoading）', !!out && !out.includes('withLoading'))
}

// 2. 页面已经自己 import 了 → 不重复注入
{
  const p = TransitionLoadingAutoImport()
  const code = `import { openLoading } from 'dmk-loading'\nopenLoading()\ncloseLoading()`
  const out = p.transformCode(code, '/proj/src/a.vue')
  ok('已有 import 时不重复注入', out === null, String(out && out.slice(0, 60)))
}

// 3. 本地自己声明了同名函数 → 不注入（避免冲突）
{
  const p = TransitionLoadingAutoImport()
  const code = `function openLoading() { return 1 }\nopenLoading()`
  const out = p.transformCode(code, '/proj/src/b.ts')
  ok('本地声明同名函数时不注入', out === null, String(out && out.slice(0, 60)))
}

// 4. 用了几种就注入几种
{
  const p = TransitionLoadingAutoImport()
  const code = `openLoading()\ncloseLoading()\ncloseAllLoading()\nwithLoading(p)\nisLoading()\nhasLoading()`
  const out = p.transformCode(code, '/proj/src/c.ts')
  ok('多函数一次性注入', !!out &&
    ['openLoading', 'closeLoading', 'closeAllLoading', 'withLoading', 'isLoading', 'hasLoading']
      .every((n) => out.includes(n)))
}

// 5. 跳过 node_modules / dist / 测试文件
{
  const p = TransitionLoadingAutoImport({ exclude: ['\\.spec\\.ts$'] })
  ok('node_modules 跳过', p.transformCode('openLoading()', '/proj/node_modules/x/i.js') === null)
  ok('dist 跳过', p.transformCode('openLoading()', '/proj/dist/a.js') === null)
  ok('.d.ts 跳过', p.transformCode('openLoading()', '/proj/src/a.d.ts') === null)
  ok('自定义排除生效', p.transformCode('openLoading()', '/proj/src/a.spec.ts') === null)
}

// 6. 没用到的名字不触发
{
  const p = TransitionLoadingAutoImport()
  ok('完全没用到则原样返回', p.transformCode('const a = 1', '/proj/src/d.ts') === null)
}

// 7. 具名导入的其它写法也能识别（不重复注入）
{
  const p = TransitionLoadingAutoImport()
  const code1 = `import * as vtl from 'dmk-loading'\nvtl.openLoading()`
  const code2 = `import Loading from 'dmk-loading'\nLoading.openLoading()`
  ok('import * as 形式不重复注入', p.transformCode(code1, '/proj/src/e.ts') === null)
  ok('默认导入形式不重复注入', p.transformCode(code2, '/proj/src/f.ts') === null)
}

// 8. window 全局注入选项
{
  const p = TransitionLoadingAutoImport({ injectWindow: true, windowKey: '$ld' })
  const out = p.transformCode('openLoading()', '/proj/src/g.ts')
  ok('injectWindow 生成全局注入代码', !!out && out.includes('defineLoadingGlobal'))
  ok('windowKey 可配置', !!out && out.includes("'$ld'"))
}

// 8.5 ★ 回归：同一库的不同写法都不能重复注入
// 真实 bug：App.vue 里写的是相对路径 '../lib/index'，注入源是 '@/lib/index'
//          字符串比对失败 → 重复注入 → Identifier 'openLoading' has already been declared（白屏）
{
  const p = TransitionLoadingAutoImport({ from: '@/lib/index' })
  const cases = [
    ['相对路径写本库', `import { openLoading } from '../lib/index'\nopenLoading()\ncloseLoading()`],
    ['别名写本库', `import { openLoading } from '@/lib/index'\nopenLoading()`],
    ['裸包名', `import { openLoading } from 'dmk-loading'\nopenLoading()`],
    ['带扩展名', `import { openLoading } from '@/lib/index.ts'\nopenLoading()`],
    ['深层相对路径', `import { openLoading } from '../../../src/lib/index'\nopenLoading()`],
    ['动态 import', `const m = await import('@/lib/index')\nm.openLoading()`],
    ['从 core 子路径引', `import { openLoading } from 'dmk-loading/dist/core'\nopenLoading()`]
  ]
  let allSafe = true
  for (const [label, code] of cases) {
    const out = p.transformCode(code, '/proj/src/views/Order.vue')
    if (out !== null) {
      allSafe = false
      console.log(`     ❌ ${label}: 被误判为未注入 → ${String(out).slice(0, 70)}`)
    }
  }
  ok('7 种本库导入写法都不重复注入', allSafe)
}

// 8.6 反向：真·别的库用了同名函数，不该被当成已导入本库
{
  const p = TransitionLoadingAutoImport({ from: '@/lib/index' })
  const code = `import { openLoading } from '@/utils/my-loading'\nopenLoading()\ncloseLoading()`
  const out = p.transformCode(code, '/proj/src/h.vue')
  ok('别的库的同名函数仍会注入（不误判）', out !== null)
}

// 8.7 ★ 回归：库自身源码绝不能被注入
// 真实 bug：src/lib/index.ts 被注入了 `import { openLoading... } from '@/lib/index'`
//          → 库 import 自己 → 循环引用 + Identifier 'openLoading' has already been declared
//          → 整个站点白屏
{
  const LIB = new URL('../src/lib/', import.meta.url).pathname
  const p = TransitionLoadingAutoImport({ from: '@/lib/index', libDir: LIB })
  const selfFiles = ['index.ts', 'plugin.ts', 'vite-plugin.ts', 'core/manager.ts', 'components/LoadingMask.vue']
  let allSkip = true
  for (const f of selfFiles) {
    const code = `import { ref } from 'vue'\nopenLoading()\ncloseLoading()\nwithLoading(p)`
    const out = p.transformCode(code, `${LIB}${f}`)
    if (out !== null) {
      allSkip = false
      console.log(`     ❌ ${f} 被误注入`)
    }
  }
  ok('库自身 5 个文件全部跳过（防自引用）', allSkip)

  // 反向：业务目录下的同名文件仍要注入
  const biz = p.transformCode('openLoading()', '/proj/src/views/Order.vue')
  ok('业务文件照常注入（未被误伤）', biz !== null && biz.includes('openLoading'))
}

// 9. 导出名列表完整
{
  ok('AUTO_IMPORT_NAMES 含核心 API',
    ['openLoading', 'closeLoading', 'withLoading', 'closeAllLoading'].every((n) => AUTO_IMPORT_NAMES.includes(n)))
}

console.log('\n=== window 全局注入 ===')
const CORE_MOD = await import(CORE)

// 10. defineLoadingGlobal 真的挂到 window
{
  const before = typeof window.$loading
  CORE_MOD.defineLoadingGlobal()
  ok('$loading 挂到 window', typeof window.$loading === 'object', `before=${before}`)
  ok('包含核心方法',
    ['open', 'close', 'closeAll', 'withLoading', 'withLoadingOn', 'isLoading', 'hasLoading', 'preset']
      .every((m) => typeof window.$loading[m] === 'function'))
}

// 11. 真实调用能开/关遮罩状态
{
  const h = window.$loading.open({ text: '测试', delay: 0 })
  await new Promise((r) => setTimeout(r, 30))
  ok('全局方法能开启加载', CORE_MOD.hasLoading() === true)
  window.$loading.close(h.token)
  await new Promise((r) => setTimeout(r, 30))
  ok('全局方法能关闭加载', CORE_MOD.hasLoading() === false)
}

// 12. 自定义 key
{
  CORE_MOD.defineLoadingGlobal({ keys: ['__myLoader'] })
  ok('自定义全局名生效', typeof window.__myLoader?.open === 'function')
}

// 13. 默认不覆盖已有全局
{
  window.__mine = { myOwn: true }
  CORE_MOD.defineLoadingGlobal({ keys: ['__mine'] })
  ok('不覆盖已存在的全局', window.__mine.myOwn === true)
  CORE_MOD.defineLoadingGlobal({ keys: ['__mine'], overwrite: true })
  ok('overwrite:true 才覆盖', typeof window.__mine.open === 'function')
}

// 14. hasLoadingGlobal 检测
{
  ok('hasLoadingGlobal 检测通过', CORE_MOD.hasLoadingGlobal('$loading') === true)
  ok('未注入的名字返回 false', CORE_MOD.hasLoadingGlobal('__never__') === false)
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
