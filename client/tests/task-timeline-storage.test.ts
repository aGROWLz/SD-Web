import { describe, expect, it } from 'vitest'
import { timelineStorageKey } from '../src/features/create/task-timeline-storage'

describe('task timeline persistence scope', () => {
  it('uses a distinct storage key for every authenticated user', () => {
    expect(timelineStorageKey('user-a')).toBe('seedance:create-timeline:user-a')
    expect(timelineStorageKey('user-b')).not.toBe(timelineStorageKey('user-a'))
  })

  it('does not create a shared key when the user id is missing', () => {
    expect(timelineStorageKey('')).toBeNull()
  })
})
