import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const timelinePath = fileURLToPath(new URL('../src/components/create/ConversationTimeline.vue', import.meta.url))
const timelineSource = readFileSync(timelinePath, 'utf8')
const createPath = fileURLToPath(new URL('../src/views/Create.vue', import.meta.url))
const createSource = readFileSync(createPath, 'utf8')
const previewPath = fileURLToPath(new URL('../src/components/create/TaskAssetPreview.vue', import.meta.url))
const previewSource = readFileSync(previewPath, 'utf8')
const videoPreviewPath = fileURLToPath(new URL('../src/components/create/TaskVideoPreview.vue', import.meta.url))
const videoPreviewSource = existsSync(videoPreviewPath) ? readFileSync(videoPreviewPath, 'utf8') : ''

describe('creation task cards', () => {
  it('renders one row with a left configuration card and a square status panel', () => {
    expect(timelineSource).toContain('class="task-row"')
    expect(timelineSource).toContain('class="task-config-card"')
    expect(timelineSource).toContain('class="task-status-panel"')
    expect(timelineSource).toMatch(/\.task-status-panel[^}]*aspect-ratio\s*:\s*1/)
    expect(timelineSource).not.toContain("entry.role === 'user'")
  })

  it('shows completed video preview and failed reason inside the status panel', () => {
    expect(timelineSource).toContain('<TaskVideoPreview')
    expect(timelineSource).toContain(':task-id="entry.taskId"')
    expect(timelineSource).not.toContain('<video v-if="entry.status')
    expect(timelineSource).toContain('entry.errorMessage')
    expect(timelineSource).not.toContain('assistant-row')
  })

  it('renders a static video frame that opens a player dialog and downloads independently', () => {
    expect(videoPreviewSource).toContain('class="video-preview-trigger"')
    expect(videoPreviewSource).toContain('<img')
    expect(videoPreviewSource).toContain('tasksApi.getTaskThumbnail')
    expect(videoPreviewSource).not.toContain('ref="thumbnailVideo"')
    expect(videoPreviewSource).toContain('@click="openPlayer"')
    expect(videoPreviewSource).toContain('@click.stop="downloadVideo"')
    expect(videoPreviewSource).toContain('<el-dialog')
    expect(videoPreviewSource).toContain('@closed="stopPlayback"')
    expect(videoPreviewSource).toContain('ref="playerVideo"')
    expect(videoPreviewSource).toContain('playerSource')
    expect(videoPreviewSource).not.toContain(':src="videoUrl"')
    expect(videoPreviewSource).not.toContain('defineProps<{ videoUrl')
    expect(videoPreviewSource).toContain('tasksApi.downloadVideo')
  })

  it('exposes edit and retry actions and wires them to the create page', () => {
    expect(timelineSource).toContain("emit('edit', entry)")
    expect(timelineSource).toContain("emit('retry', entry)")
    expect(createSource).toContain('@edit="editTask"')
    expect(createSource).toContain('@retry="retryTask"')
    expect(createSource).toContain("window.addEventListener('task:update'")
    expect(timelineSource).not.toContain('isActive(entry.status)')
  })

  it('renders bounded image, video, and audio previews inside the task card', () => {
    expect(timelineSource).toContain('<TaskAssetPreview')
    expect(previewSource).toContain('<img')
    expect(previewSource).toContain('<video')
    expect(previewSource).toContain('<audio')
    expect(previewSource).toContain('@error="handleMediaError"')
    expect(previewSource).toMatch(/\.asset-visual[^}]*overflow\s*:\s*hidden/)
    expect(previewSource).toMatch(/\.asset-image[^}]*aspect-ratio\s*:\s*1/)
    expect(previewSource).toContain('tasksApi.getTaskAsset')
    expect(previewSource).toContain('AbortController')
    expect(previewSource).toContain('releaseObjectUrl')
    expect(previewSource).toContain("compact?: boolean")
    expect(previewSource).toContain('v-if="!compact"')
  })

  it('guards edit and retry when a historical task has no local original', () => {
    expect(createSource).toContain('hasUnavailableAssets')
    expect(createSource).toContain('snapshotForEditing')
    expect(createSource).toContain('MISSING_LOCAL_ASSET_MESSAGE')
  })

  it('loads every page of the authenticated user task history', () => {
    expect(createSource).toContain('loadServerTaskHistory')
    expect(createSource).toContain('page <= totalPages')
  })

  it('keeps the composer docked while only the task timeline scrolls', () => {
    expect(createSource).toContain('class="composer-dock"')
    expect(timelineSource).toMatch(/\.conversation-timeline[^}]*overflow-y\s*:\s*auto/)
    expect(createSource).toMatch(/\.composer-dock[^}]*flex[^}]*0\s*0\s*auto/)
  })

  it('opens the task timeline at the newest record and follows newly added records', () => {
    expect(timelineSource).toContain('ref="timeline"')
    expect(timelineSource).toContain('scrollToLatest')
    expect(timelineSource).toContain('watch(() => props.entries.length')
    expect(timelineSource).toContain('timeline.value.scrollTop = timeline.value.scrollHeight')
  })

  it('shows task creation and completion timestamps', () => {
    expect(timelineSource).toContain('生成于')
    expect(timelineSource).toContain('完成于')
    expect(createSource).toContain('createdAt: new Date().toISOString()')
  })
})
