import axios, { AxiosInstance } from 'axios';
import { normalizeSeedanceRequest, type SeedanceRequest, type SeedanceContent, type SeedanceModel, type SeedanceResolution, type SeedanceRatio } from '../domain/seedance';

/**
 * SeeDance2 视频生成服务
 * 基于火山引擎 API 文档实现
 * API 文档: https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks
 */

export type SeeDance2Content = SeedanceContent;

export interface SeeDance2TaskParams {
  model: SeedanceModel;
  content: SeeDance2Content[];
  resolution?: SeedanceResolution;
  ratio?: SeedanceRatio;
  duration?: number; // 视频时长（秒），或 -1 表示自动选择
  generate_audio?: boolean; // 是否生成有声视频
  watermark?: boolean; // 是否添加水印
  seed?: number; // 随机种子，-1 表示随机
  camera_fixed?: boolean; // 是否固定摄像头
  callback_url?: string; // 回调地址
  safety_identifier?: string; // 用户标识
  priority?: number; // 执行优先级 [0-9]
  output_format?: 'mp4' | 'mov';
  omni_reference_task_type?: 'auto' | 'reference' | 'edit' | 'extend';
}

export interface SeeDance2TaskResponse {
  id: string; // 任务 ID
  status?: 'queued' | 'running' | 'succeeded' | 'failed' | 'expired';
  video_url?: string; // 生成的视频 URL
  error?: {
    code: string;
    message: string;
  };
  created_at?: number;
  started_at?: number;
  completed_at?: number;
  duration?: number; // 实际生成的视频时长
}

export class SeeDance2Service {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string, baseUrl = 'https://ark.cn-beijing.volces.com/api/v3') {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * 提交视频生成任务
   */
  async submitTask(params: SeeDance2TaskParams): Promise<string> {
    try {
      console.log('[SeeDance2] 提交任务:', JSON.stringify(params, null, 2));

      const response = await this.client.post('/contents/generations/tasks', params);

      if (!response.data?.id) {
        throw new Error('API 返回的响应中缺少任务 ID');
      }

      console.log('[SeeDance2] 任务已提交，ID:', response.data.id);
      return response.data.id;
    } catch (error: any) {
      console.error('[SeeDance2] 提交任务失败:', error.response?.data || error.message);

      if (error.response?.data?.error) {
        throw new Error(`SeeDance2 API 错误: ${error.response.data.error.message || '未知错误'}`);
      }

      throw new Error(error.message || '提交视频生成任务失败');
    }
  }

  static normalizeTask(prompt: string, params: SeeDance2TaskParams): SeedanceRequest {
    return normalizeSeedanceRequest(prompt, params);
  }

  /**
   * 查询任务状态
   */
  async getTaskStatus(taskId: string): Promise<SeeDance2TaskResponse> {
    try {
      const response = await this.client.get(`/contents/generations/tasks/${taskId}`);

      console.log(`[SeeDance2] 任务 ${taskId} 状态:`, response.data.status);

      return {
        id: response.data.id,
        status: response.data.status,
        video_url: response.data.video_url,
        error: response.data.error,
        created_at: response.data.created_at,
        started_at: response.data.started_at,
        completed_at: response.data.completed_at,
        duration: response.data.duration,
      };
    } catch (error: any) {
      console.error('[SeeDance2] 查询任务状态失败:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || '查询任务状态失败');
    }
  }

  /**
   * 轮询任务直到完成或失败
   */
  async pollTaskUntilComplete(
    taskId: string,
    maxAttempts: number = 360, // 最多轮询 30 分钟（每 5 秒一次）
    intervalMs: number = 5000
  ): Promise<SeeDance2TaskResponse> {
    console.log(`[SeeDance2] 开始轮询任务 ${taskId}，最大尝试次数: ${maxAttempts}`);

    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.getTaskStatus(taskId);

      if (result.status === 'succeeded') {
        console.log(`[SeeDance2] 任务 ${taskId} 成功完成`);
        return result;
      }

      if (result.status === 'failed') {
        console.error(`[SeeDance2] 任务 ${taskId} 失败:`, result.error);
        throw new Error(result.error?.message || '视频生成失败');
      }

      if (result.status === 'expired') {
        throw new Error('任务已过期');
      }

      // 等待后继续轮询
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(`任务轮询超时（已尝试 ${maxAttempts} 次）`);
  }

  /**
   * 创建简单的文生视频任务
   */
  static createTextToVideoTask(
    prompt: string,
    options: {
      model?: SeedanceModel;
      duration?: number;
      resolution?: '480p' | '720p' | '1080p';
      ratio?: string;
      generateAudio?: boolean;
    } = {}
  ): SeeDance2TaskParams {
    return {
      model: options.model || 'doubao-seedance-2-5',
      content: [
        {
          type: 'text',
          text: prompt,
        },
      ],
      resolution: options.resolution || '720p',
      ratio: (options.ratio as any) || 'adaptive',
      duration: options.duration || -1,
      generate_audio: options.generateAudio !== false,
      watermark: false,
    };
  }

  /**
   * 创建图生视频任务（首帧）
   */
  static createImageToVideoTask(
    prompt: string,
    imageUrl: string,
    options: {
      model?: SeedanceModel;
      duration?: number;
      resolution?: '480p' | '720p' | '1080p';
      generateAudio?: boolean;
    } = {}
  ): SeeDance2TaskParams {
    return {
      model: options.model || 'doubao-seedance-2-5',
      content: [
        {
          type: 'text',
          text: prompt,
        },
        {
          type: 'image_url',
          image_url: {
            url: imageUrl,
          },
          role: 'first_frame',
        },
      ],
      resolution: options.resolution || '720p',
      ratio: 'adaptive',
      duration: options.duration || -1,
      generate_audio: options.generateAudio !== false,
      watermark: false,
    };
  }
}
