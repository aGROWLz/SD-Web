import { describe, expect, it } from 'vitest'
import { relayKeyRules } from '../src/features/admin/relay-station'

describe('relayKeyRules', () => {
  it('requires an API key only when creating a station', () => {
    expect(relayKeyRules(false)[0]?.required).toBe(true)
    expect(relayKeyRules(true)[0]?.required).toBe(false)
  })
})
