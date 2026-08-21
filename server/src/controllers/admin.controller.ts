import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../types';
import { assertGenerationAccessUpdate } from '../domain/relay-station';
import { AppError } from '../middlewares/errorHandler';
import { getPublicR2StorageConfig, saveR2StorageConfig, testR2StorageConnection } from '../services/r2-storage.service';

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const pageQuery = req.query.page;
    const limitQuery = req.query.limit;
    
    const pageNum = pageQuery && typeof pageQuery === 'string' ? parseInt(pageQuery) : 1;
    const limitNum = limitQuery && typeof limitQuery === 'string' ? parseInt(limitQuery) : 20;
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limitNum,
        select: {
          id: true,
          email: true,
          role: true,
          canGenerate: true,
          createdAt: true,
          _count: {
            select: { tasks: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateGenerationAccess = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { canGenerate } = req.body;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('用户不存在', 404);
  assertGenerationAccessUpdate(user.role, canGenerate);

  const updated = await prisma.user.update({
    where: { id },
    data: { canGenerate },
    select: { id: true, email: true, role: true, canGenerate: true },
  });
  res.json({ user: updated });
};

export const getStorageConfig = async (_req: AuthRequest, res: Response) => {
  res.json({ storage: await getPublicR2StorageConfig() });
};

export const updateStorageConfig = async (req: AuthRequest, res: Response) => {
  const { workerUrl, keyValue, clearKey } = req.body;
  if (typeof workerUrl !== 'string' || !workerUrl.trim()) throw new AppError('R2 Worker URL 为必填项', 400);
  if (keyValue !== undefined && typeof keyValue !== 'string') throw new AppError('R2 key 格式不正确', 400);
  if (clearKey !== undefined && typeof clearKey !== 'boolean') throw new AppError('clearKey 必须是布尔值', 400);
  const storage = await saveR2StorageConfig({ workerUrl, keyValue, clearKey });
  res.json({ storage });
};

export const testStorageConnection = async (_req: AuthRequest, res: Response) => {
  res.json(await testR2StorageConnection());
};
