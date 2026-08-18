import Queue from 'bull';
import { config } from '../config/env';

interface QueueMap {
  [queueName: string]: Queue.Queue;
}

export class QueueManager {
  private static queues: QueueMap = {};

  static getQueue(apiKeyId: string): Queue.Queue {
    const queueName = `seedance2:key:${apiKeyId}`;

    if (!this.queues[queueName]) {
      this.queues[queueName] = new Queue(queueName, {
        redis: {
          host: config.redis.host,
          port: config.redis.port,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          timeout: 600000, // 10 分钟
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
