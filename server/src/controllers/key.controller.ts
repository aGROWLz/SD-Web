import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, UserRole } from '../types';
import { KeyEncryptionService } from '../services/key-encryption.service';

export const getMyKeys = async (req: AuthRequest, res: Response) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: {
        ownerId: req.user!.userId,
        type: 'USER_OWNED',
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

    res.json({ keys });
  } catch (error) {
    console.error('Get keys error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addUserKey = async (req: AuthRequest, res: Response) => {
  try {
    const { name, keyValue, rateLimit = 60 } = req.body;

    if (!name || !keyValue) {
      return res.status(400).json({ error: 'Name and key value are required' });
    }

    // 检查用户是否有权限添加自己的 Key
    if (req.user!.role !== UserRole.PREMIUM && req.user!.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Only premium users can add their own keys' });
    }

    const encryptedKey = KeyEncryptionService.encrypt(keyValue);

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        keyValue: encryptedKey,
        type: 'USER_OWNED',
        ownerId: req.user!.userId,
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
    console.error('Add key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteKey = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const key = await prisma.apiKey.findUnique({
      where: { id },
    });

    if (!key) {
      return res.status(404).json({ error: 'Key not found' });
    }

    if (key.ownerId !== req.user!.userId && req.user!.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.apiKey.delete({ where: { id } });

    res.json({ message: 'Key deleted successfully' });
  } catch (error) {
    console.error('Delete key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
