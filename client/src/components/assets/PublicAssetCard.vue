<template>
  <article class="asset-card" :class="{ selected }">
    <div class="asset-preview">
      <img v-if="kind === 'image' && mediaUrl" :src="mediaUrl" :alt="asset.filename" />
      <video v-else-if="kind === 'video' && mediaUrl" :src="mediaUrl" controls preload="metadata" />
      <audio v-else-if="kind === 'audio' && mediaUrl" :src="mediaUrl" controls preload="metadata" />
      <div v-else class="asset-placeholder">{{ kindLabel }}</div>
    </div>
    <div class="asset-meta">
      <span class="asset-name" :title="asset.filename">{{ asset.filename }}</span>
      <el-tag size="small" :type="statusType">{{ statusLabel }}</el-tag>
    </div>
    <div v-if="asset.providerAssetId" class="provider-id" :title="asset.providerAssetId">{{ asset.providerAssetId }}</div>
    <div class="asset-actions">
      <span class="provider-label">{{ providerLabel }}</span>
      <el-button v-if="asset.providerStatus === 'FAILED'" size="small" link @click="$emit('retry', asset)">重试</el-button>
      <el-button v-if="canDelete" size="small" link type="danger" @click="$emit('delete', asset)">删除</el-button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { PublicAsset } from '@/api/assets'
import client from '@/api/client'

const props = defineProps<{ asset: PublicAsset; selected?: boolean; canDelete?: boolean }>()
defineEmits<{ select: [asset: PublicAsset]; retry: [asset: PublicAsset]; delete: [asset: PublicAsset] }>()
const kind = computed(() => props.asset.contentType.split('/')[0])
const kindLabel = computed(() => ({ image: '图片', video: '视频', audio: '音频' }[kind.value] || '素材'))
const previewUrl = computed(() => props.asset.previewUrl || `/api/assets/${props.asset.id}/file`)
const mediaUrl = ref(previewUrl.value)
let objectUrl = ''
onMounted(async () => {
  try {
    const response = await client.get(previewUrl.value.replace(/^\/api(?=\/)/, ''), { responseType: 'blob', headers: { 'X-Silent-Error': '1' } })
    objectUrl = URL.createObjectURL(response.data)
    mediaUrl.value = objectUrl
  } catch {
    mediaUrl.value = ''
  }
})
onBeforeUnmount(() => { if (objectUrl) URL.revokeObjectURL(objectUrl) })
const statusLabel = computed(() => {
  if (props.asset.providerAssetId) return 'Active'
  if (props.asset.providerStatus === 'PENDING' && props.asset.providerUrl) return 'R2 已就绪'
  return ({ ACTIVE: '已就绪', PENDING: '处理中', FAILED: '失败' }[props.asset.providerStatus || 'PENDING'] || props.asset.providerStatus || '本地')
})
const statusType = computed(() => props.asset.providerAssetId || props.asset.providerStatus === 'ACTIVE' ? 'success' : props.asset.providerStatus === 'FAILED' ? 'danger' : 'info')
const providerLabel = computed(() => ({ KK: 'KK 素材库', XKU_P5: 'XKU p5 素材库' }[props.asset.providerLibrary || ''] || props.asset.providerLibrary || '未登记素材库'))
</script>

<style scoped>
.asset-card{display:flex;min-width:0;flex-direction:column;gap:8px;padding:10px;border:1px solid var(--border-default);border-radius:8px;background:var(--bg-secondary)}.asset-card.selected{border-color:var(--accent-primary)}.asset-preview{display:grid;aspect-ratio:1;overflow:hidden;place-items:center;border-radius:6px;background:var(--bg-elevated)}.asset-preview img,.asset-preview video{width:100%;height:100%;object-fit:cover}.asset-preview audio{width:calc(100% - 12px)}.asset-placeholder{color:var(--text-muted);font-size:12px}.asset-meta{display:flex;min-width:0;align-items:center;justify-content:space-between;gap:6px}.asset-name{overflow:hidden;color:var(--text-primary);font-size:12px;text-overflow:ellipsis;white-space:nowrap}.provider-id{overflow:hidden;color:var(--text-muted);font-size:9px;text-overflow:ellipsis;white-space:nowrap}.asset-actions{display:flex;min-height:28px;align-items:center;gap:4px}.provider-label{min-width:0;flex:1;overflow:hidden;color:var(--text-muted);font-size:11px;text-overflow:ellipsis;white-space:nowrap}.asset-actions .el-button{padding:4px 6px}
</style>
