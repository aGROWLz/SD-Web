import axios from 'axios';

export type RelayStationConnectionCode = 'auth' | 'not_found' | 'network' | 'http';

export type RelayStationConnectionResult =
  | { ok: true }
  | { ok: false; code: RelayStationConnectionCode; message: string };

/**
 * Performs a read-only authentication probe. It deliberately avoids the
 * generation endpoint so testing a station can never create a task.
 */
export const testRelayStationConnection = async (
  baseUrl: string,
  apiKey: string,
): Promise<RelayStationConnectionResult> => {
  try {
    const response = await axios.get(`${baseUrl.replace(/\/+$/, '')}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 10000,
      validateStatus: () => true,
    });

    if (response.status >= 200 && response.status < 300) return { ok: true };
    if (response.status === 401 || response.status === 403) {
      return { ok: false, code: 'auth', message: 'API Key 无效或无权限' };
    }
    if (response.status === 404) {
      return { ok: false, code: 'not_found', message: '中转站未提供 /models 接口' };
    }

    return {
      ok: false,
      code: 'http',
      message: `中转站返回 HTTP ${response.status}`,
    };
  } catch (error: any) {
    if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
      return { ok: false, code: 'network', message: '中转站连接超时' };
    }
    return { ok: false, code: 'network', message: '无法连接中转站，请检查 URL 和网络' };
  }
};
