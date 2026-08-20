import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const viewSource = readFileSync(fileURLToPath(new URL('../src/views/admin/AdminRelayStations.vue', import.meta.url)), 'utf8')
const apiSource = readFileSync(fileURLToPath(new URL('../src/api/admin.ts', import.meta.url)), 'utf8')

describe('admin relay station asset library configuration', () => {
  it('exposes typed asset library config and submits the complete config', () => {
    expect(apiSource).toContain('export type AssetLibraryProvider = \'KK\' | \'XKU_P4\'')
    expect(apiSource).toContain('assetLibraryConfig?: AssetLibraryConfig | null')
    expect(viewSource).toContain('assetLibraryConfig: form.assetLibraryConfig ? cloneAssetLibraryConfig(form.assetLibraryConfig) : null')
    expect(apiSource).toContain('enabled: boolean')
  })

  it('supports KK and XKU p4 presets with required defaults', () => {
    expect(viewSource).toContain("provider: 'KK'")
    expect(viewSource).toContain("provider: 'XKU_P4'")
    expect(viewSource).toContain('https://ai.kkidc.com/api/v2/assets')
    expect(viewSource).toContain('https://api-ai.xku.com/ark/p4/v1/assets')
    expect(viewSource).toContain('applyAssetLibraryPreset')
  })

  it('allows disabling while retaining config and restores it while editing', () => {
    expect(viewSource).toContain('v-model="assetLibraryEnabled"')
    expect(viewSource).toContain('station.assetLibraryConfig')
    expect(viewSource).toContain('form.assetLibraryConfig = station.assetLibraryConfig ? cloneAssetLibraryConfig(station.assetLibraryConfig) : null')
  })

  it('keeps legacy stations with no asset config disabled on save', () => {
    expect(viewSource).toContain('assetLibraryConfig: null')
    expect(viewSource).toContain('station.assetLibraryConfig ? cloneAssetLibraryConfig(station.assetLibraryConfig) : null')
    expect(viewSource).toContain('assetLibraryConfig: form.assetLibraryConfig ? cloneAssetLibraryConfig(form.assetLibraryConfig) : null')
  })

  it('keeps a selected XKU preset when the asset library remains disabled', () => {
    expect(viewSource).toContain('const enabled = form.assetLibraryConfig?.enabled ?? false')
    expect(viewSource).toContain('provider: \'XKU_P4\'')
  })
})
