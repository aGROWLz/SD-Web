import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildThumbnailArguments, thumbnailPathFor } from '../src/services/video-thumbnail.service';

describe('video thumbnail storage', () => {
  it('stores the thumbnail alongside the project video with a jpg extension', () => {
    expect(thumbnailPathFor('uploads/videos/task-123.mp4')).toBe(path.normalize('uploads/videos/task-123.jpg'));
  });

  it('extracts one small frame from the local video file', () => {
    expect(buildThumbnailArguments('uploads/videos/task-123.mp4', 'uploads/videos/task-123.jpg'))
      .toEqual([
        '-y',
        '-ss', '0.05',
        '-i', 'uploads/videos/task-123.mp4',
        '-frames:v', '1',
        '-vf', 'scale=480:-2',
        '-q:v', '3',
        'uploads/videos/task-123.jpg',
      ]);
  });
});
