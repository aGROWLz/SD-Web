export type UserRoleValue = 'ADMIN' | 'USER';

export const normalizeRelayBaseUrl = (value: string): string => {
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
  parsed.pathname = normalizedPath.endsWith('/api/v3')
    ? normalizedPath
    : `${normalizedPath}/api/v3`.replace(/\/+/g, '/');
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
