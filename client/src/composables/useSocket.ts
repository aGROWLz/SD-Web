import { ref } from 'vue'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth'
import { ElNotification } from 'element-plus'

let socket: Socket | null = null
const connected = ref(false)
const reconnecting = ref(false)

export function useSocket() {
  const authStore = useAuthStore()

  const connect = () => {
    if (socket?.connected) return

    const token = authStore.token
    if (!token) {
      console.warn('No token available for socket connection')
      return
    }

    socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      auth: {
        token
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    })

    socket.on('connect', () => {
      console.log('Socket connected')
      connected.value = true
      reconnecting.value = false
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
      connected.value = false
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      reconnecting.value = true
    })

    // 任务状态更新
    socket.on('task:update', (data) => {
      console.log('Task update:', data)
      // 触发任务列表刷新事件
      window.dispatchEvent(new CustomEvent('task:update', { detail: data }))
    })

    // 任务完成通知
    socket.on('task:completed', (data) => {
      ElNotification({
        title: '视频生成完成',
        message: `您的视频任务已完成：${data.prompt.substring(0, 30)}...`,
        type: 'success',
        duration: 5000,
        onClick: () => {
          // 跳转到任务详情
          window.location.href = `/keys`
        }
      })
      window.dispatchEvent(new CustomEvent('task:completed', { detail: data }))
    })

    // 任务失败通知
    socket.on('task:failed', (data) => {
      ElNotification({
        title: '视频生成失败',
        message: data.errorMessage || '任务处理失败，请重试',
        type: 'error',
        duration: 5000
      })
      window.dispatchEvent(new CustomEvent('task:failed', { detail: data }))
    })

    // 管理员通知
    socket.on('admin:notification', (data) => {
      if (authStore.isAdmin()) {
        ElNotification({
          title: '系统通知',
          message: data.message,
          type: 'info',
          duration: 5000
        })
      }
    })

    // 心跳
    const pingInterval = setInterval(() => {
      if (socket?.connected) {
        socket.emit('ping')
      }
    }, 30000)

    socket.on('pong', () => {
      // 心跳响应
    })

    // 清理定时器
    socket.on('disconnect', () => {
      clearInterval(pingInterval)
    })
  }

  const disconnect = () => {
    if (socket) {
      socket.disconnect()
      socket = null
      connected.value = false
    }
  }

  const emit = (event: string, data?: any) => {
    if (socket?.connected) {
      socket.emit(event, data)
    } else {
      console.warn('Socket not connected, cannot emit event:', event)
    }
  }

  const on = (event: string, callback: (...args: any[]) => void) => {
    socket?.on(event, callback)
  }

  const off = (event: string, callback?: (...args: any[]) => void) => {
    if (callback) {
      socket?.off(event, callback)
    } else {
      socket?.off(event)
    }
  }

  return {
    socket,
    connected,
    reconnecting,
    connect,
    disconnect,
    emit,
    on,
    off
  }
}

// 全局 Socket 管理
let globalSocket: ReturnType<typeof useSocket> | null = null

export function initGlobalSocket() {
  if (!globalSocket) {
    globalSocket = useSocket()
    globalSocket.connect()
  }
  return globalSocket
}

export function getGlobalSocket() {
  return globalSocket
}

export function disconnectGlobalSocket() {
  if (globalSocket) {
    globalSocket.disconnect()
    globalSocket = null
  }
}
