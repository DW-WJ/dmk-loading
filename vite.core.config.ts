import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

/**
 * core 独立构建 —— 只打包框架无关层，不含任何 Vue 代码
 *
 * 产物是正式发布的一部分（exports["./core"]），供 React / UniApp / 鸿蒙 等
 * 宿主复用同一套状态机，不走 Vue 适配层。
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/lib/core/standalone.ts', import.meta.url)),
      name: 'VtlCore',
      fileName: () => 'index.js',
      formats: ['es']
    },
    outDir: 'dist/core',
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      // 关键：vue / react / arkui 设为外部依赖，
      // 若 core 里误引入会直接构建失败 —— 「框架无关」由此机器可验证
      external: ['vue', 'react', 'react-dom', '@arkui/x']
    }
  }
})