import { describe, expect, it } from 'vitest';
import { extractSeedanceVideoUrl } from '../src/services/seedance2.service';

describe('extractSeedanceVideoUrl', () => {
  it('reads the video URL returned under content.video_url', () => {
    expect(extractSeedanceVideoUrl({
      status: 'succeeded',
      content: {
        video_url: 'https://cdn.example.com/generated.mp4',
      },
    })).toBe('https://cdn.example.com/generated.mp4');
  });

  it.each([
    { video_url: 'https://cdn.example.com/top-level.mp4' },
    { data: { video_url: 'https://cdn.example.com/data.mp4' } },
    { output: { video_url: 'https://cdn.example.com/output.mp4' } },
    { content: { video_url: { url: 'https://cdn.example.com/nested.mp4' } } },
  ])('supports common response wrappers: %o', (payload) => {
    expect(extractSeedanceVideoUrl(payload)).toMatch(/^https:\/\/cdn\.example\.com\/.+\.mp4$/);
  });

  it('returns undefined when no usable video URL is present', () => {
    expect(extractSeedanceVideoUrl({ status: 'succeeded', content: {} })).toBeUndefined();
  });
});
