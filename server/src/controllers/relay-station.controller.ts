import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../types';
import { KeyEncryptionService } from '../services/key-encryption.service';
import {
  assertRelayStationCanDelete,
  assertRelayStationState,
  normalizeAssetLibraryConfig,
  normalizeModelRedirects,
  normalizeRelayBaseUrl,
} from '../domain/relay-station';
import { AppError } from '../middlewares/errorHandler';
import { testRelayStationConnection } from '../services/relay-station-connection.service';

const maskKey = (value: string) => {
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
};

const serialize = (station: any) => ({
  id: station.id,
  name: station.name,
  baseUrl: station.baseUrl,
  queryBaseUrl: station.queryBaseUrl || station.baseUrl,
  appendApiV3: station.appendApiV3,
  modelRedirects: normalizeModelRedirects(station.modelRedirects),
  assetLibraryConfig: normalizeAssetLibraryConfig(station.assetLibraryConfig),
  apiKeyMasked: maskKey(KeyEncryptionService.decrypt(station.apiKeyEncrypted)),
  isActive: station.isActive,
  isPrimary: station.isPrimary,
  createdAt: station.createdAt,
  updatedAt: station.updatedAt,
  taskCount: station._count?.tasks ?? 0,
});

const parseBaseUrl = (value: string, appendApiV3: boolean) => {
  try {
    return normalizeRelayBaseUrl(value, appendApiV3);
  } catch (error: any) {
    throw new AppError(error.message, 400);
  }
};

const parseAssetLibraryConfig = (value: unknown) => {
  try {
    return normalizeAssetLibraryConfig(value);
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
  const { name, baseUrl, queryBaseUrl, keyValue } = req.body;
  if (!keyValue?.trim()) throw new AppError('新增中转站必须提供 API Key', 400);

  const appendApiV3 = req.body.appendApiV3 !== false;
  const normalizedUrl = parseBaseUrl(baseUrl, appendApiV3);
  const assetLibraryConfig = parseAssetLibraryConfig(req.body.assetLibraryConfig);
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
        queryBaseUrl: queryBaseUrl?.trim() ? queryBaseUrl.trim().replace(/\/+$/, '') : normalizedUrl,
        appendApiV3,
        modelRedirects: normalizeModelRedirects(req.body.modelRedirects),
        ...(assetLibraryConfig === null ? {} : { assetLibraryConfig }),
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

  const { name, baseUrl, queryBaseUrl, keyValue } = req.body;
  const appendApiV3 = typeof req.body.appendApiV3 === 'boolean'
    ? req.body.appendApiV3
    : current.appendApiV3;
  const data: any = {
    name: name.trim(),
    baseUrl: parseBaseUrl(baseUrl, appendApiV3),
    ...(queryBaseUrl !== undefined ? { queryBaseUrl: queryBaseUrl?.trim() ? queryBaseUrl.trim().replace(/\/+$/, '') : parseBaseUrl(baseUrl, appendApiV3) } : {}),
    appendApiV3,
  };
  if (req.body.assetLibraryConfig !== undefined) {
    data.assetLibraryConfig = parseAssetLibraryConfig(req.body.assetLibraryConfig);
  }
  if (req.body.modelRedirects !== undefined) {
    data.modelRedirects = normalizeModelRedirects(req.body.modelRedirects);
  }
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

export const testRelayStation = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const station = await prisma.relayStation.findUnique({ where: { id } });
  if (!station) throw new AppError('中转站不存在', 404);

  const apiKey = KeyEncryptionService.decrypt(station.apiKeyEncrypted);
  const result = apiKey
    ? await testRelayStationConnection(station.baseUrl, apiKey)
    : { ok: false as const, code: 'auth' as const, message: 'API Key 无效或无权限' };

  // Probe failures are business results, not admin authentication failures.
  res.json(result);
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
