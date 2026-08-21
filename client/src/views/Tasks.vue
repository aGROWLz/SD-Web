<template>
  <div class="keys-page">
      <div class="page-header">
        <div class="header-text">
          <h1 class="page-title">视频任务</h1>
          <p class="page-subtitle">管理您的视频生成任务和历史记录</p>
        </div>
        <el-button type="primary" :icon="Plus" size="large" @click="goToCreate">
          创建新任务
        </el-button>
      </div>

      <div class="filters-bar">
        <el-input 
          v-model="searchQuery" 
          placeholder="搜索任务ID或描述..." 
          :prefix-icon="Search"
          clearable
          class="search-input"
        />
        <el-select v-model="statusFilter" placeholder="筛选状态" clearable class="status-filter">
          <el-option label="全部状态" value="" />
          <el-option label="等待中" value="PENDING" />
          <el-option label="处理中" value="PROCESSING" />
          <el-option label="已完成" value="COMPLETED" />
          <el-option label="失败" value="FAILED" />
        </el-select>
      </div>

      <div class="tasks-grid">
        <div v-for="task in filteredTasks" :key="task.id" class="task-card" :class="{ 'prompt-open': expandedTaskId === task.id }">
          <div class="task-thumbnail">
            <TaskVideoPreview v-if="task.status === 'COMPLETED' && task.videoUrl" :task-id="task.id" />
            <img v-else-if="task.thumbnailUrl" :src="task.thumbnailUrl" alt="Video thumbnail" />
            <div v-else class="thumbnail-placeholder">
              <el-icon :size="48"><VideoCamera /></el-icon>
            </div>
            <el-tag :type="getStatusType(task.status)" size="small" class="status-badge">
              {{ getStatusText(task.status) }}
            </el-tag>
          </div>

          <div class="task-content">
            <div class="task-header">
              <div class="task-title">任务 #{{ task.id }}</div>
              <el-dropdown trigger="click">
                <el-button :icon="More" text circle size="small" />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :icon="View" v-if="task.status === 'COMPLETED'" @click="handleViewVideo(task)">
                      查看视频
                    </el-dropdown-item>
                    <el-dropdown-item :icon="Download" v-if="task.status === 'COMPLETED'" @click="handleDownloadVideo(task.id)">
                      下载
                    </el-dropdown-item>
                    <el-dropdown-item :icon="Delete" divided @click="handleDeleteTask(task.id)">删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>

            <div class="task-description-block">
              <div class="task-description">{{ task.description }}</div>
              <button v-if="task.description.length > 120" type="button" class="task-prompt-expand" :aria-expanded="expandedTaskId === task.id" @click="toggleTaskPrompt(task.id)">
                <span>{{ expandedTaskId === task.id ? '收起提示词' : '展开完整提示词' }}</span>
                <el-icon :class="{ rotated: expandedTaskId === task.id }"><ArrowDown /></el-icon>
              </button>
              <div v-if="expandedTaskId === task.id" class="task-prompt-panel">{{ task.description }}</div>
            </div>

            <div class="task-meta">
              <div class="meta-item">
                <el-icon><Clock /></el-icon>
                <span>{{ formatDate(task.createdAt) }}</span>
              </div>
              <div class="meta-item" v-if="task.duration">
                <el-icon><Timer /></el-icon>
                <span>{{ task.duration }}s</span>
              </div>
            </div>

            <el-progress 
              v-if="task.status === 'PROCESSING'" 
              :percentage="task.progress" 
              :stroke-width="6"
              :show-text="false"
            />
          </div>
        </div>
      </div>

      <div v-if="filteredTasks.length === 0" class="empty-state">
        <el-icon :size="64" color="var(--text-muted)"><VideoCamera /></el-icon>
        <h3>暂无任务</h3>
        <p>点击"创建新任务"开始您的第一个视频生成</p>
      </div>

      <!-- 创建任务对话框 -->
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { 
  Plus, 
  Search, 
  More, 
  View, 
  Download, 
  Delete, 
  Clock, 
  Timer,
  VideoCamera,
  ArrowDown
} from '@element-plus/icons-vue'
import { tasksApi, type Task } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { useSocket } from '@/composables/useSocket'
import TaskVideoPreview from '@/components/create/TaskVideoPreview.vue'

const searchQuery = ref('')
const statusFilter = ref('')
const loading = ref(false)
const tasks = ref<Task[]>([])
const router = useRouter()
const expandedTaskId = ref<string | null>(null)
const toggleTaskPrompt = (taskId: string) => {
  expandedTaskId.value = expandedTaskId.value === taskId ? null : taskId
}

// WebSocket 实时更新
const { connect, disconnect, on, off } = useSocket()

interface TaskDisplay extends Task {
  thumbnailUrl?: string
  progress?: number
}

const fetchTasks = async () => {
  loading.value = true
  try {
    const { data } = await tasksApi.getTasks({ page: 1, limit: 100 })
    tasks.value = data.tasks
    data.tasks.forEach(task => { void loadTaskThumbnail(task) })
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '获取任务列表失败')
  } finally {
    loading.value = false
  }
}

// 每个任务的首帧封面 Blob URL，key 为任务 id
const thumbnails = ref<Record<string, string>>({})

const loadTaskThumbnail = async (task: Task) => {
  if (task.status !== 'COMPLETED') return
  if (thumbnails.value[task.id]) return
  try {
    // 优先使用本地保存的视频首帧缩略图接口（返回 JPG），videoUrl 是 MP4 无法作为图片显示
    const { data } = await tasksApi.getTaskThumbnail(task.id)
    const url = window.URL.createObjectURL(new Blob([data], { type: 'image/jpeg' }))
    thumbnails.value = { ...thumbnails.value, [task.id]: url }
  } catch {
    // 无本地视频或提取失败时退回外链封面
    if (task.videoUrl) {
      thumbnails.value = { ...thumbnails.value, [task.id]: task.videoUrl }
    }
  }
}

const filteredTasks = computed(() => {
  return tasks.value.filter(task => {
    const matchesSearch = !searchQuery.value || 
      task.id.includes(searchQuery.value) ||
      task.prompt.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesStatus = !statusFilter.value || task.status === statusFilter.value
    return matchesSearch && matchesStatus
  }).map(task => ({
    ...task,
    description: task.prompt,
    thumbnailUrl: thumbnails.value[task.id],
    progress: task.status === 'PROCESSING' ? 50 : undefined
  }))
})

const handleDeleteTask = async (taskId: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这个任务吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await tasksApi.deleteTask(taskId)
    ElMessage.success('删除成功')
    await fetchTasks()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.error || '删除失败')
    }
  }
}

const handleDownloadVideo = async (taskId: string) => {
  try {
    const { data } = await tasksApi.downloadVideo(taskId)
    const url = window.URL.createObjectURL(new Blob([data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `video-${taskId}.mp4`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '下载失败')
  }
}

onMounted(() => {
  fetchTasks()
  
  // 连接 WebSocket
  connect()
  
  // 监听任务更新事件
  const handleTaskUpdate = (data: any) => {
    const index = tasks.value.findIndex(t => t.id === data.id)
    if (index > -1) {
      tasks.value[index] = { ...tasks.value[index], ...data }
    }
  }
  
  const handleTaskCompleted = () => {
    fetchTasks() // 任务完成后刷新列表
  }
  
  const handleTaskFailed = () => {
    fetchTasks() // 任务失败后刷新列表
  }
  
  window.addEventListener('task:update', (e: any) => handleTaskUpdate(e.detail))
  window.addEventListener('task:completed', handleTaskCompleted)
  window.addEventListener('task:failed', handleTaskFailed)
  
  // 清理函数
  onUnmounted(() => {
    disconnect()
    window.removeEventListener('task:update', (e: any) => handleTaskUpdate(e.detail))
    window.removeEventListener('task:completed', handleTaskCompleted)
    window.removeEventListener('task:failed', handleTaskFailed)
  })
  
  // 定时刷新（作为备份）
  const interval = setInterval(fetchTasks, 30000)
  onUnmounted(() => {
    clearInterval(interval)
  })
})

const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    PENDING: 'info',
    PROCESSING: 'warning',
    COMPLETED: 'success',
    FAILED: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    PENDING: '等待中',
    PROCESSING: '处理中',
    COMPLETED: '已完成',
    FAILED: '失败'
  }
  return texts[status] || status
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleViewVideo = (task: Task) => {
  if (task.videoUrl) {
    window.open(task.videoUrl, '_blank')
  } else {
    ElMessage.warning('视频URL不可用')
  }
}

const goToCreate = () => router.push('/create')
</script>

<style scoped>
.keys-page {
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

.status-filter {
  width: 160px;
}

.tasks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: var(--spacing-lg);
}

.task-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  overflow: visible;
  transition: all var(--transition-base);
}

.task-card:hover {
  border-color: var(--border-emphasis);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.task-thumbnail {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: var(--bg-elevated);
  overflow: hidden;
}

.task-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.status-badge {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
}

.task-content {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.task-description {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow-wrap: anywhere;
}

.task-card.prompt-open {
  position: relative;
  z-index: 50;
}

.task-description-block { position: relative; min-width: 0; }
.task-prompt-expand { display: inline-flex; align-items: center; gap: 3px; margin-top: 5px; padding: 0; border: 0; color: var(--accent-primary); background: transparent; font-size: 11px; cursor: pointer; }
.task-prompt-expand .el-icon { transition: transform .18s ease; }
.task-prompt-expand .el-icon.rotated { transform: rotate(180deg); }
.task-prompt-panel { position: absolute; z-index: 20; top: calc(100% + 8px); left: 0; width: min(420px, calc(100vw - 32px)); max-height: 260px; overflow: auto; padding: 11px 13px; border: 1px solid var(--border-emphasis); border-radius: 6px; color: var(--text-primary); background: var(--bg-elevated); box-shadow: 0 14px 34px rgba(0,0,0,.42); font-size: 12px; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }

.task-meta {
  display: flex;
  gap: var(--spacing-lg);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--border-subtle);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: 12px;
  color: var(--text-muted);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl) * 2;
  text-align: center;
}

.empty-state h3 {
  margin: var(--spacing-lg) 0 var(--spacing-sm) 0;
  font-size: 18px;
  color: var(--text-primary);
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}
</style>
