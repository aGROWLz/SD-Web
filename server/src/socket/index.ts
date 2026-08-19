import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken } from '../utils/jwt';
import prisma from '../lib/prisma';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export const initializeSocket = (httpServer: HTTPServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // 认证中间件
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('认证失败：缺少 token'));
      }

      const decoded = verifyToken(token);
      socket.userId = decoded.userId;
      
      // 验证用户是否存在
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        return next(new Error('认证失败：用户不存在'));
      }

      next();
    } catch (error) {
      console.error('Socket 认证错误:', error);
      next(new Error('认证失败'));
    }
  });

  // 连接处理
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`用户连接: ${socket.userId}`);

    // 加入用户专属房间
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // 处理断开连接
    socket.on('disconnect', () => {
      console.log(`用户断开连接: ${socket.userId}`);
    });

    // 心跳检测
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  return io;
};

// 任务状态更新通知
export const notifyTaskUpdate = (io: SocketIOServer, userId: string, task: any) => {
  io.to(`user:${userId}`).emit('task:update', {
    id: task.id,
    status: task.status,
    videoUrl: task.videoUrl,
    errorMessage: task.errorMessage,
    updatedAt: task.updatedAt,
  });
};

// 任务完成通知
export const notifyTaskCompleted = (io: SocketIOServer, userId: string, task: any) => {
  io.to(`user:${userId}`).emit('task:completed', {
    id: task.id,
    videoUrl: task.videoUrl,
    prompt: task.prompt,
    completedAt: task.updatedAt,
  });
};

// 任务失败通知
export const notifyTaskFailed = (io: SocketIOServer, userId: string, task: any) => {
  io.to(`user:${userId}`).emit('task:failed', {
    id: task.id,
    errorMessage: task.errorMessage,
    prompt: task.prompt,
    failedAt: task.updatedAt,
  });
};

// 全局系统通知（仅管理员）
export const notifyAdmins = (io: SocketIOServer, message: string, data?: any) => {
  io.emit('admin:notification', {
    message,
    data,
    timestamp: new Date(),
  });
};
