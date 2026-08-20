export type UserRoleValue = 'ADMIN' | 'USER';

export type AssetLibraryProvider = 'KK' | 'XKU_P4';

export type AssetLibraryFieldMap = {
  url: string;
  assetType: string;
  name: string;
  projectName: string;
};

export type AssetLibraryConfig = {
  enabled: boolean;
  provider: AssetLibraryProvider;
  uploadUrl: string;
  queryUrl: string;
  authHeader: string;
  authPrefix: string;
  fields: AssetLibraryFieldMap;
  projectNameValue: string;
};

const ASSET_LIBRARY_DEFAULTS: Record<AssetLibraryProvider, Omit<AssetLibraryConfig, 'provider'>> = {
  KK: {
    enabled: true,
    uploadUrl: 'https://ai.kkidc.com/api/v2/assets',
    queryUrl: 'https://ai.kkidc.com/api/v2/assets/{id}',
    authHeader: 'Authorization',
    authPrefix: '',
    fields: { url: 'url', assetType: 'asset_type', name: 'name', projectName: '' },
    projectNameValue: 'default',
  },
  XKU_P4: {
    enabled: true,
    uploadUrl: 'https://api-ai.xku.com/ark/p4/v1/assets',
    queryUrl: 'https://api-ai.xku.com/ark/p4/v1/assets',
    authHeader: 'Authorization',
    authPrefix: '',
    fields: { url: 'URL', assetType: 'AssetType', name: 'Name', projectName: 'ProjectName' },
    projectNameValue: 'default',
  },
};

const normalizeAssetLibraryUrl = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`素材库 URL ${field} 不能为空`);
  const normalized = value.trim();
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`素材库 URL ${field} 无效`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error(`素材库 URL ${field} 仅支持 HTTP 或 HTTPS`);
  }
  if ([...normalized].some((character) => character.charCodeAt(0) < 0x20 || character.charCodeAt(0) === 0x7f)) {
    throw new Error(`素材库 URL ${field} 无效`);
  }
  return normalized.replace(/\/$/, '');
};

const normalizeAssetLibraryField = (value: unknown, field: string, allowEmpty = false): string => {
  if (typeof value !== 'string') throw new Error(`素材库字段 ${field} 必须是字符串`);
  const normalized = value.trim();
  if (!normalized && allowEmpty) return '';
  if (!normalized || normalized.length > 100 || !/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(normalized)) {
    throw new Error(`素材库字段 ${field} 格式不正确`);
  }
  return normalized;
};

export const normalizeAssetLibraryConfig = (value: unknown): AssetLibraryConfig | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('素材库配置必须是对象');
  const raw = value as Record<string, unknown>;
  if (Object.keys(raw).length === 0) return null;

  const provider = raw.provider;
  if (provider !== 'KK' && provider !== 'XKU_P4') throw new Error('素材库供应商必须是 KK 或 XKU_P4');
  const defaults = ASSET_LIBRARY_DEFAULTS[provider];
  const rawFields = raw.fields;
  if (rawFields !== undefined && (typeof rawFields !== 'object' || rawFields === null || Array.isArray(rawFields))) {
    throw new Error('素材库字段必须是对象');
  }
  const fields = (rawFields ?? {}) as Record<string, unknown>;
  if (raw.enabled !== undefined && typeof raw.enabled !== 'boolean') throw new Error('素材库 enabled 必须是布尔值');
  if (raw.authHeader !== undefined && typeof raw.authHeader !== 'string') throw new Error('素材库鉴权请求头必须是字符串');
  if (raw.authPrefix !== undefined && typeof raw.authPrefix !== 'string') throw new Error('素材库鉴权前缀必须是字符串');
  if (raw.projectNameValue !== undefined && typeof raw.projectNameValue !== 'string') throw new Error('素材库项目名称必须是字符串');

  return {
    enabled: raw.enabled ?? defaults.enabled,
    provider,
    uploadUrl: normalizeAssetLibraryUrl(raw.uploadUrl ?? defaults.uploadUrl, 'uploadUrl'),
    queryUrl: normalizeAssetLibraryUrl(raw.queryUrl ?? defaults.queryUrl, 'queryUrl'),
    authHeader: (raw.authHeader as string | undefined)?.trim() || defaults.authHeader,
    authPrefix: (raw.authPrefix as string | undefined)?.trim() ?? defaults.authPrefix,
    fields: {
      url: normalizeAssetLibraryField(fields.url ?? defaults.fields.url, 'url'),
      assetType: normalizeAssetLibraryField(fields.assetType ?? defaults.fields.assetType, 'assetType'),
      name: normalizeAssetLibraryField(fields.name ?? defaults.fields.name, 'name'),
      projectName: normalizeAssetLibraryField(fields.projectName ?? defaults.fields.projectName, 'projectName', true),
    },
    projectNameValue: (raw.projectNameValue as string | undefined)?.trim() ?? defaults.projectNameValue,
  };
};

export const SEEDANCE_MODELS = [
  'doubao-seedance-2-5',
  'doubao-seedance-2-0',
  'doubao-seedance-2-0-fast',
  'doubao-seedance-2-0-mini',
] as const;

export type SeedanceModelName = typeof SEEDANCE_MODELS[number];
export type SeedanceModelRedirects = Partial<Record<SeedanceModelName, string>>;

export const DEFAULT_SEEDANCE_API_MODELS: Record<SeedanceModelName, string> = {
  'doubao-seedance-2-0': 'doubao-seedance-2-0-260128',
  'doubao-seedance-2-0-fast': 'doubao-seedance-2-0-fast-260128',
  'doubao-seedance-2-0-mini': 'doubao-seedance-2-0-mini-260615',
  'doubao-seedance-2-5': 'doubao-seedance-2-5-260628',
};

export const normalizeModelRedirects = (value: unknown): SeedanceModelRedirects => {
  if (value === undefined || value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('模型重定向必须是对象');
  }

  const redirects: SeedanceModelRedirects = {};
  for (const [model, rawAlias] of Object.entries(value)) {
    if (!SEEDANCE_MODELS.includes(model as SeedanceModelName)) {
      throw new Error(`模型重定向包含不支持的模型：${model}`);
    }
    if (typeof rawAlias !== 'string') {
      throw new Error(`模型重定向 ${model} 必须是字符串`);
    }

    const alias = rawAlias.trim();
    if (!alias) continue;
    if (alias.length > 100 || /[\u0000-\u001F\u007F-\u009F]/.test(alias)) {
      throw new Error(`模型重定向 ${model} 格式不正确`);
    }
    redirects[model as SeedanceModelName] = alias;
  }

  return redirects;
};

export const redirectSeedanceModel = (
  params: Record<string, any>,
  value: unknown,
): Record<string, any> => {
  const redirected = { ...params };
  const model = params.model;
  if (typeof model !== 'string' || !SEEDANCE_MODELS.includes(model as SeedanceModelName)) {
    return redirected;
  }

  const standardModel = model as SeedanceModelName;
  const alias = normalizeModelRedirects(value)[standardModel];
  redirected.model = alias ?? DEFAULT_SEEDANCE_API_MODELS[standardModel];
  return redirected;
};

export const normalizeRelayBaseUrl = (value: string, appendApiV3 = true): string => {
  let parsed: URL;

  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error('请输入有效的中转站 URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('中转站 URL 仅支持 HTTP 或 HTTPS');
  }

  const normalizedPath = parsed.pathname.replace(/\/+$/, '');
  parsed.pathname = appendApiV3
    ? (normalizedPath.endsWith('/api/v3')
      ? normalizedPath
      : `${normalizedPath}/api/v3`.replace(/\/+/g, '/'))
    : normalizedPath;
  parsed.search = '';
  parsed.hash = '';

  return parsed.toString().replace(/\/$/, '');
};

export const assertGenerationAccessUpdate = (
  role: UserRoleValue,
  canGenerate: boolean,
): void => {
  if (role === 'ADMIN' && !canGenerate) {
    throw new Error('不能禁用管理员的生成权限');
  }
};

export const assertRelayStationState = (
  isPrimary: boolean,
  isActive: boolean,
): void => {
  if (isPrimary && !isActive) {
    throw new Error('主中转站不能停用，请先切换到其他主站');
  }
};

export const assertRelayStationCanDelete = (
  isPrimary: boolean,
  taskCount: number,
): void => {
  if (isPrimary) throw new Error('请先切换主站，再删除该中转站');
  if (taskCount > 0) throw new Error('已有任务使用该中转站，不能删除');
};
