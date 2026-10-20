#!/usr/bin/env node
/** 给 README 插入无障碍章节（独立脚本避免 shell 转义地狱） */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const README = resolve(__dirname, '../README.md')

const BACKTICK = '`'
const FENCE = '```'

const SECTION = [
  '## 无障碍',
  '',
  '### 动效敏感用户（prefers-reduced-motion）',
  '',
  '系统开启「减弱动态效果」时自动降级 —— **旋转 / 位移 / 缩放动画停止，只保留静态指示器**。',
  '前庭功能障碍者看到旋转动画会眩晕，这是硬需求不是加分项。',
  '',
  `- CSS 层 ` + BACKTICK + `@media (prefers-reduced-motion: reduce)` + BACKTICK + ` 兜底`,
  `- JS 层挂 ` + BACKTICK + `.vtl-reduce-motion` + BACKTICK + ` class，方便业务按需判断`,
  '',
  '### ARIA 语义',
  '',
  FENCE + 'html',
  '<div class="vtl-mask" role="status" aria-live="polite" aria-busy="true" aria-label="加载订单中">',
  FENCE,
  '',
  '- `role="status"` + `aria-live="polite"`：文案变更会被礼貌播报',
  '- `aria-busy="true"`：屏幕阅读器知道"正在加载"而非"这里没内容"',
  '- 动画图形 `aria-hidden`，**但加载文案必须留在可读区域**',
  '  （早期版本误把文案也放进 aria-hidden 容器，E2E 跑出来才发现屏读器读不到）',
  '',
  '局部遮罩会给**宿主元素**打标记：',
  '',
  FENCE + 'html',
  '<!-- 加载中 -->',
  '<table aria-busy="true" data-vtl-loading>...</table>',
  FENCE,
  '',
  '### z-index 冲突',
  '',
  '默认 `2000`，可能与 AntD Modal（1050）/ Element Dialog（2000+）撞车。',
  '**令牌化后可整体覆盖，不用改库源码**：',
  '',
  FENCE + 'css',
  ':root { --vtl-z-mask: 3000; }',
  FENCE,
  '',
  '### 暗色模式',
  '',
  '`prefers-color-scheme: dark` 时自动加深遮罩底色',
  '（默认的半透明深色在深色背景下几乎不可见，这是实测发现的问题）。',
  '',
  '---',
  ''
].join('\n')

let md = readFileSync(README, 'utf8')
if (md.includes('## 无障碍')) {
  console.log('README 已有无障碍章节，跳过')
} else {
  const anchor = '## License'
  if (!md.includes(anchor)) {
    console.error('找不到锚点 ' + anchor)
    process.exit(1)
  }
  md = md.replace(anchor, SECTION + '\n' + anchor)
  writeFileSync(README, md)
  console.log('已插入无障碍章节，README 现 ' + md.split('\n').length + ' 行')
}
