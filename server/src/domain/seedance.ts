export type SeedanceModel =
  | 'doubao-seedance-2-5'
  | 'doubao-seedance-2-0'
  | 'doubao-seedance-2-0-fast'
  | 'doubao-seedance-2-0-mini';

export type SeedanceResolution = '480p' | '720p' | '1080p' | '4k';
export type SeedanceRatio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9' | 'adaptive';
export type SeedanceOutputFormat = 'mp4' | 'mov';
export type SeedanceOmniTaskType = 'auto' | 'reference' | 'edit' | 'extend';
export type SeedanceServiceTier = 'default' | 'flex';
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
  seed?: number;
  camera_fixed?: boolean;
  frames?: number;
  return_last_frame?: boolean;
  draft?: boolean;
  service_tier?: SeedanceServiceTier;
  callback_url?: string;
  execution_expires_after?: number;
  safety_identifier?: string;
  priority?: number;
  tools?: Array<{ type: 'web_search' }>;
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
  return_last_frame?: boolean;
  callback_url?: string;
  execution_expires_after?: number;
  safety_identifier?: string;
  priority?: number;
  tools?: Array<{ type: 'web_search' }>;
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
  if (!value) throw new Error('素材 URL 无效');

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      if (!parsed.hostname) throw new Error();
      return value;
    } catch {
      throw new Error('素材 URL 无效');
    }
  }

  if (/^asset:\/\//i.test(value)) {
    if (!/^asset:\/\/[A-Za-z0-9][A-Za-z0-9._-]*$/i.test(value)) {
      throw new Error('素材 URL 无效');
    }
    return value;
  }

  if (/^local-asset:\/\//i.test(value)) {
    if (!/^local-asset:\/\/[a-f0-9]{64}\.[a-z0-9]{1,10}$/i.test(value)) {
      throw new Error('素材 URL 无效');
    }
    return value;
  }

  if (/^data:/i.test(value)) {
    if (!/^data:(image|audio|video)\/[A-Za-z0-9.+-]+;base64,[A-Za-z0-9+/]+={0,2}$/i.test(value)) {
      throw new Error('素材 URL 无效');
    }
    return value;
  }

  throw new Error('素材必须使用 HTTP(S)、asset://、local-asset:// 或受支持的 Data URL');
};

const ensureRole = (
  role: SeedanceRole | undefined,
  allowed: readonly (SeedanceRole | undefined)[],
  message: string,
): SeedanceRole | undefined => {
  if (!allowed.includes(role)) throw new Error(message);
  return role;
};

const MODELS = Object.keys(MODEL_CAPABILITIES) as SeedanceModel[];
const RATIOS: SeedanceRatio[] = ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', 'adaptive'];
const TASK_TYPES: SeedanceOmniTaskType[] = ['auto', 'reference', 'edit', 'extend'];
const OUTPUT_FORMATS: SeedanceOutputFormat[] = ['mp4', 'mov'];

const requireBoolean = (value: unknown, name: string): boolean | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new Error(`${name} 必须是布尔值`);
  return value;
};

const requireIntegerRange = (
  value: unknown,
  name: string,
  min: number,
  max: number,
): number | undefined => {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new Error(`${name} 必须是 ${min}–${max} 之间的整数`);
  }
  return value as number;
};

const normalizeOptionalUrl = (value: unknown, name: string): string | undefined => {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string') throw new Error(`${name} 格式不正确`);
  try {
    const parsed = new URL(value.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    return parsed.toString();
  } catch {
    throw new Error(`${name} 必须是 HTTP(S) URL`);
  }
};

const rejectUnsupportedParameter = (input: SeedanceRequestInput, name: keyof SeedanceRequestInput) => {
  if (input[name] !== undefined) throw new Error(`当前模型不支持参数 ${name}`);
};

const normalizeContent = (prompt: string, content: SeedanceContent[]): SeedanceContent[] => {
  const normalized: SeedanceContent[] = [];

  if (prompt.trim()) {
    normalized.push({ type: 'text', text: prompt.trim() });
  }

  for (const item of content) {
    if (!item || typeof item !== 'object' || typeof item.type !== 'string') {
      throw new Error('参考素材格式不正确');
    }
    if (item.type === 'text') continue;
    if (!['image_url', 'video_url', 'audio_url', 'draft_task'].includes(item.type)) {
      throw new Error(`不支持的素材类型 ${item.type}`);
    }

    if (item.type === 'image_url') {
      const role = ensureRole(item.role, [undefined, 'first_frame', 'last_frame', 'reference_image'], '图片角色无效');
      normalized.push({
        type: 'image_url',
        image_url: { url: ensureMediaUrl(item.image_url?.url) },
        ...(role ? { role } : {}),
      });
      continue;
    }

    if (item.type === 'video_url') {
      const url = ensureMediaUrl(item.video_url?.url);
      ensureRole(item.role, [undefined, 'reference_video'], '视频角色无效');
      normalized.push({ type: 'video_url', video_url: { url }, role: 'reference_video' });
      continue;
    }

    if (item.type === 'audio_url') {
      ensureRole(item.role, [undefined, 'reference_audio'], '音频角色无效');
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
  if (typeof prompt !== 'string') throw new Error('提示词格式不正确');
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('参数格式不正确');
  if (input.content !== undefined && !Array.isArray(input.content)) throw new Error('content 必须是数组');

  const model = input.model ?? 'doubao-seedance-2-5';
  if (!MODELS.includes(model)) throw new Error('不支持的 Seedance 模型');
  const capability = MODEL_CAPABILITIES[model];

  rejectUnsupportedParameter(input, 'seed');
  rejectUnsupportedParameter(input, 'camera_fixed');
  rejectUnsupportedParameter(input, 'frames');
  rejectUnsupportedParameter(input, 'draft');
  rejectUnsupportedParameter(input, 'service_tier');

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
  if (images.length > 1 && images.some((item) => !item.role)) {
    throw new Error('多图片任务必须声明图片角色');
  }
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

  if (input.ratio !== undefined && !RATIOS.includes(input.ratio)) throw new Error('比例参数无效');
  if (input.omni_reference_task_type !== undefined && !TASK_TYPES.includes(input.omni_reference_task_type)) {
    throw new Error('参考任务类型无效');
  }
  if (input.output_format !== undefined && !OUTPUT_FORMATS.includes(input.output_format)) {
    throw new Error('输出格式无效');
  }

  const supportsOmniTaskType = model === 'doubao-seedance-2-5'
    && (videos.length > 0 || referenceImages.length > 0 || audios.length > 0);
  if (input.omni_reference_task_type !== undefined && !supportsOmniTaskType) {
    throw new Error('当前任务不支持 omni_reference_task_type');
  }
  const taskType = supportsOmniTaskType
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

  const generateAudio = requireBoolean(input.generate_audio, 'generate_audio') ?? true;
  const watermark = requireBoolean(input.watermark, 'watermark') ?? false;
  const returnLastFrame = requireBoolean(input.return_last_frame, 'return_last_frame');
  const callbackUrl = normalizeOptionalUrl(input.callback_url, 'callback_url');
  const executionExpiresAfter = requireIntegerRange(
    input.execution_expires_after,
    'execution_expires_after',
    3600,
    259200,
  );
  const priority = requireIntegerRange(input.priority, 'priority', 0, 9);

  let safetyIdentifier: string | undefined;
  if (input.safety_identifier !== undefined && input.safety_identifier !== '') {
    if (typeof input.safety_identifier !== 'string'
      || input.safety_identifier.length > 64
      || !/^[\x20-\x7E]+$/.test(input.safety_identifier)) {
      throw new Error('safety_identifier 必须是不超过 64 个字符的英文字符串');
    }
    safetyIdentifier = input.safety_identifier;
  }

  let tools: Array<{ type: 'web_search' }> | undefined;
  if (input.tools !== undefined) {
    if (!Array.isArray(input.tools)
      || input.tools.length === 0
      || input.tools.some((tool) => !tool || typeof tool !== 'object' || tool.type !== 'web_search')) {
      throw new Error('tools 仅支持 web_search');
    }
    tools = input.tools.map(() => ({ type: 'web_search' as const }));
  }

  return {
    model,
    content,
    ...(taskType ? { omni_reference_task_type: taskType } : {}),
    resolution,
    ratio,
    duration,
    generate_audio: generateAudio,
    watermark,
    output_format: outputFormat,
    ...(returnLastFrame !== undefined ? { return_last_frame: returnLastFrame } : {}),
    ...(callbackUrl ? { callback_url: callbackUrl } : {}),
    ...(executionExpiresAfter !== undefined ? { execution_expires_after: executionExpiresAfter } : {}),
    ...(safetyIdentifier ? { safety_identifier: safetyIdentifier } : {}),
    ...(priority !== undefined ? { priority } : {}),
    ...(tools ? { tools } : {}),
  };
};
