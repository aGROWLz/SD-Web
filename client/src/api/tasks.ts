import client from './client'

export interface Task {
  id: string
  userId: string
  apiKeyId?: string
  relayStationId?: string
  prompt: string
  params: Record<string, any>
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  videoUrl?: string
  localPath?: string
  errorMessage?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  updatedAt: string
  relayStation?: {
    id: string
    name: string
    baseUrl?: string
  }
  user?: {
    id: string
    email: string
  }
}

export interface CreateTaskData {
  prompt: string
  params?: Record<string, any>
}

export interface TasksResponse {
  tasks: Task[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface TaskResponse {
  task: Task
}

export const tasksApi = {
  // 创建新任务
  createTask(data: CreateTaskData) {
    return client.post<TaskResponse>('/tasks', data)
  },

  // 获取任务列表
  getTasks(params?: { page?: number; limit?: number; status?: string; mine?: boolean }) {
    return client.get<TasksResponse>('/tasks', { params })
  },

  // 获取单个任务
  getTask(id: string) {
    return client.get<TaskResponse>(`/tasks/${id}`)
  },

  // 获取任务中保存的本地参考素材
  getTaskAsset(id: string, contentIndex: number, signal?: AbortSignal, thumbnail = false) {
    return client.get<Blob>(`/tasks/${id}/assets/${contentIndex}${thumbnail ? '?thumbnail=1' : ''}`, {
      responseType: 'blob',
      signal,
      headers: { 'X-Silent-Error': '1' }
    })
  },

  // 获取项目本地保存的视频首帧缩略图
  getTaskThumbnail(id: string, signal?: AbortSignal) {
    return client.get<Blob>(`/tasks/${id}/thumbnail`, {
      responseType: 'blob',
      signal,
      headers: { 'X-Silent-Error': '1' },
    })
  },

  // 删除任务
  deleteTask(id: string) {
    return client.delete(`/tasks/${id}`)
  },

  // 下载视频
  downloadVideo(id: string, signal?: AbortSignal) {
    return client.get(`/tasks/${id}/download`, {
      responseType: 'blob',
      signal,
    })
  }
}
