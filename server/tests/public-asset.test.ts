import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'fs/promises';
import os from 'os';
import path from 'path';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  default: {
    publicAsset: mocks,
  },
}));

import {
  deletePublicAsset,
  listPublicAssets,
  retryPublicAsset,
  savePublicAsset,
} from '../src/services/public-asset.service';

const roots: string[] = [];
const makeRoot = async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sd-web-public-assets-'));
  roots.push(root);
  return root;
};

afterEach(async () => {
  vi.clearAllMocks();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('public asset service', () => {
  it('stores shared files by the real hash and reuses an existing record', async () => {
    const rootDir = await makeRoot();
    const firstRecord = {
      id: 'asset-1', ownerId: 'user-1', filename: 'hello.png', contentType: 'image/png', bytes: 2,
      contentHash: '3639efcd08abb273b1619e82e78c29a7df02c1051b1820e99fc395dcaa3326b8',
      localPath: '', providerStatus: 'PENDING',
    };
    mocks.create.mockResolvedValue(firstRecord);
    const first = await savePublicAsset('user-1', 'data:image/png;base64,SGk=', { rootDir });
    expect(first.id).toBe('asset-1');
    expect(first.contentHash).toBe('3639efcd08abb273b1619e82e78c29a7df02c1051b1820e99fc395dcaa3326b8');
    expect((await readFile(path.join(rootDir, 'shared', `${first.contentHash}.png`))).toString()).toBe('Hi');

    mocks.create.mockRejectedValueOnce({ code: 'P2002' });
    mocks.findUnique.mockResolvedValue(firstRecord);
    const second = await savePublicAsset('user-2', 'data:image/png;base64,SGk=', { rootDir });
    expect(second.id).toBe('asset-1');
    expect(mocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { contentHash: first.contentHash } }));
  });

  it('rejects empty, malformed, unsupported, and oversized Data URLs', async () => {
    const rootDir = await makeRoot();
    await expect(savePublicAsset('user-1', '')).rejects.toThrow('不能为空');
    await expect(savePublicAsset('user-1', 'data:image/png;base64,not valid')).rejects.toThrow('无效');
    await expect(savePublicAsset('user-1', 'data:image/svg+xml;base64,SGk=')).rejects.toThrow('不支持');
    const oversized = `data:video/mp4;base64,${Buffer.alloc(30 * 1024 * 1024 + 1).toString('base64')}`;
    await expect(savePublicAsset('user-1', oversized, { rootDir })).rejects.toThrow('不能超过 30 MB');
  });

  it('lists public assets with pagination and filters', async () => {
    mocks.findMany.mockResolvedValue([{ id: 'asset-1', owner: { id: 'u1', email: 'u@example.com' } }]);
    mocks.count.mockResolvedValue(7);
    const result = await listPublicAssets(2, 3, { contentType: 'image/png', keyword: 'hello' });
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 3, take: 3 }));
    expect(result).toEqual({ items: [{ id: 'asset-1', owner: { id: 'u1', email: 'u@example.com' } }], total: 7, page: 2, limit: 3 });
  });

  it('deletes a record while preserving a file referenced by another record', async () => {
    const asset = { id: 'asset-1', ownerId: 'user-1', localPath: 'uploads/assets/shared/hash.png', contentHash: 'hash' };
    mocks.findUnique.mockResolvedValue(asset);
    mocks.delete.mockResolvedValue(asset);
    mocks.count.mockResolvedValue(1);
    await expect(deletePublicAsset('asset-1', 'user-1', 'USER')).resolves.toEqual(asset);
    expect(mocks.delete).toHaveBeenCalledWith({ where: { id: 'asset-1' } });
  });

  it('resets provider state when retrying an asset', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'asset-1' });
    mocks.update.mockResolvedValue({ id: 'asset-1', providerStatus: 'PENDING', providerError: null });
    await expect(retryPublicAsset('asset-1')).resolves.toMatchObject({ providerStatus: 'PENDING' });
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: 'asset-1' }, data: { providerStatus: 'PENDING', providerError: null } });
  });
});
