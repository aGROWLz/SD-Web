import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../types';
import { QueueManager } from '../queue/queue-manager';
import { setupTaskProcessor } from '../queue/task-processor';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config/env';
import { ensureVideoThumbnail, ensureImageThumbnail } from '../services/video-thumbnail.service';
import { resolveStoredVideoPath } from '../services/video-storage.service';
import { normalizeSeedanceRequest } from '../domain/seedance';
import { buildTaskHistoryWhere } from '../domain/task-query';
import { persistLocalAssetParams, resolveLocalAssetFile } from '../services/local-asset.service';

// 每日配额限制
const DAILY_QUOTA: Record<string, number> = {
  USER: 100,
  ADMIN: 999999,
};

/**
 * 辅助函数：获取查询参数的字符串值
 */
const getQueryParam = (param: any): string | undefined => {
  if (Array.isArray(param)) {
    return param[0] as string;
  }
  if (typeof param === 'string') {
    return param;
  }
  return undefined;
};

/**
 * 创建新任务
 */
export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, params = {} } = req.body;
    const userId = req.user!.userId;

    if (prompt !== undefined && typeof prompt !== 'string') {
      return res.status(400).json({ error: '提示词格式不正确' });
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'ADMIN' && !user.canGenerate) {
      return res.status(403).json({ error: '当前账号暂未获得视频生成权限' });
    }

    // 检查每日配额
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTaskCount = await prisma.task.count({
      where: {
        userId,
        createdAt: {
          gte: today,
        },
      },
    });

    const dailyLimit = DAILY_QUOTA[user.role] || 10;
    if (todayTaskCount >= dailyLimit) {
      return res.status(429).json({
        error: `Daily quota exceeded. Limit: ${dailyLimit} tasks per day`,
        limit: dailyLimit,
        used: todayTaskCount,
      });
    }

    const relayStation = await prisma.relayStation.findFirst({
      where: { isActive: true, isPrimary: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (!relayStation) {
      return res.status(503).json({
        error: '当前没有可用的主中转站，请联系管理员配置',
      });
    }

    let normalizedParams;
    try {
      const validatedParams = normalizeSeedanceRequest(prompt ?? '', params);
      normalizedParams = await persistLocalAssetParams(validatedParams, userId);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }

    // 创建任务
    const task = await prisma.task.create({
      data: {
        userId,
        relayStationId: relayStation.id,
        prompt: prompt ?? '',
        params: normalizedParams as any,
        status: 'PENDING',
      },
      include: {
        relayStation: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 获取队列并设置处理器
    const queue = QueueManager.getQueue(relayStation.id);
    
    // 确保处理器已设置（Bull 队列会自动管理处理器）
    setupTaskProcessor(queue);

    // 添加任务到队列
    await queue.add(
      {
        taskId: task.id,
        relayStationId: relayStation.id,
      },
      {
        jobId: task.id,
        priority: user.role === 'ADMIN' ? 1 : 5,
      }
    );

    console.log(`Task ${task.id} added to queue for relay station ${relayStation.id}`);

    res.status(201).json({
      task: {
        id: task.id,
        status: task.status,
        prompt: task.prompt,
        params: task.params,
        createdAt: task.createdAt,
        relayStation: task.relayStation,
      },
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * 获取任务列表（分页、筛选）
 */
export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    // 分页参数
    const page = parseInt(getQueryParam(req.query.page) || '1');
    const limit = parseInt(getQueryParam(req.query.limit) || '20');
    const skip = (page - 1) * limit;

    // 筛选参数
    const status = getQueryParam(req.query.status);
    const mine = getQueryParam(req.query.mine) === 'true';

    // 构建查询条件
    const where: any = buildTaskHistoryWhere(userId, userRole, mine);

    // 状态筛选
    if (status && ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(status)) {
      where.status = status;
    }

    // 查询任务
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          relayStation: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      }),
      prisma.task.count({ where }),
    ]);

    res.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * 获取单个任务详情
 */
export const getTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        relayStation: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // 权限检查：只能查看自己的任务或管理员
    if (task.userId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * 读取任务保存的本地参考素材，用于创作记录预览。
 */
export const getTaskAsset = async (req: AuthRequest, res: Response) => {
  try {
    const rawId = req.params.id;
    const rawIndex = req.params.index;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const indexValue = Array.isArray(rawIndex) ? rawIndex[0] : rawIndex;
    const index = Number(indexValue);
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    if (!Number.isInteger(index) || index < 0) {
      return res.status(404).json({ error: '任务素材不存在' });
    }

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.userId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const params = task.params as Record<string, any> | null;
    const content = Array.isArray(params?.content) ? params.content : [];
    const item = content[index];
    const source = item?.image_url?.url ?? item?.video_url?.url ?? item?.audio_url?.url;
    if (typeof source !== 'string') {
      return res.status(404).json({ error: '任务素材不存在' });
    }
    if (!source.startsWith('local-asset://')) {
      return res.status(409).json({ error: '历史素材没有本地原文件，请重新选择素材' });
    }

    try {
      const asset = await resolveLocalAssetFile(task.userId, source);
      if (asset.contentType.startsWith('image/') && req.query.thumbnail === '1') {
        const thumbnailPath = await ensureImageThumbnail(asset.filePath);
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'private, max-age=86400');
        return res.sendFile(thumbnailPath);
      }
      res.setHeader('Content-Type', asset.contentType);
      res.setHeader('Content-Disposition', `inline; filename="${asset.filename}"`);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      return res.sendFile(asset.filePath);
    } catch (error: any) {
      return res.status(404).json({ error: error.message || '本地素材不存在，请重新选择文件' });
    }
  } catch (error) {
    console.error('Get task asset error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * 删除/取消任务
 */
export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // 权限检查：只能删除自己的任务或管理员
    if (task.userId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 如果任务在队列中，尝试移除
    if (task.status === 'PENDING' || task.status === 'PROCESSING') {
      try {
        if (!task.relayStationId) {
          throw new Error('任务未绑定中转站');
        }
        const queue = QueueManager.getQueue(task.relayStationId);
        const job = await queue.getJob(task.id);
        
        if (job) {
          await job.remove();
          console.log(`Job ${task.id} removed from queue`);
        }
      } catch (error) {
        console.error('Failed to remove job from queue:', error);
        // 继续执行，即使队列移除失败
      }
    }

    // 删除本地文件
    if (task.localPath) {
      try {
        const filePath = resolveStoredVideoPath(task.localPath);
        await fs.unlink(filePath);
        console.log(`Deleted local file: ${filePath}`);
      } catch (error) {
        console.error('Failed to delete local file:', error);
        // 继续执行，即使文件删除失败
      }
    }

    // 删除任务记录
    await prisma.task.delete({
      where: { id },
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * 返回项目本地保存的视频首帧缩略图，不触碰完整视频响应。
 */
export const getTaskThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const task = await prisma.task.findUnique({ where: { id } });

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.userId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (task.status !== 'COMPLETED' || !task.localPath) {
      return res.status(404).json({ error: 'Video thumbnail not found' });
    }

    const videoPath = resolveStoredVideoPath(task.localPath);
    try {
      await fs.access(videoPath);
      const thumbnailPath = await ensureVideoThumbnail(videoPath);
      await fs.access(thumbnailPath);
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(thumbnailPath)}"`);
      res.setHeader('Cache-Control', 'private, max-age=86400');
      return res.sendFile(thumbnailPath);
    } catch (error: any) {
      return res.status(404).json({ error: error.message || 'Video thumbnail not found' });
    }
  } catch (error) {
    console.error('Get task thumbnail error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * 下载视频文件
 */
export const downloadVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // 权限检查：只能下载自己的任务或管理员
    if (task.userId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 检查任务是否完成
    if (task.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Task is not completed yet' });
    }

    // 检查本地文件是否存在
    if (!task.localPath) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    const filePath = resolveStoredVideoPath(task.localPath);

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'Video file not found on server' });
    }

    // 下载文件
    const fileName = path.basename(task.localPath);
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download file' });
        }
      }
    });
  } catch (error) {
    console.error('Download video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
