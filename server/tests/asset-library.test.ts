import { describe, expect, it, vi } from 'vitest';
import { normalizeAssetLibraryConfig } from '../src/domain/relay-station';
import {
  AssetLibraryError,
  queryAsset,
  uploadAsset,
} from '../src/services/asset-library.service';

const response = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

describe('asset library service', () => {
  it('uploads to KK with the lowercase field mapping and auth header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({
      code: 0,
      data: { Id: 'kk-asset-1', Status: 'processing', URL: 'https://cdn.example/kk-asset-1' },
    }));
    const config = normalizeAssetLibraryConfig({ provider: 'KK' })!;

    await expect(uploadAsset(config, 'secret-key', {
      publicUrl: 'https://cdn.example/image.png',
      filename: 'image.png',
      contentType: 'image/png',
    }, fetchImpl as any)).resolves.toMatchObject({
      id: 'kk-asset-1',
      status: 'Pending',
      url: 'https://cdn.example/kk-asset-1',
    });

    expect(fetchImpl).toHaveBeenCalledWith(config.uploadUrl, expect.objectContaining({
      method: 'POST',
      headers: { Authorization: 'secret-key', 'Content-Type': 'application/json' },
    }));
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      url: 'https://cdn.example/image.png',
      asset_type: 'Image',
      name: 'image.png',
    });
  });

  it('adds a separator when an auth prefix has no trailing whitespace', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ code: 0, id: 'prefixed-1' }));
    const config = normalizeAssetLibraryConfig({ provider: 'KK', authPrefix: 'Bearer' })!;

    await uploadAsset(config, 'secret-key', {
      publicUrl: 'https://cdn.example/image.png', filename: 'image.png', contentType: 'image/png',
    }, fetchImpl as any);
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer secret-key');
  });

  it('uploads to XKU p4 with project name and case-sensitive fields', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({
      code: 'success',
      data: { id: 'xku-asset-1', status: 'Active', URL: 'https://cdn.example/xku-asset-1' },
    }));
    const config = normalizeAssetLibraryConfig({ provider: 'XKU_P4', projectNameValue: 'project-a' })!;

    await expect(uploadAsset(config, 'token', {
      publicUrl: 'https://cdn.example/video.mp4',
      filename: 'video.mp4',
      contentType: 'video/mp4',
    }, fetchImpl as any)).resolves.toMatchObject({ id: 'xku-asset-1', status: 'Active' });

    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      URL: 'https://cdn.example/video.mp4',
      AssetType: 'Video',
      Name: 'video.mp4',
      ProjectName: 'project-a',
    });
  });

  it('honors custom field mappings and maps audio MIME types', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ code: 0, id: 'custom-1' }));
    const config = normalizeAssetLibraryConfig({
      provider: 'KK',
      uploadUrl: 'https://library.example/upload',
      fields: { url: 'source', assetType: 'kind', name: 'filename', projectName: '' },
    })!;

    await uploadAsset(config, 'key', {
      publicUrl: 'https://cdn.example/audio.mp3',
      filename: 'audio.mp3',
      contentType: 'audio/mpeg',
    }, fetchImpl as any);

    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      source: 'https://cdn.example/audio.mp3',
      kind: 'Audio',
      filename: 'audio.mp3',
    });
  });

  it('replaces query URL placeholders and reads top-level id/status/url', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({
      code: 0,
      Id: 'asset/one',
      Status: 'failed',
      URL: 'https://cdn.example/asset/one',
    }));
    const config = normalizeAssetLibraryConfig({
      provider: 'KK',
      queryUrl: 'https://library.example/assets/{id}',
    })!;

    await expect(queryAsset(config, 'query-key', 'asset/one', fetchImpl as any))
      .resolves.toMatchObject({ id: 'asset/one', status: 'Failed', url: 'https://cdn.example/asset/one' });
    expect(fetchImpl).toHaveBeenCalledWith('https://library.example/assets/asset%2Fone', expect.objectContaining({
      method: 'GET',
      headers: { Authorization: 'query-key', 'Content-Type': 'application/json' },
    }));
  });

  it('accepts a successful response without a code when a top-level id is present', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ Id: 'xku-no-code', Status: 'Active' }));
    const config = normalizeAssetLibraryConfig({ provider: 'XKU_P4' })!;

    await expect(queryAsset(config, 'query-key', 'xku-no-code', fetchImpl as any))
      .resolves.toMatchObject({ id: 'xku-no-code', status: 'Active' });
  });

  it('appends encoded id when query URL has no placeholder', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ code: 0, data: { id: 'xku-1' } }));
    const config = normalizeAssetLibraryConfig({ provider: 'XKU_P4' })!;

    await queryAsset(config, 'key', 'xku/1', fetchImpl as any);
    expect(fetchImpl.mock.calls[0][0]).toBe(`${config.queryUrl}/xku%2F1`);
  });

  it('inserts an encoded id into the query URL pathname while preserving query and hash', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ code: 0, id: 'xku-2' }));
    const config = normalizeAssetLibraryConfig({
      provider: 'XKU_P4',
      queryUrl: 'https://library.example/assets?project=p4#status',
    })!;

    await queryAsset(config, 'key', 'xku/2', fetchImpl as any);
    expect(fetchImpl.mock.calls[0][0]).toBe('https://library.example/assets/xku%2F2?project=p4#status');
  });

  it('rejects unsupported or empty MIME types with a structured error', async () => {
    const config = normalizeAssetLibraryConfig({ provider: 'KK' })!;
    const fetchImpl = vi.fn();
    for (const contentType of ['', 'image', 'application/octet-stream']) {
      await expect(uploadAsset(config, 'key', {
        publicUrl: 'https://cdn.example/file', filename: 'file', contentType,
      }, fetchImpl as any)).rejects.toMatchObject({ status: 0, code: 'INVALID_CONTENT_TYPE' });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('aborts requests after 30 seconds and reports a timeout error', async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn().mockImplementation((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      }));
      const config = normalizeAssetLibraryConfig({ provider: 'KK' })!;
      const pending = uploadAsset(config, 'key', {
        publicUrl: 'https://cdn.example/image.png', filename: 'image.png', contentType: 'image/png',
      }, fetchImpl as any);
      expect(fetchImpl.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
      const timeoutAssertion = expect(pending).rejects.toMatchObject({ status: 0, code: 'TIMEOUT' });
      await vi.advanceTimersByTimeAsync(30_000);
      await timeoutAssertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns structured errors for HTTP, JSON, business-code, and missing-id failures', async () => {
    const config = normalizeAssetLibraryConfig({ provider: 'KK' })!;
    const key = 'do-not-leak-this-key';

    const httpFetch = vi.fn().mockResolvedValue(response({ code: 'BAD', message: 'rejected' }, 502));
    await expect(uploadAsset(config, key, {
      publicUrl: 'https://cdn.example/a.png', filename: 'a.png', contentType: 'image/png',
    }, httpFetch as any)).rejects.toMatchObject({ status: 502, code: 'BAD', message: 'rejected' });

    const invalidFetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => { throw new Error('invalid'); } });
    await expect(uploadAsset(config, key, {
      publicUrl: 'https://cdn.example/a.png', filename: 'a.png', contentType: 'image/png',
    }, invalidFetch as any)).rejects.toBeInstanceOf(AssetLibraryError);

    const businessFetch = vi.fn().mockResolvedValue(response({ code: 1001, message: `bad ${key}` }));
    await expect(uploadAsset(config, key, {
      publicUrl: 'https://cdn.example/a.png', filename: 'a.png', contentType: 'image/png',
    }, businessFetch as any)).rejects.toSatisfy((error: AssetLibraryError) =>
      error.status === 200 && error.code === 1001 && !error.message.includes(key));

    const missingIdFetch = vi.fn().mockResolvedValue(response({ code: 0, data: { Status: 'Active' } }));
    await expect(uploadAsset(config, key, {
      publicUrl: 'https://cdn.example/a.png', filename: 'a.png', contentType: 'image/png',
    }, missingIdFetch as any)).rejects.toMatchObject({ status: 200, code: 0 });
  });
});
