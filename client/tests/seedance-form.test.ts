import { describe, expect, it } from 'vitest'
import {
  buildTaskRequest,
  createDefaultForm,
  exceedsDataUrlLimit,
  MAX_DATA_URL_CHARS,
  referenceRoleForKind,
  validateCreateForm,
  type AssetInput,
  type CreateFormState,
} from '../src/features/create/seedance'

const createForm = (overrides: Partial<CreateFormState> = {}): CreateFormState => ({
  ...createDefaultForm(),
  ...overrides,
})

describe('createDefaultForm', () => {
  it('defaults to the all-modal reference workflow', () => {
    expect(createDefaultForm()).toEqual({
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
  })
})

describe('referenceRoleForKind', () => {
  it.each([
    ['image', 'reference_image'],
    ['video', 'reference_video'],
    ['audio', 'reference_audio'],
  ] as const)('maps %s assets to %s', (kind, role) => {
    expect(referenceRoleForKind(kind)).toBe(role)
  })
})

describe('buildTaskRequest', () => {
  it('builds 2.5 reference content with text first and only supported params', () => {
    const form = createForm({
      prompt: '  camera moves forward  ',
      resolution: '1080p',
      ratio: '16:9',
      duration: 5,
      generate_audio: false,
      watermark: true,
      output_format: 'mov',
      assets: [
        { id: 'image', kind: 'image', source: 'data:image/png;base64,AA', label: 'image' },
        { id: 'video', kind: 'video', source: 'asset://video', label: 'video' },
        { id: 'audio', kind: 'audio', source: 'https://example.com/audio.mp3', label: 'audio' },
      ],
    })
    const request = buildTaskRequest(Object.assign(form, {
      return_last_frame: true,
      callback_url: 'https://example.com/callback',
      execution_expires_after: 7200,
      safety_identifier: 'user-1',
      priority: 8,
      web_search: true,
    }))

    expect(request).toEqual({
      prompt: 'camera moves forward',
      params: {
        model: 'doubao-seedance-2-5',
        content: [
          { type: 'text', text: 'camera moves forward' },
          { type: 'image_url', image_url: { url: 'data:image/png;base64,AA' }, role: 'reference_image' },
          { type: 'video_url', video_url: { url: 'asset://video' }, role: 'reference_video' },
          { type: 'audio_url', audio_url: { url: 'https://example.com/audio.mp3' }, role: 'reference_audio' },
        ],
        resolution: '1080p',
        ratio: '16:9',
        duration: 5,
        generate_audio: false,
        watermark: true,
        output_format: 'mov',
        omni_reference_task_type: 'auto',
      },
    })
  })

  it('omits 2.5-only params and text content for a material-only 2.0 request', () => {
    const request = buildTaskRequest(createForm({
      prompt: '   ',
      model: 'doubao-seedance-2-0',
      assets: [{ id: 'image', kind: 'image', source: 'https://example.com/image.png', label: 'image' }],
    }))

    expect(request.params.content).toEqual([
      { type: 'image_url', image_url: { url: 'https://example.com/image.png' }, role: 'reference_image' },
    ])
    expect(request.params).not.toHaveProperty('omni_reference_task_type')
  })
})

describe('validateCreateForm', () => {
  it('accepts prompt-only creation', () => {
    expect(validateCreateForm(createForm({ prompt: 'A calm ocean' }))).toBe('')
  })

  it('accepts material-only creation', () => {
    expect(validateCreateForm(createForm({
      assets: [{ id: 'image', kind: 'image', source: 'https://example.com/image.png', label: 'image' }],
    }))).toBe('')
  })

  it('requires a prompt or at least one reference material', () => {
    expect(validateCreateForm(createForm())).toBe('请输入提示词或添加至少一项参考素材')
  })

  it.each([
    'doubao-seedance-2-0',
    'doubao-seedance-2-0-fast',
    'doubao-seedance-2-0-mini',
  ] as const)('rejects audio-only creation for %s', (model) => {
    expect(validateCreateForm(createForm({
      model,
      assets: [{ id: 'audio', kind: 'audio', source: 'https://example.com/audio.mp3', label: 'audio' }],
    }))).toBe('Seedance 2.0 不能仅使用音频，请再添加图片或视频')
  })

  it('reports the existing combined local material size error', () => {
    const source = `data:image/png;base64,${'A'.repeat(MAX_DATA_URL_CHARS)}`
    expect(validateCreateForm(createForm({
      assets: [{ id: 'large', kind: 'image', source, label: 'large' }],
    }))).toBe('本地素材总大小过大，请减少素材数量或改用 asset:// 素材 ID')
  })
})

describe('exceedsDataUrlLimit', () => {
  it('checks the combined size of all local materials', () => {
    const source = `data:image/png;base64,${'A'.repeat(Math.floor(MAX_DATA_URL_CHARS / 2))}`
    const assets: AssetInput[] = [
      { id: 'one', kind: 'image', source, label: 'one' },
      { id: 'two', kind: 'image', source, label: 'two' },
    ]
    expect(exceedsDataUrlLimit(assets)).toBe(true)
  })

  it('does not count remote material URLs', () => {
    expect(exceedsDataUrlLimit([
      { id: 'one', kind: 'video', source: 'https://example.com/video.mp4', label: 'one' },
    ])).toBe(false)
  })
})
