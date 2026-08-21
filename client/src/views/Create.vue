<template>
  <div class="create-page">
    <el-alert v-if="!canGenerate" title="当前账号暂未获得视频生成权限，请联系管理员开通。" type="warning" :closable="false" show-icon class="access-alert" />

    <main class="conversation-workspace">
      <ConversationTimeline :entries="entries" :submitting="submitting" @edit="editTask" @retry="retryTask" />
      <div ref="composerHost" class="composer-dock">
        <CreateComposer
          :form="form"
          :submitting="submitting"
          :can-generate="canGenerate"
          :error="formError"
          @local-upload="openMaterialPicker"
          @asset-library="assetLibraryOpen = true"
          @remove-asset="removeAsset"
          @model-change="handleModelChange"
          @submit="submitTask"
          @save-batch="saveBatchDraft"
          @clear-composer="clearComposerContent"
        />
      </div>
      <aside class="batch-panel">
        <div class="batch-header"><div><strong>批量任务</strong><span>{{ batchDrafts.length }} 个任务</span></div><el-button size="small" type="primary" :disabled="!batchDrafts.length || batchStarting || batchCooldown > 0" @click="startBatch">{{ batchCooldown > 0 ? `请等待 ${batchCooldown} 秒` : '批量开始生成' }}</el-button></div>
        <div class="batch-list">
          <div v-if="!batchDrafts.length" class="batch-empty">保存配置后会出现在这里</div>
          <div v-for="(draft, index) in batchDrafts" :key="draft.id" class="batch-card">
            <div class="batch-card-top"><span>#{{ index + 1 }} <em v-if="draft.status">{{ draft.status === 'running' ? '提交中' : '已提交' }}</em></span><el-button text circle size="small" :disabled="draft.status === 'running'" @click="removeBatchDraft(draft.id)"><el-icon><Delete /></el-icon></el-button></div>
            <div class="batch-prompt-block">
              <p class="batch-prompt">{{ draft.form.prompt || '仅使用参考素材' }}</p>
              <button v-if="draft.form.prompt.trim().length > 30" type="button" class="batch-prompt-expand" @click="expandedBatchPromptId = expandedBatchPromptId === draft.id ? null : draft.id">{{ expandedBatchPromptId === draft.id ? '收起提示词' : '展开完整提示词' }}</button>
              <div v-if="expandedBatchPromptId === draft.id" class="batch-prompt-panel">{{ draft.form.prompt }}</div>
            </div>
            <div v-if="draft.form.assets.length" class="batch-assets"><TaskAssetPreview v-for="asset in draft.form.assets" :key="asset.id" :asset="asset" :compact="true" /></div>
            <small>{{ draft.form.model }} · {{ draft.form.duration === -1 ? '智能时长' : `${draft.form.duration} 秒` }} · {{ draft.form.assets.length }} 个素材</small>
            <el-button link type="primary" size="small" @click="editBatchDraft(draft)">编辑</el-button>
          </div>
        </div>
      </aside>
    </main>

    <PublicAssetPicker v-model="assetLibraryOpen" :selected-assets="form.assets" @select="togglePublicAsset" />

    <input ref="materialPicker" type="file" accept="image/*,audio/*,video/*" multiple hidden @change="handleFilesSelected" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { tasksApi, type Task } from '@/api/tasks'
import { assetsApi } from '@/api/assets'
import ConversationTimeline from '@/components/create/ConversationTimeline.vue'
import CreateComposer from '@/components/create/CreateComposer.vue'
import TaskAssetPreview from '@/components/create/TaskAssetPreview.vue'
import PublicAssetPicker from '@/components/create/PublicAssetPicker.vue'
import {
  buildTaskRequest,
  createDefaultForm,
  assetKindForFile,
  exceedsDataUrlLimit,
  fileToDataUrl,
  normalizeModelSettings,
  referenceRoleForKind,
  validateCreateForm,
  type AssetInput,
  type CreateFormState,
} from '@/features/create/seedance'
import {
  applyTaskEvent,
  buildParameterSummary,
  cloneCreateForm,
  hasUnavailableAssets,
  MISSING_LOCAL_ASSET_MESSAGE,
  snapshotForEditing,
  taskToTimelineEntry,
  type TaskTimelineEntry,
  type TaskTimelineEvent,
} from '@/features/create/task-timeline'
import { loadTimelineEntries, saveTimelineEntries } from '@/features/create/task-timeline-storage'
import { useSocket } from '@/composables/useSocket'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const form = reactive(createDefaultForm())
const entries = ref<TaskTimelineEntry[]>([])
const submitting = ref(false)
const formError = ref('')
const materialPicker = ref<HTMLInputElement>()
const assetLibraryOpen = ref(false)
const composerHost = ref<HTMLElement>()
const canGenerate = computed(() => authStore.isAdmin() || authStore.user?.canGenerate !== false)
const { connect } = useSocket()
const userId = computed(() => authStore.user?.id || '')
const formStorageKey = computed(() => `seedance:create-form:${userId.value}`)
interface BatchDraft { id: string; form: CreateFormState; status?: 'running' | 'submitted' }
const batchDrafts = ref<BatchDraft[]>([])
const expandedBatchPromptId = ref<string | null>(null)
const batchStarting = ref(false)
const batchCooldown = ref(0)
let batchCooldownTimer: ReturnType<typeof setInterval> | undefined
const batchStorageKey = computed(() => `seedance:batch-drafts:${userId.value}`)

const loadBatchDrafts = () => { try { const value = localStorage.getItem(batchStorageKey.value); batchDrafts.value = value ? JSON.parse(value) : [] } catch { batchDrafts.value = [] } }
const persistBatchDrafts = () => { try { localStorage.setItem(batchStorageKey.value, JSON.stringify(batchDrafts.value)) } catch { ElMessage.warning('批量任务保存失败，浏览器存储空间不足') } }
const saveBatchDraft = () => { if (!form.prompt.trim() && !form.assets.length) { ElMessage.warning('请先填写提示词或添加素材'); return }; batchDrafts.value.push({ id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, form: cloneCreateForm(form) }); persistBatchDrafts(); ElMessage.success('已保存到批量任务') }
const removeBatchDraft = (id: string) => { batchDrafts.value = batchDrafts.value.filter(item => item.id !== id); persistBatchDrafts() }
const editBatchDraft = (draft: BatchDraft) => { if (draft.status === 'running') return; Object.assign(form, cloneCreateForm(draft.form)); normalizeModelSettings(form); removeBatchDraft(draft.id) }
const startBatch = async () => {
  if (batchStarting.value || batchCooldown.value > 0) return
  const drafts = batchDrafts.value.filter((draft) => !draft.status).map((draft) => ({ ...draft }))
  if (!drafts.length) return
  batchStarting.value = true
  drafts.forEach((draft) => { const item = batchDrafts.value.find((candidate) => candidate.id === draft.id); if (item) item.status = 'running' })
  persistBatchDrafts()
  await Promise.all(drafts.map((draft) => submitSnapshot(draft.form, false)))
  drafts.forEach((draft) => { const item = batchDrafts.value.find((candidate) => candidate.id === draft.id); if (item) item.status = 'submitted' })
  persistBatchDrafts()
  batchStarting.value = false
  batchCooldown.value = 5
  batchCooldownTimer = setInterval(() => { batchCooldown.value -= 1; if (batchCooldown.value <= 0 && batchCooldownTimer) { clearInterval(batchCooldownTimer); batchCooldownTimer = undefined } }, 1000)
  ElMessage.success('批量任务已提交')
}

const restoreComposer = () => {
  if (!userId.value) return
  try {
    const saved = localStorage.getItem(formStorageKey.value)
    if (!saved) return
    const parsed = JSON.parse(saved) as Partial<CreateFormState>
    Object.assign(form, parsed)
    form.assets = Array.isArray(parsed.assets) ? parsed.assets : []
    normalizeModelSettings(form)
  } catch { /* ignore invalid local draft */ }
}

const handleModelChange = () => {
  normalizeModelSettings(form)
  formError.value = ''
}

const openMaterialPicker = () => {
  formError.value = ''
  materialPicker.value?.click()
}

const handleFilesSelected = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files ?? [])
  if (files.length === 0) return
  try {
    const selectedAt = Date.now()
    const nextAssets: AssetInput[] = []
    for (const [index, file] of files.entries()) {
      if (file.size > 30 * 1024 * 1024) throw new Error(`「${file.name}」超过 30 MB`)
      const kind = assetKindForFile(file)
      const source = await fileToDataUrl(file)
      const pendingAsset: AssetInput = { id: `${kind}-${selectedAt}-${index}`, kind, source, previewDataUrl: source, label: file.name, role: referenceRoleForKind(kind), loading: true }
      nextAssets.push(pendingAsset)
      form.assets.push(pendingAsset)
      pendingAsset.loading = false
    }
    if (exceedsDataUrlLimit(form.assets)) throw new Error('本地素材总大小过大，请减少素材数量')
    formError.value = ''
  } catch (error: any) {
    ElMessage.error(error.message || '读取素材失败')
  } finally {
    target.value = ''
  }
}

const removeAsset = (id: string) => {
  form.assets = form.assets.filter((asset) => asset.id !== id)
  formError.value = ''
}

const togglePublicAsset = (asset: AssetInput) => {
  const existing = form.assets.find((item) => item.publicAssetId === asset.publicAssetId)
  if (existing) removeAsset(existing.id)
  else form.assets.push(asset)
  formError.value = ''
}

const clearComposerContent = () => {
  form.prompt = ''
  form.assets = []
}

const createClientEntryId = () => `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const patchEntry = (id: string, changes: Partial<TaskTimelineEntry>) => {
  const index = entries.value.findIndex((item) => item.id === id)
  if (index !== -1) entries.value[index] = { ...entries.value[index], ...changes }
}

const submitSnapshot = async (source: CreateFormState, clearComposer: boolean) => {
  const snapshot = cloneCreateForm(source)
  const entry: TaskTimelineEntry = {
    id: createClientEntryId(),
    status: 'submitting',
    snapshot,
    parameterSummary: buildParameterSummary(snapshot),
    createdAt: new Date().toISOString(),
  }
  entries.value.push(entry)
  submitting.value = true
  try {
    const requestSnapshot = cloneCreateForm(snapshot)
    for (const asset of requestSnapshot.assets) {
      if (asset.publicAssetId || !asset.previewDataUrl) continue
      try {
        const response = await assetsApi.upload(asset.previewDataUrl, asset.label)
        const publicAsset = response.data.asset
        asset.publicAssetId = publicAsset.id
        asset.previewUrl = publicAsset.previewUrl
        asset.source = publicAsset.providerAssetId ? `asset://${publicAsset.providerAssetId}` : `public-asset://${publicAsset.id}`
      } catch {
        // 未配置素材库时保留图片 Data URL，由请求体直接使用。
      }
    }
    const response = await tasksApi.createTask(buildTaskRequest(requestSnapshot))
    const persistedSnapshot = taskToTimelineEntry(response.data.task).snapshot
    patchEntry(entry.id, {
      taskId: response.data.task.id,
      status: response.data.task.status === 'PROCESSING' ? 'processing' : 'queued',
      snapshot: persistedSnapshot,
      parameterSummary: buildParameterSummary(persistedSnapshot),
      createdAt: response.data.task.createdAt,
    })
    // 并发提交时，较早任务完成上传不能清空用户正在准备的下一条任务。
    // 只有配置框仍与本次提交快照一致时才执行清空。
    if (clearComposer && JSON.stringify(form) === JSON.stringify(snapshot)) clearComposerContent()
    formError.value = ''
  } catch (error: any) {
    patchEntry(entry.id, {
      status: 'failed',
      errorMessage: error.response?.data?.error || error.message || '创建任务失败',
    })
  } finally {
    submitting.value = false
  }
}

const submitTask = async () => {
  formError.value = validateCreateForm(form)
  if (formError.value || !canGenerate.value) return
  await submitSnapshot(form, true)
}

const editTask = async (entry: TaskTimelineEntry) => {
  const requiresReselect = hasUnavailableAssets(entry.snapshot)
  Object.assign(form, snapshotForEditing(entry.snapshot))
  normalizeModelSettings(form)
  formError.value = ''
  if (requiresReselect) ElMessage.warning(MISSING_LOCAL_ASSET_MESSAGE)
  await nextTick()
  composerHost.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  composerHost.value?.querySelector<HTMLTextAreaElement>('textarea')?.focus()
}

const retryTask = async (entry: TaskTimelineEntry) => {
  if (submitting.value || !canGenerate.value) return
  if (hasUnavailableAssets(entry.snapshot)) {
    ElMessage.warning(MISSING_LOCAL_ASSET_MESSAGE)
    return
  }
  await submitSnapshot(entry.snapshot, false)
}

const updateTaskEntry = (event: TaskTimelineEvent) => {
  entries.value = applyTaskEvent(entries.value, event)
}

const loadServerTaskHistory = async () => {
  const tasks: Task[] = []
  let page = 1
  let totalPages = 1
  do {
    const response = await tasksApi.getTasks({ page, limit: 100, mine: true })
    tasks.push(...response.data.tasks)
    totalPages = response.data.pagination.totalPages
    page += 1
  } while (page <= totalPages)
  return tasks
}

const loadTaskHistory = async () => {
  const currentUserId = userId.value
  if (!currentUserId) return
  const [localEntries, serverResult] = await Promise.all([
    loadTimelineEntries(currentUserId),
    loadServerTaskHistory().catch(() => null),
  ])
  const serverEntries = serverResult?.map(taskToTimelineEntry) ?? []
  const serverTaskIds = new Set(serverEntries.map((entry) => entry.taskId))
  const uniqueLocalEntries = localEntries.filter((entry) => !entry.taskId || !serverTaskIds.has(entry.taskId))
  entries.value = [...serverEntries.reverse(), ...uniqueLocalEntries]
}

const handleTaskUpdate = (event: Event) => updateTaskEntry((event as CustomEvent<TaskTimelineEvent>).detail)
const handleTaskCompleted = (event: Event) => {
  const detail = (event as CustomEvent<TaskTimelineEvent>).detail
  updateTaskEntry({ ...detail, status: 'COMPLETED' })
}
const handleTaskFailed = (event: Event) => {
  const detail = (event as CustomEvent<TaskTimelineEvent>).detail
  updateTaskEntry({ ...detail, status: 'FAILED' })
}

onMounted(() => {
  connect()
  restoreComposer()
  void loadTaskHistory()
  loadBatchDrafts()
  window.addEventListener('task:update', handleTaskUpdate)
  window.addEventListener('task:completed', handleTaskCompleted)
  window.addEventListener('task:failed', handleTaskFailed)
})

watch(form, (value) => {
  if (!userId.value) return
  try { localStorage.setItem(formStorageKey.value, JSON.stringify(value)) } catch { /* storage quota; task submission still works */ }
}, { deep: true })

watch(entries, (value) => {
  if (userId.value) void saveTimelineEntries(userId.value, value.filter((entry) => !entry.taskId))
}, { deep: true })

onUnmounted(() => {
  if (batchCooldownTimer) clearInterval(batchCooldownTimer)
  window.removeEventListener('task:update', handleTaskUpdate)
  window.removeEventListener('task:completed', handleTaskCompleted)
  window.removeEventListener('task:failed', handleTaskFailed)
})
</script>

<style scoped>
.create-page{display:flex;width:min(1120px,100%);height:calc(100dvh - 128px);min-height:0;margin:0 auto;overflow:hidden;flex-direction:column}.page-header{display:flex;flex:0 0 auto;align-items:flex-end;justify-content:space-between;gap:16px;padding:2px 2px 14px;border-bottom:1px solid var(--border-subtle)}.eyebrow{margin:0 0 6px;color:var(--accent-primary);font-size:10px;font-weight:700;letter-spacing:.12em}.page-header h1{margin:0;color:var(--text-primary);font-size:24px;font-weight:720;line-height:1.2;letter-spacing:0}.system-status{display:flex;align-items:center;gap:7px;padding-bottom:3px;color:var(--text-muted);font-size:11px}.system-status i{width:6px;height:6px;border-radius:50%;background:var(--success);box-shadow:0 0 0 4px var(--success-light)}.access-alert{flex:0 0 auto;margin-top:14px}.conversation-workspace{display:flex;flex:1 1 auto;min-height:0;overflow:hidden;flex-direction:column}.composer-dock{position:relative;z-index:3;flex:0 0 auto;padding:12px 4px 2px;background:var(--bg-primary);box-shadow:0 -14px 28px rgba(6,10,11,.32)}@media(max-width:720px){.create-page{height:calc(100dvh - 138px)}.page-header{padding-top:0}.page-header h1{font-size:21px}.system-status{padding-bottom:1px}.composer-dock{padding:8px 2px 0}}
.create-page{position:relative}.batch-panel{position:absolute;z-index:4;top:0;right:0;bottom:0;width:248px;display:flex;flex-direction:column;min-height:0;padding:14px;border-left:1px solid var(--border-default);background:var(--bg-secondary);overflow:hidden}.batch-list{display:flex;flex:1 1 auto;min-height:0;flex-direction:column;gap:10px;margin-top:10px;overflow-y:auto;overflow-x:hidden}.batch-header{display:flex;flex:0 0 auto;align-items:center;justify-content:space-between;gap:8px}.batch-header strong{display:block;color:var(--text-primary);font-size:13px}.batch-header span{display:block;margin-top:3px;color:var(--text-muted);font-size:10px}.batch-empty{padding:28px 8px;color:var(--text-muted);font-size:11px;text-align:center}.batch-card{padding:10px;border:1px solid var(--border-default);border-radius:6px;background:var(--bg-elevated)}.batch-card-top{display:flex;align-items:center;justify-content:space-between;color:var(--accent-primary);font-size:11px}.batch-card p{display:-webkit-box;margin:8px 0 5px;overflow:hidden;color:var(--text-primary);font-size:12px;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:3}.batch-card small{display:block;margin-bottom:5px;color:var(--text-muted);font-size:10px}.save-batch-button{flex:0 0 38px;width:38px;height:38px;color:var(--text-secondary);background:var(--bg-elevated)}
@media(min-width:901px){.conversation-workspace{padding-right:248px}}@media(max-width:900px){.batch-panel{position:relative;top:auto;right:auto;bottom:auto;width:auto;max-height:220px;border-top:1px solid var(--border-default);border-left:0}.conversation-workspace{overflow:auto;padding-right:0}}
.create-page{width:100%;height:calc(100dvh - 96px);margin:0}
.batch-prompt-block{position:relative;min-width:0}.batch-prompt{display:-webkit-box;margin:8px 0 3px;overflow:hidden;color:var(--text-primary);font-size:12px;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:2}.batch-prompt-expand{padding:0;border:0;color:var(--accent-primary);background:transparent;font-size:10px;cursor:pointer}.batch-prompt-panel{position:absolute;z-index:30;top:calc(100% + 6px);right:0;left:auto;width:min(360px,calc(100vw - 32px));max-height:180px;overflow:auto;padding:10px;border:1px solid var(--border-emphasis);border-radius:6px;color:var(--text-primary);background:var(--bg-elevated);box-shadow:0 12px 30px rgba(0,0,0,.45);font-size:12px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}.batch-assets{display:flex;gap:5px;max-width:100%;overflow-x:auto;padding:3px 0 5px}.batch-assets :deep(.asset-preview){flex:0 0 40px;width:40px;height:40px}.batch-assets :deep(.asset-visual){height:40px;min-height:0}.batch-assets :deep(.material-type-icon){width:12px;height:12px;right:2px;bottom:2px;font-size:8px}.batch-panel{overflow:hidden}.batch-card{position:relative}.batch-card:has(.batch-prompt-panel){z-index:40}:global(.main-content){height:100%;min-width:0;min-height:0;overflow:hidden}
</style>

