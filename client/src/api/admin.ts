import client from './client'

export interface AdminUser {
  id: string
  email: string
  role: 'USER' | 'ADMIN'
  createdAt: string
  _count: {
    tasks: number
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

export interface RelayStation {
  id: string
  name: string
  baseUrl: string
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
  keyValue?: string
  isActive?: boolean
  isPrimary?: boolean
}

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

  deleteRelayStation(id: string) {
    return client.delete(`/admin/relay-stations/${id}`)
  },

}
