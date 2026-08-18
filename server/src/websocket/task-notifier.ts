import { SocketServerManager } from './socket-server';

export class TaskNotifier {
  static emitTaskStatus(userId: string, taskId: string, status: string, data?: any) {
    try {
      const io = SocketServerManager.getIO();
      io.to(`user:${userId}`).emit('task:status', {
        taskId,
        status,
        timestamp: new Date().toISOString(),
        ...data,
      });
    } catch (error) {
      console.error('Failed to emit task status:', error);
    }
  }

  static emitTaskProgress(userId: string, taskId: string, progress: number) {
    try {
      const io = SocketServerManager.getIO();
      io.to(`user:${userId}`).emit('task:progress', {
        taskId,
        progress,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to emit task progress:', error);
    }
  }

  static emitQueuePosition(userId: string, taskId: string, position: number) {
    try {
      const io = SocketServerManager.getIO();
      io.to(`user:${userId}`).emit('queue:position', {
        taskId,
        position,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to emit queue position:', error);
    }
  }
}
