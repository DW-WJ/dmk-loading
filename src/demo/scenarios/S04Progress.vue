<script setup lang="ts">
import { ref } from 'vue'
import { openLoading, closeLoading, updateLoading } from '../../lib/index'

/**
 * 场景 4：进度型任务 —— 上传、下载、批量导入
 * 长任务必须有进度反馈，否则用户以为卡死
 */
const emit = defineEmits<{ (e: 'log', s: string): void }>()

const files = ref<string[]>([])
const uploading = ref(false)

function mockChunk(ms = 380): Promise<boolean> {
  return new Promise((r) => setTimeout(() => r(true), ms))
}

/**
 * 分块上传：手动开关 + 循环更新进度
 * 这是最典型的"运行中更新"场景
 */
async function upload() {
  uploading.value = true
  const { token } = openLoading({
    text: '准备上传...',
    spinner: 'bars',
    color: '#10b981',
    minDuration: 800 // 保证最短显示，避免一闪而过
  })

  try {
    const list = ['报表.xlsx', '图片-1.png', '图片-2.png', '配置.json']
    for (let i = 0; i < list.length; i++) {
      await mockChunk()
      const pct = Math.round(((i + 1) / list.length) * 100)
      updateLoading(token, {
        text: `上传中 ${pct}%（${i + 1}/${list.length}）· ${list[i]}`,
        // 进度越高颜色越暖，给用户视觉反馈
        color: pct < 50 ? '#10b981' : pct < 100 ? '#f59e0b' : '#10b981'
      })
      files.value.push(list[i])
    }
    updateLoading(token, { text: '上传完成，正在校验...', spinner: 'orbit' })
    await mockChunk(500)
    emit('log', `上传完成：${files.value.length} 个文件`)
  } finally {
    closeLoading(token)
    uploading.value = false
  }
}

/** 下载进度（字节级） */
async function download() {
  const total = 1024 * 8 // 8MB 模拟
  let loaded = 0
  const { token } = openLoading({ text: '下载中 0%', spinner: 'wave', color: '#0ea5e9', minDuration: 600 })

  while (loaded < total) {
    await mockChunk(250)
    loaded = Math.min(total, loaded + Math.round(total / 10))
    const pct = Math.round((loaded / total) * 100)
    updateLoading(token, {
      text: `下载中 ${pct}% · ${(loaded / 1024).toFixed(1)} / 8.0 MB`,
      spinner: pct >= 100 ? 'orbit' : 'wave'
    })
  }
  emit('log', '下载完成')
  closeLoading(token)
}

function reset() {
  files.value = []
}
</script>

<template>
  <div class="scn">
    <div class="scn-btns">
      <button class="primary" :disabled="uploading" @click="upload">分块上传（4 个文件）</button>
      <button :disabled="uploading" @click="download">下载进度（8 MB）</button>
      <button @click="reset">重置</button>
    </div>
    <pre class="code"><code>// 进度型任务：手动开关 + 循环更新
const { token } = openLoading({ text: '准备上传...', spinner: 'bars' })
try {
  for (const [i, file] of files.entries()) {
    await uploadChunk(file)
    updateLoading(token, {
      text: `上传中 ${Math.round((i+1)/files.length*100)}%（${i+1}/${files.length}）`
    })
  }
} finally {
  closeLoading(token)   // 异常也会关
}</code></pre>
    <div class="box">
      <div v-if="!files.length" class="empty">点击上方按钮，观察遮罩文案实时变化</div>
      <div v-for="f in files" :key="f" class="row">✅ {{ f }}</div>
    </div>
  </div>
</template>