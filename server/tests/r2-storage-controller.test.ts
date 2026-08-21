import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ testConnection: vi.fn() }));

vi.mock('../src/services/r2-storage.service', () => ({
  getPublicR2StorageConfig: vi.fn(),
  saveR2StorageConfig: vi.fn(),
  testR2StorageConnection: mocks.testConnection,
}));

import { testStorageConnection } from '../src/controllers/admin.controller';

describe('R2 storage connectivity controller', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the structured probe result without exposing configuration secrets', async () => {
    mocks.testConnection.mockResolvedValue({ ok: false, code: 'auth', message: 'R2 Worker 鉴权失败（401）' });
    const response = { json: vi.fn() } as any;

    await testStorageConnection({} as any, response);

    expect(response.json).toHaveBeenCalledWith({ ok: false, code: 'auth', message: 'R2 Worker 鉴权失败（401）' });
    expect(JSON.stringify(response.json.mock.calls)).not.toContain('apiKey');
  });
});
