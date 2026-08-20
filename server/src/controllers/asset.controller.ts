import { Response } from 'express';
import { AuthRequest } from '../types';
import {
  deletePublicAsset,
  listPublicAssets,
  resolvePublicAssetFile,
  retryPublicAsset,
  savePublicAsset,
} from '../services/public-asset.service';

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
    const asset = await savePublicAsset(req.user!.userId, source, { filename: req.body?.filename });
    return res.status(201).json({ asset: publicAssetView(asset) });
  } catch (error) { return handleError(res, error); }
};

export const listPublicAssetController = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(queryValue(req.query.page) ?? '1', 10);
    const limit = parseInt(queryValue(req.query.limit) ?? '20', 10);
    const result = await listPublicAssets(page, limit, {
      contentType: queryValue(req.query.contentType), keyword: queryValue(req.query.keyword),
    });
    return res.json({ ...result, items: result.items.map(publicAssetView) });
  } catch (error) { return handleError(res, error); }
};

export const getPublicAssetFile = async (req: AuthRequest, res: Response) => {
  try {
    const asset = await resolvePublicAssetFile(paramValue(req.params.id));
    res.setHeader('Content-Type', asset.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${asset.filename.replace(/"/g, '')}"`);
    return res.sendFile(asset.filePath);
  } catch (error) { return handleError(res, error); }
};

export const retryPublicAssetController = async (req: AuthRequest, res: Response) => {
  try { return res.json({ asset: await retryPublicAsset(paramValue(req.params.id)) }); } catch (error) { return handleError(res, error); }
};

export const deletePublicAssetController = async (req: AuthRequest, res: Response) => {
  try {
    await deletePublicAsset(paramValue(req.params.id), req.user!.userId, req.user!.role);
    return res.json({ message: '公共素材已删除' });
  } catch (error) { return handleError(res, error); }
};
