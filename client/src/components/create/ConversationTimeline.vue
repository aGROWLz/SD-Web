<template>
  <div class="conversation-timeline" aria-live="polite">
    <div class="assistant-intro">
      <span class="assistant-mark"><el-icon><MagicStick /></el-icon></span>
      <div>
        <strong>准备好开始创作</strong>
        <p>输入你的想法，或添加图片、视频和音频作为参考。</p>
      </div>
    </div>

    <template v-for="entry in entries" :key="entry.id">
      <article v-if="entry.role === 'user'" class="message-row user-row">
        <div class="user-message">
          <p v-if="entry.prompt">{{ entry.prompt }}</p>
          <div v-if="entry.materials?.length" class="message-materials">
            <span v-for="(material, index) in entry.materials" :key="`${material.kind}-${index}`">
              <el-icon><component :is="materialIcon(material.kind)" /></el-icon>
              {{ material.label }}
            </span>
          </div>
          <div v-if="entry.parameterSummary?.length" class="message-parameters">
            <span v-for="parameter in entry.parameterSummary" :key="parameter">{{ parameter }}</span>
          </div>
        </div>
      </article>

      <article v-else class="message-row assistant-row" :class="entry.status">
        <span class="assistant-mark"><el-icon><MagicStick /></el-icon></span>
        <div class="assistant-result">
          <div class="result-title">
            <el-icon v-if="entry.status === 'queued'"><CircleCheckFilled /></el-icon>
            <el-icon v-else><WarningFilled /></el-icon>
            <strong>{{ entry.message }}</strong>
          </div>
          <code v-if="entry.taskId">{{ entry.taskId }}</code>
        </div>
      </article>
    </template>
  </div>
</template>

<script lang="ts">
export interface ConversationEntry {
  id: string
  role: 'user' | 'assistant'
  prompt?: string
  materials?: Array<{ kind: 'image' | 'video' | 'audio'; label: string }>
  parameterSummary?: string[]
  status?: 'queued' | 'failed'
  taskId?: string
  message?: string
}
</script>

<script setup lang="ts">
import { CircleCheckFilled, Headset, MagicStick, Picture, VideoCamera, WarningFilled } from '@element-plus/icons-vue'
import type { AssetInput } from '@/features/create/seedance'

defineProps<{ entries: ConversationEntry[] }>()
const materialIcon = (kind: AssetInput['kind']) => ({ image: Picture, audio: Headset, video: VideoCamera }[kind])
</script>

<style scoped>
.conversation-timeline{display:flex;flex:1 1 auto;flex-direction:column;gap:22px;min-height:260px;padding:24px 4px 30px}.assistant-intro,.assistant-row{display:flex;align-items:flex-start;gap:11px;max-width:720px}.assistant-mark{display:grid;flex:0 0 30px;width:30px;height:30px;place-items:center;border:1px solid rgba(101,214,179,.25);border-radius:6px;color:var(--accent-primary);background:var(--accent-light)}.assistant-intro strong{display:block;margin-top:1px;color:var(--text-primary);font-size:13px}.assistant-intro p{margin:5px 0 0;color:var(--text-muted);font-size:12px;line-height:1.55}.message-row{display:flex;width:100%}.user-row{justify-content:flex-end}.user-message{width:min(78%,760px);padding:14px 16px;border:1px solid var(--border-default);border-radius:8px 8px 2px 8px;background:var(--bg-elevated)}.user-message>p{margin:0;color:var(--text-primary);font-size:14px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}.message-materials,.message-parameters{display:flex;flex-wrap:wrap;gap:6px}.user-message>p+.message-materials,.user-message>p+.message-parameters,.message-materials+.message-parameters{margin-top:10px}.message-materials span,.message-parameters span{display:inline-flex;align-items:center;gap:5px;min-width:0;padding:4px 7px;border-radius:4px;color:var(--text-secondary);background:rgba(255,255,255,.035);font-size:10px}.message-materials span{max-width:180px}.message-materials span :deep(.el-icon){flex:0 0 auto;color:var(--accent-primary)}.assistant-result{min-width:0;padding-top:3px}.result-title{display:flex;align-items:center;gap:7px;color:var(--success);font-size:12px}.assistant-row.failed .result-title{color:var(--error)}.assistant-result code{display:block;margin-top:6px;color:var(--text-muted);font-size:10px;overflow-wrap:anywhere}@media(max-width:640px){.conversation-timeline{min-height:180px;gap:18px;padding:18px 2px 22px}.user-message{width:92%;padding:12px 13px}}
</style>
