import { describe, expect, it, vi } from 'vitest';
import { validateCreateTask, validateRegister, validateRelayStation } from '../src/middlewares/validator';
import { errorHandler } from '../src/middlewares/errorHandler';

const next = vi.fn();

describe('request validation', () => {
  it('allows a pure material task without a prompt', () => {
    const req = { body: { prompt: '', params: { content: [{ type: 'draft_task' }] } } } as any;
    expect(() => validateCreateTask(req, {} as any, next)).not.toThrow();
  });

  it('rejects administrator role registration', () => {
    const req = { body: { email: 'user@example.com', password: 'password1', role: 'ADMIN' } } as any;
    expect(() => validateRegister(req, {} as any, next)).toThrow('不允许指定管理员角色');
  });

  it('rejects a non-string registration role as a bad request', () => {
    const req = { body: { email: 'user@example.com', password: 'password1', role: 1 } } as any;
    expect(() => validateRegister(req, {} as any, next)).toThrow('角色格式不正确');
  });

  it('requires the relay API prefix option to be boolean', () => {
    const req = { body: { name: '站点', baseUrl: 'https://relay.example.com', appendApiV3: 'false' } } as any;
    expect(() => validateRelayStation(req, {} as any, next)).toThrow('appendApiV3 必须是布尔值');
  });

  it('rejects invalid relay model redirect payloads', () => {
    const req = {
      body: {
        name: '站点',
        baseUrl: 'https://relay.example.com',
        modelRedirects: { 'doubao-seedance-2-5': 25 },
      },
    } as any;
    expect(() => validateRelayStation(req, {} as any, next)).toThrow('模型重定向');
  });

  it('returns 413 for an oversized JSON payload', () => {
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    const error = Object.assign(new Error('request entity too large'), {
      type: 'entity.too.large',
      status: 413,
    });

    errorHandler(error, {} as any, { status, json } as any, next);
    expect(status).toHaveBeenCalledWith(413);
    expect(json).toHaveBeenCalledWith({ error: '上传素材总大小不能超过 64 MB' });
  });
});
