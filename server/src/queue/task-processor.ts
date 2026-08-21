import Queue from 'bull';
import prisma from '../lib/prisma';
import { SeeDance2Service } from '../services/seedance2.service';
import { VideoDownloaderService } from '../services/video-downloader.service';
import { KeyEncryptionService } from '../services/key-encryption.service';
import { TaskNotifier } from '../websocket/task-notifier';
import { io } from '../index';
import { notifyTaskUpdate, notifyTaskCompleted, notifyTaskFailed } from '../socket';
import { markProcessorConfigured } from './processor-registry';
import { submitRelayTask } from '../services/relay-task-submission.service';
import { materializeLocalAssetParams } from '../services/local-asset.service';
import { getR2StorageConfig, uploadBytesToWorker } from '../services/r2-storage.service';
import { ensureVideoThumbnail } from '../services/video-thumbnail.service';
import { resolveStoredVideoPath } from '../services/video-storage.service';

export interface TaskJobData {
  taskId: string;
  relayStationId: string;
}

export const setupTaskProcessor = (queue: Queue.Queue) => {
  if (!markProcessorConfigured(queue)) return;

  queue.process(21, async (job: Queue.Job<TaskJobData>) => {
    const { taskId, relayStationId } = job.data;

    console.log(`Processing task ${taskId} with relay station ${relayStationId}`);

    try {
      // 获取任务和中转站
      const [task, relayStation] = await Promise.all([
        prisma.task.findUnique({ where: { id: taskId } }),
        prisma.relayStation.findUnique({ where: { id: relayStationId } }),
      ]);

      if (!task) {
        throw new Error('Task not found');
      }

      if (!relayStation || !relayStation.isActive) {
        throw new Error('中转站不存在或已禁用');
      }

      // 更新任务状态为处理中
      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'PROCESSING',
          startedAt: new Date(),
        },
      });

      // 发送 WebSocket 通知（旧版）
      TaskNotifier.emitTaskStatus(task.userId, taskId, 'PROCESSING');

      // 发送 Socket.IO 通知（新版）
      notifyTaskUpdate(io, task.userId, updatedTask);

      // 解密中转站 API Key
      const decryptedKey = KeyEncryptionService.decrypt(relayStation.apiKeyEncrypted);

      // 创建 SeeDance2 客户端
      const seedance2 = new SeeDance2Service(decryptedKey, relayStation.baseUrl);

      // 每次执行都从本地原文件重新上传，数据库任务参数始终保留本地引用。
      const storage = await getR2StorageConfig();
      const materializedParams = await materializeLocalAssetParams(
        task.params as Record<string, any>,
        task.userId,
        {
          configured: storage.configured,
          upload: (bytes, filename, contentType) => uploadBytesToWorker(
            storage.workerUrl,
            storage.apiKey,
            bytes,
            filename,
            contentType,
          ),
        },
      );

      // 提交时按当前中转站配置转换模型名。
      const seedanceTaskId = await submitRelayTask(
        seedance2,
        materializedParams,
        relayStation.modelRedirects,
      );

      console.log(`[TaskProcessor] SeeDance2 任务已提交: ${seedanceTaskId}`);

      // 轮询任务状态
      const result = await seedance2.pollTaskUntilComplete(seedanceTaskId);

      if (result.status === 'failed') {
        throw new Error(result.error?.message || 'SeeDance2 任务失败');
      }

      if (!result.video_url) {
        throw new Error('SeeDance2 返回的结果中没有视频 URL');
      }

      // 下载视频到本地
      const localPath = await VideoDownloaderService.downloadVideo(
        result.video_url,
        taskId
      );

      try {
        await ensureVideoThumbnail(resolveStoredVideoPath(localPath));
      } catch (thumbnailError: any) {
        console.warn(`[TaskProcessor] 视频首帧生成失败，任务仍保留视频结果: ${thumbnailError.message}`);
      }

      // 更新任务状态为完成
      const completedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          videoUrl: result.video_url,
          localPath,
          completedAt: new Date(),
        },
      });

      // 发送 WebSocket 通知（旧版）
      TaskNotifier.emitTaskStatus(task.userId, taskId, 'COMPLETED', {
        videoUrl: result.video_url,
        localPath,
      });

      // 发送 Socket.IO 通知（新版）
      notifyTaskCompleted(io, task.userId, completedTask);

      // 记录使用量
      await prisma.usageLog.create({
        data: {
          userId: task.userId,
          apiKeyId: null,
          relayStationId: relayStation.id,
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
      const failedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });

      // 发送 WebSocket 通知（旧版）
      if (task) {
        TaskNotifier.emitTaskStatus(task.userId, taskId, 'FAILED', {
          errorMessage: error.message,
        });

        // 发送 Socket.IO 通知（新版）
        notifyTaskFailed(io, task.userId, failedTask);
      }

      // 如果是 API Key 问题，禁用该 Key
      // 站点鉴权错误不自动删除或泄露中转站配置，交由管理员确认。

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
