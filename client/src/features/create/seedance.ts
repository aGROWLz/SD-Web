export type CreateMode = 'text' | 'first-frame' | 'frames' | 'reference' | 'draft'
export type ModelId = 'doubao-seedance-2-5' | 'doubao-seedance-2-0' | 'doubao-seedance-2-0-fast' | 'doubao-seedance-2-0-mini'
export type Resolution = '480p' | '720p' | '1080p' | '4k'
export type Ratio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9' | 'adaptive'
export type OmniTaskType = 'auto' | 'reference' | 'edit' | 'extend'

export interface AssetInput {
  id: string
  kind: 'image' | 'video' | 'audio'
  source: string
  label: string
  role?: 'first_frame' | 'last_frame' | 'reference_image' | 'reference_video' | 'reference_audio'
  roleLabel?: string
}

export interface CreateFormState {
  mode: CreateMode
  prompt: string
  model: ModelId
  resolution: Resolution
  ratio: Ratio
  duration: number
  generate_audio: boolean
  watermark: boolean
  output_format: 'mp4' | 'mov'
  omni_reference_task_type: OmniTaskType
  assets: AssetInput[]
  draftTaskId: string
}

export const MODE_OPTIONS = [
  { value: 'text' as const, label: '文生视频', hint: '只用提示词生成画面' },
  { value: 'first-frame' as const, label: '首帧', hint: '从指定画面开始' },
  { value: 'frames' as const, label: '首尾帧', hint: '控制开始与结束画面' },
  { value: 'reference' as const, label: '全模态参考', hint: '组合图片、视频和音频' },
  { value: 'draft' as const, label: '样片任务', hint: '基于已有样片继续生成' },
]

export const MODEL_OPTIONS: Array<{ value: ModelId; label: string; resolutions: Resolution[]; maxDuration: number }> = [
  { value: 'doubao-seedance-2-5', label: 'Seedance 2.5', resolutions: ['480p', '720p', '1080p'], maxDuration: 30 },
  { value: 'doubao-seedance-2-0', label: 'Seedance 2.0', resolutions: ['480p', '720p', '1080p', '4k'], maxDuration: 15 },
  { value: 'doubao-seedance-2-0-fast', label: 'Seedance 2.0 Fast', resolutions: ['480p', '720p'], maxDuration: 15 },
  { value: 'doubao-seedance-2-0-mini', label: 'Seedance 2.0 Mini', resolutions: ['480p', '720p'], maxDuration: 15 },
]

export const createDefaultForm = (): CreateFormState => ({
  mode: 'text', prompt: '', model: 'doubao-seedance-2-5', resolution: '720p', ratio: 'adaptive', duration: -1,
  generate_audio: true, watermark: false, output_format: 'mp4', omni_reference_task_type: 'auto', assets: [], draftTaskId: '',
})

export const buildTaskRequest = (form: Pick<CreateFormState, 'mode' | 'prompt' | 'model' | 'resolution' | 'ratio' | 'duration' | 'generate_audio' | 'watermark' | 'output_format' | 'omni_reference_task_type' | 'assets' | 'draftTaskId'>) => {
  const prompt = form.prompt.trim()
  const content: Record<string, any>[] = []
  if (prompt) content.push({ type: 'text', text: prompt })

  if (form.mode === 'draft') {
    if (form.draftTaskId.trim()) content.push({ type: 'draft_task', draft_task: { id: form.draftTaskId.trim() } })
  } else {
    content.push(...form.assets.map((asset) => ({
      type: `${asset.kind}_url`,
      [`${asset.kind}_url`]: { url: asset.source },
      ...(asset.role ? { role: asset.role } : {}),
    })))
  }

  const params: Record<string, any> = {
    model: form.model, content, resolution: form.resolution, ratio: form.ratio, duration: form.duration,
    generate_audio: form.generate_audio, watermark: form.watermark, output_format: form.output_format,
  }
  if (form.mode === 'reference' && form.model === 'doubao-seedance-2-5') params.omni_reference_task_type = form.omni_reference_task_type
  return { prompt, params }
}

export const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result))
  reader.onerror = () => reject(new Error('读取素材失败'))
  reader.readAsDataURL(file)
})

export const fileRoleForMode = (mode: CreateMode, kind: AssetInput['kind'], index: number): AssetInput['role'] => {
  if (mode === 'first-frame' && kind === 'image') return 'first_frame'
  if (mode === 'frames' && kind === 'image') return index === 0 ? 'first_frame' : 'last_frame'
  if (mode === 'reference') return `reference_${kind}` as AssetInput['role']
  return undefined
}
