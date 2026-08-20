import crypto from 'crypto';
import path from 'path';
import { access, mkdir, unlink, writeFile } from 'fs/promises';
import prisma from '../lib/prisma';
import { MAX_ASSET_BYTES, CONTENT_TYPE_EXTENSIONS, parseDataUrl } from './local-asset.service';

const DEFAULT_ASSET_ROOT = path.resolve(process.cwd(), 'uploads/assets');
const SHARED_DIRNAME = 'shared';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PublicAssetOptions {
  rootDir?: string;
  filename?: string;
}

export interface PublicAssetFilters {
  contentType?: string;
  keyword?: string;
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

  try {
    return await db.publicAsset.create({
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

export const listPublicAssets = async (page = 1, limit = 20, filters: PublicAssetFilters = {}) => {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 20;
  const where: any = {};
  if (filters.contentType) where.contentType = filters.contentType;
  if (filters.keyword) where.filename = { contains: filters.keyword, mode: 'insensitive' };
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

export const retryPublicAsset = async (id: string) => {
  const asset = await db.publicAsset.findUnique({ where: { id } });
  if (!asset) throw new Error('公共素材不存在');
  return db.publicAsset.update({ where: { id }, data: { providerStatus: 'PENDING', providerError: null } });
};
