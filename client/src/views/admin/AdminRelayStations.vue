<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">系统管理 / ROUTING</p>
        <h1 class="page-title">中转站</h1>
        <p class="page-subtitle">统一管理 Seedance 请求入口，用户只会使用当前主站。</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreate">添加中转站</el-button>
    </div>

    <el-alert
      v-if="!primaryStation && !loading"
      title="当前没有主中转站，用户暂时无法创建视频任务。"
      type="warning"
      :closable="false"
      show-icon
      class="primary-alert"
    />

    <div class="summary-grid">
      <div class="summary-item"><span>全部站点</span><strong>{{ stations.length }}</strong></div>
      <div class="summary-item"><span>运行中</span><strong>{{ activeCount }}</strong></div>
      <div class="summary-item"><span>当前主站</span><strong class="primary-value">{{ primaryStation?.name || '未设置' }}</strong></div>
    </div>

    <section class="storage-panel">
      <div class="storage-heading">
        <div><p class="eyebrow">ASSET STORAGE</p><h2>R2 素材存储</h2><p>本地图片、音频和视频只在点击生成时上传到公网。</p></div>
        <el-tag :type="storage.configured ? 'success' : 'warning'">{{ storage.configured ? '已配置' : '未配置' }}</el-tag>
      </div>
      <el-form label-position="top" class="storage-form">
        <el-form-item label="WORKER_URL"><el-input v-model="storageForm.workerUrl" placeholder="https://your-worker.example.com" /></el-form-item>
        <el-form-item label="Key"><el-input v-model="storageForm.keyValue" type="password" show-password :placeholder="storage.keyMasked ? `已配置：${storage.keyMasked}，留空保持不变` : '输入 R2 Worker key'" /></el-form-item>
        <div class="storage-actions">
          <el-button type="primary" :loading="storageSaving" @click="saveStorage">保存配置</el-button>
          <el-button :loading="storageTesting" :disabled="!storage.configured || storageSaving" @click="testStorageConnection">测试连通</el-button>
          <el-button :disabled="!storage.keyMasked || storageSaving || storageTesting" @click="clearStorageKey">清除 Key</el-button>
        </div>
      </el-form>
      <p class="storage-hint">未配置 R2 时，只有图片素材允许回退为 Base64；音频和视频素材需要先完成配置。</p>
    </section>

    <div class="table-shell" v-loading="loading">
      <el-table :data="stations" row-key="id">
        <el-table-column label="站点" min-width="190">
          <template #default="{ row }">
            <div class="station-name"><span class="status-dot" :class="{ active: row.isActive }"></span>{{ row.name }}</div>
            <span class="station-url">{{ row.baseUrl }}</span>
          </template>
        </el-table-column>
        <el-table-column label="API Key" min-width="170">
          <template #default="{ row }"><code>{{ row.apiKeyMasked }}</code></template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><el-tag :type="row.isActive ? 'success' : 'info'">{{ row.isActive ? '启用' : '停用' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="任务数" prop="taskCount" width="90" align="right" />
        <el-table-column label="创建时间" width="150">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="360" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :loading="testingStationId === row.id" @click="testConnection(row)">测试连通</el-button>
            <el-button v-if="!row.isPrimary" link type="primary" :disabled="!row.isActive" @click="setPrimary(row)">设为主站</el-button>
            <el-tag v-else type="success" effect="plain">当前主站</el-tag>
            <el-button link :disabled="row.isPrimary && row.isActive" @click="toggleActive(row)">{{ row.isActive ? '停用' : '启用' }}</el-button>
            <el-button link @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" :disabled="row.isPrimary || row.taskCount > 0" @click="removeStation(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && stations.length === 0" description="还没有配置中转站" />
    </div>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑中转站' : '添加中转站'" width="620px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="站点名称" prop="name"><el-input v-model="form.name" placeholder="例如：主线路由" /></el-form-item>
        <el-form-item label="Base URL" prop="baseUrl"><el-input v-model="form.baseUrl" placeholder="https://relay.example.com" /></el-form-item>
        <el-form-item label="自动补齐 API 前缀">
          <el-switch v-model="form.appendApiV3" active-text="补齐 /api/v3" inactive-text="使用完整自定义路径" />
        </el-form-item>
        <el-form-item label="API Key" prop="keyValue">
          <el-input v-model="form.keyValue" type="password" show-password :placeholder="editing ? '留空表示保持原 Key' : '输入兼容中转站的 API Key'" />
        </el-form-item>
        <div class="form-hint">{{ form.appendApiV3 ? '系统会自动补齐 `/api/v3`。' : '系统将直接使用上方填写的完整接口前缀。' }} Key 只加密存储，不会在列表中显示明文。</div>
        <div class="asset-library-section">
          <div class="redirect-heading">
            <h3>管理员素材库</h3>
            <p>用于把生成素材同步到指定供应商；关闭后仍保留当前配置。</p>
          </div>
          <div class="asset-library-toolbar">
            <el-form-item label="启用素材库">
              <el-switch v-model="assetLibraryEnabled" />
            </el-form-item>
            <el-form-item label="供应商预设">
              <el-select v-model="selectedAssetLibraryProvider" @change="applyAssetLibraryPreset">
                <el-option label="KK" value="KK" />
                <el-option label="XKU p4" value="XKU_P4" />
              </el-select>
            </el-form-item>
          </div>
          <div v-if="form.assetLibraryConfig" class="asset-library-grid">
            <el-form-item label="上传 URL"><el-input v-model="form.assetLibraryConfig.uploadUrl" /></el-form-item>
            <el-form-item label="查询 URL"><el-input v-model="form.assetLibraryConfig.queryUrl" /></el-form-item>
            <el-form-item label="鉴权头"><el-input v-model="form.assetLibraryConfig.authHeader" /></el-form-item>
            <el-form-item label="鉴权前缀"><el-input v-model="form.assetLibraryConfig.authPrefix" /></el-form-item>
            <el-form-item label="URL 字段"><el-input v-model="form.assetLibraryConfig.fields.url" /></el-form-item>
            <el-form-item label="类型字段"><el-input v-model="form.assetLibraryConfig.fields.assetType" /></el-form-item>
            <el-form-item label="名称字段"><el-input v-model="form.assetLibraryConfig.fields.name" /></el-form-item>
            <el-form-item label="ProjectName 字段"><el-input v-model="form.assetLibraryConfig.fields.projectName" /></el-form-item>
            <el-form-item label="ProjectName 值"><el-input v-model="form.assetLibraryConfig.projectNameValue" /></el-form-item>
          </div>
        </div>
        <div class="redirect-section">
          <div class="redirect-heading">
            <h3>模型重定向</h3>
            <p>中转站模型名不一致时填写；留空则使用对应的默认 API 模型名。</p>
          </div>
          <el-form-item v-for="model in SEEDANCE_MODELS" :key="model" :label="model">
            <el-input
              v-model="form.modelRedirects[model]"
              maxlength="100"
              clearable
              :placeholder="`留空使用 ${DEFAULT_SEEDANCE_API_MODELS[model]}`"
            />
          </el-form-item>
        </div>
        <el-form-item v-if="!editing" label="创建后设为主站"><el-switch v-model="form.isPrimary" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="saveStation">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { adminApi, DEFAULT_SEEDANCE_API_MODELS, type AssetLibraryConfig, type AssetLibraryProvider, type RelayStation, type SeedanceModelName, type StorageConfig } from '@/api/admin'
import { relayKeyRules } from '@/features/admin/relay-station'

const stations = ref<RelayStation[]>([])
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editing = ref<RelayStation | null>(null)
const formRef = ref<FormInstance>()
const SEEDANCE_MODELS: readonly SeedanceModelName[] = [
  'doubao-seedance-2-5',
  'doubao-seedance-2-0',
  'doubao-seedance-2-0-fast',
  'doubao-seedance-2-0-mini',
]
const emptyModelRedirects = (): Record<SeedanceModelName, string> => ({
  'doubao-seedance-2-5': '',
  'doubao-seedance-2-0': '',
  'doubao-seedance-2-0-fast': '',
  'doubao-seedance-2-0-mini': '',
})
const ASSET_LIBRARY_PRESETS: Record<AssetLibraryProvider, AssetLibraryConfig> = {
  KK: {
    enabled: true,
    provider: 'KK',
    uploadUrl: 'https://ai.kkidc.com/api/v2/assets',
    queryUrl: 'https://ai.kkidc.com/api/v2/assets/{id}',
    authHeader: 'Authorization',
    authPrefix: '',
    fields: { url: 'url', assetType: 'asset_type', name: 'name', projectName: '' },
    projectNameValue: 'default',
  },
  XKU_P4: {
    enabled: true,
    provider: 'XKU_P4',
    uploadUrl: 'https://api-ai.xku.com/ark/p4/v1/assets',
    queryUrl: 'https://api-ai.xku.com/ark/p4/v1/assets',
    authHeader: 'Authorization',
    authPrefix: '',
    fields: { url: 'URL', assetType: 'AssetType', name: 'Name', projectName: 'ProjectName' },
    projectNameValue: 'default',
  },
}
const cloneAssetLibraryConfig = (value: AssetLibraryConfig): AssetLibraryConfig => ({ ...value, fields: { ...value.fields } })
const form = reactive({ name: '', baseUrl: '', keyValue: '', appendApiV3: true, isPrimary: false, modelRedirects: emptyModelRedirects(), assetLibraryConfig: null as AssetLibraryConfig | null })
const storage = reactive<StorageConfig>({ workerUrl: '', configured: false, keyMasked: '' })
const storageForm = reactive({ workerUrl: '', keyValue: '' })
const storageSaving = ref(false)
const storageTesting = ref(false)
const testingStationId = ref<string | null>(null)
const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: '请输入站点名称', trigger: 'blur' }],
  baseUrl: [{ required: true, message: '请输入 Base URL', trigger: 'blur' }],
  keyValue: relayKeyRules(Boolean(editing.value)),
}))

const primaryStation = computed(() => stations.value.find((station) => station.isPrimary && station.isActive))
const activeCount = computed(() => stations.value.filter((station) => station.isActive).length)
const assetLibraryEnabled = computed({
  get: () => Boolean(form.assetLibraryConfig?.enabled),
  set: (enabled: boolean) => {
    if (enabled) {
      form.assetLibraryConfig = form.assetLibraryConfig
        ? { ...form.assetLibraryConfig, enabled: true }
        : cloneAssetLibraryConfig(ASSET_LIBRARY_PRESETS.KK)
    } else if (form.assetLibraryConfig) {
      form.assetLibraryConfig.enabled = false
    }
  },
})
const selectedAssetLibraryProvider = computed<AssetLibraryProvider>({
  get: () => form.assetLibraryConfig?.provider ?? 'KK',
  set: (provider) => {
    if (form.assetLibraryConfig) form.assetLibraryConfig.provider = provider
  },
})

const fetchStations = async () => {
  loading.value = true
  try { stations.value = (await adminApi.getRelayStations()).data.stations }
  catch (error: any) { ElMessage.error(error.response?.data?.error || '获取中转站失败') }
  finally { loading.value = false }
}

const fetchStorage = async () => {
  try {
    const result = (await adminApi.getStorageConfig()).data.storage
    Object.assign(storage, result)
    storageForm.workerUrl = result.workerUrl
    storageForm.keyValue = ''
  } catch (error: any) { ElMessage.error(error.response?.data?.error || '获取 R2 配置失败') }
}

const saveStorage = async () => {
  storageSaving.value = true
  try {
    const result = (await adminApi.updateStorageConfig({ workerUrl: storageForm.workerUrl, keyValue: storageForm.keyValue || undefined })).data.storage
    Object.assign(storage, result); storageForm.keyValue = ''
    ElMessage.success('R2 配置已保存')
  } catch (error: any) { ElMessage.error(error.response?.data?.error || '保存 R2 配置失败') }
  finally { storageSaving.value = false }
}

const clearStorageKey = async () => {
  storageSaving.value = true
  try {
    const result = (await adminApi.updateStorageConfig({ workerUrl: storageForm.workerUrl, clearKey: true })).data.storage
    Object.assign(storage, result); storageForm.keyValue = ''
    ElMessage.success('R2 Key 已清除')
  } catch (error: any) { ElMessage.error(error.response?.data?.error || '清除 R2 Key 失败') }
  finally { storageSaving.value = false }
}

const testStorageConnection = async () => {
  storageTesting.value = true
  try {
    const result = (await adminApi.testStorageConnection()).data
    if (result.ok) ElMessage.success(result.message)
    else ElMessage.error(result.message)
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || 'R2 连通测试失败')
  } finally {
    storageTesting.value = false
  }
}

const resetForm = () => { form.name = ''; form.baseUrl = ''; form.keyValue = ''; form.appendApiV3 = true; form.isPrimary = false; form.modelRedirects = emptyModelRedirects(); form.assetLibraryConfig = null }
const openCreate = () => { editing.value = null; resetForm(); dialogVisible.value = true }
const openEdit = (station: RelayStation) => { editing.value = station; form.name = station.name; form.baseUrl = station.baseUrl; form.keyValue = ''; form.appendApiV3 = station.appendApiV3; form.isPrimary = false; form.modelRedirects = { ...emptyModelRedirects(), ...station.modelRedirects }; form.assetLibraryConfig = station.assetLibraryConfig ? cloneAssetLibraryConfig(station.assetLibraryConfig) : null; dialogVisible.value = true }
const applyAssetLibraryPreset = (provider: AssetLibraryProvider) => { const enabled = form.assetLibraryConfig?.enabled ?? false; form.assetLibraryConfig = { ...cloneAssetLibraryConfig(ASSET_LIBRARY_PRESETS[provider]), enabled } }

const stationPayload = () => ({
  name: form.name,
  baseUrl: form.baseUrl,
  appendApiV3: form.appendApiV3,
  keyValue: form.keyValue || undefined,
  modelRedirects: { ...form.modelRedirects },
  assetLibraryConfig: form.assetLibraryConfig ? cloneAssetLibraryConfig(form.assetLibraryConfig) : null,
})

const saveStation = async () => {
  if (!formRef.value || !(await formRef.value.validate().catch(() => false))) return
  saving.value = true
  try {
    if (editing.value) await adminApi.updateRelayStation(editing.value.id, stationPayload())
    else await adminApi.addRelayStation({ ...stationPayload(), isPrimary: form.isPrimary })
    ElMessage.success('中转站已保存'); dialogVisible.value = false; await fetchStations()
  } catch (error: any) { ElMessage.error(error.response?.data?.error || '保存失败') }
  finally { saving.value = false }
}

const setPrimary = async (station: RelayStation) => {
  try { await ElMessageBox.confirm(`将「${station.name}」设为当前主站？新任务会从该站点发送。`, '切换主站', { type: 'warning' }); await adminApi.setPrimaryRelayStation(station.id); ElMessage.success('主站已切换'); await fetchStations() }
  catch (error: any) { if (error !== 'cancel') ElMessage.error(error.response?.data?.error || '切换失败') }
}

const testConnection = async (station: RelayStation) => {
  testingStationId.value = station.id
  try {
    const result = (await adminApi.testRelayStation(station.id)).data
    if (result.ok) ElMessage.success('中转站连通测试成功')
    else ElMessage.error(result.message)
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '连通测试失败')
  } finally {
    testingStationId.value = null
  }
}

const toggleActive = async (station: RelayStation) => {
  try { await adminApi.updateRelayStation(station.id, { name: station.name, baseUrl: station.baseUrl, appendApiV3: station.appendApiV3, modelRedirects: { ...station.modelRedirects }, isActive: !station.isActive }); ElMessage.success(station.isActive ? '中转站已停用' : '中转站已启用'); await fetchStations() }
  catch (error: any) { ElMessage.error(error.response?.data?.error || '更新失败') }
}

const removeStation = async (station: RelayStation) => {
  try { await ElMessageBox.confirm(`确认删除「${station.name}」？`, '删除中转站', { type: 'warning' }); await adminApi.deleteRelayStation(station.id); ElMessage.success('中转站已删除'); await fetchStations() }
  catch (error: any) { if (error !== 'cancel') ElMessage.error(error.response?.data?.error || '删除失败') }
}

const formatDate = (date: string) => new Date(date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', year: 'numeric' })
onMounted(() => { fetchStations(); fetchStorage() })
</script>

<style scoped>
.admin-page { max-width: 1380px; margin: 0 auto; }
.page-header { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; margin-bottom:24px; }
.eyebrow { margin:0 0 8px; color:var(--accent-primary); font-size:11px; font-weight:700; letter-spacing:.12em; }
.page-title { margin:0; color:var(--text-primary); font-size:32px; line-height:1.15; font-weight:700; }
.page-subtitle { margin:8px 0 0; color:var(--text-secondary); font-size:14px; }
.primary-alert { margin-bottom:16px; }
.summary-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:16px; }
.summary-item { padding:16px 18px; border:1px solid var(--border-default); background:var(--bg-secondary); border-radius:8px; }
.summary-item span { display:block; color:var(--text-muted); font-size:12px; margin-bottom:7px; }.summary-item strong{font-size:24px;color:var(--text-primary)}.summary-item .primary-value{font-size:16px;color:var(--accent-primary)}
.table-shell { padding:4px 0 14px; border:1px solid var(--border-default); background:var(--bg-secondary); border-radius:8px; overflow:hidden; }
.storage-panel { margin-bottom:16px; padding:20px; border:1px solid var(--border-default); background:var(--bg-secondary); border-radius:8px; }
.storage-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:14px; }.storage-heading h2{margin:0;color:var(--text-primary);font-size:18px}.storage-heading p:not(.eyebrow){margin:6px 0 0;color:var(--text-muted);font-size:12px}.storage-form{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) auto;align-items:end;gap:12px}.storage-form :deep(.el-form-item){margin-bottom:0}.storage-actions{display:flex;gap:8px;padding-bottom:1px;white-space:nowrap}.storage-hint{margin:14px 0 0;color:var(--text-muted);font-size:11px;line-height:1.5}
.station-name { display:flex; align-items:center; gap:8px; color:var(--text-primary); font-weight:600; }.station-url{display:block;margin:5px 0 0 16px;color:var(--text-muted);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.status-dot{width:7px;height:7px;border-radius:50%;background:var(--text-muted)}.status-dot.active{background:var(--success);box-shadow:0 0 0 3px var(--success-light)}code{color:var(--text-secondary);font-size:12px}.form-hint{margin:-4px 0 18px;color:var(--text-muted);font-size:12px;line-height:1.5}
.asset-library-section{margin:2px 0 18px;padding:16px;border:1px solid var(--border-default);border-radius:8px;background:var(--bg-tertiary)}.asset-library-toolbar{display:grid;grid-template-columns:1fr 1fr;gap:12px}.asset-library-toolbar :deep(.el-form-item){margin-bottom:12px}.asset-library-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}.asset-library-grid :deep(.el-form-item){margin-bottom:12px}.asset-library-grid :deep(.el-input__wrapper),.asset-library-toolbar :deep(.el-select){width:100%}
.admin-page :deep(.el-dialog__body){max-height:calc(100vh - 220px);overflow-y:auto}
.redirect-section{margin:2px 0 18px;padding:16px;border:1px solid var(--border-default);border-radius:8px;background:var(--bg-tertiary)}.redirect-heading{margin-bottom:14px}.redirect-heading h3{margin:0;color:var(--text-primary);font-size:14px;line-height:1.4}.redirect-heading p{margin:5px 0 0;color:var(--text-muted);font-size:12px;line-height:1.5}.redirect-section :deep(.el-form-item:last-child){margin-bottom:0}.redirect-section :deep(.el-form-item__label){font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px}
@media(max-width:700px){.page-header{align-items:flex-start;flex-direction:column}.summary-grid{grid-template-columns:1fr}.storage-form{grid-template-columns:1fr}.storage-actions{padding-top:4px}.table-shell{overflow:auto}.table-shell :deep(.el-table){min-width:850px}.asset-library-toolbar,.asset-library-grid{grid-template-columns:1fr}}
</style>
