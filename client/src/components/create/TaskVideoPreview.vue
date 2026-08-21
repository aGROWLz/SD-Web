<template>
  <div class="task-video-preview">
    <button class="video-preview-trigger" type="button" aria-label="播放生成的视频" @click="openPlayer">
      <img v-if="thumbnailUrl" :src="thumbnailUrl" alt="视频首帧" @error="handleThumbnailError" />
      <div v-else class="thumbnail-placeholder">
        <el-icon v-if="thumbnailLoading" class="spinning"><Loading /></el-icon>
        <el-icon v-else><VideoCamera /></el-icon>
        <span>{{ thumbnailLoading ? '读取首帧' : '暂无预览' }}</span>
      </div>
      <span class="preview-play" aria-hidden="true"><el-icon><VideoPlay /></el-icon></span>
    </button>

    <el-tooltip content="下载视频" placement="left">
      <button
        class="video-download"
        type="button"
        aria-label="下载视频"
        :disabled="downloading"
        @click.stop="downloadVideo"
      >
        <el-icon :class="{ spinning: downloading }"><component :is="downloading ? Loading : Download" /></el-icon>
      </button>
    </el-tooltip>

    <el-dialog
      v-model="playerVisible"
      class="task-video-dialog"
      title="视频预览"
      width="min(920px, 92vw)"
      append-to-body
      align-center
      destroy-on-close
      @closed="stopPlayback"
    >
      <div v-if="playerLoading" class="player-placeholder">
        <el-icon class="spinning"><Loading /></el-icon>
        <span>正在加载视频</span>
      </div>
      <video
        v-else-if="playerSource"
        ref="playerVideo"
        :src="playerSource"
        controls
        autoplay
        playsinline
        preload="auto"
        @loadeddata="startPlayback"
      />
      <div v-else class="player-placeholder">视频读取失败</div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Loading, VideoCamera, VideoPlay } from '@element-plus/icons-vue'
import { tasksApi } from '@/api/tasks'

const props = defineProps<{ taskId?: string }>()
const thumbnailUrl = ref('')
const thumbnailLoading = ref(false)
const playerSource = ref('')
const playerVisible = ref(false)
const playerLoading = ref(false)
const downloading = ref(false)
const playerVideo = ref<HTMLVideoElement>()
let thumbnailObjectUrl = ''
let playerObjectUrl = ''
let thumbnailController: AbortController | undefined
let playerController: AbortController | undefined
let disposed = false
let thumbnailRetryTimer: ReturnType<typeof setTimeout> | undefined

const releaseThumbnail = () => {
  if (thumbnailObjectUrl) URL.revokeObjectURL(thumbnailObjectUrl)
  thumbnailObjectUrl = ''
}

const releasePlayer = () => {
  if (playerObjectUrl) URL.revokeObjectURL(playerObjectUrl)
  playerObjectUrl = ''
  playerSource.value = ''
}

const handleThumbnailError = () => {
  releaseThumbnail()
  thumbnailUrl.value = ''
}

const loadThumbnail = async () => {
  if (thumbnailRetryTimer) { clearTimeout(thumbnailRetryTimer); thumbnailRetryTimer = undefined }
  thumbnailController?.abort()
  releaseThumbnail()
  thumbnailUrl.value = ''
  if (!props.taskId) return

  const controller = new AbortController()
  thumbnailController = controller
  thumbnailLoading.value = true
  try {
    const response = await tasksApi.getTaskThumbnail(props.taskId, controller.signal)
    if (disposed || controller.signal.aborted) return
    thumbnailObjectUrl = URL.createObjectURL(response.data)
    thumbnailUrl.value = thumbnailObjectUrl
  } catch {
    if (!controller.signal.aborted && !disposed) {
      thumbnailUrl.value = ''
      thumbnailRetryTimer = setTimeout(() => { void loadThumbnail() }, 2000)
    }
  } finally {
    if (thumbnailController === controller) {
      thumbnailLoading.value = false
      thumbnailController = undefined
    }
  }
}

const openPlayer = async () => {
  if (!props.taskId || playerLoading.value) {
    if (!props.taskId) ElMessage.warning('该任务没有可读取的视频文件')
    return
  }

  playerController?.abort()
  releasePlayer()
  playerVisible.value = true
  playerLoading.value = true
  const controller = new AbortController()
  playerController = controller
  try {
    // 完整视频只在用户点击后从项目本地存储读取。
    const response = await tasksApi.downloadVideo(props.taskId, controller.signal)
    if (disposed || controller.signal.aborted) return
    playerObjectUrl = URL.createObjectURL(response.data)
    playerSource.value = playerObjectUrl
    await nextTick()
    await playerVideo.value?.play().catch(() => undefined)
  } catch (error: any) {
    if (!controller.signal.aborted && !disposed) {
      ElMessage.error(error.response?.data?.error || '视频读取失败')
      playerVisible.value = false
    }
  } finally {
    if (playerController === controller) {
      playerLoading.value = false
      playerController = undefined
    }
  }
}

const startPlayback = async () => {
  await nextTick()
  await playerVideo.value?.play().catch(() => undefined)
}

const stopPlayback = () => {
  playerController?.abort()
  playerController = undefined
  playerLoading.value = false
  playerVideo.value?.pause()
  releasePlayer()
}

const triggerDownload = (url: string, filename: string) => {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

const downloadVideo = async () => {
  if (downloading.value) return
  if (!props.taskId) {
    ElMessage.warning('该任务没有可下载的视频文件')
    return
  }

  downloading.value = true
  let objectUrl = ''
  try {
    const response = await tasksApi.downloadVideo(props.taskId)
    objectUrl = URL.createObjectURL(response.data)
    triggerDownload(objectUrl, `seedance-${props.taskId}.mp4`)
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '视频下载失败')
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    downloading.value = false
  }
}

watch(() => props.taskId, () => { void loadThumbnail() }, { immediate: true })

onBeforeUnmount(() => {
  disposed = true
  if (thumbnailRetryTimer) clearTimeout(thumbnailRetryTimer)
  thumbnailController?.abort()
  playerController?.abort()
  releaseThumbnail()
  releasePlayer()
})
</script>

<style scoped>
.task-video-preview{position:relative;width:100%;height:100%;overflow:hidden;background:#070a0b}
.video-preview-trigger{position:relative;display:block;width:100%;height:100%;padding:0;overflow:hidden;border:0;color:#fff;background:#070a0b;cursor:pointer}
.video-preview-trigger img{display:block;width:100%;height:100%;object-fit:contain;pointer-events:none}
.video-preview-trigger::after{position:absolute;inset:0;content:"";background:rgba(0,0,0,0);transition:background-color .18s ease}
.thumbnail-placeholder{display:flex;width:100%;height:100%;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:var(--text-muted);font-size:10px}
.thumbnail-placeholder .el-icon{font-size:22px;color:var(--accent-primary)}
.preview-play{position:absolute;top:50%;left:50%;z-index:1;display:grid;width:40px;height:40px;place-items:center;border:1px solid rgba(255,255,255,.48);border-radius:50%;color:#fff;background:rgba(7,10,11,.62);font-size:22px;opacity:0;transform:translate(-50%,-50%) scale(.92);transition:opacity .18s ease,transform .18s ease}
.video-preview-trigger:hover::after,.video-preview-trigger:focus-visible::after{background:rgba(0,0,0,.2)}
.video-preview-trigger:hover .preview-play,.video-preview-trigger:focus-visible .preview-play{opacity:1;transform:translate(-50%,-50%) scale(1)}
.video-preview-trigger:focus-visible{outline:2px solid var(--accent-primary);outline-offset:-2px}
.video-download{position:absolute;top:8px;right:8px;z-index:2;display:grid;width:30px;height:30px;padding:0;place-items:center;border:1px solid rgba(255,255,255,.28);border-radius:5px;color:#fff;background:rgba(7,10,11,.72);box-shadow:0 4px 14px rgba(0,0,0,.2);cursor:pointer;transition:border-color .18s ease,background-color .18s ease}
.video-download:hover,.video-download:focus-visible{border-color:rgba(255,255,255,.55);background:rgba(20,28,30,.92)}
.video-download:focus-visible{outline:2px solid var(--accent-primary);outline-offset:2px}
.video-download:disabled{cursor:wait;opacity:.7}
.spinning{animation:video-download-spin 1s linear infinite}
.player-placeholder{display:flex;min-height:240px;align-items:center;justify-content:center;gap:9px;color:var(--text-muted);font-size:12px}
:global(.task-video-dialog){max-width:calc(100vw - 24px);border:1px solid var(--border-default);background:var(--bg-elevated)}
:global(.task-video-dialog .el-dialog__header){padding:14px 18px 12px;border-bottom:1px solid var(--border-subtle)}
:global(.task-video-dialog .el-dialog__title){color:var(--text-primary);font-size:14px;font-weight:650}
:global(.task-video-dialog .el-dialog__body){padding:0;background:#050708}
:global(.task-video-dialog video){display:block;width:100%;max-height:78dvh;background:#000;object-fit:contain}
@keyframes video-download-spin{to{transform:rotate(360deg)}}
@media(max-width:640px){.preview-play{width:36px;height:36px;font-size:20px;opacity:1}.video-download{top:7px;right:7px;width:28px;height:28px}}
</style>
