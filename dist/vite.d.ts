/**
 * Vite 插件入口（子路径 import）
 *
 * 用法：
 *   import { TransitionLoadingAutoImport } from 'dmk-loading/vite'
 */
export { TransitionLoadingAutoImport, AUTO_IMPORT_NAMES, default } from './vite-plugin';
export type { AutoImportOptions, TransitionLoadingAutoImport as AutoImportPlugin } from './vite-plugin';
