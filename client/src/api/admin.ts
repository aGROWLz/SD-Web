import client from './client'

export interface AdminUser {
  id: string
  email: string
  role: 'USER' | 'ADMIN'
  createdAt: string
  _count: {
    tasks: number
    publicAssets: number
    usageLogs: number
  }
  canGenerate: boolean
}

export interface UsersResponse {
  users: AdminUser[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type SeedanceModelName =
  | 'doubao-seedance-2-5'
  | 'doubao-seedance-2-0'
  | 'doubao-seedance-2-0-fast'
  | 'doubao-seedance-2-0-mini'

export type SeedanceModelRedirects = Partial<Record<SeedanceModelName, string>>

export type AssetLibraryProvider = 'KK' | 'XKU_P5'

export interface AssetLibraryFieldMap {
  url: string
  assetType: string
  name: string
  projectName: string
}

export interface AssetLibraryConfig {
  name: string
  enabled: boolean
  provider: AssetLibraryProvider
  uploadUrl: string
  queryUrl: string
  authHeader: string
  authPrefix: string
  fields: AssetLibraryFieldMap
  projectNameValue: string
}

export const DEFAULT_SEEDANCE_API_MODELS: Record<SeedanceModelName, string> = {
  'doubao-seedance-2-0': 'doubao-seedance-2-0-260128',
  'doubao-seedance-2-0-fast': 'doubao-seedance-2-0-fast-260128',
  'doubao-seedance-2-0-mini': 'doubao-seedance-2-0-mini-260615',
  'doubao-seedance-2-5': 'doubao-seedance-2-5-260628',
}

export interface RelayStation {
  id: string
  name: string
  baseUrl: string
  queryBaseUrl: string
  appendApiV3: boolean
  modelRedirects: SeedanceModelRedirects
  assetLibraryConfig: AssetLibraryConfig | null
  apiKeyMasked: string
  isActive: boolean
  isPrimary: boolean
  createdAt: string
  updatedAt: string
  taskCount: number
}

export interface RelayStationsResponse {
  stations: RelayStation[]
}

export interface RelayStationData {
  name: string
  baseUrl: string
  queryBaseUrl?: string
  appendApiV3?: boolean
  modelRedirects: SeedanceModelRedirects
  assetLibraryConfig?: AssetLibraryConfig | null
  keyValue?: string
  isActive?: boolean
  isPrimary?: boolean
}

export type RelayStationTestResponse =
  | { ok: true }
  | { ok: false; code: 'auth' | 'not_found' | 'network' | 'http'; message: string }

export interface StorageConfig {
  workerUrl: string
  configured: boolean
  keyMasked: string
}

export type StorageTestResponse =
  | { ok: true; message: string }
  | { ok: false; code: 'not_configured' | 'auth' | 'network' | 'http' | 'invalid_response'; message: string }

export const adminApi = {
  // 用户管理
  getAllUsers(params?: { page?: number; limit?: number }) {
    return client.get<UsersResponse>('/admin/users', { params })
  },

  updateGenerationAccess(id: string, canGenerate: boolean) {
    return client.patch<{ user: Pick<AdminUser, 'id' | 'email' | 'role' | 'canGenerate'> }>(
      `/admin/users/${id}/generation-access`,
      { canGenerate },
    )
  },

  getRelayStations() {
    return client.get<RelayStationsResponse>('/admin/relay-stations')
  },

  addRelayStation(data: RelayStationData) {
    return client.post<{ station: RelayStation }>('/admin/relay-stations', data)
  },

  updateRelayStation(id: string, data: RelayStationData) {
    return client.patch<{ station: RelayStation }>(`/admin/relay-stations/${id}`, data)
  },

  setPrimaryRelayStation(id: string) {
    return client.patch<{ station: RelayStation }>(`/admin/relay-stations/${id}/primary`)
  },

  testRelayStation(id: string) {
    return client.post<RelayStationTestResponse>(`/admin/relay-stations/${id}/test`)
  },

  deleteRelayStation(id: string) {
    return client.delete(`/admin/relay-stations/${id}`)
  },

  getStorageConfig() {
    return client.get<{ storage: StorageConfig }>('/admin/storage')
  },

  updateStorageConfig(data: { workerUrl: string; keyValue?: string; clearKey?: boolean }) {
    return client.put<{ storage: StorageConfig }>('/admin/storage', data)
  },

  testStorageConnection() {
    return client.post<StorageTestResponse>('/admin/storage/test')
  },
}
