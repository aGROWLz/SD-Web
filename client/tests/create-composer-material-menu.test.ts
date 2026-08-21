import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const composerPath = fileURLToPath(new URL('../src/components/create/CreateComposer.vue', import.meta.url))
const composerSource = readFileSync(composerPath, 'utf8')
const previewPath = fileURLToPath(new URL('../src/components/create/TaskAssetPreview.vue', import.meta.url))
const previewSource = readFileSync(previewPath, 'utf8')
const createViewPath = fileURLToPath(new URL('../src/views/Create.vue', import.meta.url))
const createViewSource = readFileSync(createViewPath, 'utf8')

describe('CreateComposer material picker', () => {
  it('uses one direct add-material action instead of media type menus', () => {
    expect(composerSource).toContain("emit('add-material')")
    expect(composerSource).not.toContain('<el-dropdown')
    expect(composerSource).not.toContain('添加图片')
    expect(composerSource).not.toContain('添加音频')
    expect(composerSource).not.toContain('添加视频 URL')
  })

  it('opens one multi-file picker for image, audio and video files', () => {
    expect(createViewSource).toMatch(/type="file"[^>]*accept="image\/\*,audio\/\*,video\/\*"[^>]*multiple/)
    expect(createViewSource.match(/type="file"/g)).toHaveLength(1)
    expect(createViewSource).not.toContain('videoDialogVisible')
  })

  it('requests task history scoped to the authenticated user', () => {
    expect(createViewSource).toContain('mine: true')
    expect(createViewSource).toContain('loadTimelineEntries')
  })

  it('previews selected media without displaying file names or increasing strip height', () => {
    expect(composerSource).toContain('<TaskAssetPreview')
    expect(composerSource).toContain(':compact="true"')
    expect(composerSource).not.toContain('{{ asset.label }}')
    expect(composerSource).not.toContain('material-copy')
    expect(composerSource).toMatch(/\.material-chip[^}]*flex\s*:\s*0\s*0\s*48px/)
    expect(composerSource).toMatch(/\.material-chip[^}]*width\s*:\s*48px/)
    expect(composerSource).toMatch(/\.material-chip[^}]*height\s*:\s*48px/)
    expect(composerSource).toMatch(/\.remove-material[^}]*width\s*:\s*16px/)
    expect(composerSource).toMatch(/\.remove-material[^}]*height\s*:\s*16px/)
    expect(previewSource).toContain('class="material-type-icon"')
  })
})
