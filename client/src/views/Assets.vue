<template>
  <div class="assets-page">
    <header class="page-header"><div><p class="eyebrow">SHARED ASSETS</p><h1>公共素材库</h1></div><div class="page-actions"><el-button :loading="refreshing" @click="refreshStatuses">刷新状态</el-button><el-button type="primary" :loading="uploading" @click="picker?.click()">添加素材</el-button></div></header>
    <input ref="picker" hidden type="file" accept="image/*,audio/*,video/*" multiple @change="uploadFiles" />
    <el-tabs v-model="kindFilter" class="asset-tabs"><el-tab-pane label="全部" name="all" /><el-tab-pane label="图片" name="image" /><el-tab-pane label="音频" name="audio" /><el-tab-pane label="视频" name="video" /></el-tabs>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />
    <div v-if="loading" class="state">正在加载素材...</div>
    <div v-else-if="!filteredAssets.length" class="state">暂无此类素材，点击“添加素材”上传。</div>
    <div v-else class="asset-grid"><PublicAssetCard v-for="asset in filteredAssets" :key="asset.id" :asset="asset" :can-delete="canDelete(asset)" @retry="retryAsset" @delete="deleteAsset" /></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { assetsApi, type PublicAsset } from '@/api/assets'
import PublicAssetCard from '@/components/assets/PublicAssetCard.vue'
import { useAuthStore } from '@/stores/auth'
import { fileToDataUrl } from '@/features/create/seedance'

const auth = useAuthStore(); const picker = ref<HTMLInputElement>(); const assets = ref<PublicAsset[]>([]); const kindFilter = ref('all'); const loading = ref(false); const uploading = ref(false); const refreshing = ref(false); const error = ref('')
const filteredAssets = computed(() => kindFilter.value === 'all' ? assets.value : assets.value.filter(asset => asset.contentType.split('/')[0] === kindFilter.value))
const load = async () => { loading.value = true; try { assets.value = (await assetsApi.list({ limit: 100 })).data.items } catch (e: any) { error.value = e.response?.data?.error || '加载素材失败' } finally { loading.value = false } }
const refreshStatuses = async () => { refreshing.value = true; error.value = ''; try { assets.value = (await assetsApi.refreshStatus()).data.items; ElMessage.success('素材状态已刷新') } catch (e: any) { error.value = e.response?.data?.error || '刷新状态失败' } finally { refreshing.value = false } }
const uploadFiles = async (event: Event) => { const input = event.target as HTMLInputElement; uploading.value = true; error.value = ''; try { for (const file of Array.from(input.files || [])) { await assetsApi.upload(await fileToDataUrl(file), file.name) }; await load(); ElMessage.success('素材已添加') } catch (e: any) { error.value = e.response?.data?.error || e.message || '上传失败' } finally { uploading.value = false; input.value = '' } }
const canDelete = (asset: PublicAsset) => auth.isAdmin() || asset.ownerId === auth.user?.id
const retryAsset = async (asset: PublicAsset) => { try { const r = await assetsApi.retry(asset.id); Object.assign(asset, r.data.asset) } catch {} }
const deleteAsset = async (asset: PublicAsset) => { try { await ElMessageBox.confirm(`确定删除“${asset.filename}”吗？`, '删除素材'); await assetsApi.remove(asset.id); assets.value = assets.value.filter(item => item.id !== asset.id) } catch {} }
onMounted(load)
</script>

<style scoped>
.assets-page{width:min(1120px,100%);margin:0 auto}.page-header{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--border-subtle)}.eyebrow{margin:0 0 6px;color:var(--accent-primary);font-size:10px;font-weight:700;letter-spacing:.12em}.page-header h1{margin:0;color:var(--text-primary);font-size:24px}.asset-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-top:16px}.state{padding:60px 20px;color:var(--text-muted);text-align:center}@media(max-width:640px){.asset-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}
.page-actions{display:flex;gap:8px}
</style>
