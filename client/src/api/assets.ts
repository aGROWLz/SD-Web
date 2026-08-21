import client from './client'

export interface PublicAsset {
  id: string
  ownerId: string
  filename: string
  contentType: string
  size: number
  providerStatus?: 'PENDING' | 'ACTIVE' | 'FAILED' | string
  providerAssetId?: string | null
  providerLibrary?: 'KK' | 'XKU_P5' | string | null
  providerUrl?: string | null
  providerError?: string | null
  previewUrl: string
  createdAt: string
  updatedAt?: string
}

export interface PublicAssetsResponse {
  items: PublicAsset[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export const assetsApi = {
  list(params?: { page?: number; limit?: number; contentType?: string; keyword?: string }) {
    return client.get<PublicAssetsResponse>('/assets', { params })
  },
  upload(source: string, filename?: string) {
    return client.post<{ asset: PublicAsset }>('/assets', { source, filename })
  },
  fileUrl(asset: Pick<PublicAsset, 'id' | 'previewUrl'>) {
    return asset.previewUrl || `/api/assets/${asset.id}/file`
  },
  retry(id: string) {
    return client.post<{ asset: PublicAsset }>(`/assets/${id}/retry`)
  },
  refreshStatus() {
    return client.post<{ items: PublicAsset[] }>('/assets/refresh-status')
  },
  remove(id: string) {
    return client.delete(`/assets/${id}`)
  },
}
