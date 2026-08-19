<template>
  <div class="create-page">
    <header class="page-header">
      <div><p class="eyebrow">CREATE WITH SEEDANCE</p><h1>视频创作</h1></div>
      <span class="system-status"><i></i>系统就绪</span>
    </header>

    <el-alert v-if="!canGenerate" title="当前账号暂未获得视频生成权限，请联系管理员开通。" type="warning" :closable="false" show-icon class="access-alert" />

    <main class="conversation-workspace">
      <ConversationTimeline :entries="entries" />
      <CreateComposer
        :form="form"
        :submitting="submitting"
        :can-generate="canGenerate"
        :error="formError"
        @material-command="handleMaterialCommand"
        @remove-asset="removeAsset"
        @model-change="handleModelChange"
        @submit="submitTask"
      />
    </main>

    <input ref="imagePicker" type="file" accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff,image/gif,image/heic,image/heif" hidden @change="handleFileSelected($event, 'image')" />
    <input ref="audioPicker" type="file" accept="audio/wav,audio/mpeg,audio/mp3" hidden @change="handleFileSelected($event, 'audio')" />

    <el-dialog v-model="videoDialogVisible" title="添加参考视频" width="min(460px, calc(100vw - 28px))">
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="视频 URL 或素材 ID">
          <el-input v-model="videoSource" placeholder="https://.../video.mp4 或 asset://xxx" @keyup.enter="addVideoAsset" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="videoDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addVideoAsset">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { tasksApi } from '@/api/tasks'
import ConversationTimeline, { type ConversationEntry } from '@/components/create/ConversationTimeline.vue'
import CreateComposer from '@/components/create/CreateComposer.vue'
import {
  buildTaskRequest,
  createDefaultForm,
  exceedsDataUrlLimit,
  fileToDataUrl,
  MODEL_OPTIONS,
  normalizeModelSettings,
  referenceRoleForKind,
  validateCreateForm,
  type AssetInput,
} from '@/features/create/seedance'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const form = reactive(createDefaultForm())
const entries = ref<ConversationEntry[]>([])
const submitting = ref(false)
const formError = ref('')
const imagePicker = ref<HTMLInputElement>()
const audioPicker = ref<HTMLInputElement>()
const videoDialogVisible = ref(false)
const videoSource = ref('')
const canGenerate = computed(() => authStore.isAdmin() || authStore.user?.canGenerate !== false)

const handleModelChange = () => {
  normalizeModelSettings(form)
  formError.value = ''
}

const handleMaterialCommand = (command: 'image' | 'audio' | 'video') => {
  formError.value = ''
  if (command === 'image') imagePicker.value?.click()
  else if (command === 'audio') audioPicker.value?.click()
  else {
    videoSource.value = ''
    videoDialogVisible.value = true
  }
}

const handleFileSelected = async (event: Event, kind: 'image' | 'audio') => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  try {
    if (file.size > 30 * 1024 * 1024) throw new Error('单个本地素材不能超过 30 MB')
    const source = await fileToDataUrl(file)
    const nextAsset: AssetInput = { id: `${kind}-${Date.now()}`, kind, source, label: file.name, role: referenceRoleForKind(kind) }
    if (exceedsDataUrlLimit([...form.assets, nextAsset])) throw new Error('本地素材总大小过大，请减少素材数量或改用 asset:// 素材 ID')
    form.assets.push(nextAsset)
    formError.value = ''
  } catch (error: any) {
    ElMessage.error(error.message || '读取素材失败')
  } finally {
    target.value = ''
  }
}

const addVideoAsset = () => {
  const source = videoSource.value.trim()
  if (!/^(https?:\/\/|asset:\/\/)/i.test(source)) {
    ElMessage.error('视频必须使用 HTTP(S) URL 或 asset:// 素材 ID')
    return
  }
  form.assets.push({ id: `video-${Date.now()}`, kind: 'video', source, label: source, role: referenceRoleForKind('video') })
  formError.value = ''
  videoDialogVisible.value = false
}

const removeAsset = (id: string) => {
  form.assets = form.assets.filter((asset) => asset.id !== id)
  formError.value = ''
}

const buildParameterSummary = () => {
  const model = MODEL_OPTIONS.find((item) => item.value === form.model)
  return [
    model?.label ?? form.model,
    form.resolution.toUpperCase(),
    form.ratio === 'adaptive' ? '自适应比例' : form.ratio,
    form.duration === -1 ? '智能时长' : `${form.duration} 秒`,
    form.generate_audio ? '有声' : '无声',
    form.watermark ? 'AI 水印' : '无水印',
    form.output_format.toUpperCase(),
  ]
}

const clearComposerContent = () => {
  form.prompt = ''
  form.assets = []
}

const submitTask = async () => {
  if (submitting.value) return
  formError.value = validateCreateForm(form)
  if (formError.value || !canGenerate.value) return

  const request = buildTaskRequest({ ...form, assets: [...form.assets] })
  entries.value.push({
    id: `user-${Date.now()}`,
    role: 'user',
    prompt: form.prompt.trim(),
    materials: form.assets.map(({ kind, label }) => ({ kind, label })),
    parameterSummary: buildParameterSummary(),
  })
  submitting.value = true
  try {
    const response = await tasksApi.createTask(request)
    entries.value.push({ id: `assistant-${response.data.task.id}`, role: 'assistant', status: 'queued', taskId: response.data.task.id, message: '任务已进入生成队列' })
    clearComposerContent()
    formError.value = ''
  } catch (error: any) {
    formError.value = error.response?.data?.error || error.message || '创建任务失败'
    entries.value.push({ id: `assistant-error-${Date.now()}`, role: 'assistant', status: 'failed', message: formError.value })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.create-page{display:flex;width:min(1120px,100%);min-height:calc(100vh - 128px);margin:0 auto;flex-direction:column}.page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:2px 2px 14px;border-bottom:1px solid var(--border-subtle)}.eyebrow{margin:0 0 6px;color:var(--accent-primary);font-size:10px;font-weight:700;letter-spacing:.12em}.page-header h1{margin:0;color:var(--text-primary);font-size:24px;font-weight:720;line-height:1.2;letter-spacing:0}.system-status{display:flex;align-items:center;gap:7px;padding-bottom:3px;color:var(--text-muted);font-size:11px}.system-status i{width:6px;height:6px;border-radius:50%;background:var(--success);box-shadow:0 0 0 4px var(--success-light)}.access-alert{margin-top:14px}.conversation-workspace{display:flex;flex:1 1 auto;min-height:0;flex-direction:column}@media(max-width:720px){.create-page{min-height:calc(100vh - 138px)}.page-header{padding-top:0}.page-header h1{font-size:21px}.system-status{padding-bottom:1px}}
</style>
