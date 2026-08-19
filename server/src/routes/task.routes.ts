import { Router } from 'express';
import {
  createTask,
  getTasks,
  getTask,
  deleteTask,
  downloadVideo,
} from '../controllers/task.controller';
import { authenticate } from '../middleware/auth';
import { validateCreateTask, validateParamId } from '../middlewares/validator';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 创建任务
router.post('/', validateCreateTask, createTask);

// 获取任务列表（支持分页和筛选）
router.get('/', getTasks);

// 获取单个任务详情
router.get('/:id', validateParamId('id'), getTask);

// 删除/取消任务
router.delete('/:id', validateParamId('id'), deleteTask);

// 下载视频文件
router.get('/:id/download', validateParamId('id'), downloadVideo);

export default router;
