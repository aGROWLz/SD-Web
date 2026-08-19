import client from './client'

export interface RegisterData {
  email: string
  password: string
  role?: 'USER' | 'ADMIN'
}

export interface LoginData {
  email: string
  password: string
}

export interface User {
  id: string
  email: string
  role: 'USER' | 'ADMIN'
  canGenerate?: boolean
  createdAt: string
  updatedAt?: string
}

export interface AuthResponse {
  token: string
  user: User
}

export const authApi = {
  register(data: RegisterData) {
    return client.post<AuthResponse>('/auth/register', data)
  },

  login(data: LoginData) {
    return client.post<AuthResponse>('/auth/login', data)
  },

  getCurrentUser() {
    return client.get<{ user: User }>('/auth/me')
  }
}
