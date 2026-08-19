export type ModelId = 'doubao-seedance-2-5' | 'doubao-seedance-2-0' | 'doubao-seedance-2-0-fast' | 'doubao-seedance-2-0-mini'
export type Resolution = '480p' | '720p' | '1080p' | '4k'
export type Ratio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9' | 'adaptive'
export type ReferenceRole = 'reference_image' | 'reference_video' | 'reference_audio'
export const MAX_DATA_URL_CHARS = 48 * 1024 * 1024

export interface AssetInput {
  id: string
  kind: 'image' | 'video' | 'audio'
  source: string
  label: string
  role?: ReferenceRole
  roleLabel?: string
}

export interface CreateFormState {
  mode: 'reference'
  prompt: string
  model: ModelId
  resolution: Resolution
  ratio: Ratio
  duration: number
  generate_audio: boolean
  watermark: boolean
  output_format: 'mp4' | 'mov'
  omni_reference_task_type: 'auto'
  assets: AssetInput[]
}

export const MODEL_OPTIONS: Array<{ value: ModelId; label: string; resolutions: Resolution[]; maxDuration: number }> = [
  { value: 'doubao-seedance-2-5', label: 'Seedance 2.5', resolutions: ['480p', '720p', '1080p'], maxDuration: 30 },
  { value: 'doubao-seedance-2-0', label: 'Seedance 2.0', resolutions: ['480p', '720p', '1080p', '4k'], maxDuration: 15 },
  { value: 'doubao-seedance-2-0-fast', label: 'Seedance 2.0 Fast', resolutions: ['480p', '720p'], maxDuration: 15 },
  { value: 'doubao-seedance-2-0-mini', label: 'Seedance 2.0 Mini', resolutions: ['480p', '720p'], maxDuration: 15 },
]

export const createDefaultForm = (): CreateFormState => ({
  mode: 'reference',
  prompt: '',
  model: 'doubao-seedance-2-5',
  resolution: '720p',
  ratio: 'adaptive',
  duration: -1,
  generate_audio: true,
  watermark: false,
  output_format: 'mp4',
  omni_reference_task_type: 'auto',
  assets: [],
})

export const referenceRoleForKind = (kind: AssetInput['kind']): ReferenceRole => `reference_${kind}`

export const buildTaskRequest = (form: CreateFormState) => {
  const prompt = form.prompt.trim()
  const content: Record<string, unknown>[] = []
  if (prompt) content.push({ type: 'text', text: prompt })
  content.push(...form.assets.map((asset) => ({
    type: `${asset.kind}_url`,
    [`${asset.kind}_url`]: { url: asset.source },
    role: referenceRoleForKind(asset.kind),
  })))

  const params: Record<string, unknown> = {
    model: form.model,
    content,
    resolution: form.resolution,
    ratio: form.ratio,
    duration: form.duration,
    generate_audio: form.generate_audio,
    watermark: form.watermark,
    output_format: form.output_format,
  }
  if (form.model === 'doubao-seedance-2-5') params.omni_reference_task_type = 'auto'
  return { prompt, params }
}

export const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result))
  reader.onerror = () => reject(new Error('读取素材失败'))
  reader.readAsDataURL(file)
})

export const exceedsDataUrlLimit = (assets: AssetInput[]): boolean => assets
  .filter((asset) => asset.source.startsWith('data:'))
  .reduce((total, asset) => total + asset.source.length, 0) > MAX_DATA_URL_CHARS

export const validateCreateForm = (form: CreateFormState): string => {
  if (exceedsDataUrlLimit(form.assets)) return '本地素材总大小过大，请减少素材数量或改用 asset:// 素材 ID'
  if (!form.prompt.trim() && form.assets.length === 0) return '请输入提示词或添加至少一项参考素材'

  const audioOnly = form.assets.length > 0 && form.assets.every((asset) => asset.kind === 'audio')
  if (form.model !== 'doubao-seedance-2-5' && audioOnly) return 'Seedance 2.0 不能仅使用音频，请再添加图片或视频'
  return ''
}
