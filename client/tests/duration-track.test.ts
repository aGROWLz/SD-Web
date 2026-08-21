import { describe, expect, it } from 'vitest'
import {
  DURATION_TRACK_MAX,
  durationToTrackPosition,
  trackPositionToDuration,
} from '../src/features/create/duration-track'

describe('duration track mapping', () => {
  it.each([
    [-1, 0],
    [4, 5],
    [15, 16],
    [16, 21],
    [30, 35],
  ])('maps duration %s to track position %s', (duration, position) => {
    expect(durationToTrackPosition(duration)).toBe(position)
  })

  it('keeps the 15-to-16 gap sticky until the 16-second marker is reached', () => {
    expect(trackPositionToDuration(18, 15, 30)).toBe(15)
    expect(trackPositionToDuration(20, 15, 30)).toBe(15)
    expect(trackPositionToDuration(21, 15, 30)).toBe(16)
  })

  it('keeps the 16-to-15 gap sticky while dragging backwards', () => {
    expect(trackPositionToDuration(18, 16, 30)).toBe(16)
    expect(trackPositionToDuration(17, 16, 30)).toBe(16)
    expect(trackPositionToDuration(16, 16, 30)).toBe(15)
  })

  it('keeps the intelligent-to-4-second gap sticky in both directions', () => {
    expect(trackPositionToDuration(3, -1, 30)).toBe(-1)
    expect(trackPositionToDuration(4, -1, 30)).toBe(-1)
    expect(trackPositionToDuration(5, -1, 30)).toBe(4)
    expect(trackPositionToDuration(3, 4, 30)).toBe(4)
    expect(trackPositionToDuration(0, 4, 30)).toBe(-1)
  })

  it('caps the track at 15 seconds for non-2.5 models', () => {
    expect(trackPositionToDuration(17, 15, 15)).toBe(15)
    expect(trackPositionToDuration(21, 15, 15)).toBe(15)
    expect(trackPositionToDuration(DURATION_TRACK_MAX, 15, 15)).toBe(15)
  })
})
