import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  savePublicAsset: vi.fn(),
  listPublicAssets: vi.fn(),
  resolvePublicAssetFile: vi.fn(),
  deletePublicAsset: vi.fn(),
  retryPublicAsset: vi.fn(),
}));

vi.mock('../src/services/public-asset.service', () => mocks);

import {
  createPublicAsset,
  getPublicAssetFile,
  listPublicAssetController,
  deletePublicAssetController,
} from '../src/controllers/asset.controller';

const response = () => ({
  status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(),
  setHeader: vi.fn(), sendFile: vi.fn(),
}) as any;

describe('public asset controller', () => {
  beforeEach(() => vi.clearAllMocks());

  it('accepts dataUrl as a compatibility alias for source', async () => {
    mocks.savePublicAsset.mockResolvedValue({ id: 'asset-1', filename: 'x.png', contentType: 'image/png', localPath: 'uploads/assets/shared/hash.png' });
    const res = response();
    await createPublicAsset({ body: { dataUrl: 'data:image/png;base64,SGk=', filename: 'x.png' }, user: { userId: 'u1', role: 'USER' } } as any, res);
    expect(mocks.savePublicAsset).toHaveBeenCalledWith('u1', 'data:image/png;base64,SGk=', { filename: 'x.png' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ asset: expect.objectContaining({ previewUrl: '/api/assets/asset-1/file' }) });
    expect(res.json.mock.calls[0][0].asset).not.toHaveProperty('localPath');
  });

  it('serves a protected file without exposing its disk path in JSON', async () => {
    mocks.resolvePublicAssetFile.mockResolvedValue({ filePath: 'D:/private/hash.png', contentType: 'image/png', filename: 'x.png' });
    const res = response();
    await getPublicAssetFile({ params: { id: 'asset-1' }, user: { userId: 'u1', role: 'USER' } } as any, res);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
    expect(res.sendFile).toHaveBeenCalledWith('D:/private/hash.png');
  });

  it('passes requester identity and role to deletion authorization', async () => {
    mocks.deletePublicAsset.mockResolvedValue({ id: 'asset-1' });
    const res = response();
    await deletePublicAssetController({ params: { id: 'asset-1' }, user: { userId: 'u1', role: 'ADMIN' } } as any, res);
    expect(mocks.deletePublicAsset).toHaveBeenCalledWith('asset-1', 'u1', 'ADMIN');
  });

  it('returns paginated list data', async () => {
    mocks.listPublicAssets.mockResolvedValue({ items: [{ id: 'asset-1', localPath: '/private/path' }], total: 1, page: 1, limit: 20 });
    const res = response();
    await listPublicAssetController({ query: { page: '1', limit: '20' }, user: { userId: 'u1', role: 'USER' } } as any, res);
    expect(res.json).toHaveBeenCalledWith({ items: [{ id: 'asset-1', previewUrl: '/api/assets/asset-1/file' }], total: 1, page: 1, limit: 20 });
  });
});
