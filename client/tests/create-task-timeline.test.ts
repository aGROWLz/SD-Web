import { describe, expect, it } from 'vitest'
import { createDefaultForm } from '../src/features/create/seedance'
import {
  applyTaskEvent,
  buildParameterSummary,
  cloneCreateForm,
  hasUnavailableAssets,
  MISSING_LOCAL_ASSET_MESSAGE,
  snapshotForEditing,
  taskToTimelineEntry,
  type TaskTimelineEntry,
} from '../src/features/create/task-timeline'

describe('create task timeline', () => {
  it('uses a clear message for historical material without a local original', () => {
    expect(MISSING_LOCAL_ASSET_MESSAGE).toBe('历史素材没有本地原文件，请重新选择素材')
  })

  it('restores and updates task completion timestamps', () => {
    const entry = taskToTimelineEntry({
      id: 'task-time-1', userId: 'user-1', prompt: '时间测试', params: { content: [{ type: 'text', text: '时间测试' }] },
      status: 'COMPLETED', videoUrl: 'https://cdn.example/video.mp4', errorMessage: undefined,
      createdAt: '2026-08-19T01:02:03.000Z', completedAt: '2026-08-19T01:05:06.000Z', updatedAt: '2026-08-19T01:05:06.000Z',
    })
    expect(entry).toMatchObject({ createdAt: '2026-08-19T01:02:03.000Z', completedAt: '2026-08-19T01:05:06.000Z' })
    const updated = applyTaskEvent([entry], { id: 'task-time-1', status: 'COMPLETED', completedAt: '2026-08-19T01:06:07.000Z' })
    expect(updated[0].completedAt).toBe('2026-08-19T01:06:07.000Z')
  })

  it('clones the complete form so edits do not mutate a submitted task', () => {
    const form = createDefaultForm()
    form.prompt = '图1跳舞'
    form.assets.push({
      id: 'asset-1',
      kind: 'image',
      source: 'data:image/png;base64,SGk=',
      label: 'reference.png',
      role: 'reference_image',
    })

    const snapshot = cloneCreateForm(form)
    form.prompt = '新的提示词'
    form.assets[0].source = 'changed'

    expect(snapshot.prompt).toBe('图1跳舞')
    expect(snapshot.assets[0].source).toBe('data:image/png;base64,SGk=')
    expect(snapshot.assets[0]).not.toBe(form.assets[0])
  })

  it('builds parameter labels from the supplied snapshot', () => {
    const form = createDefaultForm()
    form.resolution = '1080p'
    form.ratio = '16:9'
    form.duration = 8
    form.generate_audio = false

    expect(buildParameterSummary(form)).toEqual([
      'Seedance 2.0 Fast', '1080P', '16:9', '8 秒', '无声', '无水印', 'MP4',
    ])
  })

  it('updates the matching task in place from socket events', () => {
    const snapshot = createDefaultForm()
    const entry: TaskTimelineEntry = {
      id: 'client-1',
      taskId: 'task-1',
      status: 'queued',
      snapshot,
      parameterSummary: buildParameterSummary(snapshot),
    }

    const processing = applyTaskEvent([entry], { id: 'task-1', status: 'PROCESSING' })
    const completed = applyTaskEvent(processing, { id: 'task-1', status: 'COMPLETED', videoUrl: 'https://cdn.example/video.mp4' })

    expect(processing).toHaveLength(1)
    expect(processing[0].status).toBe('processing')
    expect(completed[0]).toMatchObject({ status: 'completed', videoUrl: 'https://cdn.example/video.mp4' })
  })

  it('keeps a failed reason on the matching task record', () => {
    const snapshot = createDefaultForm()
    const entry: TaskTimelineEntry = {
      id: 'client-1',
      taskId: 'task-1',
      status: 'queued',
      snapshot,
      parameterSummary: [],
    }

    const result = applyTaskEvent([entry], { id: 'task-1', status: 'FAILED', errorMessage: '生成服务拒绝请求' })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ status: 'failed', errorMessage: '生成服务拒绝请求' })
  })

  it('marks remote-only historical material for reselection', () => {
    const entry = taskToTimelineEntry({
      id: 'task-42',
      userId: 'user-1',
      prompt: '镜头向前推进',
      params: {
        model: 'doubao-seedance-2-0',
        content: [
          { type: 'text', text: '镜头向前推进' },
          { type: 'image_url', image_url: { url: 'https://cdn.example/frame.png' }, role: 'reference_image' },
        ],
        resolution: '1080p',
        ratio: '16:9',
        duration: 8,
        generate_audio: false,
        watermark: true,
        output_format: 'mp4',
      },
      status: 'FAILED',
      errorMessage: '中转站失败',
      createdAt: '2026-08-19T00:00:00.000Z',
      updatedAt: '2026-08-19T00:01:00.000Z',
    })

    expect(entry).toMatchObject({ taskId: 'task-42', status: 'failed', errorMessage: '中转站失败' })
    expect(entry.snapshot).toMatchObject({
      prompt: '镜头向前推进', model: 'doubao-seedance-2-0', resolution: '1080p',
      ratio: '16:9', duration: 8, generate_audio: false, watermark: true,
    })
    expect(entry.snapshot.assets[0]).toMatchObject({
      kind: 'image',
      source: 'https://cdn.example/frame.png',
      contentIndex: 1,
      requiresReselect: true,
    })
    expect(hasUnavailableAssets(entry.snapshot)).toBe(true)
    expect(snapshotForEditing(entry.snapshot).assets).toEqual([])
  })

  it('restores local material with its original content index for authenticated previews', () => {
    const uri = `local-asset://${'a'.repeat(64)}.mp4`
    const entry = taskToTimelineEntry({
      id: 'task-43',
      userId: 'user-1',
      prompt: '参考视频',
      params: {
        content: [
          { type: 'text', text: '参考视频' },
          { type: 'video_url', video_url: { url: uri }, role: 'reference_video' },
        ],
      },
      status: 'PENDING',
      createdAt: '2026-08-19T00:00:00.000Z',
      updatedAt: '2026-08-19T00:00:00.000Z',
    })

    expect(entry.snapshot.assets[0]).toMatchObject({
      kind: 'video',
      source: uri,
      contentIndex: 1,
      requiresReselect: false,
    })
    expect(hasUnavailableAssets(entry.snapshot)).toBe(false)
  })
})
