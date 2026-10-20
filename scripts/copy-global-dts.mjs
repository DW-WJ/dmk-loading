import { copyFileSync, existsSync } from 'node:fs'
// global.d.ts 是手写声明，vue-tsc 不会从 .d.ts 输入产出，需手动拷进 dist
const src = 'src/lib/global.d.ts'
const dst = 'dist/global.d.ts'
if (existsSync(src)) {
  copyFileSync(src, dst)
  console.log('  已拷贝 global.d.ts → dist/')
} else {
  console.warn('  跳过：找不到', src)
}
