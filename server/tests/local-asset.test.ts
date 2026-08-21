import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, readdir, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  materializeLocalAssetParams,
  persistLocalAssetParams,
  resolveLocalAsset,
  saveDataUrlAsset,
} from '../src/services/local-asset.service';

const roots: string[] = [];
const makeRoot = async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sd-web-assets-'));
  roots.push(root);
  return root;
};

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('local asset storage', () => {
  it('saves a Data URL by content hash and deduplicates it for one user', async () => {
    const rootDir = await makeRoot();
    const first = await saveDataUrlAsset('user-a', 'data:image/png;base64,SGk=', { rootDir });
    const second = await saveDataUrlAsset('user-a', 'data:image/png;base64,SGk=', { rootDir });

    expect(first.uri).toMatch(/^local-asset:\/\/[a-f0-9]{64}\.png$/);
    expect(second).toEqual(first);
    expect((await readFile(first.filePath)).toString()).toBe('Hi');
  });

  it('isolates identical asset bytes in separate user directories', async () => {
    const rootDir = await makeRoot();
    const first = await saveDataUrlAsset('user-a', 'data:image/png;base64,SGk=', { rootDir });
    const second = await saveDataUrlAsset('user-b', 'data:image/png;base64,SGk=', { rootDir });

    expect(first.uri).toBe(second.uri);
    expect(first.filePath).not.toBe(second.filePath);
    expect(first.filePath).toContain(`${path.sep}user-a${path.sep}`);
    expect(second.filePath).toContain(`${path.sep}user-b${path.sep}`);
  });

  it('rejects path traversal and missing local assets', async () => {
    const rootDir = await makeRoot();
    await expect(resolveLocalAsset('user-a', 'local-asset://../../secret', { rootDir }))
      .rejects.toThrow('本地素材引用无效');
    await expect(resolveLocalAsset('user-a', `local-asset://${'a'.repeat(64)}.png`, { rootDir }))
      .rejects.toThrow('本地素材不存在');
  });
});

describe('local asset task flow', () => {
  it('persists all local media before storing task params', async () => {
    const rootDir = await makeRoot();
    const result = await persistLocalAssetParams({ content: [
      { type: 'image_url', image_url: { url: 'data:image/png;base64,SGk=' }, role: 'reference_image' },
      { type: 'audio_url', audio_url: { url: 'data:audio/wav;base64,SGk=' }, role: 'reference_audio' },
      { type: 'video_url', video_url: { url: 'data:video/mp4;base64,SGk=' }, role: 'reference_video' },
    ] }, 'user-a', { rootDir });

    expect(result.content).toEqual([
      expect.objectContaining({ image_url: { url: expect.stringMatching(/^local-asset:\/\//) } }),
      expect.objectContaining({ audio_url: { url: expect.stringMatching(/^local-asset:\/\//) } }),
      expect.objectContaining({ video_url: { url: expect.stringMatching(/^local-asset:\/\//) } }),
    ]);
  });

  it('does not write any file when one Data URL has an unsupported content type', async () => {
    const rootDir = await makeRoot();
    await expect(persistLocalAssetParams({ content: [
      { type: 'image_url', image_url: { url: 'data:image/png;base64,SGk=' }, role: 'reference_image' },
      { type: 'image_url', image_url: { url: 'data:image/svg+xml;base64,SGk=' }, role: 'reference_image' },
    ] }, 'user-a', { rootDir })).rejects.toThrow('不支持的本地素材类型');

    await expect(readdir(path.join(rootDir, 'user-a'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects oversized individual and aggregate uploads before writing files', async () => {
    const rootDir = await makeRoot();
    const tooLarge = `data:video/mp4;base64,${Buffer.alloc(31 * 1024 * 1024).toString('base64')}`;
    await expect(persistLocalAssetParams({ content: [
      { type: 'video_url', video_url: { url: tooLarge } },
    ] }, 'user-a', { rootDir })).rejects.toThrow('单个素材不能超过 30 MB');

    const medium = `data:video/mp4;base64,${Buffer.alloc(19 * 1024 * 1024).toString('base64')}`;
    await expect(persistLocalAssetParams({ content: [
      { type: 'video_url', video_url: { url: medium } },
      { type: 'video_url', video_url: { url: medium } },
    ] }, 'user-a', { rootDir })).rejects.toThrow('素材总大小不能超过 36 MB');
    await expect(readdir(path.join(rootDir, 'user-a'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('uploads a fresh R2 copy every time params are materialized', async () => {
    const rootDir = await makeRoot();
    const stored = await persistLocalAssetParams({ content: [
      { type: 'image_url', image_url: { url: 'data:image/png;base64,SGk=' }, role: 'reference_image' },
    ] }, 'user-a', { rootDir });
    const upload = vi.fn()
      .mockResolvedValueOnce('https://r2.example/first.png')
      .mockResolvedValueOnce('https://r2.example/second.png');

    const first = await materializeLocalAssetParams(stored, 'user-a', { rootDir, configured: true, upload });
    const second = await materializeLocalAssetParams(stored, 'user-a', { rootDir, configured: true, upload });

    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload.mock.calls[0][1]).not.toBe(upload.mock.calls[1][1]);
    expect(first.content[0].image_url.url).toBe('https://r2.example/first.png');
    expect(second.content[0].image_url.url).toBe('https://r2.example/second.png');
    expect(stored.content[0].image_url.url).toMatch(/^local-asset:\/\//);
  });

  it('falls back to Base64 for local images without R2 but rejects audio and video', async () => {
    const rootDir = await makeRoot();
    const image = await persistLocalAssetParams({ content: [
      { type: 'image_url', image_url: { url: 'data:image/png;base64,SGk=' }, role: 'reference_image' },
    ] }, 'user-a', { rootDir });
    const audio = await persistLocalAssetParams({ content: [
      { type: 'audio_url', audio_url: { url: 'data:audio/wav;base64,SGk=' }, role: 'reference_audio' },
    ] }, 'user-a', { rootDir });

    await expect(materializeLocalAssetParams(image, 'user-a', { rootDir, configured: false, upload: vi.fn() }))
      .resolves.toMatchObject({ content: [{ image_url: { url: 'data:image/png;base64,SGk=' } }] });
    await expect(materializeLocalAssetParams(audio, 'user-a', { rootDir, configured: false, upload: vi.fn() }))
      .rejects.toThrow('本地音频和视频需要先配置 R2');
  });
});
