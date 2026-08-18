import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import authRoutes from './routes/auth.routes';
import keyRoutes from './routes/key.routes';
import adminRoutes from './routes/admin.routes';
import taskRoutes from './routes/task.routes';
import { SocketServerManager } from './websocket/socket-server';

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
app.use('/api/keys', keyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tasks', taskRoutes);

// 创建 HTTP 服务器
const httpServer = createServer(app);

// 初始化 WebSocket
SocketServerManager.initialize(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
