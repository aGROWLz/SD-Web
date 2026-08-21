import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { testRelayStationConnection } from '../src/services/relay-station-connection.service';

describe('testRelayStationConnection', () => {
  afterEach(() => vi.restoreAllMocks());

  it('probes the models endpoint with the relay API key', async () => {
    const request = vi.spyOn(axios, 'get').mockResolvedValue({ status: 200, data: { data: [] } } as any);

    await expect(testRelayStationConnection('https://relay.example.com/api/v3', 'secret-key'))
      .resolves.toEqual({ ok: true });

    expect(request).toHaveBeenCalledWith(
      'https://relay.example.com/api/v3/models',
      expect.objectContaining({
        headers: { Authorization: 'Bearer secret-key' },
        timeout: 10000,
        validateStatus: expect.any(Function),
      }),
    );
  });

  it('reports invalid credentials without throwing', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({ status: 401, data: {} } as any);

    await expect(testRelayStationConnection('https://relay.example.com/api/v3', 'bad-key'))
      .resolves.toEqual({ ok: false, code: 'auth', message: 'API Key 无效或无权限' });
  });

  it('reports an unsupported models endpoint', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({ status: 404, data: {} } as any);

    await expect(testRelayStationConnection('https://relay.example.com/api/v3', 'secret-key'))
      .resolves.toEqual({ ok: false, code: 'not_found', message: '中转站未提供 /models 接口' });
  });

  it('reports network and timeout failures', async () => {
    vi.spyOn(axios, 'get').mockRejectedValueOnce({ code: 'ECONNABORTED', message: 'timeout' });
    await expect(testRelayStationConnection('https://relay.example.com/api/v3', 'secret-key'))
      .resolves.toEqual({ ok: false, code: 'network', message: '中转站连接超时' });

    vi.spyOn(axios, 'get').mockRejectedValueOnce(new Error('socket failed'));
    await expect(testRelayStationConnection('https://relay.example.com/api/v3', 'secret-key'))
      .resolves.toEqual({ ok: false, code: 'network', message: '无法连接中转站，请检查 URL 和网络' });
  });
});
