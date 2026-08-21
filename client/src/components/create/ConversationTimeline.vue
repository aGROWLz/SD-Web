<template>
  <div ref="timeline" class="conversation-timeline" aria-live="polite">
    <div class="assistant-intro">
      <span class="assistant-mark"><el-icon><MagicStick /></el-icon></span>
      <div>
        <strong>准备好开始创作</strong>
        <p>输入你的想法，或添加图片、视频和音频作为参考。</p>
      </div>
    </div>

    <article v-for="entry in entries" :key="entry.id" class="task-row">
      <section class="task-config-card">
        <div class="task-card-header">
          <span class="task-status-label" :class="entry.status">{{ statusLabel(entry.status) }}</span>
          <code v-if="entry.taskId">#{{ entry.taskId }}</code>
        </div>

        <div class="task-times">
          <time v-if="entry.createdAt" :datetime="entry.createdAt">生成于 {{ formatTaskTime(entry.createdAt) }}</time>
          <time v-if="entry.completedAt" :datetime="entry.completedAt">完成于 {{ formatTaskTime(entry.completedAt) }}</time>
        </div>

        <p v-if="entry.snapshot.prompt" class="task-prompt">{{ entry.snapshot.prompt }}</p>
        <p v-else class="task-prompt muted">仅使用参考素材生成</p>

        <div v-if="entry.snapshot.assets.length" class="message-materials">
          <TaskAssetPreview
            v-for="asset in entry.snapshot.assets"
            :key="asset.id"
            :asset="asset"
            :task-id="entry.taskId"
          />
        </div>

        <div class="message-parameters">
          <span v-for="parameter in entry.parameterSummary" :key="parameter">{{ parameter }}</span>
        </div>

        <div class="task-actions">
          <el-button size="small" plain :icon="Edit" @click="emit('edit', entry)">编辑</el-button>
          <el-button
            size="small"
            plain
            :icon="RefreshRight"
            :disabled="submitting"
            @click="emit('retry', entry)"
          >重试</el-button>
        </div>
      </section>

      <section class="task-status-panel" :class="entry.status" :aria-label="statusLabel(entry.status)">
        <TaskVideoPreview
          v-if="entry.status === 'completed' && entry.videoUrl"
          :task-id="entry.taskId"
        />

        <div v-else-if="entry.status === 'failed'" class="status-content failed-content" role="alert">
          <el-icon><WarningFilled /></el-icon>
          <strong>生成失败</strong>
          <p>{{ entry.errorMessage || '任务处理失败，请重试' }}</p>
        </div>

        <div v-else-if="entry.status === 'completed'" class="status-content completed-content">
          <el-icon><CircleCheckFilled /></el-icon>
          <strong>视频已生成</strong>
          <p>暂未获取到可播放地址</p>
        </div>

        <div v-else class="status-content generating-content">
          <el-icon class="status-spinner"><Loading /></el-icon>
          <strong>{{ statusLabel(entry.status) }}</strong>
          <p>{{ entry.status === 'submitting' ? '正在上传素材并创建任务' : '完成后会在这里显示视频' }}</p>
        </div>
      </section>
    </article>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { CircleCheckFilled, Edit, Loading, MagicStick, RefreshRight, WarningFilled } from '@element-plus/icons-vue'
import TaskAssetPreview from '@/components/create/TaskAssetPreview.vue'
import TaskVideoPreview from '@/components/create/TaskVideoPreview.vue'
import type { TaskTimelineEntry, TaskTimelineStatus } from '@/features/create/task-timeline'

const props = defineProps<{ entries: TaskTimelineEntry[]; submitting: boolean }>()
const emit = defineEmits<{ edit: [entry: TaskTimelineEntry]; retry: [entry: TaskTimelineEntry] }>()
const timeline = ref<HTMLElement>()
const scrollToLatest = async () => {
  await nextTick()
  if (timeline.value) timeline.value.scrollTop = timeline.value.scrollHeight
}

watch(() => props.entries.length, () => { void scrollToLatest() })
onMounted(() => { void scrollToLatest() })
const statusLabel = (status: TaskTimelineStatus) => ({
  submitting: '正在提交',
  queued: '等待生成',
  processing: '正在生成',
  completed: '生成完成',
  failed: '生成失败',
}[status])
const formatTaskTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(date)
}
</script>

<style scoped>
.conversation-timeline{display:flex;flex:1 1 auto;flex-direction:column;gap:18px;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:24px 10px 24px 4px;scrollbar-gutter:stable}.assistant-intro{display:flex;align-items:flex-start;gap:11px;max-width:720px;margin-bottom:4px}.assistant-mark{display:grid;flex:0 0 30px;width:30px;height:30px;place-items:center;border:1px solid rgba(101,214,179,.25);border-radius:6px;color:var(--accent-primary);background:var(--accent-light)}.assistant-intro strong{display:block;margin-top:1px;color:var(--text-primary);font-size:13px}.assistant-intro p{margin:5px 0 0;color:var(--text-muted);font-size:12px;line-height:1.55}.task-row{display:grid;width:100%;grid-template-columns:minmax(0,1fr) clamp(190px,22vw,240px);align-items:stretch;gap:14px}.task-config-card{display:flex;min-width:0;min-height:190px;flex-direction:column;padding:16px 18px;border:1px solid var(--border-default);border-radius:7px;background:var(--bg-elevated)}.task-card-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:7px}.task-card-header code{max-width:55%;overflow:hidden;color:var(--text-muted);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.task-times{display:flex;flex-wrap:wrap;gap:5px 14px;margin-bottom:12px;color:var(--text-muted);font-size:10px;font-variant-numeric:tabular-nums}.task-times time{white-space:nowrap}.task-status-label{display:inline-flex;align-items:center;min-height:22px;padding:3px 7px;border-radius:4px;color:var(--text-secondary);background:rgba(255,255,255,.045);font-size:10px;font-weight:650}.task-status-label.processing,.task-status-label.submitting{color:var(--accent-primary);background:var(--accent-light)}.task-status-label.completed{color:var(--success);background:var(--success-light)}.task-status-label.failed{color:var(--error);background:var(--error-light)}.task-prompt{margin:0;color:var(--text-primary);font-size:14px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}.task-prompt.muted{color:var(--text-muted)}.message-materials{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,144px));max-width:100%;gap:8px;margin-top:12px;overflow:hidden}.message-parameters{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.message-parameters>span{display:inline-flex;align-items:center;gap:5px;min-width:0;padding:4px 7px;border-radius:4px;color:var(--text-secondary);background:rgba(255,255,255,.035);font-size:10px}.task-actions{display:flex;gap:8px;margin-top:auto;padding-top:16px}.task-actions :deep(.el-button){margin-left:0}.task-status-panel{display:grid;width:100%;aspect-ratio:1;place-items:center;overflow:hidden;border:1px solid var(--border-default);border-radius:7px;background:#111719}.task-status-panel.processing,.task-status-panel.submitting{border-color:rgba(101,214,179,.25)}.task-status-panel.failed{border-color:rgba(240,120,120,.28);background:rgba(240,120,120,.055)}.task-status-panel>.task-video-preview{width:100%;height:100%}.status-content{display:flex;width:100%;height:100%;align-items:center;justify-content:center;flex-direction:column;padding:18px;text-align:center}.status-content>.el-icon{font-size:27px}.status-content strong{margin-top:10px;color:var(--text-primary);font-size:12px}.status-content p{max-width:100%;margin:7px 0 0;color:var(--text-muted);font-size:10px;line-height:1.5;overflow-wrap:anywhere}.failed-content>.el-icon,.failed-content strong{color:var(--error)}.completed-content>.el-icon{color:var(--success)}.generating-content>.el-icon{color:var(--accent-primary)}.status-spinner{animation:status-spin 1.2s linear infinite}@keyframes status-spin{to{transform:rotate(360deg)}}@media(max-width:640px){.conversation-timeline{gap:16px;padding:18px 8px 18px 2px}.task-row{grid-template-columns:1fr;gap:10px}.task-config-card{min-height:0;padding:14px}.task-times{gap:4px 10px}.message-materials{grid-template-columns:repeat(auto-fill,minmax(96px,128px))}.task-status-panel{width:min(100%,340px);justify-self:start}.task-actions{padding-top:14px}}
</style>
