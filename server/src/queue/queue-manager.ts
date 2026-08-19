import Queue from 'bull';
import { config } from '../config/env';

interface QueueMap {
  [queueName: string]: Queue.Queue;
}

export class QueueManager {
  private static queues: QueueMap = {};

  static getQueue(relayStationId: string): Queue.Queue {
    const queueName = `seedance2:relay:${relayStationId}`;

    if (!this.queues[queueName]) {
      this.queues[queueName] = new Queue(queueName, {
        redis: {
          host: config.redis.host,
          port: config.redis.port,
        },
        defaultJobOptions: {
          // A retry after upstream submission could create and bill a duplicate video.
          attempts: 1,
          timeout: 2700000, // 覆盖 30 分钟轮询、HTTP 查询和结果下载余量
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      });

      console.log(`Created queue: ${queueName}`);
    }

    return this.queues[queueName];
  }

  static async closeAll(): Promise<void> {
    const closePromises = Object.values(this.queues).map((queue) =>
      queue.close()
    );
    await Promise.all(closePromises);
    console.log('All queues closed');
  }
}
