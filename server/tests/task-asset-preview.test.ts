import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  resolveLocalAssetFile: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  default: {
    task: { findUnique: mocks.findUnique },
  },
}));
vi.mock('../src/queue/queue-manager', () => ({ QueueManager: {} }));
vi.mock('../src/queue/task-processor', () => ({ setupTaskProcessor: vi.fn() }));
vi.mock('../src/services/local-asset.service', () => ({
  persistLocalAssetParams: vi.fn(),
  resolveLocalAssetFile: mocks.resolveLocalAssetFile,
}));

import { getTaskAsset } from '../src/controllers/task.controller';

const localUri = `local-asset://${'a'.repeat(64)}.png`;
const task = (userId = 'user-1', url = localUri) => ({
  id: 'task-1',
  userId,
  params: {
    content: [
      { type: 'text', text: 'prompt' },
      { type: 'image_url', image_url: { url }, role: 'reference_image' },
    ],
  },
});

const response = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
  setHeader: vi.fn(),
  send: vi.fn(),
  sendFile: vi.fn(),
}) as any;

describe('task asset preview controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveLocalAssetFile.mockResolvedValue({
      filePath: 'D:/Project/SD-Web/uploads/assets/user-1/asset.png',
      contentType: 'image/png',
      filename: 'asset.png',
    });
  });

  it('returns a task owner local material with the correct content type', async () => {
    mocks.findUnique.mockResolvedValue(task());
    const res = response();

    await getTaskAsset({
      params: { id: 'task-1', index: '1' },
      user: { userId: 'user-1', role: 'USER' },
    } as any, res);

    expect(mocks.resolveLocalAssetFile).toHaveBeenCalledWith('user-1', localUri);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
    expect(res.sendFile).toHaveBeenCalledWith('D:/Project/SD-Web/uploads/assets/user-1/asset.png');
  });

  it('forbids another user but allows an administrator', async () => {
    mocks.findUnique.mockResolvedValue(task('owner-1'));
    const denied = response();
    await getTaskAsset({
      params: { id: 'task-1', index: '1' },
      user: { userId: 'user-2', role: 'USER' },
    } as any, denied);
    expect(denied.status).toHaveBeenCalledWith(403);
    expect(mocks.resolveLocalAssetFile).not.toHaveBeenCalled();

    const allowed = response();
    await getTaskAsset({
      params: { id: 'task-1', index: '1' },
      user: { userId: 'admin-1', role: 'ADMIN' },
    } as any, allowed);
    expect(allowed.sendFile).toHaveBeenCalledWith('D:/Project/SD-Web/uploads/assets/user-1/asset.png');
  });

  it('asks the user to reselect old remote-only material', async () => {
    mocks.findUnique.mockResolvedValue(task('user-1', 'https://expired.example/old.png'));
    const res = response();

    await getTaskAsset({
      params: { id: 'task-1', index: '1' },
      user: { userId: 'user-1', role: 'USER' },
    } as any, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: '历史素材没有本地原文件，请重新选择素材' });
    expect(mocks.resolveLocalAssetFile).not.toHaveBeenCalled();
  });

  it('rejects an invalid or non-media content index', async () => {
    mocks.findUnique.mockResolvedValue(task());
    const res = response();

    await getTaskAsset({
      params: { id: 'task-1', index: '0' },
      user: { userId: 'user-1', role: 'USER' },
    } as any, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mocks.resolveLocalAssetFile).not.toHaveBeenCalled();
  });
});
