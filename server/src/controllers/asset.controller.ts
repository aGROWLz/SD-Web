import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../types';
import {
  deletePublicAsset,
  listPublicAssets,
  resolvePublicAssetFile,
  resolvePublicAssetFileByProviderId,
  retryPublicAsset,
  savePublicAsset,
  processPublicAssetProvider,
  queryPublicAssetProvider,
} from '../services/public-asset.service';
import { normalizeAssetLibraryConfig } from '../domain/relay-station';

const queryValue = (value: unknown): string | undefined => Array.isArray(value) ? String(value[0]) : typeof value === 'string' ? value : undefined;
const paramValue = (value: unknown): string => Array.isArray(value) ? String(value[0]) : String(value ?? '');

const publicAssetView = (asset: any) => {
  const { localPath: _localPath, ...safeAsset } = asset;
  return { ...safeAsset, previewUrl: `/api/assets/${asset.id}/file` };
};

const handleError = (res: Response, error: any) => {
  const status = error?.statusCode ?? (error?.message?.includes('不存在') ? 404 : 400);
  return res.status(status).json({ error: error?.message ?? '操作失败' });
};

export const createPublicAsset = async (req: AuthRequest, res: Response) => {
  try {
    const source = req.body?.source ?? req.body?.dataUrl;
    if (typeof source !== 'string' || !source.trim()) return res.status(400).json({ error: 'source 或 dataUrl 为必填项' });
    const saved = await savePublicAsset(req.user!.userId, source, { filename: req.body?.filename });
    // 等待 R2 和素材库注册完成，这样客户端可以立即拿到 providerAssetId 并使用 asset:// 引用。
    const asset = process.env.NODE_ENV === 'test'
      ? saved
      : await processPublicAssetProvider(saved.id);
    return res.status(201).json({ asset: publicAssetView(asset) });
  } catch (error) { return handleError(res, error); }
};

export const listPublicAssetController = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(queryValue(req.query.page) ?? '1', 10);
    const limit = parseInt(queryValue(req.query.limit) ?? '20', 10);
    const primary = await (prisma as any).relayStation.findFirst({ where: { isActive: true, isPrimary: true } });
    const primaryProvider = primary ? normalizeAssetLibraryConfig(primary.assetLibraryConfig)?.provider : undefined;
    const result = await listPublicAssets(page, limit, {
      contentType: queryValue(req.query.contentType), keyword: queryValue(req.query.keyword), providerLibrary: primaryProvider,
    });
    return res.json({ ...result, items: result.items.map(publicAssetView) });
  } catch (error) { return handleError(res, error); }
};

export const getPublicAssetFile = async (req: AuthRequest, res: Response) => {
  try {
    const asset = await resolvePublicAssetFile(paramValue(req.params.id));
    res.setHeader('Content-Type', asset.contentType);
    const fallbackName = asset.filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '') || 'asset';
    res.setHeader('Content-Disposition', `inline; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(asset.filename)}`);
    return res.sendFile(asset.filePath);
  } catch (error) { return handleError(res, error); }
};

export const getPublicAssetFileByProviderId = async (req: AuthRequest, res: Response) => {
  try {
    const asset = await resolvePublicAssetFileByProviderId(paramValue(req.params.providerId));
    res.setHeader('Content-Type', asset.contentType);
    return res.sendFile(asset.filePath);
  } catch (error) { return handleError(res, error); }
};

export const retryPublicAssetController = async (req: AuthRequest, res: Response) => {
  try {
    const reset = await retryPublicAsset(paramValue(req.params.id), req.user!.userId, req.user!.role);
    const asset = typeof processPublicAssetProvider === 'function'
      ? await processPublicAssetProvider(reset.id)
      : reset;
    return res.json({ asset: publicAssetView(asset) });
  } catch (error) { return handleError(res, error); }
};

export const refreshPublicAssetStatuses = async (_req: AuthRequest, res: Response) => {
  try {
    const result = await listPublicAssets(1, 100);
    const assets = await Promise.all(result.items.map((asset: any) => queryPublicAssetProvider(asset.id)));
    return res.json({ items: assets.map(publicAssetView) });
  } catch (error) { return handleError(res, error); }
};

export const deletePublicAssetController = async (req: AuthRequest, res: Response) => {
  try {
    await deletePublicAsset(paramValue(req.params.id), req.user!.userId, req.user!.role);
    return res.json({ message: '公共素材已删除' });
  } catch (error) { return handleError(res, error); }
};
