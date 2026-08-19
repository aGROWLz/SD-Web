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
