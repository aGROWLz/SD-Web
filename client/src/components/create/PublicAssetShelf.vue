<template>
  <aside class="asset-shelf" :class="{ expanded }" aria-label="公共素材栏">
    <button class="shelf-toggle" type="button" :aria-expanded="expanded" @click="expanded = !expanded">{{ expanded ? '收起素材' : '公共素材' }}</button>
    <div v-if="expanded" class="shelf-body">
      <div v-if="loading" class="shelf-state">加载中...</div>
      <div v-else-if="!assets.length" class="shelf-state">暂无素材</div>
      <button v-for="asset in assets" :key="asset.id" class="shelf-item" type="button" :class="{ selected: selectedIds.has(asset.id) }" @click="toggle(asset)">
        <img v-if="asset.contentType.startsWith('image/') && previewUrls[asset.id]" :src="previewUrls[asset.id]" :alt="asset.filename" />
        <video v-else-if="asset.contentType.startsWith('video/') && previewUrls[asset.id]" :src="previewUrls[asset.id]" muted preload="metadata" />
        <span v-else-if="asset.contentType.startsWith('audio/')" class="audio-tile">♫</span>
        <span v-else class="asset-tile-error">预览不可用</span><span class="shelf-name">{{ asset.filename }}</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { assetsApi, type PublicAsset } from '@/api/assets'
import client from '@/api/client'
import type { AssetInput } from '@/features/create/seedance'
const props = defineProps<{ selectedAssets?: AssetInput[] }>()
const emit = defineEmits<{ 'toggle-asset': [asset: AssetInput] }>()
const expanded = ref(false); const loading = ref(false); const assets = ref<PublicAsset[]>([]); const previewUrls = ref<Record<string, string>>({}); const objectUrls: string[] = []
const selectedIds = computed(() => new Set((props.selectedAssets || []).map(item => item.publicAssetId).filter(Boolean)))
const load = async () => { loading.value = true; try { assets.value = (await assetsApi.list({ limit: 100 })).data.items; await Promise.all(assets.value.map(async asset => { try { const response = await client.get(asset.previewUrl.replace(/^\/api(?=\/)/, ''), { responseType: 'blob', headers: { 'X-Silent-Error': '1' } }); const url = URL.createObjectURL(response.data); objectUrls.push(url); previewUrls.value[asset.id] = url } catch { if (asset.providerUrl?.startsWith('http')) previewUrls.value[asset.id] = asset.providerUrl } })) } finally { loading.value = false } }
const toggle = (asset: PublicAsset) => { const kind = asset.contentType.split('/')[0] as AssetInput['kind']; const source = asset.providerAssetId ? `asset://${asset.providerAssetId}` : `public-asset://${asset.id}`; emit('toggle-asset', { id: `public-${asset.id}`, publicAssetId: asset.id, kind, source, label: asset.filename, role: `reference_${kind}` as AssetInput['role'] }) }
onMounted(load)
onBeforeUnmount(() => objectUrls.forEach(url => URL.revokeObjectURL(url)))
</script>

<style scoped>
.asset-shelf{position:absolute;top:12px;right:0;bottom:12px;z-index:10;width:52px;border:1px solid var(--border-default);border-radius:8px 0 0 8px;background:var(--bg-secondary);transition:width .2s ease}.asset-shelf.expanded{width:190px}.shelf-toggle{width:100%;padding:10px 4px;border:0;color:var(--text-secondary);background:transparent;cursor:pointer;font-size:11px}.asset-shelf:not(.expanded) .shelf-toggle{height:92px;writing-mode:vertical-rl;letter-spacing:2px}.shelf-body{display:flex;height:calc(100% - 38px);min-height:0;flex-direction:column;gap:8px;overflow-y:auto;padding:8px}.shelf-item{position:relative;display:block;flex:0 0 74px;width:100%;overflow:hidden;padding:0;border:1px solid var(--border-default);border-radius:6px;background:var(--bg-elevated);cursor:pointer}.shelf-item.selected{border-color:var(--accent-primary);box-shadow:0 0 0 1px var(--accent-primary)}.shelf-item img,.shelf-item video{display:block;width:100%;height:100%;object-fit:cover}.audio-tile{display:grid;height:100%;place-items:center;color:var(--accent-primary);font-size:24px}.shelf-name{position:absolute;right:0;bottom:0;left:0;overflow:hidden;padding:3px 4px;color:#fff;background:rgba(0,0,0,.6);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.shelf-state{padding:12px 2px;color:var(--text-muted);font-size:11px;text-align:center}
.asset-shelf{top:96px}
.shelf-item{flex-basis:auto;aspect-ratio:1;height:auto}
</style>
