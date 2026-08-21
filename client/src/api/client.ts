import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const client = axios.create({
  baseURL: '/api'
})

// 请求拦截器：自动添加 Authorization header
client.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => {
    // 缩略图/预览请求允许单个素材失败，不应打断素材库交互。
    const requestHeaders = error?.config?.headers
    const silentPreview = requestHeaders?.['X-Silent-Error'] === '1'
      || requestHeaders?.['x-silent-error'] === '1'
      || requestHeaders?.get?.('X-Silent-Error') === '1'
    const requestUrl = String(error?.config?.url || '')
    if (silentPreview || /(?:\/assets\/|\/tasks\/[^/]+\/(?:assets|thumbnail))/.test(requestUrl)) return Promise.reject(error)
    return Promise.reject(error)
  }
)

// 响应拦截器：统一错误处理
client.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // 预览请求允许单个素材失败，由调用组件显示占位状态，不能污染全局提示。
    const requestHeaders = error?.config?.headers
    const silentPreview = requestHeaders?.['X-Silent-Error'] === '1'
      || requestHeaders?.['x-silent-error'] === '1'
      || requestHeaders?.get?.('X-Silent-Error') === '1'
    if (silentPreview) return Promise.reject(error)

    // Scrolling task cards intentionally aborts previews that leave the viewport.
    // 预览组件在滚动离开视口时会主动 abort 请求。不同 Axios 浏览器适配器
    // 对取消请求的错误形态不一致，有些会伪装成没有 response 的 Network Error。
    // 只要对应 signal 已取消，就不应弹出“网络连接失败”。
    if (
      axios.isCancel(error)
      || error?.code === 'ERR_CANCELED'
      || error?.name === 'CanceledError'
      || error?.name === 'AbortError'
      || error?.config?.signal?.aborted
    ) {
      return Promise.reject(error)
    }
    // 处理网络错误
    if (!error.response) {
      ElMessage.error('网络连接失败，请检查网络设置')
      return Promise.reject(error)
    }

    const { status, data } = error.response

    // 处理 401 未授权
    if (status === 401) {
      const authStore = useAuthStore()
      authStore.logout()
      ElMessage.error('登录已过期，请重新登录')
      window.location.href = '/login'
      return Promise.reject(error)
    }

    // 处理 403 权限不足
    if (status === 403) {
      ElMessage.error('权限不足，无法访问该资源')
      return Promise.reject(error)
    }

    // 处理 404 资源不存在
    if (status === 404) {
      ElMessage.error(data?.error || '请求的资源不存在')
      return Promise.reject(error)
    }

    // 处理 409 冲突
    if (status === 409) {
      ElMessage.error(data?.error || '操作冲突，请刷新后重试')
      return Promise.reject(error)
    }

    // 处理 422 验证错误
    if (status === 422) {
      ElMessage.error(data?.error || '输入数据验证失败')
      return Promise.reject(error)
    }

    // 处理 500 服务器错误
    if (status >= 500) {
      ElMessage.error('服务器错误，请稍后重试')
      return Promise.reject(error)
    }

    // 其他错误显示后端返回的错误信息
    if (data?.error) {
      ElMessage.error(data.error)
    } else {
      ElMessage.error('请求失败，请稍后重试')
    }

    return Promise.reject(error)
  }
)

export default client
