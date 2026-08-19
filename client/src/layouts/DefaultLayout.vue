<template>
  <el-container class="layout-container">
    <el-header class="header">
      <div class="header-content">
        <div class="logo">
          <div class="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h2>SeeDance<span class="brand-accent">2</span></h2>
        </div>
        <div class="user-menu">
          <div class="user-badge">
            <el-tag :type="authStore.isAdmin() ? 'danger' : 'info'" size="small">
              {{ authStore.isAdmin() ? '管理员' : '用户' }}
            </el-tag>
          </div>
          <el-dropdown @command="handleCommand" trigger="click">
            <span class="user-info">
              <el-avatar :size="32" style="background: linear-gradient(135deg, var(--accent-primary), #8B5CF6)">
                <el-icon><User /></el-icon>
              </el-avatar>
              <span class="user-email">{{ authStore.user?.email }}</span>
              <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu class="user-dropdown">
                <el-dropdown-item disabled class="user-role-item">
                  <div class="role-info">
                    <el-icon><Lock /></el-icon>
                    <span>{{ authStore.isAdmin() ? '管理员账号' : '普通用户' }}</span>
                  </div>
                </el-dropdown-item>
                <el-dropdown-item divided command="logout" class="logout-item">
                  <el-icon><SwitchButton /></el-icon>
                  <span>退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </el-header>

    <el-container>
      <el-aside width="240px" class="sidebar">
        <el-menu
          :default-active="activeMenu"
          router
          class="sidebar-menu"
        >
          <el-menu-item index="/create">
            <el-icon><MagicStick /></el-icon>
            <span>创作</span>
          </el-menu-item>

          <el-menu-item index="/dashboard">
            <el-icon><HomeFilled /></el-icon>
            <span>仪表盘</span>
          </el-menu-item>

          <el-menu-item index="/keys">
            <el-icon><VideoCamera /></el-icon>
            <span>视频任务</span>
          </el-menu-item>

          <el-menu-item-group v-if="authStore.isAdmin()" title="系统管理" class="admin-group">
            <el-menu-item index="/admin/users">
              <el-icon><UserFilled /></el-icon>
              <span>用户管理</span>
            </el-menu-item>
            <el-menu-item index="/admin/relay-stations">
              <el-icon><Connection /></el-icon>
              <span>中转站</span>
            </el-menu-item>
          </el-menu-item-group>
        </el-menu>
      </el-aside>

      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { 
  User, 
  SwitchButton, 
  HomeFilled, 
  UserFilled, 
  ArrowDown,
  VideoCamera,
  Lock,
  MagicStick,
  Connection
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const activeMenu = computed(() => route.path)

const handleCommand = (command: string) => {
  if (command === 'logout') {
    authStore.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  background: var(--bg-primary);
}

.header {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-default);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  padding: 0 var(--spacing-xl);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(20px);
  z-index: 100;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, var(--accent-primary), #8B5CF6);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.logo-icon svg {
  width: 20px;
  height: 20px;
}

.logo h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.brand-accent {
  color: var(--accent-primary);
}

.user-menu {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.user-badge {
  padding: 4px 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.user-info:hover {
  background: var(--bg-elevated);
  border-color: var(--border-default);
}

.user-email {
  font-size: 14px;
  color: var(--text-primary);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-icon {
  font-size: 12px;
  color: var(--text-secondary);
  transition: transform var(--transition-fast);
}

.user-info:hover .dropdown-icon {
  transform: translateY(2px);
}

.sidebar {
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-default);
  overflow-y: auto;
}

.sidebar-menu {
  border-right: none;
  background: transparent;
  padding: var(--spacing-lg) var(--spacing-sm);
}

.sidebar-menu .el-menu-item {
  margin-bottom: var(--spacing-xs);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.sidebar-menu .el-menu-item:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.sidebar-menu .el-menu-item.is-active {
  background: var(--accent-light);
  color: var(--accent-primary);
  font-weight: 600;
}

.sidebar-menu .el-menu-item-group__title {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: var(--spacing-lg) var(--spacing-md) var(--spacing-sm);
}

.admin-group {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-subtle);
}

.main-content {
  background: var(--bg-primary);
  padding: var(--spacing-xl);
  overflow-y: auto;
}

/* Dropdown 样式 */
:deep(.user-dropdown) {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-xs);
}

:deep(.user-dropdown .el-dropdown-menu__item) {
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  margin: 2px 0;
}

:deep(.user-dropdown .el-dropdown-menu__item:hover) {
  background: var(--bg-secondary);
}

.role-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.logout-item {
  color: var(--error) !important;
}
</style>
