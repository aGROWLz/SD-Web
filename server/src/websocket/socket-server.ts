import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyToken } from '../utils/jwt';

export class SocketServerManager {
  private static io: SocketServer;

  static initialize(httpServer: HttpServer): SocketServer {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: '*', // 生产环境应配置具体域名
        methods: ['GET', 'POST'],
      },
    });

    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const user = verifyToken(token);
        socket.data.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`User ${socket.data.user.userId} connected`);

      socket.join(`user:${socket.data.user.userId}`);

      socket.on('disconnect', () => {
        console.log(`User ${socket.data.user.userId} disconnected`);
      });
    });

    return this.io;
  }

  static getIO(): SocketServer {
    if (!this.io) {
      throw new Error('Socket.io not initialized');
    }
    return this.io;
  }
}
