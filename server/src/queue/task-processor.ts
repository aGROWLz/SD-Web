import Queue from 'bull';
import prisma from '../lib/prisma';
import { SeeDance2Service } from '../services/seedance2.service';
import { VideoDownloaderService } from '../services/video-downloader.service';
import { KeyEncryptionService } from '../services/key-encryption.service';
import { TaskNotifier } from '../websocket/task-notifier';

export interface TaskJobData {
  taskId: string;
  apiKeyId: string;
}

export const setupTaskProcessor = (queue: Queue.Queue) => {
  queue.process(3, async (job: Queue.Job<TaskJobData>) => {
    const { taskId, apiKeyId } = job.data;

    console.log(`Processing task ${taskId} with API key ${apiKeyId}`);

    try {
      // 获取任务和 API Key
      const [task, apiKey] = await Promise.all([
        prisma.task.findUnique({ where: { id: taskId } }),
        prisma.apiKey.findUnique({ where: { id: apiKeyId } }),
      ]);

      if (!task) {
        throw new Error('Task not found');
      }

      if (!apiKey || !apiKey.isActive) {
        throw new Error('API key not found or inactive');
      }

      // 更新任务状态为处理中
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'PROCESSING',
          startedAt: new Date(),
        },
      });

      // 发送 WebSocket 通知
      TaskNotifier.emitTaskStatus(task.userId, taskId, 'PROCESSING');

      // 解密 API Key
      const decryptedKey = KeyEncryptionService.decrypt(apiKey.keyValue);

      // 创建 SeeDance2 客户端
      const seedance2 = new SeeDance2Service(decryptedKey);

      // 提交任务到 SeeDance2
      const seedanceTaskId = await seedance2.submitTask({
        prompt: task.prompt,
        ...(task.params as any),
      });

      // 轮询任务状态
      const result = await seedance2.pollTaskUntilComplete(seedanceTaskId);

      if (result.status === 'failed') {
        throw new Error(result.error || 'SeeDance2 task failed');
      }

      // 下载视频
      const localPath = await VideoDownloaderService.downloadVideo(
        result.videoUrl!,
        taskId
      );

      // 更新任务状态为完成
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          resultUrl: result.videoUrl,
          localPath,
          completedAt: new Date(),
        },
      });

      // 发送 WebSocket 通知
      TaskNotifier.emitTaskStatus(task.userId, taskId, 'COMPLETED', {
        resultUrl: result.videoUrl,
        localPath,
      });

      // 记录使用量
      await prisma.usageLog.create({
        data: {
          userId: task.userId,
          apiKeyId: apiKey.id,
          taskId: task.id,
          cost: 1.0, // 根据实际计费规则调整
        },
      });

      console.log(`Task ${taskId} completed successfully`);

      return { success: true, taskId };
    } catch (error: any) {
      console.error(`Task ${taskId} failed:`, error.message);

      // 获取任务信息以便发送通知
      const task = await prisma.task.findUnique({ where: { id: taskId } });

      // 更新任务状态为失败
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });

      // 发送 WebSocket 通知
      if (task) {
        TaskNotifier.emitTaskStatus(task.userId, taskId, 'FAILED', {
          errorMessage: error.message,
        });
      }

      // 如果是 API Key 问题，禁用该 Key
      if (error.message.includes('Invalid API key') || error.message.includes('unauthorized')) {
        await prisma.apiKey.update({
          where: { id: apiKeyId },
          data: { isActive: false },
        });
        console.log(`API key ${apiKeyId} disabled due to authentication error`);
      }

      throw error;
    }
  });

  queue.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  queue.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });
};
