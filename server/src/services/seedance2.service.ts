import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';

export interface SeeDance2TaskParams {
  prompt: string;
  duration?: number;
  aspectRatio?: string;
  [key: string]: any;
}

export interface SeeDance2TaskResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

export class SeeDance2Service {
  private client: AxiosInstance;

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: config.seedance2ApiBaseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async submitTask(params: SeeDance2TaskParams): Promise<string> {
    try {
      const response = await this.client.post('/v1/tasks', params);
      return response.data.taskId;
    } catch (error: any) {
      console.error('SeeDance2 submit task error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to submit task');
    }
  }

  async getTaskStatus(taskId: string): Promise<SeeDance2TaskResponse> {
    try {
      const response = await this.client.get(`/v1/tasks/${taskId}`);
      return response.data;
    } catch (error: any) {
      console.error('SeeDance2 get task status error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to get task status');
    }
  }

  async pollTaskUntilComplete(
    taskId: string,
    maxAttempts: number = 120,
    intervalMs: number = 5000
  ): Promise<SeeDance2TaskResponse> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getTaskStatus(taskId);

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error('Task polling timeout');
  }
}
