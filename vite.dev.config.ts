import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { TransitionLoadingAutoImport } from './src/lib/vite'

/**
 * 演示站 dev 配置
 * 与 vite.config.ts（库构建）分开，本文件只负责跑 demo：
 *   npm run dev        → vite.dev.config.ts
 *   npm run build      → vite.config.ts（库产物）
 */
export default defineConfig({
  plugins: [
    vue(),
    // ★ 自动注入：让 S13ZeroImport.vue 这类「零 import」页面能跑起来
    // from 用项目别名 @ ——绝对路径写法，与注入方所在目录无关
    TransitionLoadingAutoImport({ from: '@/lib/index' })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5180,
    host: '127.0.0.1'
  }
})
