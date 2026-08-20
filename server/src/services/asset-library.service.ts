import type { AssetLibraryConfig } from '../domain/relay-station';

export type AssetType = 'Image' | 'Video' | 'Audio';

export type AssetLibraryInput = {
  publicUrl: string;
  filename: string;
  contentType: string;
};

export type AssetLibraryResult = {
  id: string;
  status: 'Pending' | 'Active' | 'Failed';
  /** Provider URL, when the provider includes one in its response. */
  url?: string;
  /** Original provider status, retained for diagnostics when available. */
  rawStatus?: string;
};

export class AssetLibraryError extends Error {
  readonly status: number;
  readonly code: string | number;

  constructor(status: number, code: string | number, message: string) {
    super(message);
    this.name = 'AssetLibraryError';
    this.status = status;
    this.code = code;
  }
}

type FetchImpl = typeof fetch;
type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
);

const readPath = (value: unknown, paths: string[][]): unknown => {
  for (const path of paths) {
    let current: unknown = value;
    for (const segment of path) {
      if (!current || typeof current !== 'object') {
        current = undefined;
        break;
      }
      current = (current as JsonRecord)[segment];
    }
    if (current !== undefined && current !== null && current !== '') return current;
  }
  return undefined;
};

const assetTypeForMime = (contentType: string): AssetType => {
  const match = /^([a-z]+)\/(.+)$/i.exec(contentType.trim());
  const prefix = match?.[1].toLowerCase();
  if (!match || !match[2].trim()) {
    throw new AssetLibraryError(0, 'INVALID_CONTENT_TYPE', '素材库仅支持图片、视频或音频 MIME 类型');
  }
  if (prefix === 'video') return 'Video';
  if (prefix === 'audio') return 'Audio';
  if (prefix === 'image') return 'Image';
  throw new AssetLibraryError(0, 'INVALID_CONTENT_TYPE', '素材库仅支持图片、视频或音频 MIME 类型');
};

const sanitizeMessage = (value: unknown, apiKey: string): string => {
  const message = typeof value === 'string' && value.trim() ? value.trim() : '素材库请求失败';
  return apiKey ? message.split(apiKey).join('[redacted]') : message;
};

const responseCode = (body: unknown): string | number | undefined => {
  const code = asRecord(body).code;
  return typeof code === 'string' || typeof code === 'number' ? code : undefined;
};

const isSuccessfulCode = (code: unknown): boolean => code === 0 || code === 'success';

const parseResult = (body: unknown, status: number, apiKey: string): AssetLibraryResult => {
  const root = asRecord(body);
  const code = responseCode(body);
  const idValue = readPath(body, [
    ['data', 'Id'], ['data', 'id'], ['data', 'asset_id'], ['id'], ['Id'],
  ]);
  const hasValidId = (typeof idValue === 'string' || typeof idValue === 'number') && Boolean(String(idValue).trim());

  if (code !== undefined && !isSuccessfulCode(code)) {
    const message = sanitizeMessage(root.message ?? root.msg ?? root.error, apiKey);
    throw new AssetLibraryError(status, code ?? 'BUSINESS_ERROR', message);
  }

  if (!hasValidId) {
    throw new AssetLibraryError(status, code ?? 'MISSING_ID', '素材库响应缺少素材 ID');
  }

  const statusValue = readPath(body, [['data', 'Status'], ['data', 'status'], ['Status'], ['status']]);
  const urlValue = readPath(body, [['data', 'URL'], ['data', 'url'], ['URL'], ['url']]);
  const rawStatus = typeof statusValue === 'string' ? statusValue : undefined;
  const normalizedStatus = normalizeStatus(rawStatus);

  return {
    id: String(idValue),
    status: normalizedStatus,
    ...(typeof urlValue === 'string' && urlValue ? { url: urlValue } : {}),
    ...(rawStatus ? { rawStatus } : {}),
  };
};

const normalizeStatus = (value: string | undefined): AssetLibraryResult['status'] => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'active' || normalized === 'success' || normalized === 'completed' || normalized === 'complete') {
    return 'Active';
  }
  if (normalized === 'failed' || normalized === 'failure' || normalized === 'error' || normalized === 'rejected' || normalized === 'cancelled' || normalized === 'canceled') {
    return 'Failed';
  }
  return 'Pending';
};

const requestHeaders = (config: AssetLibraryConfig, apiKey: string): Record<string, string> => ({
  [config.authHeader]: `${config.authPrefix}${config.authPrefix && !/\s$/.test(config.authPrefix) ? ' ' : ''}${apiKey}`,
  'Content-Type': 'application/json',
});

const parseResponse = async (response: Response, apiKey: string, signal?: AbortSignal): Promise<unknown> => {
  let body: unknown;
  try {
    body = await response.json();
  } catch (error: any) {
    if (signal?.aborted || error?.name === 'AbortError') throw error;
    throw new AssetLibraryError(response.status, 'INVALID_JSON', '素材库返回的响应格式无效');
  }

  if (!response.ok) {
    const record = asRecord(body);
    const code = responseCode(body) ?? response.status;
    throw new AssetLibraryError(response.status, code, sanitizeMessage(record.message ?? record.msg ?? record.error ?? `素材库请求失败（${response.status}）`, apiKey));
  }
  return body;
};

const execute = async (
  config: AssetLibraryConfig,
  apiKey: string,
  url: string,
  init: RequestInit,
  fetchImpl: FetchImpl,
): Promise<AssetLibraryResult> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal });
    const body = await parseResponse(response, apiKey, controller.signal);
    return parseResult(body, response.status, apiKey);
  } catch (error: any) {
    if (error instanceof AssetLibraryError) throw error;
    if (controller.signal.aborted) {
      throw new AssetLibraryError(0, 'TIMEOUT', '素材库请求超时');
    }
    throw new AssetLibraryError(0, 'NETWORK_ERROR', sanitizeMessage(error?.message, apiKey));
  } finally {
    clearTimeout(timeout);
  }
};

export const uploadAsset = async (
  config: AssetLibraryConfig,
  apiKey: string,
  input: AssetLibraryInput,
  fetchImpl: FetchImpl = fetch,
): Promise<AssetLibraryResult> => {
  const body: JsonRecord = {
    [config.fields.url]: input.publicUrl,
    [config.fields.assetType]: assetTypeForMime(input.contentType),
    [config.fields.name]: input.filename,
  };
  if (config.fields.projectName) {
    body[config.fields.projectName] = config.projectNameValue;
  }
  return execute(config, apiKey, config.uploadUrl, {
    method: 'POST',
    headers: requestHeaders(config, apiKey),
    body: JSON.stringify(body),
  }, fetchImpl);
};

export const queryAsset = async (
  config: AssetLibraryConfig,
  apiKey: string,
  assetId: string,
  fetchImpl: FetchImpl = fetch,
): Promise<AssetLibraryResult> => {
  const encodedId = encodeURIComponent(assetId);
  const url = config.queryUrl.includes('{id}')
    ? config.queryUrl.split('{id}').join(encodedId)
    : (() => {
      const parsed = new URL(config.queryUrl);
      parsed.pathname = `${parsed.pathname.replace(/\/+$/, '')}/${encodedId}`;
      return parsed.toString();
    })();
  return execute(config, apiKey, url, {
    method: 'GET',
    headers: requestHeaders(config, apiKey),
  }, fetchImpl);
};
