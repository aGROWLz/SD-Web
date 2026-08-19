import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/api/auth'
import { authApi } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)

  // 从 localStorage 恢复 token 和用户信息
  const initAuth = () => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    
    if (savedToken) {
      token.value = savedToken
    }
    
    if (savedUser) {
      try {
        user.value = JSON.parse(savedUser)
      } catch (e) {
        console.error('Failed to parse user data:', e)
        localStorage.removeItem('user')
      }
    }
  }

  const setAuth = (authToken: string, userData: User) => {
    token.value = authToken
    user.value = userData
    localStorage.setItem('token', authToken)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login({ email, password })
    setAuth(data.token, data.user)
    return data
  }

  const logout = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const isAuthenticated = () => {
    return !!token.value
  }

  const hasRole = (role: User['role']) => {
    return user.value?.role === role
  }

  const isAdmin = () => {
    return user.value?.role === 'ADMIN'
  }

  // 初始化
  initAuth()

  return {
    user,
    token,
    setAuth,
    login,
    logout,
    isAuthenticated,
    hasRole,
    isAdmin
  }
})
