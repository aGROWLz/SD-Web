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
        <el-table-column label="操作" width="245" fixed="right">
          <template #default="{ row }">
            <el-button v-if="!row.isPrimary" link type="primary" :disabled="!row.isActive" @click="setPrimary(row)">设为主站</el-button>
            <el-tag v-else type="success" effect="plain">当前主站</el-tag>
            <el-button link @click="toggleActive(row)">{{ row.isActive ? '停用' : '启用' }}</el-button>
            <el-button link @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" :disabled="row.taskCount > 0" @click="removeStation(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && stations.length === 0" description="还没有配置中转站" />
    </div>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑中转站' : '添加中转站'" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="站点名称" prop="name"><el-input v-model="form.name" placeholder="例如：主线路由" /></el-form-item>
        <el-form-item label="Base URL" prop="baseUrl"><el-input v-model="form.baseUrl" placeholder="https://relay.example.com" /></el-form-item>
        <el-form-item label="API Key" prop="keyValue">
          <el-input v-model="form.keyValue" type="password" show-password :placeholder="editing ? '留空表示保持原 Key' : '输入兼容中转站的 API Key'" />
        </el-form-item>
        <div class="form-hint">系统会自动补齐 `/api/v3`，Key 只加密存储，不会在列表中显示明文。</div>
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
import { adminApi, type RelayStation } from '@/api/admin'

const stations = ref<RelayStation[]>([])
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editing = ref<RelayStation | null>(null)
const formRef = ref<FormInstance>()
const form = reactive({ name: '', baseUrl: '', keyValue: '', isPrimary: false })
const rules: FormRules = {
  name: [{ required: true, message: '请输入站点名称', trigger: 'blur' }],
  baseUrl: [{ required: true, message: '请输入 Base URL', trigger: 'blur' }],
  keyValue: [{ required: true, message: '请输入 API Key', trigger: 'blur' }],
}

const primaryStation = computed(() => stations.value.find((station) => station.isPrimary && station.isActive))
const activeCount = computed(() => stations.value.filter((station) => station.isActive).length)

const fetchStations = async () => {
  loading.value = true
  try { stations.value = (await adminApi.getRelayStations()).data.stations }
  catch (error: any) { ElMessage.error(error.response?.data?.error || '获取中转站失败') }
  finally { loading.value = false }
}

const resetForm = () => { form.name = ''; form.baseUrl = ''; form.keyValue = ''; form.isPrimary = false }
const openCreate = () => { editing.value = null; resetForm(); dialogVisible.value = true }
const openEdit = (station: RelayStation) => { editing.value = station; form.name = station.name; form.baseUrl = station.baseUrl; form.keyValue = ''; form.isPrimary = false; dialogVisible.value = true }

const saveStation = async () => {
  if (!formRef.value || !(await formRef.value.validate().catch(() => false))) return
  saving.value = true
  try {
    if (editing.value) await adminApi.updateRelayStation(editing.value.id, { name: form.name, baseUrl: form.baseUrl, keyValue: form.keyValue || undefined })
    else await adminApi.addRelayStation(form)
    ElMessage.success('中转站已保存'); dialogVisible.value = false; await fetchStations()
  } catch (error: any) { ElMessage.error(error.response?.data?.error || '保存失败') }
  finally { saving.value = false }
}

const setPrimary = async (station: RelayStation) => {
  try { await ElMessageBox.confirm(`将「${station.name}」设为当前主站？新任务会从该站点发送。`, '切换主站', { type: 'warning' }); await adminApi.setPrimaryRelayStation(station.id); ElMessage.success('主站已切换'); await fetchStations() }
  catch (error: any) { if (error !== 'cancel') ElMessage.error(error.response?.data?.error || '切换失败') }
}

const toggleActive = async (station: RelayStation) => {
  try { await adminApi.updateRelayStation(station.id, { name: station.name, baseUrl: station.baseUrl, isActive: !station.isActive }); ElMessage.success(station.isActive ? '中转站已停用' : '中转站已启用'); await fetchStations() }
  catch (error: any) { ElMessage.error(error.response?.data?.error || '更新失败') }
}

const removeStation = async (station: RelayStation) => {
  try { await ElMessageBox.confirm(`确认删除「${station.name}」？`, '删除中转站', { type: 'warning' }); await adminApi.deleteRelayStation(station.id); ElMessage.success('中转站已删除'); await fetchStations() }
  catch (error: any) { if (error !== 'cancel') ElMessage.error(error.response?.data?.error || '删除失败') }
}

const formatDate = (date: string) => new Date(date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', year: 'numeric' })
onMounted(fetchStations)
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
.station-name { display:flex; align-items:center; gap:8px; color:var(--text-primary); font-weight:600; }.station-url{display:block;margin:5px 0 0 16px;color:var(--text-muted);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.status-dot{width:7px;height:7px;border-radius:50%;background:var(--text-muted)}.status-dot.active{background:var(--success);box-shadow:0 0 0 3px var(--success-light)}code{color:var(--text-secondary);font-size:12px}.form-hint{margin:-4px 0 18px;color:var(--text-muted);font-size:12px;line-height:1.5}
@media(max-width:700px){.page-header{align-items:flex-start;flex-direction:column}.summary-grid{grid-template-columns:1fr}.table-shell{overflow:auto}.table-shell :deep(.el-table){min-width:850px}}
</style>
