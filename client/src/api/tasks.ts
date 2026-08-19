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
  getTasks(params?: { page?: number; limit?: number; status?: string }) {
    return client.get<TasksResponse>('/tasks', { params })
  },

  // 获取单个任务
  getTask(id: string) {
    return client.get<TaskResponse>(`/tasks/${id}`)
  },

  // 删除任务
  deleteTask(id: string) {
    return client.delete(`/tasks/${id}`)
  },

  // 下载视频
  downloadVideo(id: string) {
    return client.get(`/tasks/${id}/download`, {
      responseType: 'blob'
    })
  }
}
