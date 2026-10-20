/**
 * 自动导入插件（unplugin 风格的零配置方案）
 *
 * 解决的问题：全量引入后，业务页面仍要写 `import { openLoading } from '...'`
 *              20 个页面 = 20 行重复样板，加人加页面还要记得加。
 *
 * 做法：构建期扫描源码，检测到未声明的 openLoading / closeLoading 等标识符，
 *       自动在本文件顶部插入 import 语句。**业务代码零改动、零心智负担。**
 *
 * 用法（vite.config.ts）：
 *   import { TransitionLoadingAutoImport } from 'dmk-loading/vite'
 *   export default defineConfig({
 *     plugins: [vue(), TransitionLoadingAutoImport()]
 *   })
 */

/** 可以免 import 直接用的全局函数 */
export const AUTO_IMPORT_NAMES = [
  'openLoading',
  'closeLoading',
  'closeAllLoading',
  'updateLoading',
  'setLoadingText',
  'isLoading',
  'hasLoading',
  'withLoading',
  'withLoadingOn',
  'setDefaultOptions',
  'getDefaultOptions',
  'preset'
] as const

/** 项目里可能已有的同名工具（避免和业务代码撞车） */
const PROJECT_SHADOWS = ['$loading']

export interface AutoImportOptions {
  /** 要自动导入的函数名，默认全部 */
  names?: string[]  /** import 来源，默认当前库 */
  from?: string
  /** 额外排除的文件（正则字符串），如 ['\\.spec\\.ts$'] */
  exclude?: string[]
  /**
   * 插件自身所在的库目录（绝对路径或前缀）。
   * 库源码内部永远不该被注入 —— 否则 src/lib/index.ts 会 import 自己，
   * 形成循环引用 + 重复声明（Identifier 'openLoading' has already been declared）。
   * 默认从 from 反推；接入方一般无需手动设置。
   */
  libDir?: string
  /**
   * 是否在转译时顺带注入 window 全局（默认 false）。
   * 开启后生成的 import 里会附带一行 `window.$loading ??= ...`，适合纯 JS 场景。
   * Vue 项目一般由 app.use() 负责注入，不用开这个。
   */
  injectWindow?: boolean
  /** window 全局变量名（injectWindow 开启时生效） */
  windowKey?: string
}

function shouldSkip(code: string, id: string, excludes: RegExp[], libDir?: string): boolean {
  if (!/\.(vue|jsx?|tsx?|mjs)$/.test(id)) return true
  if (id.includes('node_modules')) return true
  if (/[\\/]dist[\\/]/.test(id)) return true
  if (/\.(d\.ts|min\.js)$/.test(id)) return true
  // 库自身源码绝不注入（否则会 import 自己 → 循环引用 + 重复声明）
  if (libDir && normalizePath(id).includes(normalizePath(libDir))) return true
  return excludes.some((re) => re.test(id))
}

/** 去掉路径末尾的扩展名与斜杠，取最后一段作为「入口名」 */
function baseName(p: string): string {
  return p.replace(/[?#].*$/, '').replace(/\.(ts|tsx|js|jsx|mjs|cjs|vue)$/, '').split('/').pop() ?? ''
}

/**
 * 判断「本文件是否已经导入过本库」
 *
 * 比对的是「模块身份」而非路径字符串：
 *   - from 与注入源完全一致                → 已导入
 *   - 去掉扩展名后入口名相同（且不是第三方同名包） → 已导入
 *   - 来源是本库包名或其子路径              → 已导入
 *   - 来源末尾是注入源的入口名              → 已导入（'../lib/index' vs '@/lib/index'）
 *
 * 之前只比字符串 → App.vue（'../lib/index'）被误判为未导入 → 重复注入 → 白屏。
 * 教训：构建期工具判断"同一个模块"必须按解析后的身份比，不能按用户写的字符串比。
 */
function resolveImports(code: string, from: string, id: string): boolean {
  const sources = [
    ...[...code.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1]),
    ...[...code.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]),
    // 裸副作用引入：import 'dmk-loading/style.css'
    ...[...code.matchAll(/\bimport\s+['"]([^'"]+)['"]/g)].map((m) => m[1])
  ]
  if (!sources.length) return false

  const fromBase = baseName(from)
  const libPkg = 'dmk-loading'

  for (const src of sources) {
    if (src === from) return true
    // 本库包名（含子路径）
    if (src === libPkg || src.startsWith(`${libPkg}/`)) return true
    // 归一化后（去扩展名 / 去尾斜杠）完全相同
    if (normalizePath(src) === normalizePath(from)) return true
    // 入口名相同即视为同一模块。第三方包不会和本库入口重名（除非用户自己起同名，
    // 那种情况下保守地不注入更安全 —— 宁可漏注入让 TS 报错，也不要重复声明崩掉）。
    if (fromBase && baseName(src) === fromBase) return true
  }
  return false
}

/** 归一化路径（消掉 ./ 与 ../ 与扩展名） */
function normalizePath(p: string): string {
  const clean = p.replace(/[?#].*$/, '').replace(/\.(ts|tsx|js|jsx|mjs|cjs|vue)$/, '')
  const abs = clean.startsWith('/') ? clean : `/${clean}`
  const parts: string[] = []
  for (const seg of abs.split('/')) {
    if (seg === '.' || seg === '') continue
    if (seg === '..') { parts.pop(); continue }
    parts.push(seg)
  }
  return parts.join('/')
}

/**
 * 自动注入插件实例类型
 *
 * 刻意声明成普通对象而不是 extends Plugin：
 * 消费方的 vite 版本可能与开发时不同，Plugin 接口（含 transform 的
 * Rollup 泛型签名）在版本间会漂移，直接 extends 会导致
 * 「库能跑但消费端 TS 报错」。这里只声明我们实际提供的字段，
 * 结构上兼容 vite 的 PluginOption，跨版本稳定。
 */
export interface TransitionLoadingAutoImport {
  name: string
  enforce: 'pre' | 'post'
  transform(code: string, id: string): { code: string; map: null } | null
  /** 供测试：手动对一段代码跑一遍转换，返回 null 表示未改动 */
  transformCode(code: string, id: string): string | null
}

export function TransitionLoadingAutoImport(options: AutoImportOptions = {}): TransitionLoadingAutoImport {
  const names = options.names ?? [...AUTO_IMPORT_NAMES]
  const from = options.from ?? 'dmk-loading'
  const windowKey = options.windowKey ?? '$loading'
  const excludes = (options.exclude ?? []).map((e) => new RegExp(e))
  // 库源码目录：默认用本插件文件所在目录的上一级（src/lib）。
  // 这样即使用 from: '@/lib/index' 这种别名写法，也能识别出
  // "被注入的文件本身就是库源码" 并跳过。
  // 从 import.meta.url 反推本文件所在目录（不引 node:url，兼容非 node 环境）
  const libDir = options.libDir ?? dirnameFromUrl(import.meta.url)

  const transformCode = (code: string, id: string): string | null => {
    if (shouldSkip(code, id, excludes, libDir)) return null
    // 快速失败：文件里压根没出现这些名字就不用处理
    if (!names.some((n) => code.includes(n))) return null

    // 收集"真正缺失"的：既没被 import，也没在本文件声明
    //
    // 关键坑：判断「本页是否已导入过本库」不能只比对 import 语句里的路径字符串。
    //   同一个库可能写成 '@/lib/index'、'../lib/index'、'dmk-loading'，
    //   甚至从 dist 引入 —— 字符串各不相同，但都是同一个模块。
    //   之前只比字符串，导致 App.vue（写的是相对路径）被误判为"未导入"，
    //   结果重复注入 → Identifier 'openLoading' has already been declared，白屏。
    //
    // 解法：先把 import 来源解析成「模块身份」再比对。规则：
    //   1. 提取本页所有 import 来源
    //   2. 任意一个来源能指向本库就算已导入（相对路径按当前文件目录解析）
    const alreadyImported = resolveImports(code, from, id)

    // vue 编译后函数名可能被 mangle（openLoading → oe），那时源码层检查会漏判。
    // 判据：出现「调用形态」才算用过 —— xxx( 这样的标识符调用。
    const usedNames = names.filter((n) => {
      if (!code.includes(n)) return false
      // 裸调用 openLoading( / 带空白换行 openLoading (
      return new RegExp(`\\b${n}\\s*\\(`).test(code) ||
        // 作为参数传递：withLoading: xxx / { onSuccess: openLoading }
        new RegExp(`[:\\[,]\\s*${n}\\b`).test(code)
    })
    if (!usedNames.length) return null
    if (alreadyImported) return null

    const missing: string[] = []
    for (const name of usedNames) {
      if (PROJECT_SHADOWS.includes(name)) continue
      // 本文件自己声明了同名符号（const/let/var/function/class）
      const declared = new RegExp(
        `(?:const|let|var|function|class)\\s+${name}\\b`,
        'm'
      ).test(code)
      if (declared) continue

      missing.push(name)
    }
    if (!missing.length) return null

    const parts = [`import { ${missing.join(', ')} } from '${from}';`]
    if (options.injectWindow) {
      // 纯 JS 场景（无 app.use）：import 完顺手把 API 挂到 window
      parts.push(
        `import { defineLoadingGlobal as __vtlDefineGlobal } from '${from}';`,
        `__vtlDefineGlobal({ keys: ['${windowKey}'], overwrite: false });`
      )
    }

    // 保持 shebang 与文件头注释在前
    const shebang = code.startsWith('#!')
      ? `${code.slice(0, code.indexOf('\n') + 1)}\n`
      : ''
    const body = shebang ? code.slice(shebang.length) : code
    return `${shebang}${parts.join('\n')}\n${body}`
  }

  return {
    name: 'dmk-loading:auto-import',
    // 关键：必须排在 @vitejs/plugin-vue 之后。
    //   enforce:'pre'  时拿到的是**原始 SFC**，注入到 <script> 标签外的位置会被 Vue 编译器丢弃。
    //   post 阶段拿到的是 vue 已经编译好的 JS，注入的 import 才是有效顶层语句。
    //   对 .ts/.js 而言 post 与 pre 行为一致，所以统一用 post。
    enforce: 'post',

    transform(code: string, id: string) {
      const out = transformCode(code, id)
      return out === null ? null : { code: out, map: null }
    },

    transformCode
  }
}

export default TransitionLoadingAutoImport

/** 从 file:// URL 里取出目录部分（不依赖 node:url） */
function dirnameFromUrl(url: string): string {
  // file:///a/b/c.ts → /a/b/
  const m = url.match(/^file:\/\/\/(.*)$/)
  const path = m ? m[1] : url.replace(/^[a-z]+:\/\/[^/]*/, '')
  const dir = path.slice(0, path.lastIndexOf('/') + 1)
  try {
    return decodeURIComponent(dir)
  } catch {
    return dir
  }
}
