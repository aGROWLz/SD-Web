import { describe, expect, it } from 'vitest';
import { prepareSeedanceParams } from '../src/services/r2-storage.service';

const params = (url: string, type: 'image_url' | 'audio_url' | 'video_url') => ({
  model: 'doubao-seedance-2-5',
  content: [{ type, [type]: { url }, role: `reference_${type.replace('_url', '')}` }],
});

describe('prepareSeedanceParams', () => {
  it('keeps local images as Data URLs when R2 is not configured', async () => {
    const source = 'data:image/png;base64,SGk=';
    await expect(prepareSeedanceParams(params(source, 'image_url'), { configured: false, upload: async () => 'unused' }))
      .resolves.toMatchObject({ content: [{ image_url: { url: source } }] });
  });

  it('rejects local audio and video when R2 is not configured', async () => {
    await expect(prepareSeedanceParams(params('data:audio/wav;base64,SGk=', 'audio_url'), { configured: false, upload: async () => 'unused' }))
      .rejects.toThrow('本地音频和视频需要先配置 R2');
    await expect(prepareSeedanceParams(params('data:video/mp4;base64,SGk=', 'video_url'), { configured: false, upload: async () => 'unused' }))
      .rejects.toThrow('本地音频和视频需要先配置 R2');
  });

  it('replaces all local media with Worker public URLs when R2 is configured', async () => {
    const result = await prepareSeedanceParams({
      model: 'doubao-seedance-2-5',
      content: [
        { type: 'image_url', image_url: { url: 'data:image/png;base64,SGk=' }, role: 'reference_image' },
        { type: 'audio_url', audio_url: { url: 'data:audio/wav;base64,SGk=' }, role: 'reference_audio' },
      ],
    }, { configured: true, upload: async (_source, filename) => `https://cdn.example.com/${filename}` });

    expect(result.content).toEqual([
      { type: 'image_url', image_url: { url: 'https://cdn.example.com/seedance-image-0.png' }, role: 'reference_image' },
      { type: 'audio_url', audio_url: { url: 'https://cdn.example.com/seedance-audio-1.wav' }, role: 'reference_audio' },
    ]);
  });

  it('does not alter remote or asset URLs', async () => {
    const source = { model: 'doubao-seedance-2-5', content: [
      { type: 'video_url', video_url: { url: 'https://cdn.example.com/a.mp4' }, role: 'reference_video' },
      { type: 'image_url', image_url: { url: 'asset://image-1' }, role: 'reference_image' },
    ] };
    await expect(prepareSeedanceParams(source, { configured: true, upload: async () => 'unexpected' })).resolves.toEqual(source);
  });
});
