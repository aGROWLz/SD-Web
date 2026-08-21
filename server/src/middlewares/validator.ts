import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { normalizeModelRedirects } from '../domain/relay-station';

// 邮箱验证
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 密码验证 (至少8位，包含字母和数字)
export const validatePassword = (password: string): boolean => {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
};

// 注册验证中间件
export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    throw new AppError('邮箱和密码为必填项', 400);
  }

  if (!validateEmail(email)) {
    throw new AppError('邮箱格式不正确', 400);
  }

  if (!validatePassword(password)) {
    throw new AppError('密码至少8位，且包含字母和数字', 400);
  }

  if (role !== undefined && typeof role !== 'string') {
    throw new AppError('角色格式不正确', 400);
  }

  if (role && role.toUpperCase() !== 'USER') {
    throw new AppError('注册接口不允许指定管理员角色', 400);
  }

  next();
};

// 登录验证中间件
export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('邮箱和密码为必填项', 400);
  }

  if (!validateEmail(email)) {
    throw new AppError('邮箱格式不正确', 400);
  }

  next();
};

// 创建任务验证
export const validateCreateTask = (req: Request, res: Response, next: NextFunction) => {
  const { prompt } = req.body;

  if (prompt !== undefined && typeof prompt !== 'string') {
    throw new AppError('提示词格式不正确', 400);
  }

  const content = req.body.params?.content;
  if ((!prompt || !prompt.trim()) && (!Array.isArray(content) || content.length === 0)) {
    throw new AppError('提示词或参考素材至少需要填写一项', 400);
  }

  next();
};

export const validateRelayStation = (req: Request, res: Response, next: NextFunction) => {
  const { name, baseUrl, keyValue } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    throw new AppError('中转站名称至少需要2个字符', 400);
  }
  if (!baseUrl || typeof baseUrl !== 'string') {
    throw new AppError('中转站 URL 为必填项', 400);
  }
  if (keyValue !== undefined && typeof keyValue !== 'string') {
    throw new AppError('API Key 格式不正确', 400);
  }
  if (keyValue !== undefined && keyValue.trim().length > 0 && keyValue.trim().length < 10) {
    throw new AppError('API Key 长度不正确', 400);
  }
  if (req.body.isActive !== undefined && typeof req.body.isActive !== 'boolean') {
    throw new AppError('isActive 必须是布尔值', 400);
  }
  if (req.body.isPrimary !== undefined && typeof req.body.isPrimary !== 'boolean') {
    throw new AppError('isPrimary 必须是布尔值', 400);
  }
  if (req.body.appendApiV3 !== undefined && typeof req.body.appendApiV3 !== 'boolean') {
    throw new AppError('appendApiV3 必须是布尔值', 400);
  }
  if (req.body.assetLibraryConfig !== undefined && req.body.assetLibraryConfig !== null
    && (typeof req.body.assetLibraryConfig !== 'object' || Array.isArray(req.body.assetLibraryConfig))) {
    throw new AppError('素材库配置必须是对象或 null', 400);
  }
  try {
    normalizeModelRedirects(req.body.modelRedirects);
  } catch (error: any) {
    throw new AppError(error.message, 400);
  }
  next();
};

export const validateGenerationAccess = (req: Request, res: Response, next: NextFunction) => {
  if (typeof req.body.canGenerate !== 'boolean') {
    throw new AppError('canGenerate 必须是布尔值', 400);
  }
  next();
};

// UUID 验证
export const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// 路径参数 ID 验证
export const validateParamId = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const rawId = req.params[paramName];
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    
    if (!id) {
      throw new AppError(`参数 ${paramName} 为必填项`, 400);
    }

    if (!isValidUUID(id)) {
      throw new AppError(`参数 ${paramName} 格式不正确`, 400);
    }

    next();
  };
};
