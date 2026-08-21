import { Router } from 'express';
import {
  createTask,
  getTasks,
  getTask,
  getTaskAsset,
  getTaskThumbnail,
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

// 读取任务的本地参考素材
router.get('/:id/assets/:index', validateParamId('id'), getTaskAsset);

// 获取任务视频首帧缩略图，不返回完整视频
router.get('/:id/thumbnail', validateParamId('id'), getTaskThumbnail);

// 获取单个任务详情
router.get('/:id', validateParamId('id'), getTask);

// 删除/取消任务
router.delete('/:id', validateParamId('id'), deleteTask);

// 下载视频文件
router.get('/:id/download', validateParamId('id'), downloadVideo);

export default router;
