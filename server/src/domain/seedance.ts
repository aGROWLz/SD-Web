export type SeedanceModel =
  | 'doubao-seedance-2-5'
  | 'doubao-seedance-2-0'
  | 'doubao-seedance-2-0-fast'
  | 'doubao-seedance-2-0-mini';

export type SeedanceResolution = '480p' | '720p' | '1080p' | '4k';
export type SeedanceRatio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9' | 'adaptive';
export type SeedanceOutputFormat = 'mp4' | 'mov';
export type SeedanceOmniTaskType = 'auto' | 'reference' | 'edit' | 'extend';
export type SeedanceRole =
  | 'first_frame'
  | 'last_frame'
  | 'reference_image'
  | 'reference_video'
  | 'reference_audio';

export interface SeedanceContent {
  type: 'text' | 'image_url' | 'video_url' | 'audio_url' | 'draft_task';
  text?: string;
  image_url?: { url: string };
  video_url?: { url: string };
  audio_url?: { url: string };
  draft_task?: { id: string };
  role?: SeedanceRole;
}

export interface SeedanceRequestInput {
  model?: SeedanceModel;
  content?: SeedanceContent[];
  omni_reference_task_type?: SeedanceOmniTaskType;
  resolution?: SeedanceResolution;
  ratio?: SeedanceRatio;
  duration?: number;
  generate_audio?: boolean;
  watermark?: boolean;
  output_format?: SeedanceOutputFormat;
}

export interface SeedanceRequest {
  model: SeedanceModel;
  content: SeedanceContent[];
  omni_reference_task_type?: SeedanceOmniTaskType;
  resolution: SeedanceResolution;
  ratio: SeedanceRatio;
  duration: number;
  generate_audio: boolean;
  watermark: boolean;
  output_format: SeedanceOutputFormat;
}

interface ModelCapability {
  resolutions: readonly SeedanceResolution[];
  minDuration: number;
  maxDuration: number;
  maxImages: number;
  maxVideos: number;
  maxAudios: number;
}

export const MODEL_CAPABILITIES: Record<SeedanceModel, ModelCapability> = {
  'doubao-seedance-2-5': {
    resolutions: ['480p', '720p', '1080p'],
    minDuration: 4,
    maxDuration: 30,
    maxImages: 30,
    maxVideos: 10,
    maxAudios: 10,
  },
  'doubao-seedance-2-0': {
    resolutions: ['480p', '720p', '1080p', '4k'],
    minDuration: 4,
    maxDuration: 15,
    maxImages: 9,
    maxVideos: 3,
    maxAudios: 3,
  },
  'doubao-seedance-2-0-fast': {
    resolutions: ['480p', '720p'],
    minDuration: 4,
    maxDuration: 15,
    maxImages: 9,
    maxVideos: 3,
    maxAudios: 3,
  },
  'doubao-seedance-2-0-mini': {
    resolutions: ['480p', '720p'],
    minDuration: 4,
    maxDuration: 15,
    maxImages: 9,
    maxVideos: 3,
    maxAudios: 3,
  },
};

const ensureMediaUrl = (url: string | undefined): string => {
  const value = url?.trim();
  if (!value || !/^(https?:\/\/|asset:\/\/|data:(image|audio)\/)/i.test(value)) {
    throw new Error('素材必须使用 HTTP(S)、asset:// 或受支持的 Data URL');
  }
  return value;
};

const normalizeContent = (prompt: string, content: SeedanceContent[]): SeedanceContent[] => {
  const normalized: SeedanceContent[] = [];

  if (prompt.trim()) {
    normalized.push({ type: 'text', text: prompt.trim() });
  }

  for (const item of content) {
    if (item.type === 'text') continue;

    if (item.type === 'image_url') {
      normalized.push({
        type: 'image_url',
        image_url: { url: ensureMediaUrl(item.image_url?.url) },
        role: item.role,
      });
      continue;
    }

    if (item.type === 'video_url') {
      const url = ensureMediaUrl(item.video_url?.url);
      if (url.startsWith('data:')) throw new Error('视频仅支持 HTTP(S) URL 或 asset:// 素材 ID');
      normalized.push({ type: 'video_url', video_url: { url }, role: 'reference_video' });
      continue;
    }

    if (item.type === 'audio_url') {
      normalized.push({
        type: 'audio_url',
        audio_url: { url: ensureMediaUrl(item.audio_url?.url) },
        role: 'reference_audio',
      });
      continue;
    }

    const id = item.draft_task?.id?.trim();
    if (!id) throw new Error('请输入有效的样片任务 ID');
    normalized.push({ type: 'draft_task', draft_task: { id } });
  }

  return normalized;
};

export const normalizeSeedanceRequest = (
  prompt: string,
  input: SeedanceRequestInput,
): SeedanceRequest => {
  const model = input.model ?? 'doubao-seedance-2-5';
  const capability = MODEL_CAPABILITIES[model];
  if (!capability) throw new Error('不支持的 Seedance 模型');

  const content = normalizeContent(prompt, input.content ?? []);
  if (content.length === 0) throw new Error('提示词或参考素材至少需要填写一项');

  const drafts = content.filter((item) => item.type === 'draft_task');
  if (drafts.length > 0 && (drafts.length !== 1 || content.length !== 1)) {
    throw new Error('样片任务不能与其他内容混用');
  }

  const images = content.filter((item) => item.type === 'image_url');
  const videos = content.filter((item) => item.type === 'video_url');
  const audios = content.filter((item) => item.type === 'audio_url');
  if (images.length > capability.maxImages) throw new Error(`该模型最多支持 ${capability.maxImages} 张图片`);
  if (videos.length > capability.maxVideos) throw new Error(`该模型最多支持 ${capability.maxVideos} 个视频`);
  if (audios.length > capability.maxAudios) throw new Error(`该模型最多支持 ${capability.maxAudios} 个音频`);

  const frameImages = images.filter((item) => ['first_frame', 'last_frame'].includes(item.role ?? ''));
  const referenceImages = images.filter((item) => item.role === 'reference_image');
  if (frameImages.length > 0 && (referenceImages.length > 0 || videos.length > 0 || audios.length > 0)) {
    throw new Error('首帧/首尾帧不能与参考素材混用');
  }

  const firstFrames = images.filter((item) => item.role === 'first_frame');
  const lastFrames = images.filter((item) => item.role === 'last_frame');
  if (firstFrames.length > 1 || lastFrames.length > 1 || (lastFrames.length > 0 && firstFrames.length === 0)) {
    throw new Error('首尾帧素材组合无效');
  }

  if (model !== 'doubao-seedance-2-5' && audios.length > 0 && images.length === 0 && videos.length === 0) {
    throw new Error('Seedance 2.0 不能仅使用音频');
  }

  const resolution = input.resolution ?? '720p';
  if (!capability.resolutions.includes(resolution)) {
    throw new Error(`该模型不支持 ${resolution}`);
  }

  const taskType = model === 'doubao-seedance-2-5' && (videos.length > 0 || referenceImages.length > 0 || audios.length > 0)
    ? input.omni_reference_task_type ?? 'auto'
    : undefined;
  let ratio = input.ratio ?? 'adaptive';
  let duration = input.duration ?? -1;

  if (model === 'doubao-seedance-2-5' && frameImages.length > 0) ratio = 'adaptive';
  if (taskType === 'edit') {
    if (videos.length === 0) throw new Error('视频编辑任务至少需要一个参考视频');
    ratio = 'adaptive';
    duration = -1;
  }
  if (taskType === 'extend') {
    if (videos.length === 0) throw new Error('视频延长任务至少需要一个参考视频');
    ratio = 'adaptive';
  }

  if (duration !== -1 && (!Number.isInteger(duration)
    || duration < capability.minDuration
    || duration > capability.maxDuration)) {
    throw new Error(`该模型时长应为自动或 ${capability.minDuration}–${capability.maxDuration} 秒`);
  }

  const outputFormat = input.output_format ?? 'mp4';
  if (outputFormat === 'mov' && model !== 'doubao-seedance-2-5') {
    throw new Error('仅 Seedance 2.5 支持 MOV 输出');
  }

  return {
    model,
    content,
    ...(taskType ? { omni_reference_task_type: taskType } : {}),
    resolution,
    ratio,
    duration,
    generate_audio: input.generate_audio ?? true,
    watermark: input.watermark ?? false,
    output_format: outputFormat,
  };
};
