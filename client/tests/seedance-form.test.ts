import { describe, expect, it } from 'vitest'
import { buildTaskRequest, exceedsDataUrlLimit, MAX_DATA_URL_CHARS } from '../src/features/create/seedance'

describe('buildTaskRequest', () => {
  it('builds first and last frame content with official roles', () => {
    const request = buildTaskRequest({
      mode: 'frames', prompt: 'camera moves forward', model: 'doubao-seedance-2-5', resolution: '720p', ratio: 'adaptive', duration: -1,
      generate_audio: true, watermark: false, output_format: 'mp4', omni_reference_task_type: 'auto', draftTaskId: '',
      assets: [
        { id: 'first', kind: 'image', source: 'data:image/png;base64,AA', label: 'first', role: 'first_frame' },
        { id: 'last', kind: 'image', source: 'asset://last', label: 'last', role: 'last_frame' },
      ],
    })
    expect(request.params.content).toEqual([
      { type: 'text', text: 'camera moves forward' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,AA' }, role: 'first_frame' },
      { type: 'image_url', image_url: { url: 'asset://last' }, role: 'last_frame' },
    ])
  })

  it('uses snake_case for audio and preserves output settings', () => {
    const request = buildTaskRequest({
      mode: 'text', prompt: 'A calm ocean', model: 'doubao-seedance-2-5', resolution: '1080p', ratio: '16:9', duration: 5,
      generate_audio: false, watermark: true, output_format: 'mov', omni_reference_task_type: 'auto', draftTaskId: '', assets: [],
      return_last_frame: true, callback_url: 'https://example.com/callback', execution_expires_after: 7200,
      safety_identifier: 'user-1', priority: 8, web_search: true,
    })
    expect(request.params).toMatchObject({
      generate_audio: false,
      watermark: true,
      output_format: 'mov',
      return_last_frame: true,
      callback_url: 'https://example.com/callback',
      execution_expires_after: 7200,
      safety_identifier: 'user-1',
      priority: 8,
      tools: [{ type: 'web_search' }],
    })
  })
})

describe('exceedsDataUrlLimit', () => {
  it('checks the combined size of all local materials', () => {
    const source = `data:image/png;base64,${'A'.repeat(Math.floor(MAX_DATA_URL_CHARS / 2))}`
    expect(exceedsDataUrlLimit([
      { id: 'one', kind: 'image', source, label: 'one' },
      { id: 'two', kind: 'image', source, label: 'two' },
    ])).toBe(true)
  })

  it('does not count remote material URLs', () => {
    expect(exceedsDataUrlLimit([
      { id: 'one', kind: 'video', source: 'https://example.com/video.mp4', label: 'one' },
    ])).toBe(false)
  })
})
