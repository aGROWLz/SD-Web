import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

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

  if (role && !['USER', 'ADMIN'].includes(role.toUpperCase())) {
    throw new AppError('角色类型无效', 400);
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

  if (!prompt || typeof prompt !== 'string') {
    throw new AppError('提示词为必填项', 400);
  }

  if (prompt.trim().length < 10) {
    throw new AppError('提示词至少需要10个字符', 400);
  }

  if (prompt.length > 500) {
    throw new AppError('提示词不能超过500个字符', 400);
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
  next();
};

export const validateGenerationAccess = (req: Request, res: Response, next: NextFunction) => {
  if (typeof req.body.canGenerate !== 'boolean') {
    throw new AppError('canGenerate 必须是布尔值', 400);
  }
  next();
};

// 添加 API Key 验证
export const validateAddKey = (req: Request, res: Response, next: NextFunction) => {
  const { name, keyValue } = req.body;

  if (!name || typeof name !== 'string') {
    throw new AppError('密钥名称为必填项', 400);
  }

  if (name.trim().length < 2) {
    throw new AppError('密钥名称至少需要2个字符', 400);
  }

  if (!keyValue || typeof keyValue !== 'string') {
    throw new AppError('密钥值为必填项', 400);
  }

  if (keyValue.trim().length < 10) {
    throw new AppError('密钥值长度不正确', 400);
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
