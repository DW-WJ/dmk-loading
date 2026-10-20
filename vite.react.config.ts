import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

/**
 * React 适配层独立构建 —— 复用框架无关 core，只打包 React 宿主组件。
 * 产物是正式发布的一部分（exports["./react"]）。
 *
 * react / react-dom 设为外部依赖（peerDependency），由消费方提供，
 * 避免业务里出现两份 React 实例。
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/react/index.tsx', import.meta.url)),
      name: 'VtlReact',
      fileName: () => 'react.js',
      formats: ['es']
    },
    outDir: 'dist',
    emptyOutDir: false,
    minify: false,
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'vue', '@arkui/x']
    }
  }
})
