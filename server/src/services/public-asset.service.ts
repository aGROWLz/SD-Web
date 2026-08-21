import crypto from 'crypto';
import path from 'path';
import { access, mkdir, unlink, writeFile, readFile } from 'fs/promises';
import prisma from '../lib/prisma';
import { MAX_ASSET_BYTES, CONTENT_TYPE_EXTENSIONS, parseDataUrl } from './local-asset.service';
import { getR2StorageConfig, uploadBytesToWorker } from './r2-storage.service';
import { uploadAsset, queryAsset, AssetLibraryError } from './asset-library.service';
import { KeyEncryptionService } from './key-encryption.service';
import { normalizeAssetLibraryConfig, AssetLibraryConfig } from '../domain/relay-station';

const DEFAULT_ASSET_ROOT = path.resolve(process.cwd(), 'uploads/assets');
const SHARED_DIRNAME = 'shared';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PublicAssetOptions {
  rootDir?: string;
  filename?: string;
  processProvider?: boolean;
}

export interface PublicAssetFilters {
  contentType?: string;
  keyword?: string;
  providerLibrary?: string;
}

const db = prisma as any;

const sharedRoot = (rootDir?: string) => path.join(rootDir ?? DEFAULT_ASSET_ROOT, SHARED_DIRNAME);

const normalizeFilename = (filename: string | undefined, extension: string): string => {
  const base = typeof filename === 'string' && filename.trim() ? path.basename(filename.trim()) : `asset.${extension}`;
  return path.extname(base) ? base : `${base}.${extension}`;
};

const assertOwnerId = (ownerId: string) => {
  if (!ownerId || typeof ownerId !== 'string' || !UUID_PATTERN.test(ownerId) && !/^[A-Za-z0-9_-]{1,128}$/.test(ownerId)) {
    throw new Error('用户 ID 无效');
  }
};

export const savePublicAsset = async (ownerId: string, source: string, options: PublicAssetOptions = {}) => {
  assertOwnerId(ownerId);
  if (typeof source !== 'string' || !source.trim()) throw new Error('公共素材 Data URL 不能为空');
  const parsed = parseDataUrl(source);
  if (parsed.bytes.length > MAX_ASSET_BYTES) throw new Error('单个素材不能超过 30 MB');
  const contentHash = crypto.createHash('sha256').update(parsed.bytes).digest('hex');
  const extension = CONTENT_TYPE_EXTENSIONS[parsed.contentType];
  const filename = normalizeFilename(options.filename, extension);
  const filePath = path.join(sharedRoot(options.rootDir), `${contentHash}.${extension}`);
  const localPath = path.relative(options.rootDir ?? process.cwd(), filePath).replace(/\\/g, '/');

  await mkdir(path.dirname(filePath), { recursive: true });
  try {
    await writeFile(filePath, parsed.bytes, { flag: 'wx' });
  } catch (error: any) {
    if (error?.code !== 'EEXIST') throw error;
  }

  // Avoid turning normal re-uploads of the same file into noisy unique-key errors.
  const duplicate = await db.publicAsset.findUnique({
    where: { contentHash },
    include: { owner: { select: { id: true, email: true } } },
  });
  if (duplicate) return duplicate;

  try {
    const created = await db.publicAsset.create({
      data: {
        ownerId,
        filename,
        contentType: parsed.contentType,
        bytes: parsed.bytes.length,
        contentHash,
        localPath,
        providerStatus: 'PENDING',
      },
      include: { owner: { select: { id: true, email: true } } },
    });
    return options.processProvider ? processPublicAssetProvider(created.id, { rootDir: options.rootDir }) : created;
  } catch (error: any) {
    if (error?.code !== 'P2002') throw error;
    const existing = await db.publicAsset.findUnique({
      where: { contentHash },
      include: { owner: { select: { id: true, email: true } } },
    });
    if (!existing) throw error;
    if (existing.localPath !== localPath) {
      try { await unlink(filePath); } catch (unlinkError: any) {
        if (unlinkError?.code !== 'ENOENT') console.error('清理重复公共素材文件失败', unlinkError);
      }
    }
    return existing;
  }
};

export interface PublicAssetProviderOptions {
  rootDir?: string;
  fetchImpl?: typeof fetch;
  r2Config?: { workerUrl: string; apiKey: string; configured: boolean };
  relayStation?: { apiKeyEncrypted: string; assetLibraryConfig?: unknown } | null;
}

const providerErrorMessage = (error: any): string => error instanceof AssetLibraryError
  ? error.message : (error?.message || '素材库注册失败');

/** Uploads the local file to R2 first, then registers it with the current primary station. */
export const processPublicAssetProvider = async (id: string, options: PublicAssetProviderOptions = {}) => {
  const asset = await db.publicAsset.findUnique({ where: { id } });
  if (!asset) throw new Error('公共素材不存在');
  const root = path.resolve(options.rootDir ?? process.cwd());
  const filePath = path.resolve(root, asset.localPath);
  const bytes = await readFile(filePath);
  const r2 = options.r2Config ?? await getR2StorageConfig();
  let providerUrl: string | undefined;
  let station = options.relayStation;
  if (station === undefined) station = await db.relayStation.findFirst({ where: { isActive: true, isPrimary: true } });
  const config = station ? normalizeAssetLibraryConfig(station.assetLibraryConfig) : null;

  try {
    if (r2.configured) {
      providerUrl = await uploadBytesToWorker(r2.workerUrl, r2.apiKey, bytes, asset.filename, asset.contentType, options.fetchImpl);
    } else if (asset.contentType.startsWith('image/')) {
      providerUrl = `data:${asset.contentType};base64,${bytes.toString('base64')}`;
    } else {
      return db.publicAsset.update({ where: { id }, data: { providerStatus: 'FAILED', providerError: '音频和视频素材需要先配置 R2' } });
    }

    if (!config?.enabled || !station) {
      return db.publicAsset.update({ where: { id }, data: { providerUrl, providerStatus: 'PENDING', providerError: null } });
    }
    const key = KeyEncryptionService.decrypt(station.apiKeyEncrypted);
    const result = await uploadAsset(config, key, { publicUrl: providerUrl, filename: asset.filename, contentType: asset.contentType }, options.fetchImpl);
    return db.publicAsset.update({ where: { id }, data: { providerUrl: providerUrl, providerAssetId: result.id, providerLibrary: config.provider, providerStatus: result.status === 'Active' ? 'ACTIVE' : result.status === 'Failed' ? 'FAILED' : 'PENDING', providerError: null } });
  } catch (error) {
    return db.publicAsset.update({ where: { id }, data: { providerUrl: providerUrl ?? null, providerStatus: 'FAILED', providerError: providerErrorMessage(error) } });
  }
};

export const queryPublicAssetProvider = async (id: string, options: PublicAssetProviderOptions = {}) => {
  const asset = await db.publicAsset.findUnique({ where: { id } });
  if (!asset) throw new Error('公共素材不存在');
  if (!asset.providerAssetId) return asset;
  let station = options.relayStation;
  if (station === undefined && asset.providerLibrary) {
    const stations = await db.relayStation.findMany({ where: { isActive: true } });
    station = stations.find((candidate: any) => normalizeAssetLibraryConfig(candidate.assetLibraryConfig)?.provider === asset.providerLibrary) ?? null;
  }
  if (station === undefined) station = await db.relayStation.findFirst({ where: { isActive: true, isPrimary: true } });
  const config = station ? normalizeAssetLibraryConfig(station.assetLibraryConfig) : null;
  if (!config?.enabled || !station) return asset;
  try {
    const result = await queryAsset(config, KeyEncryptionService.decrypt(station.apiKeyEncrypted), asset.providerAssetId, options.fetchImpl);
    return db.publicAsset.update({ where: { id }, data: { providerLibrary: asset.providerLibrary || config.provider, providerStatus: result.status === 'Active' ? 'ACTIVE' : result.status === 'Failed' ? 'FAILED' : 'PENDING', providerError: null, ...(result.url ? { providerUrl: result.url } : {}) } });
  } catch (error) {
    return db.publicAsset.update({ where: { id }, data: { providerStatus: 'FAILED', providerError: providerErrorMessage(error) } });
  }
};

export const listPublicAssets = async (page = 1, limit = 20, filters: PublicAssetFilters = {}) => {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 20;
  const where: any = {};
  if (filters.contentType) where.contentType = filters.contentType;
  if (filters.keyword) where.filename = { contains: filters.keyword, mode: 'insensitive' };
  if (filters.providerLibrary) where.providerLibrary = filters.providerLibrary;
  const [items, total] = await Promise.all([
    db.publicAsset.findMany({
      where,
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      orderBy: { createdAt: 'desc' },
      include: { owner: { select: { id: true, email: true } } },
    }),
    db.publicAsset.count({ where }),
  ]);
  return { items, total, page: safePage, limit: safeLimit };
};

export const resolvePublicAssetFile = async (id: string, options: PublicAssetOptions = {}) => {
  const asset = await db.publicAsset.findUnique({ where: { id } });
  if (!asset) throw new Error('公共素材不存在');
  const root = path.resolve(options.rootDir ?? process.cwd());
  const filePath = path.resolve(root, asset.localPath);
  if (!filePath.startsWith(`${root}${path.sep}`)) throw new Error('公共素材路径无效');
  try {
    await access(filePath);
  } catch {
    throw new Error('公共素材文件不存在');
  }
  return { ...asset, filePath };
};

export const resolvePublicAssetFileByProviderId = async (providerAssetId: string, options: PublicAssetOptions = {}) => {
  const asset = await db.publicAsset.findFirst({ where: { providerAssetId } });
  if (!asset) throw new Error('公共素材不存在');
  const root = path.resolve(options.rootDir ?? process.cwd());
  const filePath = path.resolve(root, asset.localPath);
  if (!filePath.startsWith(`${root}${path.sep}`)) throw new Error('公共素材路径无效');
  try { await access(filePath); } catch { throw new Error('公共素材文件不存在'); }
  return { ...asset, filePath };
};

export const deletePublicAsset = async (id: string, requesterId: string, role: string, options: PublicAssetOptions = {}) => {
  const asset = await db.publicAsset.findUnique({ where: { id } });
  if (!asset) throw new Error('公共素材不存在');
  if (asset.ownerId !== requesterId && role !== 'ADMIN') {
    const error: any = new Error('无权删除该公共素材');
    error.statusCode = 403;
    throw error;
  }
  const deleted = await db.publicAsset.delete({ where: { id } });
  const references = await db.publicAsset.count({ where: { OR: [{ contentHash: asset.contentHash }, { localPath: asset.localPath }] } });
  if (references === 0) {
    const root = path.resolve(options.rootDir ?? process.cwd());
    const filePath = path.resolve(root, asset.localPath);
    if (filePath.startsWith(`${root}${path.sep}`)) {
      try { await unlink(filePath); } catch (error: any) { if (error?.code !== 'ENOENT') console.error('删除公共素材文件失败', error); }
    }
  }
  return deleted;
};

export const retryPublicAsset = async (id: string, requesterId?: string, role?: string, options: PublicAssetProviderOptions = {}) => {
  const asset = await db.publicAsset.findUnique({ where: { id } });
  if (!asset) throw new Error('公共素材不存在');
  if (requesterId && asset.ownerId !== requesterId && role !== 'ADMIN') {
    const error: any = new Error('无权重试该公共素材');
    error.statusCode = 403;
    throw error;
  }
  return db.publicAsset.update({ where: { id }, data: { providerStatus: 'PENDING', providerError: null } });
};
