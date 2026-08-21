import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'

const componentPath = fileURLToPath(new URL('../src/components/create/ParameterBar.vue', import.meta.url))
const source = readFileSync(componentPath, 'utf8')

describe('ParameterBar confirmed visual controls', () => {
  it('uses centered upward panels and custom model, resolution, ratio, duration, and format controls', () => {
    expect(source).toContain('placement="top"')
    expect(source).toContain('parameter-model-option')
    expect(source).toContain('resolution-card')
    expect(source).toContain('ratio-shape')
    expect(source).toContain('duration-slider')
    expect(source).toContain('format-card')
    expect(source).not.toMatch(/aria-label="宽高比"[^>]*<el-option/s)
    expect(source).not.toMatch(/aria-label="视频时长"[^>]*<el-option/s)
  })

  it('keeps model labels clean and resolution cards text-only', () => {
    expect(source).toContain('model-radio')
    expect(source).not.toContain('高质量')
    expect(source).not.toContain('经济')
    expect(source).not.toContain('快速</')
    expect(source).toContain('{{ resolution.toUpperCase() }}')
  })

  it('shows the confirmed audio, watermark, and file icon states', () => {
    expect(source).toContain('speaker-icon')
    expect(source).toContain('sound-wave')
    expect(source).toContain('watermark-star')
    expect(source).toContain('stroke-dasharray')
    expect(source).toContain('<Document')
    expect(source).toContain('<small>音频</small>')
  })

  it('marks the 16-30 range as Seedance 2.5 exclusive without helper copy', () => {
    expect(source).toContain('2.5 专属')
    expect(source).not.toContain('智能时长和两个秒数区间之间保留拖动距离')
  })

  it('uses the primary duration rail for visible segmented ranges', () => {
    expect(source).toContain('class="duration-track-rail"')
    expect(source).toContain('class="duration-track-gap start-gap"')
    expect(source).toContain('class="duration-track-gap extended-gap"')
    expect(source).toContain('class="duration-track-range short-range"')
    expect(source).toContain('class="duration-track-range extended-range"')
    expect(source).not.toContain('class="duration-segments"')
  })

  it('keeps the 2.5-only range visible but locked for other models', () => {
    expect(source).toContain(':class="{ locked: !supportsExtendedDuration }"')
    expect(source).toContain(':max="DURATION_TRACK_MAX"')
    expect(source).not.toContain(':max="durationTrackMax"')
  })

  it('writes the normalized track position back after every drag input', () => {
    expect(source).toContain(':value="durationTrackPosition"')
    expect(source).toContain('@input="handleDurationInput"')
    expect(source).not.toContain('v-model.number="durationTrackPosition"')
  })
})
