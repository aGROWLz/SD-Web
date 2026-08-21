import { describe, expect, it, vi } from 'vitest';
import {
  buildWorkerUploadUrl,
  parseDataUrl,
  maskStorageKey,
  probeR2Worker,
  uploadBytesToWorker,
} from '../src/services/r2-storage.service';

describe('R2 storage helpers', () => {
  it('parses base64 Data URLs into content type and bytes', () => {
    expect(parseDataUrl('data:image/png;base64,SGk=')).toEqual({
      contentType: 'image/png',
      bytes: Buffer.from('Hi'),
    });
  });

  it('rejects non-base64 Data URLs', () => {
    expect(() => parseDataUrl('data:text/plain,hello')).toThrow('仅支持 Base64 Data URL');
  });

  it('encodes filenames and keys in Worker upload requests', () => {
    expect(buildWorkerUploadUrl('https://worker.example.com/', 'a b.png', 'key/x'))
      .toBe('https://worker.example.com/get-upload-url?file=a%20b.png&api_key=key%2Fx');
  });

  it('masks storage keys without exposing the full value', () => {
    expect(maskStorageKey('secret-key-123')).toBe('•••••••••••123');
    expect(maskStorageKey('short')).toBe('••••••••');
  });

  it('tests connectivity by requesting an upload URL without uploading an object', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ uploadUrl: 'https://upload.example/test', publicUrl: 'https://cdn.example/test' }),
    });

    await expect(probeR2Worker('https://worker.example.com', 'secret', fetchImpl as any))
      .resolves.toEqual({ ok: true, message: 'R2 Worker 连通测试成功' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toContain('/get-upload-url?');
    expect(fetchImpl.mock.calls[0][0]).toContain('api_key=secret');
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ signal: expect.any(AbortSignal) });
    expect(fetchImpl.mock.calls[0][1]?.method).toBeUndefined();
  });

  it('reports authentication failures as a business result', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    await expect(probeR2Worker('https://worker.example.com', 'bad-key', fetchImpl as any))
      .resolves.toEqual({ ok: false, code: 'auth', message: 'R2 Worker 鉴权失败（401）' });
  });

  it('reports network and invalid response failures', async () => {
    const networkFetch = vi.fn().mockRejectedValue(new Error('socket timeout'));
    await expect(probeR2Worker('https://worker.example.com', 'secret', networkFetch as any))
      .resolves.toEqual({ ok: false, code: 'network', message: '无法连接 R2 Worker：socket timeout' });

    const invalidFetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ uploadUrl: 'only-one-field' }) });
    await expect(probeR2Worker('https://worker.example.com', 'secret', invalidFetch as any))
      .resolves.toEqual({ ok: false, code: 'invalid_response', message: 'R2 Worker 返回的上传地址不完整' });
  });

  it('uploads local file bytes with their original content type', async () => {
    const bytes = Buffer.from('video-content');
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          uploadUrl: 'https://upload.example/material',
          publicUrl: 'https://cdn.example/material.mp4',
        }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    await expect(uploadBytesToWorker(
      'https://worker.example.com',
      'secret',
      bytes,
      'reference video.mp4',
      'video/mp4',
      fetchImpl as any,
    )).resolves.toBe('https://cdn.example/material.mp4');

    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      'https://upload.example/material',
      { method: 'PUT', headers: { 'Content-Type': 'video/mp4' }, body: bytes },
    );
  });
});
