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
export declare const AUTO_IMPORT_NAMES: readonly ["openLoading", "closeLoading", "closeAllLoading", "updateLoading", "setLoadingText", "isLoading", "hasLoading", "withLoading", "withLoadingOn", "setDefaultOptions", "getDefaultOptions", "preset"];
export interface AutoImportOptions {
    /** 要自动导入的函数名，默认全部 */
    names?: string[]; /** import 来源，默认当前库 */
    from?: string;
    /** 额外排除的文件（正则字符串），如 ['\\.spec\\.ts$'] */
    exclude?: string[];
    /**
     * 插件自身所在的库目录（绝对路径或前缀）。
     * 库源码内部永远不该被注入 —— 否则 src/lib/index.ts 会 import 自己，
     * 形成循环引用 + 重复声明（Identifier 'openLoading' has already been declared）。
     * 默认从 from 反推；接入方一般无需手动设置。
     */
    libDir?: string;
    /**
     * 是否在转译时顺带注入 window 全局（默认 false）。
     * 开启后生成的 import 里会附带一行 `window.$loading ??= ...`，适合纯 JS 场景。
     * Vue 项目一般由 app.use() 负责注入，不用开这个。
     */
    injectWindow?: boolean;
    /** window 全局变量名（injectWindow 开启时生效） */
    windowKey?: string;
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
    name: string;
    enforce: 'pre' | 'post';
    transform(code: string, id: string): {
        code: string;
        map: null;
    } | null;
    /** 供测试：手动对一段代码跑一遍转换，返回 null 表示未改动 */
    transformCode(code: string, id: string): string | null;
}
export declare function TransitionLoadingAutoImport(options?: AutoImportOptions): TransitionLoadingAutoImport;
export default TransitionLoadingAutoImport;
