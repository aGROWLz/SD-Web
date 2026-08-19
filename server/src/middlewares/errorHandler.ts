import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  // 处理自定义应用错误
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // 处理 Prisma 错误
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({
          error: '数据已存在，违反唯一性约束',
          field: err.meta?.target
        });
      case 'P2025':
        return res.status(404).json({
          error: '未找到相关记录'
        });
      case 'P2003':
        return res.status(400).json({
          error: '外键约束失败'
        });
      default:
        return res.status(400).json({
          error: '数据库操作失败',
          code: err.code
        });
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      error: '数据验证失败，请检查输入参数'
    });
  }

  // 处理 JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token 无效'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token 已过期'
    });
  }

  // 处理验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: '输入验证失败',
      details: err.message
    });
  }

  // 默认错误响应
  res.status(500).json({
    error: process.env.NODE_ENV === 'development' 
      ? err.message 
      : '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 异步路由处理器包装器
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
