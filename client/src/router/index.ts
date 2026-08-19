import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/Register.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/',
      component: DefaultLayout,
      redirect: '/create',
      children: [
        {
          path: '/create',
          name: 'Create',
          component: () => import('@/views/Create.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: '/dashboard',
          name: 'Dashboard',
          component: () => import('@/views/Dashboard.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: '/tasks',
          name: 'Tasks',
          component: () => import('@/views/Tasks.vue'),
          meta: { requiresAuth: true }
        },
        { path: '/keys', redirect: '/tasks' },
        {
          path: '/admin/relay-stations',
          name: 'AdminRelayStations',
          component: () => import('@/views/admin/AdminRelayStations.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        { path: '/admin/keys', redirect: '/admin/relay-stations' },
        {
          path: '/admin/users',
          name: 'AdminUsers',
          component: () => import('@/views/admin/AdminUsers.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        }
      ]
    }
  ]
})

// 路由守卫
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // 🔧 开发模式：自动登录管理员账号
  const DEV_MODE = import.meta.env.DEV // Vite 开发模式
  
  if (DEV_MODE && !authStore.isAuthenticated()) {
    // 未登录时自动登录管理员账号
    console.log('🔧 开发模式：检测到未登录，开始自动登录...')
    try {
      await authStore.login('admin@seedance.com', 'admin123456')
      console.log('✅ 自动登录成功！')
      // 如果正在访问登录页，跳转到创作页面
      if (to.path === '/login' || to.path === '/register') {
        next('/create')
        return
      }
      // 否则继续访问原目标页面
      next()
      return
    } catch (error) {
      console.error('⚠️ 自动登录失败，请检查后端服务:', error)
      // 登录失败，跳转到登录页面让用户手动登录
      if (to.meta.requiresAuth) {
        next('/login')
        return
      }
    }
  }

  // 需要认证的路由
  if (to.meta.requiresAuth && !authStore.isAuthenticated()) {
    next('/login')
    return
  }

  // 已登录用户访问登录/注册页
  if (to.meta.requiresGuest && authStore.isAuthenticated()) {
    next('/create')
    return
  }

  // 需要 Admin 权限
  if (to.meta.requiresAdmin && !authStore.isAdmin()) {
    next('/create')
    return
  }

  next()
})

export default router
