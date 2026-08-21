<template>
  <div class="create-page">
    <header class="page-header">
      <div><p class="eyebrow">CREATE WITH SEEDANCE</p><h1>视频创作</h1></div>
      <span class="system-status"><i></i>系统就绪</span>
    </header>

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
        />
      </div>
    </main>

    <PublicAssetPicker v-model="assetLibraryOpen" :selected-assets="form.assets" @select="togglePublicAsset" />

    <input ref="materialPicker" type="file" accept="image/*,audio/*,video/*" multiple hidden @change="handleFilesSelected" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { tasksApi, type Task } from '@/api/tasks'
import { assetsApi } from '@/api/assets'
import ConversationTimeline from '@/components/create/ConversationTimeline.vue'
import CreateComposer from '@/components/create/CreateComposer.vue'
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
    if (clearComposer) clearComposerContent()
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
  if (submitting.value) return
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
  void loadTaskHistory()
  window.addEventListener('task:update', handleTaskUpdate)
  window.addEventListener('task:completed', handleTaskCompleted)
  window.addEventListener('task:failed', handleTaskFailed)
})

watch(entries, (value) => {
  if (userId.value) void saveTimelineEntries(userId.value, value.filter((entry) => !entry.taskId))
}, { deep: true })

onUnmounted(() => {
  window.removeEventListener('task:update', handleTaskUpdate)
  window.removeEventListener('task:completed', handleTaskCompleted)
  window.removeEventListener('task:failed', handleTaskFailed)
})
</script>

<style scoped>
.create-page{display:flex;width:min(1120px,100%);height:calc(100dvh - 128px);min-height:0;margin:0 auto;overflow:hidden;flex-direction:column}.page-header{display:flex;flex:0 0 auto;align-items:flex-end;justify-content:space-between;gap:16px;padding:2px 2px 14px;border-bottom:1px solid var(--border-subtle)}.eyebrow{margin:0 0 6px;color:var(--accent-primary);font-size:10px;font-weight:700;letter-spacing:.12em}.page-header h1{margin:0;color:var(--text-primary);font-size:24px;font-weight:720;line-height:1.2;letter-spacing:0}.system-status{display:flex;align-items:center;gap:7px;padding-bottom:3px;color:var(--text-muted);font-size:11px}.system-status i{width:6px;height:6px;border-radius:50%;background:var(--success);box-shadow:0 0 0 4px var(--success-light)}.access-alert{flex:0 0 auto;margin-top:14px}.conversation-workspace{display:flex;flex:1 1 auto;min-height:0;overflow:hidden;flex-direction:column}.composer-dock{position:relative;z-index:3;flex:0 0 auto;padding:12px 4px 2px;background:var(--bg-primary);box-shadow:0 -14px 28px rgba(6,10,11,.32)}@media(max-width:720px){.create-page{height:calc(100dvh - 138px)}.page-header{padding-top:0}.page-header h1{font-size:21px}.system-status{padding-bottom:1px}.composer-dock{padding:8px 2px 0}}
</style>
