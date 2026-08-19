import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../types';
import { KeyEncryptionService } from '../services/key-encryption.service';
import { assertGenerationAccessUpdate } from '../domain/relay-station';
import { AppError } from '../middlewares/errorHandler';

export const getPlatformKeys = async (req: AuthRequest, res: Response) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { type: 'PLATFORM' },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
        rateLimit: true,
        createdAt: true,
      },
    });

    res.json({ keys });
  } catch (error) {
    console.error('Get platform keys error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addPlatformKey = async (req: AuthRequest, res: Response) => {
  try {
    const { name, keyValue, rateLimit = 60 } = req.body;

    if (!name || !keyValue) {
      return res.status(400).json({ error: 'Name and key value are required' });
    }

    const encryptedKey = KeyEncryptionService.encrypt(keyValue);

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        keyValue: encryptedKey,
        type: 'PLATFORM',
        ownerId: null,
        rateLimit,
      },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
        rateLimit: true,
        createdAt: true,
      },
    });

    res.status(201).json({ key: apiKey });
  } catch (error) {
    console.error('Add platform key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateKeyStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const { isActive } = req.body;

    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid key ID' });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    const key = await prisma.apiKey.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
        rateLimit: true,
        createdAt: true,
      },
    });

    res.json({ key });
  } catch (error) {
    console.error('Update key status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

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
            select: { tasks: true, apiKeys: true },
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
