import crypto from 'crypto';
import path from 'path';
import { access, mkdir, readFile, writeFile } from 'fs/promises';

const DEFAULT_ASSET_ROOT = path.resolve(process.cwd(), 'uploads/assets');
const LOCAL_ASSET_PATTERN = /^local-asset:\/\/([a-f0-9]{64})\.([a-z0-9]{1,10})$/;
const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
export const MAX_ASSET_BYTES = 30 * 1024 * 1024;
export const MAX_TOTAL_ASSET_BYTES = 36 * 1024 * 1024;

export const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'audio/aac': 'aac',
  'audio/flac': 'flac',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/x-matroska': 'mkv',
  'video/x-msvideo': 'avi',
  'video/mpeg': 'mpeg',
};

const EXTENSION_CONTENT_TYPES = Object.fromEntries(
  Object.entries(CONTENT_TYPE_EXTENSIONS).map(([contentType, extension]) => [extension, contentType]),
) as Record<string, string>;

export interface LocalAssetOptions {
  rootDir?: string;
}

export interface LocalAsset {
  uri: string;
  filePath: string;
  filename: string;
  contentType: string;
  bytes: Buffer;
}

export type LocalAssetFile = Omit<LocalAsset, 'bytes'>;

const assertUserId = (userId: string): void => {
  if (!USER_ID_PATTERN.test(userId)) throw new Error('用户素材目录无效');
};

export const parseDataUrl = (source: string): { contentType: string; extension: string; bytes: Buffer } => {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=]*)$/i.exec(source);
  if (!match) throw new Error('本地素材 Data URL 无效');
  const encoded = match[2];
  if (!encoded || encoded.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    throw new Error('本地素材 Data URL 无效');
  }
  const contentType = match[1].toLowerCase();
  const extension = CONTENT_TYPE_EXTENSIONS[contentType];
  if (!extension) throw new Error(`不支持的本地素材类型：${contentType}`);
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length === 0) throw new Error('本地素材内容为空');
  return { contentType, extension, bytes };
};

export const saveDataUrlAsset = async (
  userId: string,
  source: string,
  options: LocalAssetOptions = {},
): Promise<LocalAsset> => {
  assertUserId(userId);
  const { contentType, extension, bytes } = parseDataUrl(source);
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  const filename = `${hash}.${extension}`;
  const userDir = path.join(options.rootDir ?? DEFAULT_ASSET_ROOT, userId);
  const filePath = path.join(userDir, filename);
  await mkdir(userDir, { recursive: true });
  try {
    await writeFile(filePath, bytes, { flag: 'wx' });
  } catch (error: any) {
    if (error?.code !== 'EEXIST') throw error;
  }
  return { uri: `local-asset://${filename}`, filePath, filename, contentType, bytes };
};

export const resolveLocalAssetFile = async (
  userId: string,
  uri: string,
  options: LocalAssetOptions = {},
): Promise<LocalAssetFile> => {
  assertUserId(userId);
  const match = LOCAL_ASSET_PATTERN.exec(uri);
  if (!match) throw new Error('本地素材引用无效');
  const filename = `${match[1]}.${match[2]}`;
  const contentType = EXTENSION_CONTENT_TYPES[match[2]];
  if (!contentType) throw new Error('本地素材引用无效');
  const filePath = path.join(options.rootDir ?? DEFAULT_ASSET_ROOT, userId, filename);
  try {
    await access(filePath);
  } catch {
    throw new Error('本地素材不存在，请重新选择文件');
  }
  return { uri, filePath, filename, contentType };
};

export const resolveLocalAsset = async (
  userId: string,
  uri: string,
  options: LocalAssetOptions = {},
): Promise<LocalAsset> => {
  const asset = await resolveLocalAssetFile(userId, uri, options);
  const bytes = await readFile(asset.filePath);
  return { ...asset, bytes };
};

const mediaUrlKey = (entry: Record<string, any>): 'image_url' | 'audio_url' | 'video_url' | undefined =>
  (['image_url', 'audio_url', 'video_url'] as const).find((key) => typeof entry[key]?.url === 'string');

export const persistLocalAssetParams = async <T extends { content?: unknown[] }>(
  params: T,
  userId: string,
  options: LocalAssetOptions = {},
): Promise<T> => {
  if (!Array.isArray(params.content)) return params;
  let totalBytes = 0;
  for (const item of params.content) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as Record<string, any>;
    const key = mediaUrlKey(entry);
    const source = key ? entry[key]?.url : undefined;
    if (typeof source === 'string' && source.startsWith('data:')) {
      const parsed = parseDataUrl(source);
      if (parsed.bytes.length > MAX_ASSET_BYTES) throw new Error('单个素材不能超过 30 MB');
      totalBytes += parsed.bytes.length;
    }
  }
  if (totalBytes > MAX_TOTAL_ASSET_BYTES) throw new Error('素材总大小不能超过 36 MB');

  const content = await Promise.all(params.content.map(async (item) => {
    if (!item || typeof item !== 'object') return item;
    const entry = item as Record<string, any>;
    const key = mediaUrlKey(entry);
    const source = key ? entry[key]?.url : undefined;
    if (!key || typeof source !== 'string' || !source.startsWith('data:')) return item;
    const asset = await saveDataUrlAsset(userId, source, options);
    return { ...entry, [key]: { ...entry[key], url: asset.uri } };
  }));
  return { ...params, content };
};

export interface MaterializeLocalAssetOptions extends LocalAssetOptions {
  configured: boolean;
  upload: (bytes: Buffer, filename: string, contentType: string) => Promise<string>;
}

export const materializeLocalAssetParams = async <T extends { content?: unknown[] }>(
  params: T,
  userId: string,
  options: MaterializeLocalAssetOptions,
): Promise<T> => {
  if (!Array.isArray(params.content)) return params;
  const content = await Promise.all(params.content.map(async (item, index) => {
    if (!item || typeof item !== 'object') return item;
    const entry = item as Record<string, any>;
    const key = mediaUrlKey(entry);
    const source = key ? entry[key]?.url : undefined;
    if (!key || typeof source !== 'string' || !source.startsWith('local-asset://')) return item;
    const asset = await resolveLocalAsset(userId, source, options);
    if (!options.configured) {
      if (key !== 'image_url') throw new Error('本地音频和视频需要先配置 R2');
      const dataUrl = `data:${asset.contentType};base64,${asset.bytes.toString('base64')}`;
      return { ...entry, [key]: { ...entry[key], url: dataUrl } };
    }
    const kind = key.replace('_url', '');
    const extension = path.extname(asset.filename);
    const publicUrl = await options.upload(
      asset.bytes,
      `seedance-${kind}-${index}-${crypto.randomUUID()}${extension}`,
      asset.contentType,
    );
    return { ...entry, [key]: { ...entry[key], url: publicUrl } };
  }));
  return { ...params, content };
};
