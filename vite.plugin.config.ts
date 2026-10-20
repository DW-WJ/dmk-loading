import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

/**
 * 构建 vite 子入口（TransitionLoadingAutoImport）
 * 独立配置的原因：vite lib 模式不允许「多入口 + umd」组合，
 * 而 vite 插件只在构建期运行、不需要 UMD 产物。
 */
export default defineConfig({
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/lib/vite.ts', import.meta.url)),
      name: 'VTLVitePlugin',
      fileName: (format) => (format === 'es' ? 'vite.js' : 'vite.umd.cjs'),
      formats: ['es', 'umd']
    },
    rollupOptions: {
      output: {
        exports: 'named',
        assetFileNames: '[name][extname]'
      }
    },
    minify: false,
    emptyOutDir: false
  }
})
