/**
 * SFC 结构检查：确保 <style> 不在 <template> 内部（Vue 会直接编译报错）
 * 用法：node scripts/check-sfc.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd(), 'src')

function walk(dir, acc = []) {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f)
    if (statSync(p).isDirectory()) walk(p, acc)
    else if (p.endsWith('.vue')) acc.push(p)
  }
  return acc
}

const files = walk(ROOT)
let bad = 0

console.log('\n=== SFC 结构检查 ===\n')

for (const f of files) {
  const src = readFileSync(f, 'utf8')
  const rel = path.relative(process.cwd(), f)
  const problems = []

  const tStart = src.indexOf('<template>')
  const tEnd = src.lastIndexOf('</template>')
  const sStart = src.indexOf('<style')
  const sEnd = src.lastIndexOf('</style>')

  if (sStart === -1) {
    // 无 style 块，允许
  } else if (tEnd !== -1 && sStart < tEnd) {
    problems.push('❌ <style> 在 </template> 之前（Vue 会报 "Tags with side effect are ignored"）')
  }

  if (tStart === -1 && src.includes('<template')) problems.push('❌ <template> 未闭合')
  if (sStart !== -1 && sEnd === -1) problems.push('❌ <style> 未闭合')
  if (src.indexOf('<script setup') !== -1 && src.indexOf('</script>') === -1) problems.push('❌ <script setup> 未闭合')

  // script 必须在 template 之前（SFC 块顺序：script > template > style）
  const scriptStart = src.indexOf('<script')
  if (scriptStart !== -1 && tStart !== -1 && scriptStart > tStart) {
    problems.push('⚠️  <script> 在 <template> 之后（合法但不符合惯例）')
  }

  if (problems.length) {
    bad++
    console.log(`  ❌ ${rel}`)
    problems.forEach((p) => console.log(`       ${p}`))
  } else {
    console.log(`  ✅ ${rel}`)
  }
}

console.log(`\n=== ${files.length - bad} 通过 / ${bad} 失败 ===\n`)
process.exit(bad > 0 ? 1 : 0)