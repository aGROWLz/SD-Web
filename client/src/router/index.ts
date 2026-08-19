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
