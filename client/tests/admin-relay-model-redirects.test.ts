import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const viewPath = fileURLToPath(new URL('../src/views/admin/AdminRelayStations.vue', import.meta.url))
const viewSource = readFileSync(viewPath, 'utf8')
const apiPath = fileURLToPath(new URL('../src/api/admin.ts', import.meta.url))
const apiSource = readFileSync(apiPath, 'utf8')

const models = [
  'doubao-seedance-2-5',
  'doubao-seedance-2-0',
  'doubao-seedance-2-0-fast',
  'doubao-seedance-2-0-mini',
]

const apiModels = [
  'doubao-seedance-2-0-260128',
  'doubao-seedance-2-0-fast-260128',
  'doubao-seedance-2-0-mini-260615',
  'doubao-seedance-2-5-260628',
]

describe('admin relay station model redirects', () => {
  it('renders one redirect input for every standard SeeDance model', () => {
    expect(viewSource).toContain('模型重定向')
    expect(viewSource).toContain('v-for="model in SEEDANCE_MODELS"')
    expect(viewSource).toContain('v-model="form.modelRedirects[model]"')
    models.forEach((model) => expect(viewSource).toContain(`'${model}'`))
  })

  it('includes redirects in relay station API types and update payloads', () => {
    expect(apiSource).toContain('modelRedirects: SeedanceModelRedirects')
    expect(viewSource).toContain('modelRedirects: { ...form.modelRedirects }')
    expect(viewSource).toContain('modelRedirects: { ...station.modelRedirects }')
  })

  it('shows the versioned API model used when a redirect is blank', () => {
    expect(viewSource).toContain('DEFAULT_SEEDANCE_API_MODELS[model]')
    apiModels.forEach((model) => expect(apiSource).toContain(`'${model}'`))
  })
})
