import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveStoredVideoPath } from '../src/services/video-storage.service';

describe('resolveStoredVideoPath', () => {
  it('resolves legacy paths that already contain the upload directory', () => {
    const resolved = resolveStoredVideoPath(path.join('uploads', 'videos', 'task-123.mp4'));
    expect(resolved).toBe(path.resolve('uploads', 'videos', 'task-123.mp4'));
  });

  it('resolves filename-only records inside the upload directory', () => {
    const resolved = resolveStoredVideoPath('task-123.mp4');
    expect(resolved).toBe(path.resolve('uploads', 'videos', 'task-123.mp4'));
  });

  it('does not allow a stored path to escape the upload directory', () => {
    const resolved = resolveStoredVideoPath('../../outside.mp4');
    expect(path.dirname(resolved)).toBe(path.resolve('uploads', 'videos'));
  });
});
