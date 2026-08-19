import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import taskRoutes from './routes/task.routes';
import relayStationRoutes from './routes/relay-station.routes';
import { SocketServerManager } from './websocket/socket-server';
import { initializeSocket } from './socket';
import { errorHandler } from './middlewares/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 注册路由
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/relay-stations', relayStationRoutes);
app.use('/api/tasks', taskRoutes);

// 全局错误处理中间件（必须在所有路由之后）
app.use(errorHandler);

// 创建 HTTP 服务器
const httpServer = createServer(app);

// 初始化 WebSocket（旧版）
SocketServerManager.initialize(httpServer);

// 初始化 Socket.IO（新版实时通知）
export const io = initializeSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server initialized`);
});
