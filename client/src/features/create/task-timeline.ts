import type { Task } from '@/api/tasks'
import { MODEL_OPTIONS, createDefaultForm, referenceRoleForKind, type AssetInput, type CreateFormState } from './seedance'

export type TaskTimelineStatus = 'submitting' | 'queued' | 'processing' | 'completed' | 'failed'

export interface TaskTimelineEntry {
  id: string
  taskId?: string
  status: TaskTimelineStatus
  snapshot: CreateFormState
  parameterSummary: string[]
  errorMessage?: string
  videoUrl?: string
  createdAt?: string
  completedAt?: string
}

export interface TaskTimelineEvent {
  id: string
  status?: string
  errorMessage?: string
  videoUrl?: string
  completedAt?: string
}

export const MISSING_LOCAL_ASSET_MESSAGE = '历史素材没有本地原文件，请重新选择素材'

const taskStatus = (status: Task['status']): TaskTimelineStatus => ({
  PENDING: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as Record<Task['status'], TaskTimelineStatus>)[status]

const isModel = (value: unknown): value is CreateFormState['model'] => MODEL_OPTIONS.some((item) => item.value === value)
const isResolution = (value: unknown): value is CreateFormState['resolution'] => ['480p', '720p', '1080p', '4k'].includes(String(value))
const isRatio = (value: unknown): value is CreateFormState['ratio'] => ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', 'adaptive'].includes(String(value))
const isOutputFormat = (value: unknown): value is CreateFormState['output_format'] => ['mp4', 'mov'].includes(String(value))

const assetFromContent = (entry: Record<string, any>, taskId: string, index: number): AssetInput | null => {
  const media = ([
    ['image', entry.image_url?.url],
    ['video', entry.video_url?.url],
    ['audio', entry.audio_url?.url],
  ] as const).find(([, source]) => typeof source === 'string' && source.length > 0)
  if (!media) return null
  const [kind, source] = media
  const isLocal = source.startsWith('local-asset://')
  return {
    id: `${taskId}-asset-${index}`,
    kind,
    source,
    label: isLocal ? `参考${kind}` : source.split(/[/?#]/).pop() || `参考${kind}`,
    role: referenceRoleForKind(kind),
    contentIndex: index,
    requiresReselect: /^https?:\/\//i.test(source),
    previewTaskId: taskId,
  }
}

export const taskToTimelineEntry = (task: Pick<Task, 'id' | 'prompt' | 'params' | 'status' | 'videoUrl' | 'errorMessage' | 'createdAt' | 'completedAt'>): TaskTimelineEntry => {
  const params = task.params ?? {}
  const form = createDefaultForm()
  if (isModel(params.model)) form.model = params.model
  if (isResolution(params.resolution)) form.resolution = params.resolution
  if (isRatio(params.ratio)) form.ratio = params.ratio
  if (typeof params.duration === 'number') form.duration = params.duration
  if (typeof params.generate_audio === 'boolean') form.generate_audio = params.generate_audio
  if (typeof params.watermark === 'boolean') form.watermark = params.watermark
  if (isOutputFormat(params.output_format)) form.output_format = params.output_format
  if (params.omni_reference_task_type === 'auto') form.omni_reference_task_type = 'auto'

  const content = Array.isArray(params.content) ? params.content as Record<string, any>[] : []
  const textPrompt = content.find((item) => item?.type === 'text')?.text
  form.prompt = task.prompt || (typeof textPrompt === 'string' ? textPrompt : '')
  form.assets = content
    .map((item, index) => assetFromContent(item, task.id, index))
    .filter((asset): asset is AssetInput => Boolean(asset))

  return {
    id: `server-${task.id}`,
    taskId: task.id,
    status: taskStatus(task.status),
    snapshot: form,
    parameterSummary: buildParameterSummary(form),
    errorMessage: task.errorMessage || undefined,
    videoUrl: task.videoUrl || undefined,
    createdAt: task.createdAt,
    completedAt: task.completedAt || undefined,
  }
}

export const cloneCreateForm = (form: CreateFormState): CreateFormState => ({
  ...form,
  assets: form.assets.map((asset) => ({ ...asset })),
})

export const hasUnavailableAssets = (form: CreateFormState): boolean => form.assets
  .some((asset) => asset.requiresReselect)

export const snapshotForEditing = (form: CreateFormState): CreateFormState => {
  const snapshot = cloneCreateForm(form)
  snapshot.assets = snapshot.assets.filter((asset) => !asset.requiresReselect)
  return snapshot
}

export const buildParameterSummary = (form: CreateFormState): string[] => {
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

const normalizeTaskStatus = (status: string | undefined, current: TaskTimelineStatus): TaskTimelineStatus => {
  const statusMap: Record<string, TaskTimelineStatus> = {
    PENDING: 'queued',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
  }
  return status ? statusMap[status.toUpperCase()] ?? current : current
}

export const applyTaskEvent = (entries: TaskTimelineEntry[], event: TaskTimelineEvent): TaskTimelineEntry[] => entries.map((entry) => {
  if (entry.taskId !== event.id) return entry
  return {
    ...entry,
    status: normalizeTaskStatus(event.status, entry.status),
    errorMessage: event.errorMessage ?? entry.errorMessage,
    videoUrl: event.videoUrl ?? entry.videoUrl,
    completedAt: event.completedAt ?? entry.completedAt,
  }
})
