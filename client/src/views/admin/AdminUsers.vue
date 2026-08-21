<template>
  <div class="admin-users-page">
      <div class="page-header">
        <div class="header-text">
          <h1 class="page-title">用户管理</h1>
          <p class="page-subtitle">管理平台所有用户账号和权限</p>
        </div>
      </div>

      <div class="filters-bar">
        <el-input 
          v-model="searchQuery" 
          placeholder="搜索用户邮箱或ID..." 
          :prefix-icon="Search"
          clearable
          class="search-input"
        />
        <el-select v-model="roleFilter" placeholder="筛选角色" clearable class="role-filter">
          <el-option label="全部角色" value="" />
          <el-option label="管理员" value="ADMIN" />
          <el-option label="普通用户" value="USER" />
        </el-select>
      </div>

      <div class="users-table-card">
        <el-table :data="filteredUsers" v-loading="loading">
          <el-table-column prop="id" label="ID" width="280" show-overflow-tooltip />
          <el-table-column prop="email" label="邮箱" min-width="200" />
          <el-table-column label="角色" width="120">
            <template #default="{ row }">
              <el-tag :type="row.role === 'ADMIN' ? 'danger' : 'info'" size="small">
                {{ row.role === 'ADMIN' ? '管理员' : '用户' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="tasksCount" label="任务数" width="100" align="center" />
          <el-table-column prop="assetsCount" label="素材数" width="100" align="center" />
          <el-table-column prop="usageLogsCount" label="用量记录" width="110" align="center" />
          <el-table-column label="注册时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="生成权限" width="130">
            <template #default="{ row }">
              <el-switch v-model="row.canGenerate" :disabled="row.role === 'ADMIN' || row.permissionSaving" @change="toggleGeneration(row)" />
              <span class="permission-label">{{ row.canGenerate ? '允许' : '禁止' }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { adminApi, type AdminUser } from '@/api'
import { ElMessage } from 'element-plus'

const searchQuery = ref('')
const roleFilter = ref('')
const loading = ref(false)
const users = ref<AdminUser[]>([])

const fetchUsers = async () => {
  loading.value = true
  try {
    const { data } = await adminApi.getAllUsers({ page: 1, limit: 100 })
    users.value = data.users.map(user => ({
      ...user,
      tasksCount: user._count.tasks,
      assetsCount: user._count.publicAssets,
      usageLogsCount: user._count.usageLogs,
      permissionSaving: false
    }))
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const filteredUsers = computed(() => {
  return users.value.filter(user => {
    const matchesSearch = !searchQuery.value || 
      user.email.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      user.id.includes(searchQuery.value)
    const matchesRole = !roleFilter.value || user.role === roleFilter.value
    return matchesSearch && matchesRole
  })
})

const toggleGeneration = async (user: AdminUser & { permissionSaving?: boolean }) => {
  const nextValue = user.canGenerate
  user.permissionSaving = true
  try {
    await adminApi.updateGenerationAccess(user.id, nextValue)
    ElMessage.success(nextValue ? '已允许该用户生成视频' : '已禁止该用户生成视频')
  } catch (error: any) {
    user.canGenerate = !nextValue
    ElMessage.error(error.response?.data?.error || '更新权限失败')
  } finally {
    user.permissionSaving = false
  }
}

onMounted(() => {
  fetchUsers()
})

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.admin-users-page {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--border-subtle);
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.page-title {
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  background: linear-gradient(135deg, var(--text-primary), var(--accent-primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.filters-bar {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.search-input {
  flex: 1;
  max-width: 400px;
}

.role-filter {
  width: 160px;
}

.users-table-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  overflow: hidden;
}
.permission-label { margin-left: 8px; font-size: 12px; color: var(--text-secondary); }

:deep(.el-table) {
  background: transparent;
  color: var(--text-primary);
}

:deep(.el-table__header-wrapper) {
  background: var(--bg-elevated);
}

:deep(.el-table th.el-table__cell) {
  background: var(--bg-elevated);
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-default);
}

:deep(.el-table tr) {
  background: transparent;
}

:deep(.el-table td.el-table__cell) {
  border-bottom: 1px solid var(--border-subtle);
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped) {
  background: transparent;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped > td.el-table__cell) {
  background: transparent;
}

:deep(.el-table__body tr:hover > td) {
  background: var(--bg-elevated) !important;
}
</style>
