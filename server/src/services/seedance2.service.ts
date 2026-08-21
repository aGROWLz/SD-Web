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
  return_last_frame?: boolean;
  callback_url?: string; // 回调地址
  execution_expires_after?: number;
  safety_identifier?: string; // 用户标识
  priority?: number; // 执行优先级 [0-9]
  tools?: Array<{ type: 'web_search' }>;
  output_format?: 'mp4' | 'mov';
  omni_reference_task_type?: 'auto' | 'reference' | 'edit' | 'extend';
}

export type SeeDance2SubmissionParams = Omit<SeeDance2TaskParams, 'model'> & { model: string };

export interface SeeDance2TaskResponse {
  id: string; // 任务 ID
  status?: 'queued' | 'running' | 'succeeded' | 'failed' | 'expired';
  video_url?: string; // 生成的视频 URL
  content?: unknown;
  error?: {
    code: string;
    message: string;
  };
  created_at?: number;
  started_at?: number;
  completed_at?: number;
  duration?: number; // 实际生成的视频时长
}

type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord | undefined => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : undefined
);

const asVideoUrl = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) return value;
  const record = asRecord(value);
  const url = record?.url;
  return typeof url === 'string' && url.trim() ? url : undefined;
};

/**
 * 中转站可能保留官方响应的包装层。当前实际响应为 content.video_url，
 * 同时兼容官方顶层和常见 data/output 包装，避免成功任务被误判为无结果。
 */
export const extractSeedanceVideoUrl = (payload: unknown): string | undefined => {
  const root = asRecord(payload);
  if (!root) return undefined;

  const content = asRecord(root.content);
  const data = asRecord(root.data);
  const dataContent = asRecord(data?.content);
  const output = asRecord(root.output);
  const outputContent = asRecord(output?.content);

  for (const candidate of [
    root.video_url,
    content?.video_url,
    data?.video_url,
    dataContent?.video_url,
    output?.video_url,
    outputContent?.video_url,
  ]) {
    const url = asVideoUrl(candidate);
    if (url) return url;
  }

  return undefined;
};

export class SeeDance2Service {
  private client: AxiosInstance;
  private queryClient: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string, baseUrl = 'https://ark.cn-beijing.volces.com/api/v3', queryBaseUrl = baseUrl) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    });
    this.queryClient = axios.create({ baseURL: queryBaseUrl, headers: this.client.defaults.headers, timeout: 120000 });
  }

  /**
   * 提交视频生成任务
   */
  async submitTask(params: SeeDance2SubmissionParams): Promise<string> {
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
      const response = await this.queryClient.get(`/contents/generations/tasks/${taskId}`);

      const payload = asRecord(response.data) || {};

      console.log(`[SeeDance2] 任务 ${taskId} 状态:`, payload.status);

      return {
        id: String(payload.id || taskId),
        status: payload.status as SeeDance2TaskResponse['status'],
        video_url: extractSeedanceVideoUrl(payload),
        content: payload.content,
        error: payload.error as SeeDance2TaskResponse['error'],
        created_at: payload.created_at as number | undefined,
        started_at: payload.started_at as number | undefined,
        completed_at: payload.completed_at as number | undefined,
        duration: payload.duration as number | undefined,
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
    maxAttempts: number = 1000, // 最多轮询 50 分钟（每 3 秒一次）
    intervalMs: number = 3000
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
