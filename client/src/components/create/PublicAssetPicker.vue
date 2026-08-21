<template>
  <el-dialog v-model="open" title="选择公共素材" width="min(680px, calc(100vw - 32px))" append-to-body>
    <el-tabs v-model="kindFilter" class="asset-tabs">
      <el-tab-pane label="全部" name="all" /><el-tab-pane label="图片" name="image" /><el-tab-pane label="音频" name="audio" /><el-tab-pane label="视频" name="video" />
    </el-tabs>
    <div v-if="loading" class="picker-state">正在加载素材...</div>
    <div v-else-if="filteredAssets.length" class="picker-grid">
      <button v-for="asset in filteredAssets" :key="asset.id" type="button" class="picker-item" :class="{ selected: selectedIds.has(asset.id) }" @click="toggle(asset)">
        <div class="picker-preview">
          <img v-if="kind(asset) === 'image' && previewUrls[asset.id]" :src="previewUrls[asset.id]" :alt="asset.filename" />
          <video v-else-if="kind(asset) === 'video' && previewUrls[asset.id]" :src="previewUrls[asset.id]" muted preload="metadata" />
          <span v-else-if="kind(asset) === 'audio'">♫</span><span v-else>预览不可用</span>
        </div>
        <span class="picker-name">{{ asset.filename }}</span>
        <span v-if="selectedIds.has(asset.id)" class="order">{{ selectedOrder(asset.id) }}</span>
      </button>
    </div>
    <div v-else class="picker-state">暂无此类素材</div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { assetsApi, type PublicAsset } from '@/api/assets'
import client from '@/api/client'
import type { AssetInput } from '@/features/create/seedance'

const props = defineProps<{ modelValue: boolean; selectedAssets: AssetInput[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; select: [asset: AssetInput] }>()
const open = computed({ get: () => props.modelValue, set: value => emit('update:modelValue', value) })
const kindFilter = ref('all'); const loading = ref(false); const assets = ref<PublicAsset[]>([]); const previewUrls = ref<Record<string, string>>({}); const objectUrls: string[] = []
const selectedIds = computed(() => new Set(props.selectedAssets.map(item => item.publicAssetId).filter(Boolean)))
const filteredAssets = computed(() => kindFilter.value === 'all' ? assets.value : assets.value.filter(asset => kind(asset) === kindFilter.value))
const kind = (asset: PublicAsset) => asset.contentType.split('/')[0]
const selectedOrder = (id: string) => props.selectedAssets.findIndex(item => item.publicAssetId === id) + 1
const load = async () => { loading.value = true; try { assets.value = (await assetsApi.list({ limit: 100 })).data.items; await Promise.all(assets.value.map(async asset => { if (kind(asset) === 'audio') return; try { const previewPath = asset.previewUrl || `/api/assets/${asset.id}/file`; const response = await client.get(previewPath.replace(/^\/api(?=\/)/, ''), { responseType: 'blob', headers: { 'X-Silent-Error': '1' } }); const url = URL.createObjectURL(response.data); objectUrls.push(url); previewUrls.value[asset.id] = url } catch { if (asset.providerUrl?.startsWith('http')) previewUrls.value[asset.id] = asset.providerUrl } })) } finally { loading.value = false } }
const toggle = (asset: PublicAsset) => { const k = kind(asset) as AssetInput['kind']; emit('select', { id: `public-${asset.id}`, publicAssetId: asset.id, previewUrl: asset.previewUrl, kind: k, source: asset.providerAssetId ? `asset://${asset.providerAssetId}` : `public-asset://${asset.id}`, label: asset.filename, role: `reference_${k}` as AssetInput['role'] }) }
watch(() => props.modelValue, value => { if (value && !assets.value.length) void load() })
onBeforeUnmount(() => objectUrls.forEach(url => URL.revokeObjectURL(url)))
</script>

<style scoped>
.picker-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;max-height:420px;overflow:auto}.picker-item{position:relative;min-width:0;aspect-ratio:1;padding:0;overflow:hidden;border:1px solid var(--border-default);border-radius:7px;background:var(--bg-elevated);color:var(--text-secondary);cursor:pointer;text-align:left}.picker-item.selected{border-color:var(--accent-primary);box-shadow:0 0 0 1px var(--accent-primary)}.picker-preview{display:grid;width:100%;height:100%;place-items:center;background:var(--bg-primary);color:var(--accent-primary);font-size:25px}.picker-preview img,.picker-preview video{width:100%;height:100%;object-fit:cover}.picker-name{position:absolute;right:0;bottom:0;left:0;display:block;overflow:hidden;padding:6px;color:#fff;background:rgba(0,0,0,.6);font-size:11px;text-overflow:ellipsis;white-space:nowrap}.order{position:absolute;top:5px;right:5px;display:grid;width:20px;height:20px;place-items:center;border-radius:50%;color:#07100d;background:var(--accent-primary);font-size:11px;font-weight:700}.picker-state{padding:48px;color:var(--text-muted);text-align:center}@media(max-width:560px){.picker-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
</style>
