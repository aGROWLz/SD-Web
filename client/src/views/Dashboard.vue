<template>
  <div class="dashboard" v-loading="loading">
      <div class="page-header">
        <div class="header-text">
          <h1 class="page-title">欢迎回来</h1>
          <p class="page-subtitle">{{ authStore.user?.email }} · {{ authStore.isAdmin() ? '管理员' : '用户' }}</p>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon tasks">
            <el-icon><Document /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">任务总数</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon processing">
            <el-icon><Loading /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.processing }}</div>
            <div class="stat-label">进行中</div>
          </div>
          <div class="stat-trend">
            <span>实时</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon completed">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.completed }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon api">
            <el-icon><Calendar /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.todayCalls }}</div>
            <div class="stat-label">今日调用</div>
          </div>
        </div>
      </div>

      <div class="content-grid">
        <div class="activity-card">
          <div class="card-header">
            <h2 class="card-title">最近活动</h2>
            <el-button text @click="goToTasks">查看全部</el-button>
          </div>
          <div class="activity-list">
            <div v-if="recentTasks.length === 0" class="empty-state">
              <el-icon><VideoCamera /></el-icon>
              <p>暂无任务记录</p>
            </div>
            <div 
              v-for="task in recentTasks" 
              :key="task.id" 
              class="activity-item"
            >
              <div class="activity-icon" :class="task.status.toLowerCase()">
                <el-icon v-if="task.status === 'COMPLETED'"><CircleCheck /></el-icon>
                <el-icon v-else-if="task.status === 'PROCESSING'"><Loading /></el-icon>
                <el-icon v-else-if="task.status === 'FAILED'"><CircleClose /></el-icon>
                <el-icon v-else><Clock /></el-icon>
              </div>
              <div class="activity-content">
                <div class="activity-title">{{ task.prompt.substring(0, 40) }}...</div>
                <div class="activity-meta">
                  <span class="activity-time">{{ formatTime(task.createdAt) }}</span>
                  <el-tag :type="getStatusType(task.status)" size="small">
                    {{ getStatusText(task.status) }}
                  </el-tag>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="quick-actions-card">
          <div class="card-header">
            <h2 class="card-title">快速操作</h2>
          </div>
          <div class="actions-list">
            <button class="action-btn primary" @click="createNewTask">
              <div class="action-icon">
                <el-icon><VideoCamera /></el-icon>
              </div>
              <div class="action-text">
                <div class="action-title">创建新任务</div>
                <div class="action-desc">生成AI视频</div>
              </div>
            </button>
            <button class="action-btn" @click="goToTasks">
              <div class="action-icon">
                <el-icon><Document /></el-icon>
              </div>
              <div class="action-text">
                <div class="action-title">查看任务</div>
                <div class="action-desc">管理视频任务</div>
              </div>
            </button>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { 
  Document, 
  Loading, 
  CircleCheck, 
  Calendar, 
  VideoCamera,
  Clock,
  CircleClose
} from '@element-plus/icons-vue'
import { tasksApi, type Task } from '@/api'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

interface Stats {
  total: number
  pending: number
  processing: number
  completed: number
  todayCalls: number
}

const loading = ref(false)
const stats = ref<Stats>({
  total: 0,
  pending: 0,
  processing: 0,
  completed: 0,
  todayCalls: 0
})
const recentTasks = ref<Task[]>([])

const fetchDashboardData = async () => {
  loading.value = true
  try {
    const { data } = await tasksApi.getTasks({ page: 1, limit: 5 })
    recentTasks.value = data.tasks
    
    stats.value.total = data.pagination.total
    stats.value.pending = data.tasks.filter(t => t.status === 'PENDING').length
    stats.value.processing = data.tasks.filter(t => t.status === 'PROCESSING').length
    stats.value.completed = data.tasks.filter(t => t.status === 'COMPLETED').length
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    stats.value.todayCalls = data.tasks.filter(t => {
      const taskDate = new Date(t.createdAt)
      taskDate.setHours(0, 0, 0, 0)
      return taskDate.getTime() === today.getTime()
    }).length
  } catch (error: any) {
    console.error('Failed to fetch dashboard data:', error)
    // 不显示错误消息，避免刚登录就弹错误
  } finally {
    loading.value = false
  }
}

const getStatusType = (status: string): 'success' | 'warning' | 'info' | 'danger' => {
  const map: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
    COMPLETED: 'success',
    PROCESSING: 'warning',
    PENDING: 'info',
    FAILED: 'danger'
  }
  return map[status] || 'info'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    PENDING: '等待中',
    PROCESSING: '处理中',
    COMPLETED: '已完成',
    FAILED: '失败'
  }
  return map[status] || status
}

const formatTime = (dateStr: string) => {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

const goToTasks = () => {
  router.push('/tasks')
}

const createNewTask = () => {
  router.push('/create')
}

onMounted(() => {
  fetchDashboardData()
})
</script>

<style scoped>
.dashboard {
  padding: 32px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-size: 32px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  border-color: var(--border-strong);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-icon.tasks {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.stat-icon.processing {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.stat-icon.completed {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.stat-icon.api {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.stat-trend {
  font-size: 12px;
  color: var(--text-muted);
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 24px;
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

.activity-card, .quick-actions-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: var(--text-muted);
}

.empty-state .el-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.3;
}

.activity-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.activity-item:hover {
  background: var(--bg-primary);
  border-color: var(--border-strong);
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.activity-icon.completed {
  background: rgba(76, 175, 80, 0.15);
  color: #4caf50;
}

.activity-icon.processing {
  background: rgba(255, 152, 0, 0.15);
  color: #ff9800;
}

.activity-icon.pending {
  background: rgba(33, 150, 243, 0.15);
  color: #2196f3;
}

.activity-icon.failed {
  background: rgba(244, 67, 54, 0.15);
  color: #f44336;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.activity-time {
  font-size: 12px;
  color: var(--text-muted);
}

.actions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  text-align: left;
}

.action-btn:hover {
  background: var(--bg-primary);
  border-color: var(--accent-primary);
  transform: translateX(4px);
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
  border: none;
}

.action-btn.primary .action-icon {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.action-btn.primary .action-title {
  color: white;
}

.action-btn.primary .action-desc {
  color: rgba(255, 255, 255, 0.8);
}

.action-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--accent-primary);
  flex-shrink: 0;
}

.action-text {
  flex: 1;
}

.action-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.action-desc {
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
