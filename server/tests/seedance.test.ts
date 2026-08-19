import { describe, expect, it } from 'vitest';
import { normalizeSeedanceRequest } from '../src/domain/seedance';

describe('normalizeSeedanceRequest', () => {
  it('rejects a resolution unsupported by the selected model', () => {
    expect(() => normalizeSeedanceRequest('雨夜城市', {
      model: 'doubao-seedance-2-0-fast',
      content: [{ type: 'text', text: '雨夜城市' }],
      resolution: '1080p',
    })).toThrow('该模型不支持 1080p');
  });

  it('locks edit tasks to adaptive ratio and automatic duration', () => {
    const result = normalizeSeedanceRequest('调整视频色调', {
      model: 'doubao-seedance-2-5',
      content: [{
        type: 'video_url',
        video_url: { url: 'https://cdn.example.com/source.mp4' },
        role: 'reference_video',
      }],
      omni_reference_task_type: 'edit',
      ratio: '16:9',
      duration: 10,
    });

    expect(result.ratio).toBe('adaptive');
    expect(result.duration).toBe(-1);
  });

  it('uses the trusted top-level prompt and preserves official field names', () => {
    const result = normalizeSeedanceRequest('新的提示词', {
      model: 'doubao-seedance-2-5',
      content: [{ type: 'text', text: '旧提示词' }],
      generate_audio: false,
      watermark: true,
      output_format: 'mov',
    });

    expect(result.content[0]).toEqual({ type: 'text', text: '新的提示词' });
    expect(result).toMatchObject({
      generate_audio: false,
      watermark: true,
      output_format: 'mov',
    });
  });

  it('rejects audio-only input for Seedance 2.0', () => {
    expect(() => normalizeSeedanceRequest('', {
      model: 'doubao-seedance-2-0',
      content: [{
        type: 'audio_url',
        audio_url: { url: 'asset://voice' },
        role: 'reference_audio',
      }],
    })).toThrow('Seedance 2.0 不能仅使用音频');
  });

  it('rejects mixed frame and reference material roles', () => {
    expect(() => normalizeSeedanceRequest('镜头过渡', {
      model: 'doubao-seedance-2-5',
      content: [
        { type: 'text', text: '镜头过渡' },
        { type: 'image_url', image_url: { url: 'asset://first' }, role: 'first_frame' },
        { type: 'image_url', image_url: { url: 'asset://reference' }, role: 'reference_image' },
      ],
    })).toThrow('首帧/首尾帧不能与参考素材混用');
  });
});
