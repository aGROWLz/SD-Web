import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../types';
import { KeyEncryptionService } from '../services/key-encryption.service';
import {
  assertRelayStationCanDelete,
  assertRelayStationState,
  normalizeRelayBaseUrl,
} from '../domain/relay-station';
import { AppError } from '../middlewares/errorHandler';

const maskKey = (value: string) => {
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
};

const serialize = (station: any) => ({
  id: station.id,
  name: station.name,
  baseUrl: station.baseUrl,
  apiKeyMasked: maskKey(KeyEncryptionService.decrypt(station.apiKeyEncrypted)),
  isActive: station.isActive,
  isPrimary: station.isPrimary,
  createdAt: station.createdAt,
  updatedAt: station.updatedAt,
  taskCount: station._count?.tasks ?? 0,
});

const parseBaseUrl = (value: string) => {
  try {
    return normalizeRelayBaseUrl(value);
  } catch (error: any) {
    throw new AppError(error.message, 400);
  }
};

export const getRelayStations = async (_req: AuthRequest, res: Response) => {
  const stations = await prisma.relayStation.findMany({
    include: { _count: { select: { tasks: true } } },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
  });
  res.json({ stations: stations.map(serialize) });
};

export const createRelayStation = async (req: AuthRequest, res: Response) => {
  const { name, baseUrl, keyValue } = req.body;
  if (!keyValue?.trim()) throw new AppError('新增中转站必须提供 API Key', 400);

  const normalizedUrl = parseBaseUrl(baseUrl);
  const shouldBePrimary = Boolean(req.body.isPrimary);
  const isActive = req.body.isActive !== false;
  try {
    assertRelayStationState(shouldBePrimary, isActive);
  } catch (error: any) {
    throw new AppError(error.message, 400);
  }
  const station = await prisma.$transaction(async (tx) => {
    if (shouldBePrimary) await tx.relayStation.updateMany({ data: { isPrimary: false } });
    return tx.relayStation.create({
      data: {
        name: name.trim(),
        baseUrl: normalizedUrl,
        apiKeyEncrypted: KeyEncryptionService.encrypt(keyValue.trim()),
        isActive,
        isPrimary: shouldBePrimary,
      },
      include: { _count: { select: { tasks: true } } },
    });
  });
  res.status(201).json({ station: serialize(station) });
};

export const updateRelayStation = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const current = await prisma.relayStation.findUnique({ where: { id } });
  if (!current) throw new AppError('中转站不存在', 404);

  const { name, baseUrl, keyValue } = req.body;
  const data: any = { name: name.trim(), baseUrl: parseBaseUrl(baseUrl) };
  if (keyValue?.trim()) data.apiKeyEncrypted = KeyEncryptionService.encrypt(keyValue.trim());
  if (typeof req.body.isActive === 'boolean') data.isActive = req.body.isActive;

  try {
    assertRelayStationState(current.isPrimary, data.isActive ?? current.isActive);
  } catch (error: any) {
    throw new AppError(error.message, 400);
  }

  const station = await prisma.relayStation.update({
    where: { id },
    data,
    include: { _count: { select: { tasks: true } } },
  });
  res.json({ station: serialize(station) });
};

export const setPrimaryRelayStation = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const station = await prisma.$transaction(async (tx) => {
    const target = await tx.relayStation.findUnique({ where: { id } });
    if (!target) throw new AppError('中转站不存在', 404);
    if (!target.isActive) throw new AppError('禁用的中转站不能设为主站', 400);
    await tx.relayStation.updateMany({ data: { isPrimary: false } });
    return tx.relayStation.update({
      where: { id },
      data: { isPrimary: true },
      include: { _count: { select: { tasks: true } } },
    });
  });
  res.json({ station: serialize(station) });
};

export const deleteRelayStation = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const station = await prisma.relayStation.findUnique({
    where: { id },
    include: { _count: { select: { tasks: true } } },
  });
  if (!station) throw new AppError('中转站不存在', 404);
  try {
    assertRelayStationCanDelete(station.isPrimary, station._count.tasks);
  } catch (error: any) {
    throw new AppError(error.message, 409);
  }
  await prisma.relayStation.delete({ where: { id } });
  res.json({ message: '中转站已删除' });
};
