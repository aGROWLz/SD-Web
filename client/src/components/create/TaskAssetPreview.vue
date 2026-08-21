<template>
  <figure ref="previewRoot" class="asset-preview" :class="[{ compact }, `asset-${asset.kind}`]">
    <div class="asset-visual" :class="{ clickable: previewUrl && asset.kind === 'image' }" @click="openOriginal">
      <img v-if="asset.kind === 'image' && previewUrl" :src="previewUrl" :alt="asset.label" @error="handleMediaError" />
      <video v-else-if="asset.kind === 'video' && previewUrl" :src="previewUrl" controls preload="metadata" @error="handleMediaError" />
      <audio v-else-if="asset.kind === 'audio' && previewUrl" :src="previewUrl" controls preload="metadata" @error="handleMediaError" />
      <div v-else class="asset-placeholder" :class="{ loading }">
        <el-icon><component :is="placeholderIcon" /></el-icon>
        <span>{{ errorMessage || (loading || (asset.loading && !asset.publicAssetId) ? '处理中' : '暂无预览') }}</span>
      </div>
      <span v-if="compact" class="material-type-icon" aria-hidden="true">
        <el-icon><component :is="placeholderIcon" /></el-icon>
      </span>
      <span v-if="asset.kind === 'image' && previewUrl" class="asset-hover-view" aria-hidden="true"><el-icon><ZoomIn /></el-icon></span>
    </div>
    <figcaption v-if="!compact" :title="asset.label">
      <span>{{ asset.label }}</span>
      <small v-if="asset.requiresReselect">需重新选择</small>
    </figcaption>
  </figure>
  <el-dialog v-model="originalVisible" title="素材预览" width="min(860px, 92vw)" append-to-body align-center destroy-on-close>
    <img v-if="asset.kind === 'image' && previewUrl" class="original-image" :src="previewUrl" :alt="asset.label" />
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Headset, Picture, VideoCamera, ZoomIn } from '@element-plus/icons-vue'
import { tasksApi } from '@/api/tasks'
import client from '@/api/client'
import type { AssetInput } from '@/features/create/seedance'

const props = withDefaults(defineProps<{ asset: AssetInput; taskId?: string; compact?: boolean }>(), {
  compact: false,
})
const previewUrl = ref('')
const originalVisible = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const previewRoot = ref<HTMLElement>()
const isVisible = ref(false)
let objectUrl = ''
let observer: IntersectionObserver | undefined
let requestController: AbortController | undefined
let requestVersion = 0
let disposed = false

// 同一素材在任务时间线中可能出现多次，使用浏览器内存缓存避免滚动回来重复请求。
const previewCache = new Map<string, string>()

const cacheKey = () => props.asset.previewUrl || props.asset.publicAssetId || props.asset.source

const placeholderIcon = computed(() => ({
  image: Picture,
  video: VideoCamera,
  audio: Headset,
}[props.asset.kind]))

const releaseObjectUrl = () => {
  if (objectUrl && !Array.from(previewCache.values()).includes(objectUrl)) URL.revokeObjectURL(objectUrl)
  objectUrl = ''
}

const handleMediaError = () => {
  previewCache.delete(cacheKey())
  releaseObjectUrl()
  previewUrl.value = ''
  errorMessage.value = '预览不可用'
}
const openOriginal = () => {
  if (props.asset.kind === 'image' && previewUrl.value) originalVisible.value = true
}

const loadPreview = async () => {
  if (props.asset.loading && !props.asset.publicAssetId) {
    previewUrl.value = ''
    loading.value = true
    return
  }
  const key = cacheKey()
  const cached = previewCache.get(key)
  if (cached) {
    previewUrl.value = cached
    errorMessage.value = ''
    loading.value = false
    return
  }
  const version = ++requestVersion
  requestController?.abort()
  requestController = undefined
  releaseObjectUrl()
  previewUrl.value = ''
  errorMessage.value = ''

  // 公共素材接口返回的 previewUrl 可能来自旧记录；始终按 publicAssetId 提供一个稳定回退地址。
  const publicAssetPreview = props.asset.publicAssetId
    ? `/assets/${props.asset.publicAssetId}/file`
    : ''
  const providerPreview = props.asset.source.startsWith('asset://')
    ? `/assets/provider/${encodeURIComponent(props.asset.source.slice('asset://'.length))}/file`
    : ''
  const requestedPreview = props.asset.previewUrl || publicAssetPreview || providerPreview
  if (requestedPreview && !requestedPreview.startsWith('data:') && !/^https?:\/\//i.test(requestedPreview)) {
    loading.value = true
    const controller = new AbortController()
    requestController = controller
    try {
      const response = await client.get(requestedPreview.replace(/^\/api(?=\/)/, ''), { responseType: 'blob', signal: controller.signal, headers: { 'X-Silent-Error': '1' } })
      if (disposed || version !== requestVersion) return
      objectUrl = URL.createObjectURL(response.data)
      previewUrl.value = objectUrl
      previewCache.set(key, objectUrl)
    } catch (error: any) {
      // 部分旧记录的 UUID 文件地址不可用时，按 asset:// provider ID 再回退一次。
      if (!controller.signal.aborted && providerPreview && requestedPreview !== providerPreview) {
        try {
          const fallback = await client.get(providerPreview, { responseType: 'blob', signal: controller.signal, headers: { 'X-Silent-Error': '1' } })
          if (!disposed && version === requestVersion) {
            objectUrl = URL.createObjectURL(fallback.data)
            previewUrl.value = objectUrl
            previewCache.set(key, objectUrl)
            return
          }
        } catch { /* fall through to the local preview error */ }
      }
      if (!controller.signal.aborted && !disposed && version === requestVersion) {
        if (props.asset.previewDataUrl) {
          previewUrl.value = props.asset.previewDataUrl
          errorMessage.value = ''
        } else {
          errorMessage.value = error.response?.data?.error || '素材读取失败'
        }
      }
    } finally {
      if (version === requestVersion) { loading.value = false; requestController = undefined }
    }
    return
  }
  if (!props.asset.source.startsWith('local-asset://')) {
    previewUrl.value = props.asset.source.startsWith('data:') || /^https?:\/\//i.test(props.asset.source)
      ? props.asset.source
      : ''
    return
  }
  if (!props.taskId || props.asset.contentIndex === undefined) {
    errorMessage.value = '暂无预览'
    return
  }

  loading.value = true
  const controller = new AbortController()
  requestController = controller
  try {
    const response = await tasksApi.getTaskAsset(props.taskId, props.asset.contentIndex, controller.signal)
    if (disposed || version !== requestVersion) return
    const nextObjectUrl = URL.createObjectURL(response.data)
    if (disposed || version !== requestVersion) {
      URL.revokeObjectURL(nextObjectUrl)
      return
    }
    objectUrl = nextObjectUrl
    previewUrl.value = nextObjectUrl
    previewCache.set(key, nextObjectUrl)
  } catch (error: any) {
    if (controller.signal.aborted || disposed || version !== requestVersion) return
    errorMessage.value = error.response?.data?.error || '素材读取失败'
  } finally {
    if (version === requestVersion) {
      loading.value = false
      requestController = undefined
    }
  }
}

watch(
  [() => props.taskId, () => props.asset.source, () => props.asset.previewUrl, () => props.asset.publicAssetId, () => props.asset.loading, () => props.asset.contentIndex],
  () => {
    if (isVisible.value || !props.asset.source.startsWith('local-asset://')) void loadPreview()
  },
  { immediate: true },
)

onMounted(() => {
  if (!props.asset.source.startsWith('local-asset://')) {
    isVisible.value = true
    return
  }
  if (!('IntersectionObserver' in window) || !previewRoot.value) {
    isVisible.value = true
    void loadPreview()
    return
  }
  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) {
      if (!isVisible.value) {
        isVisible.value = true
        void loadPreview()
      }
      return
    }
    if (!isVisible.value) return
    isVisible.value = false
    requestVersion += 1
    requestController?.abort()
    requestController = undefined
    loading.value = false
    // 已完成的预览保留在前端缓存中；只取消尚未完成的请求。
    if (!previewUrl.value) releaseObjectUrl()
  }, { rootMargin: '160px' })
  observer.observe(previewRoot.value)
})

onBeforeUnmount(() => {
  disposed = true
  requestVersion += 1
  requestController?.abort()
  observer?.disconnect()
  releaseObjectUrl()
})
</script>

<style scoped>
.asset-preview{display:flex;min-width:0;margin:0;flex-direction:column;border:1px solid var(--border-subtle);border-radius:6px;background:rgba(255,255,255,.025)}
.asset-visual{position:relative;display:grid;width:100%;min-width:0;min-height:72px;place-items:center;overflow:hidden;background:#0b0f10}
.asset-image .asset-visual{aspect-ratio:1}
.asset-image img,.asset-video video{display:block;width:100%;height:100%;object-fit:cover}
.asset-visual.clickable{cursor:zoom-in}.original-image{display:block;width:100%;max-height:78dvh;object-fit:contain;background:#050708}
.asset-video .asset-visual{aspect-ratio:16/10}
.asset-audio .asset-visual{min-height:58px;padding:8px}
.asset-audio audio{display:block;width:100%;max-width:100%;height:32px}
.asset-placeholder{display:flex;max-width:100%;align-items:center;justify-content:center;gap:6px;padding:10px;color:var(--text-muted);font-size:10px;text-align:center}
.asset-placeholder .el-icon{flex:0 0 auto;color:var(--accent-primary);font-size:17px}
.asset-placeholder.loading .el-icon{animation:preview-pulse 1.2s ease-in-out infinite}
.asset-preview.compact{height:48px;border:0;border-radius:5px;background:#0b0f10}
.compact .asset-visual{height:48px;min-height:0;aspect-ratio:auto}
.compact .asset-image .asset-visual,.compact .asset-video .asset-visual{aspect-ratio:auto}
.compact.asset-audio .asset-visual{height:48px;padding:8px 26px 8px 8px}
.compact .asset-audio audio{height:30px}
.material-type-icon{position:absolute;right:4px;bottom:4px;z-index:1;display:grid;width:16px;height:16px;place-items:center;border:1px solid rgba(255,255,255,.28);border-radius:3px;color:#fff;background:rgba(7,10,11,.72);font-size:10px}
.asset-hover-view{position:absolute;inset:0;display:grid;place-items:center;color:#fff;background:rgba(5,8,9,.48);font-size:28px;opacity:0;transform:scale(.94);transition:opacity .18s ease,transform .18s ease;pointer-events:none}.asset-visual:hover .asset-hover-view{opacity:1;transform:scale(1)}
figcaption{display:flex;min-width:0;align-items:center;justify-content:space-between;gap:6px;padding:6px 7px;color:var(--text-muted);font-size:9px}
figcaption span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
figcaption small{flex:0 0 auto;color:var(--warning);font-size:8px}
@keyframes preview-pulse{50%{opacity:.35}}
</style>
