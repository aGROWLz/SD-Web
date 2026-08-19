import prisma from '../lib/prisma';
import { KeyEncryptionService } from './key-encryption.service';

const DEFAULT_SETTING_ID = 'default';

export interface R2StorageConfig {
  workerUrl: string;
  apiKey: string;
  configured: boolean;
}

export interface R2StoragePublicConfig {
  workerUrl: string;
  configured: boolean;
  keyMasked: string;
}

export interface SaveR2StorageInput {
  workerUrl: string;
  keyValue?: string;
  clearKey?: boolean;
}

export const parseDataUrl = (value: string): { contentType: string; bytes: Buffer } => {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/i.exec(value);
  if (!match) throw new Error('仅支持 Base64 Data URL');
  return { contentType: match[1].toLowerCase(), bytes: Buffer.from(match[2], 'base64') };
};

export const buildWorkerUploadUrl = (workerUrl: string, filename: string, apiKey: string): string => {
  const baseUrl = workerUrl.trim().replace(/\/+$/, '');
  return `${baseUrl}/get-upload-url?file=${encodeURIComponent(filename)}&api_key=${encodeURIComponent(apiKey)}`;
};

export const maskStorageKey = (key: string): string => {
  if (key.length <= 8) return '••••••••';
  return `${'•'.repeat(Math.min(12, key.length - 3))}${key.slice(-3)}`;
};

const normalizeWorkerUrl = (workerUrl: string): string => {
  const value = workerUrl.trim().replace(/\/+$/, '');
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('R2 Worker URL 必须是 HTTP(S) 地址');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('R2 Worker URL 必须是 HTTP(S) 地址');
  return value;
};

export const getR2StorageConfig = async (): Promise<R2StorageConfig> => {
  const setting = await prisma.storageSetting.findUnique({ where: { id: DEFAULT_SETTING_ID } });
  const apiKey = setting?.keyEncrypted ? KeyEncryptionService.decrypt(setting.keyEncrypted) : '';
  const workerUrl = setting?.workerUrl || '';
  return { workerUrl, apiKey, configured: Boolean(workerUrl && apiKey) };
};

export const getPublicR2StorageConfig = async (): Promise<R2StoragePublicConfig> => {
  const config = await getR2StorageConfig();
  return { workerUrl: config.workerUrl, configured: config.configured, keyMasked: config.apiKey ? maskStorageKey(config.apiKey) : '' };
};

export const saveR2StorageConfig = async (input: SaveR2StorageInput): Promise<R2StoragePublicConfig> => {
  const workerUrl = normalizeWorkerUrl(input.workerUrl);
  const existing = await prisma.storageSetting.findUnique({ where: { id: DEFAULT_SETTING_ID } });
  const data: { workerUrl: string; keyEncrypted?: string | null } = { workerUrl };
  if (input.clearKey) data.keyEncrypted = null;
  else if (input.keyValue?.trim()) data.keyEncrypted = KeyEncryptionService.encrypt(input.keyValue.trim());

  await prisma.storageSetting.upsert({
    where: { id: DEFAULT_SETTING_ID },
    create: { id: DEFAULT_SETTING_ID, workerUrl, keyEncrypted: data.keyEncrypted ?? null },
    update: existing && data.keyEncrypted === undefined ? { workerUrl } : data,
  });
  return getPublicR2StorageConfig();
};

export const uploadDataUrlToR2 = async (
  source: string,
  filename: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> => {
  const config = await getR2StorageConfig();
  if (!config.configured) throw new Error('管理员尚未配置 R2 素材存储');
  const { contentType, bytes } = parseDataUrl(source);
  const response = await fetchImpl(buildWorkerUploadUrl(config.workerUrl, filename, config.apiKey));
  if (!response.ok) throw new Error(`R2 Worker 获取上传地址失败（${response.status}）`);
  const uploadData = await response.json() as { uploadUrl?: string; publicUrl?: string };
  if (!uploadData.uploadUrl || !uploadData.publicUrl) throw new Error('R2 Worker 返回的上传地址不完整');
  const uploadResponse = await fetchImpl(uploadData.uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: bytes });
  if (!uploadResponse.ok) throw new Error(`R2 上传失败（${uploadResponse.status}）`);
  return uploadData.publicUrl;
};

export interface PrepareUploadOptions {
  configured: boolean;
  upload: (source: string, filename: string) => Promise<string>;
}

const extensionForContentType = (contentType: string): string => {
  const extension = contentType.split('/')[1]?.split('+')[0] || 'bin';
  return extension === 'jpeg' ? 'jpg' : extension;
};

export const prepareSeedanceParams = async <T extends { content?: unknown[] }>(
  params: T,
  options: PrepareUploadOptions,
): Promise<T> => {
  if (!Array.isArray(params.content)) return params;
  const content = await Promise.all(params.content.map(async (item, index) => {
    if (!item || typeof item !== 'object') return item;
    const entry = item as Record<string, any>;
    const mediaKey = ['image_url', 'audio_url', 'video_url'].find((key) => entry[key]?.url?.startsWith('data:'));
    if (!mediaKey) return item;
    const source = entry[mediaKey].url as string;
    if (!options.configured) {
      if (mediaKey === 'audio_url' || mediaKey === 'video_url') throw new Error('本地音频和视频需要先配置 R2');
      return item;
    }
    const { contentType } = parseDataUrl(source);
    const kind = mediaKey.replace('_url', '');
    const filename = `seedance-${kind}-${index}.${extensionForContentType(contentType)}`;
    const publicUrl = await options.upload(source, filename);
    return { ...entry, [mediaKey]: { ...entry[mediaKey], url: publicUrl } };
  }));
  return { ...params, content };
};
