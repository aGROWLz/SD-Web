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

  it('allows a draft task without a top-level prompt', () => {
    const result = normalizeSeedanceRequest('', {
      model: 'doubao-seedance-2-5',
      content: [{ type: 'draft_task', draft_task: { id: 'draft_123' } }],
    });

    expect(result.content).toEqual([{ type: 'draft_task', draft_task: { id: 'draft_123' } }]);
  });

  it('preserves supported official snake_case parameters', () => {
    const result = normalizeSeedanceRequest('镜头推进', {
      model: 'doubao-seedance-2-5',
      content: [{ type: 'text', text: '镜头推进' }],
      return_last_frame: true,
      callback_url: 'https://example.com/callback',
      execution_expires_after: 7200,
      safety_identifier: 'user-42',
      priority: 7,
      tools: [{ type: 'web_search' }],
    });

    expect(result).toMatchObject({
      return_last_frame: true,
      callback_url: 'https://example.com/callback',
      execution_expires_after: 7200,
      safety_identifier: 'user-42',
      priority: 7,
      tools: [{ type: 'web_search' }],
    });
  });

  it('rejects parameters unsupported by the selected model instead of dropping them', () => {
    for (const params of [
      { seed: 42 },
      { camera_fixed: true },
      { frames: 49 },
      { draft: true },
      { service_tier: 'default' },
    ]) {
      expect(() => normalizeSeedanceRequest('镜头推进', {
        content: [{ type: 'text', text: '镜头推进' }],
        ...params,
      } as any)).toThrow('当前模型不支持参数');
    }
  });

  it('rejects invalid runtime enum and boolean values', () => {
    expect(() => normalizeSeedanceRequest('镜头', {
      ratio: 'invalid' as any,
      content: [{ type: 'text', text: '镜头' }],
    })).toThrow('比例参数无效');
    expect(() => normalizeSeedanceRequest('镜头', {
      generate_audio: 'false' as any,
      content: [{ type: 'text', text: '镜头' }],
    })).toThrow('generate_audio 必须是布尔值');
    expect(() => normalizeSeedanceRequest('镜头', {
      output_format: 'avi' as any,
      content: [{ type: 'text', text: '镜头' }],
    })).toThrow('输出格式无效');
  });

  it('rejects a reference task type outside a Seedance 2.5 reference task', () => {
    expect(() => normalizeSeedanceRequest('镜头', {
      model: 'doubao-seedance-2-0',
      omni_reference_task_type: 'edit',
      content: [{ type: 'text', text: '镜头' }],
    })).toThrow('当前任务不支持 omni_reference_task_type');
  });

  it('rejects malformed params and content with a client error message', () => {
    expect(() => normalizeSeedanceRequest('镜头', null as any)).toThrow('参数格式不正确');
    expect(() => normalizeSeedanceRequest('镜头', { content: 'bad' as any })).toThrow('content 必须是数组');
    expect(() => normalizeSeedanceRequest('镜头', {
      content: [{ type: 'unknown' } as any],
    })).toThrow('不支持的素材类型');
  });

});
