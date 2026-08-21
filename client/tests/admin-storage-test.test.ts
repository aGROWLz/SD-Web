import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const adminViewPath = fileURLToPath(new URL('../src/views/admin/AdminRelayStations.vue', import.meta.url))
const source = readFileSync(adminViewPath, 'utf8')
const apiPath = fileURLToPath(new URL('../src/api/admin.ts', import.meta.url))
const apiSource = readFileSync(apiPath, 'utf8')

describe('admin R2 connectivity test', () => {
  it('provides a separate connectivity action using the saved storage configuration', () => {
    expect(source).toContain('测试连通')
    expect(source).toContain(':loading="storageTesting"')
    expect(source).toContain('@click="testStorageConnection"')
    expect(apiSource).toContain("'/admin/storage/test'")
  })
})
