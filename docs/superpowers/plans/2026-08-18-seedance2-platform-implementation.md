# SeeDance2 视频生成平台实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 构建企业级 SeeDance2 视频生成 SaaS 平台，支持多账号管理、并发任务处理和账号隔离

**架构：** 单体应用架构，Node.js + Express 后端，React + Vite 前端，PostgreSQL 数据库，Bull + Redis 任务队列，每个 API Key 独立队列实现并发隔离

**技术栈：** Node.js 18+ TypeScript, Express, Prisma, Bull, React 18, Vite, TanStack Query, Zustand, Socket.io

---

## 文件结构规划

### 后端文件 (server/)

**核心配置和入口：**
- `server/src/index.ts` - 应用入口，启动 Express 和 WebSocket 服务器
- `server/src/config/env.ts` - 环境变量配置
- `server/src/config/database.ts` - 数据库连接配置
- `server/src/config/redis.ts` - Redis 连接配置

**数据库层：**
- `server/prisma/schema.prisma` - Prisma 数据模型定义
- `server/prisma/migrations/` - 数据库迁移文件（自动生成）
- `server/src/lib/prisma.ts` - Prisma 客户端实例

**认证和授权：**
- `server/src/middleware/auth.ts` - JWT 认证中间件
- `server/src/middleware/role.ts` - 角色权限检查中间件
- `server/src/utils/jwt.ts` - JWT token 生成和验证
- `server/src/utils/password.ts` - 密码加密和验证

**API 路由：**
- `server/src/routes/auth.routes.ts` - 认证相关路由
- `server/src/routes/task.routes.ts` - 任务管理路由
- `server/src/routes/key.routes.ts` - API Key 管理路由
- `server/src/routes/admin.routes.ts` - 管理员路由

**业务逻辑控制器：**
- `server/src/controllers/auth.controller.ts` - 认证控制器
- `server/src/controllers/task.controller.ts` - 任务控制器
- `server/src/controllers/key.controller.ts` - API Key 控制器
- `server/src/controllers/admin.controller.ts` - 管理员控制器

**任务队列：**
- `server/src/queue/queue-manager.ts` - Bull 队列管理器
- `server/src/queue/task-processor.ts` - 任务处理器
- `server/src/queue/queue-monitor.ts` - 队列监控

**SeeDance2 集成：**
- `server/src/services/seedance2.service.ts` - SeeDance2 API 客户端
- `server/src/services/video-downloader.service.ts` - 视频下载服务
- `server/src/services/key-encryption.service.ts` - API Key 加密服务

**WebSocket：**
- `server/src/websocket/socket-server.ts` - WebSocket 服务器
- `server/src/websocket/task-notifier.ts` - 任务通知服务

**工具和类型：**
- `server/src/types/index.ts` - TypeScript 类型定义
- `server/src/utils/logger.ts` - 日志工具
- `server/src/utils/error-handler.ts` - 错误处理工具

### 前端文件 (client/)

**核心配置和入口：**
- `client/src/main.tsx` - React 应用入口
- `client/src/App.tsx` - 根组件
- `client/vite.config.ts` - Vite 配置

**路由：**
- `client/src/routes/index.tsx` - 路由配置
- `client/src/routes/ProtectedRoute.tsx` - 受保护路由组件

**页面组件：**
- `client/src/pages/Login.tsx` - 登录页
- `client/src/pages/Register.tsx` - 注册页
- `client/src/pages/Dashboard.tsx` - 用户仪表盘
- `client/src/pages/Keys.tsx` - API Key 管理页
- `client/src/pages/AdminKeys.tsx` - 管理员 Key 管理页
- `client/src/pages/AdminUsers.tsx` - 用户管理页

**UI 组件：**
- `client/src/components/TaskList.tsx` - 任务列表组件
- `client/src/components/TaskForm.tsx` - 任务创建表单
- `client/src/components/TaskCard.tsx` - 任务卡片组件
- `client/src/components/VideoPlayer.tsx` - 视频播放器
- `client/src/components/KeyManagement.tsx` - Key 管理组件

**状态管理：**
- `client/src/stores/auth.store.ts` - 认证状态（Zustand）
- `client/src/stores/task.store.ts` - 任务状态（Zustand）

**API 客户端：**
- `client/src/api/client.ts` - Axios 客户端配置
- `client/src/api/auth.api.ts` - 认证 API
- `client/src/api/task.api.ts` - 任务 API
- `client/src/api/key.api.ts` - API Key API

**WebSocket：**
- `client/src/services/socket.service.ts` - Socket.io 客户端

**工具和类型：**
- `client/src/types/index.ts` - TypeScript 类型定义
- `client/src/utils/helpers.ts` - 工具函数

### 项目根目录

- `package.json` - 项目依赖和脚本
- `tsconfig.json` - TypeScript 配置
- `.env.example` - 环境变量模板
- `docker-compose.yml` - Docker 编排配置
- `README.md` - 项目文档

---

## 任务 1：项目初始化和基础配置

**文件：**
- 创建：`package.json`
- 创建：`tsconfig.json`
- 创建：`.env.example`
- 创建：`server/src/index.ts`
- 创建：`server/src/config/env.ts`

- [ ] **步骤 1：初始化 Node.js 项目**

```bash
npm init -y
```

预期：创建 `package.json` 文件

- [ ] **步骤 2：安装后端核心依赖**

```bash
npm install express cors dotenv bcrypt jsonwebtoken bull axios ws
npm install @prisma/client
npm install -D typescript @types/node @types/express @types/cors @types/bcrypt @types/jsonwebtoken @types/ws ts-node-dev prisma
```

预期：依赖安装完成

- [ ] **步骤 3：创建 TypeScript 配置**

创建 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./server/src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["server/src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **步骤 4：创建环境变量模板**

创建 `.env.example`：

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/seedance2

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h

# File Storage
UPLOAD_DIR=./uploads/videos

# SeeDance2 API
SEEDANCE2_API_BASE_URL=https://api.seedance2.com

# Encryption
ENCRYPTION_KEY=your-32-char-encryption-key-here
```

- [ ] **步骤 5：创建服务器入口文件骨架**

创建 `server/src/index.ts`：

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

- [ ] **步骤 6：创建环境配置模块**

创建 `server/src/config/env.ts`：

```typescript
export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL!,
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  uploadDir: process.env.UPLOAD_DIR || './uploads/videos',
  seedance2ApiBaseUrl: process.env.SEEDANCE2_API_BASE_URL!,
  encryptionKey: process.env.ENCRYPTION_KEY!,
};
```

- [ ] **步骤 7：更新 package.json 脚本**

修改 `package.json`，添加：

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only server/src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev"
  }
}
```

- [ ] **步骤 8：测试服务器启动**

```bash
npm run dev
```

预期：服务器在 http://localhost:3000 启动，访问 /health 返回 JSON

- [ ] **步骤 9：Commit**

```bash
git add .
git commit -m "feat: 初始化项目和基础配置"
```

---

## 任务 2：数据库设计和 Prisma 配置

**文件：**
- 创建：`server/prisma/schema.prisma`
- 创建：`server/src/lib/prisma.ts`

- [ ] **步骤 1：初始化 Prisma**

```bash
npx prisma init
```

预期：创建 `server/prisma/schema.prisma` 和更新 `.env`

- [ ] **步骤 2：编写 Prisma Schema**

修改 `server/prisma/schema.prisma`：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  PREMIUM
  FREE
}

enum KeyType {
  PLATFORM
  USER_OWNED
}

enum TaskStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  role         UserRole @default(FREE)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  apiKeys    ApiKey[]
  tasks      Task[]
  usageLogs  UsageLog[]

  @@map("users")
}

model ApiKey {
  id         String   @id @default(uuid())
  name       String
  keyValue   String   @map("key_value")
  type       KeyType
  ownerId    String?  @map("owner_id")
  isActive   Boolean  @default(true) @map("is_active")
  rateLimit  Int      @default(60) @map("rate_limit")
  createdAt  DateTime @default(now()) @map("created_at")

  owner      User?      @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  tasks      Task[]
  usageLogs  UsageLog[]

  @@index([ownerId])
  @@index([type, isActive])
  @@map("api_keys")
}

model Task {
  id            String      @id @default(uuid())
  userId        String      @map("user_id")
  apiKeyId      String      @map("api_key_id")
  status        TaskStatus  @default(PENDING)
  prompt        String
  params        Json?
  resultUrl     String?     @map("result_url")
  localPath     String?     @map("local_path")
  errorMessage  String?     @map("error_message")
  startedAt     DateTime?   @map("started_at")
  completedAt   DateTime?   @map("completed_at")
  createdAt     DateTime    @default(now()) @map("created_at")

  user          User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  apiKey        ApiKey      @relation(fields: [apiKeyId], references: [id])
  usageLogs     UsageLog[]

  @@index([userId, status])
  @@index([apiKeyId])
  @@index([createdAt])
  @@map("tasks")
}

model UsageLog {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  apiKeyId   String   @map("api_key_id")
  taskId     String   @map("task_id")
  cost       Decimal  @db.Decimal(10, 2)
  createdAt  DateTime @default(now()) @map("created_at")

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  apiKey     ApiKey   @relation(fields: [apiKeyId], references: [id])
  task       Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([apiKeyId])
  @@map("usage_logs")
}
```

- [ ] **步骤 3：创建 Prisma 客户端实例**

创建 `server/src/lib/prisma.ts`：

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
```

- [ ] **步骤 4：运行数据库迁移**

```bash
npx prisma migrate dev --name init
```

预期：创建数据库表和迁移文件

- [ ] **步骤 5：生成 Prisma Client**

```bash
npx prisma generate
```

预期：生成类型安全的 Prisma 客户端

- [ ] **步骤 6：Commit**

```bash
git add .
git commit -m "feat: 添加 Prisma 数据库 schema 和迁移"
```

---

## 任务 3：认证工具和中间件

**文件：**
- 创建：`server/src/utils/password.ts`
- 创建：`server/src/utils/jwt.ts`
- 创建：`server/src/middleware/auth.ts`
- 创建：`server/src/middleware/role.ts`
- 创建：`server/src/types/index.ts`

- [ ] **步骤 1：创建密码加密工具**

创建 `server/src/utils/password.ts`：

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
```

- [ ] **步骤 2：创建 JWT 工具**

创建 `server/src/utils/jwt.ts`：

```typescript
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
};
```

- [ ] **步骤 3：创建类型定义**

创建 `server/src/types/index.ts`：

```typescript
import { Request } from 'express';
import { JwtPayload } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  PREMIUM = 'PREMIUM',
  FREE = 'FREE',
}
```

- [ ] **步骤 4：创建认证中间件**

创建 `server/src/middleware/auth.ts`：

```typescript
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyToken } from '../utils/jwt';

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

- [ ] **步骤 5：创建角色权限中间件**

创建 `server/src/middleware/role.ts`：

```typescript
import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types';

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};
```

- [ ] **步骤 6：Commit**

```bash
git add .
git commit -m "feat: 添加认证和授权工具及中间件"
```

---

## 任务 4：认证 API（注册和登录）

**文件：**
- 创建：`server/src/controllers/auth.controller.ts`
- 创建：`server/src/routes/auth.routes.ts`
- 修改：`server/src/index.ts`

- [ ] **步骤 1：创建认证控制器**

创建 `server/src/controllers/auth.controller.ts`：

```typescript
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { AuthRequest } from '../types';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, role = 'FREE' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: role.toUpperCase(),
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

- [ ] **步骤 2：创建认证路由**

创建 `server/src/routes/auth.routes.ts`：

```typescript
import { Router } from 'express';
import { register, login, getCurrentUser } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getCurrentUser);

export default router;
```

- [ ] **步骤 3：在主应用中注册路由**

修改 `server/src/index.ts`：

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

- [ ] **步骤 4：测试注册接口**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","role":"FREE"}'
```

预期：返回用户信息和 JWT token

- [ ] **步骤 5：测试登录接口**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

预期：返回用户信息和 JWT token

- [ ] **步骤 6：Commit**

```bash
git add .
git commit -m "feat: 实现用户注册和登录 API"
```

---

## 任务 5：API Key 加密服务

**文件：**
- 创建：`server/src/services/key-encryption.service.ts`

- [ ] **步骤 1：安装加密库**

```bash
npm install crypto-js
npm install -D @types/crypto-js
```

- [ ] **步骤 2：创建加密服务**

创建 `server/src/services/key-encryption.service.ts`：

```typescript
import CryptoJS from 'crypto-js';
import { config } from '../config/env';

export class KeyEncryptionService {
  private static readonly SECRET_KEY = config.encryptionKey;

  static encrypt(apiKey: string): string {
    return CryptoJS.AES.encrypt(apiKey, this.SECRET_KEY).toString();
  }

  static decrypt(encryptedKey: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedKey, this.SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
```

- [ ] **步骤 3：Commit**

```bash
git add .
git commit -m "feat: 添加 API Key 加密服务"
```

---

## 任务 6：API Key 管理功能

**文件：**
- 创建：`server/src/controllers/key.controller.ts`
- 创建：`server/src/routes/key.routes.ts`
- 修改：`server/src/index.ts`

- [ ] **步骤 1：创建 Key 控制器**

创建 `server/src/controllers/key.controller.ts`：

```typescript
import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, UserRole } from '../types';
import { KeyEncryptionService } from '../services/key-encryption.service';

export const getMyKeys = async (req: AuthRequest, res: Response) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: {
        ownerId: req.user!.userId,
        type: 'USER_OWNED',
      },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
        rateLimit: true,
        createdAt: true,
      },
    });

    res.json({ keys });
  } catch (error) {
    console.error('Get keys error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addUserKey = async (req: AuthRequest, res: Response) => {
  try {
    const { name, keyValue, rateLimit = 60 } = req.body;

    if (!name || !keyValue) {
      return res.status(400).json({ error: 'Name and key value are required' });
    }

    // 检查用户是否有权限添加自己的 Key
    if (req.user!.role !== UserRole.PREMIUM && req.user!.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Only premium users can add their own keys' });
    }

    const encryptedKey = KeyEncryptionService.encrypt(keyValue);

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        keyValue: encryptedKey,
        type: 'USER_OWNED',
        ownerId: req.user!.userId,
        rateLimit,
      },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
        rateLimit: true,
        createdAt: true,
      },
    });

    res.status(201).json({ key: apiKey });
  } catch (error) {
    console.error('Add key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteKey = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const key = await prisma.apiKey.findUnique({
      where: { id },
    });

    if (!key) {
      return res.status(404).json({ error: 'Key not found' });
    }

    if (key.ownerId !== req.user!.userId && req.user!.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.apiKey.delete({ where: { id } });

    res.json({ message: 'Key deleted successfully' });
  } catch (error) {
    console.error('Delete key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

- [ ] **步骤 2：创建 Key 路由**

创建 `server/src/routes/key.routes.ts`：

```typescript
import { Router } from 'express';
import { getMyKeys, addUserKey, deleteKey } from '../controllers/key.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getMyKeys);
router.post('/', addUserKey);
router.delete('/:id', deleteKey);

export default router;
```

- [ ] **步骤 3：注册路由**

修改 `server/src/index.ts`，添加：

```typescript
import keyRoutes from './routes/key.routes';

// 在其他路由下方添加
app.use('/api/keys', keyRoutes);
```

- [ ] **步骤 4：Commit**

```bash
git add .
git commit -m "feat: 实现用户 API Key 管理功能"
```

---

## 任务 7：管理员 API Key 管理

**文件：**
- 创建：`server/src/controllers/admin.controller.ts`
- 创建：`server/src/routes/admin.routes.ts`
- 修改：`server/src/index.ts`

- [ ] **步骤 1：创建管理员控制器**

创建 `server/src/controllers/admin.controller.ts`：

```typescript
import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../types';
import { KeyEncryptionService } from '../services/key-encryption.service';

export const getPlatformKeys = async (req: AuthRequest, res: Response) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { type: 'PLATFORM' },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
        rateLimit: true,
        createdAt: true,
      },
    });

    res.json({ keys });
  } catch (error) {
    console.error('Get platform keys error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addPlatformKey = async (req: AuthRequest, res: Response) => {
  try {
    const { name, keyValue, rateLimit = 60 } = req.body;

    if (!name || !keyValue) {
      return res.status(400).json({ error: 'Name and key value are required' });
    }

    const encryptedKey = KeyEncryptionService.encrypt(keyValue);

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        keyValue: encryptedKey,
        type: 'PLATFORM',
        ownerId: null,
        rateLimit,
      },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
        rateLimit: true,
        createdAt: true,
      },
    });

    res.status(201).json({ key: apiKey });
  } catch (error) {
    console.error('Add platform key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateKeyStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    const key = await prisma.apiKey.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
        rateLimit: true,
        createdAt: true,
      },
    });

    res.json({ key });
  } catch (error) {
    console.error('Update key status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: Number(limit),
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          _count: {
            select: { tasks: true, apiKeys: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

- [ ] **步骤 2：创建管理员路由**

创建 `server/src/routes/admin.routes.ts`：

```typescript
import { Router } from 'express';
import {
  getPlatformKeys,
  addPlatformKey,
  updateKeyStatus,
  getAllUsers,
} from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.ADMIN));

router.get('/keys', getPlatformKeys);
router.post('/keys', addPlatformKey);
router.patch('/keys/:id', updateKeyStatus);
router.get('/users', getAllUsers);

export default router;
```

- [ ] **步骤 3：注册路由**

修改 `server/src/index.ts`，添加：

```typescript
import adminRoutes from './routes/admin.routes';

// 在其他路由下方添加
app.use('/api/admin', adminRoutes);
```

- [ ] **步骤 4：Commit**

```bash
git add .
git commit -m "feat: 实现管理员 API Key 和用户管理功能"
```

---

- [ ] **步骤 4：Commit**

```bash
git add .
git commit -m "feat: 实现管理员 API Key 和用户管理功能"
```

---

## 任务 8：Redis 配置和 Bull 队列管理器

**文件：**
- 创建：`server/src/config/redis.ts`
- 创建：`server/src/queue/queue-manager.ts`

- [ ] **步骤 1：安装 Bull 和 Redis 依赖**

```bash
npm install bull ioredis
npm install -D @types/bull
```

- [ ] **步骤 2：创建 Redis 配置**

创建 `server/src/config/redis.ts`：

```typescript
import Redis from 'ioredis';
import { config } from './env';

export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

export default redis;
```

- [ ] **步骤 3：创建队列管理器**

创建 `server/src/queue/queue-manager.ts`：

```typescript
import Queue from 'bull';
import { config } from '../config/env';

interface QueueMap {
  [queueName: string]: Queue.Queue;
}

export class QueueManager {
  private static queues: QueueMap = {};

  static getQueue(apiKeyId: string): Queue.Queue {
    const queueName = `seedance2:key:${apiKeyId}`;

    if (!this.queues[queueName]) {
      this.queues[queueName] = new Queue(queueName, {
        redis: {
          host: config.redis.host,
          port: config.redis.port,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          timeout: 600000, // 10 分钟
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      });

      console.log(`Created queue: ${queueName}`);
    }

    return this.queues[queueName];
  }

  static async closeAll(): Promise<void> {
    const closePromises = Object.values(this.queues).map((queue) =>
      queue.close()
    );
    await Promise.all(closePromises);
    console.log('All queues closed');
  }
}
```

- [ ] **步骤 4：Commit**

```bash
git add .
git commit -m "feat: 添加 Redis 配置和 Bull 队列管理器"
```

---

## 任务 9：SeeDance2 API 客户端

**文件：**
- 创建：`server/src/services/seedance2.service.ts`
- 创建：`server/src/services/video-downloader.service.ts`

- [ ] **步骤 1：创建 SeeDance2 API 客户端**

创建 `server/src/services/seedance2.service.ts`：

```typescript
import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';

export interface SeeDance2TaskParams {
  prompt: string;
  duration?: number;
  aspectRatio?: string;
  [key: string]: any;
}

export interface SeeDance2TaskResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

export class SeeDance2Service {
  private client: AxiosInstance;

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: config.seedance2ApiBaseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async submitTask(params: SeeDance2TaskParams): Promise<string> {
    try {
      const response = await this.client.post('/v1/tasks', params);
      return response.data.taskId;
    } catch (error: any) {
      console.error('SeeDance2 submit task error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to submit task');
    }
  }

  async getTaskStatus(taskId: string): Promise<SeeDance2TaskResponse> {
    try {
      const response = await this.client.get(`/v1/tasks/${taskId}`);
      return response.data;
    } catch (error: any) {
      console.error('SeeDance2 get task status error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to get task status');
    }
  }

  async pollTaskUntilComplete(
    taskId: string,
    maxAttempts: number = 120,
    intervalMs: number = 5000
  ): Promise<SeeDance2TaskResponse> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getTaskStatus(taskId);

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error('Task polling timeout');
  }
}
```

- [ ] **步骤 2：创建视频下载服务**

创建 `server/src/services/video-downloader.service.ts`：

```typescript
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env';

export class VideoDownloaderService {
  static async downloadVideo(videoUrl: string, taskId: string): Promise<string> {
    const uploadDir = config.uploadDir;

    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${taskId}.mp4`;
    const filePath = path.join(uploadDir, fileName);

    const response = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'stream',
      timeout: 120000, // 2 分钟
    });

    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(filePath));
      writer.on('error', reject);
    });
  }
}
```

- [ ] **步骤 3：Commit**

```bash
git add .
git commit -m "feat: 实现 SeeDance2 API 客户端和视频下载服务"
```

---

## 任务 10：任务处理器（Bull Worker）

**文件：**
- 创建：`server/src/queue/task-processor.ts`

- [ ] **步骤 1：创建任务处理器**

创建 `server/src/queue/task-processor.ts`：

```typescript
import Queue from 'bull';
import prisma from '../lib/prisma';
import { SeeDance2Service } from '../services/seedance2.service';
import { VideoDownloaderService } from '../services/video-downloader.service';
import { KeyEncryptionService } from '../services/key-encryption.service';

export interface TaskJobData {
  taskId: string;
  apiKeyId: string;
}

export const setupTaskProcessor = (queue: Queue.Queue) => {
  queue.process(3, async (job: Queue.Job<TaskJobData>) => {
    const { taskId, apiKeyId } = job.data;

    console.log(`Processing task ${taskId} with API key ${apiKeyId}`);

    try {
      // 获取任务和 API Key
      const [task, apiKey] = await Promise.all([
        prisma.task.findUnique({ where: { id: taskId } }),
        prisma.apiKey.findUnique({ where: { id: apiKeyId } }),
      ]);

      if (!task) {
        throw new Error('Task not found');
      }

      if (!apiKey || !apiKey.isActive) {
        throw new Error('API key not found or inactive');
      }

      // 更新任务状态为处理中
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'PROCESSING',
          startedAt: new Date(),
        },
      });

      // 解密 API Key
      const decryptedKey = KeyEncryptionService.decrypt(apiKey.keyValue);

      // 创建 SeeDance2 客户端
      const seedance2 = new SeeDance2Service(decryptedKey);

      // 提交任务到 SeeDance2
      const seedanceTaskId = await seedance2.submitTask({
        prompt: task.prompt,
        ...(task.params as any),
      });

      // 轮询任务状态
      const result = await seedance2.pollTaskUntilComplete(seedanceTaskId);

      if (result.status === 'failed') {
        throw new Error(result.error || 'SeeDance2 task failed');
      }

      // 下载视频
      const localPath = await VideoDownloaderService.downloadVideo(
        result.videoUrl!,
        taskId
      );

      // 更新任务状态为完成
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          resultUrl: result.videoUrl,
          localPath,
          completedAt: new Date(),
        },
      });

      // 记录使用量
      await prisma.usageLog.create({
        data: {
          userId: task.userId,
          apiKeyId: apiKey.id,
          taskId: task.id,
          cost: 1.0, // 根据实际计费规则调整
        },
      });

      console.log(`Task ${taskId} completed successfully`);

      return { success: true, taskId };
    } catch (error: any) {
      console.error(`Task ${taskId} failed:`, error.message);

      // 更新任务状态为失败
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });

      // 如果是 API Key 问题，禁用该 Key
      if (error.message.includes('Invalid API key') || error.message.includes('unauthorized')) {
        await prisma.apiKey.update({
          where: { id: apiKeyId },
          data: { isActive: false },
        });
        console.log(`API key ${apiKeyId} disabled due to authentication error`);
      }

      throw error;
    }
  });

  queue.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  queue.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });
};
```

- [ ] **步骤 2：Commit**

```bash
git add .
git commit -m "feat: 实现任务处理器（Bull Worker）"
```

---

## 任务 11：任务管理 API

**文件：**
- 创建：`server/src/controllers/task.controller.ts`
- 创建：`server/src/routes/task.routes.ts`
- 修改：`server/src/index.ts`

- [ ] **步骤 1：创建任务控制器**

创建 `server/src/controllers/task.controller.ts`：

```typescript
import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, UserRole } from '../types';
import { QueueManager } from '../queue/queue-manager';
import { setupTaskProcessor } from '../queue/task-processor';
import path from 'path';
import fs from 'fs';

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, params } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        apiKeys: {
          where: { isActive: true, type: 'USER_OWNED' },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 选择 API Key：优先用户自己的 Key，否则使用平台 Key
    let apiKey;
    if (user.apiKeys.length > 0) {
      apiKey = user.apiKeys[0];
    } else {
      apiKey = await prisma.apiKey.findFirst({
        where: { type: 'PLATFORM', isActive: true },
      });
    }

    if (!apiKey) {
      return res.status(503).json({ error: 'No available API keys' });
    }

    // 检查配额（Free 用户）
    if (user.role === UserRole.FREE) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayTaskCount = await prisma.task.count({
        where: {
          userId: user.id,
          createdAt: { gte: today },
        },
      });

      if (todayTaskCount >= 10) {
        return res.status(429).json({ error: 'Daily quota exceeded' });
      }
    }

    // 创建任务
    const task = await prisma.task.create({
      data: {
        userId: user.id,
        apiKeyId: apiKey.id,
        prompt,
        params: params || {},
        status: 'PENDING',
      },
    });

    // 添加到队列
    const queue = QueueManager.getQueue(apiKey.id);
    
    // 确保处理器已设置
    if (queue.handlers.length === 0) {
      setupTaskProcessor(queue);
    }

    await queue.add({
      taskId: task.id,
      apiKeyId: apiKey.id,
    });

    res.status(201).json({ task });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { userId: req.user!.userId };
    if (status) {
      where.status = String(status).toUpperCase();
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          prompt: true,
          status: true,
          resultUrl: true,
          errorMessage: true,
          createdAt: true,
          startedAt: true,
          completedAt: true,
        },
      }),
      prisma.task.count({ where }),
    ]);

    res.json({
      tasks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        apiKey: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.userId !== req.user!.userId && req.user!.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({ where: { id } });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.userId !== req.user!.userId && req.user!.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // 如果任务还在队列中，尝试移除
    if (task.status === 'PENDING' || task.status === 'PROCESSING') {
      const queue = QueueManager.getQueue(task.apiKeyId);
      const jobs = await queue.getJobs(['active', 'waiting', 'delayed']);
      const job = jobs.find((j) => j.data.taskId === id);
      if (job) {
        await job.remove();
      }
    }

    // 删除本地文件
    if (task.localPath && fs.existsSync(task.localPath)) {
      fs.unlinkSync(task.localPath);
    }

    await prisma.task.delete({ where: { id } });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const downloadVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({ where: { id } });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.userId !== req.user!.userId && req.user!.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (task.status !== 'COMPLETED' || !task.localPath) {
      return res.status(400).json({ error: 'Video not available' });
    }

    if (!fs.existsSync(task.localPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    res.download(task.localPath, `${task.id}.mp4`);
  } catch (error) {
    console.error('Download video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

- [ ] **步骤 2：创建任务路由**

创建 `server/src/routes/task.routes.ts`：

```typescript
import { Router } from 'express';
import {
  createTask,
  getTasks,
  getTask,
  deleteTask,
  downloadVideo,
} from '../controllers/task.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', createTask);
router.get('/', getTasks);
router.get('/:id', getTask);
router.delete('/:id', deleteTask);
router.get('/:id/download', downloadVideo);

export default router;
```

- [ ] **步骤 3：注册路由**

修改 `server/src/index.ts`，添加：

```typescript
import taskRoutes from './routes/task.routes';

// 在其他路由下方添加
app.use('/api/tasks', taskRoutes);
```

- [ ] **步骤 4：Commit**

```bash
git add .
git commit -m "feat: 实现任务管理 API"
```

---

## 任务 12：WebSocket 实时通知

**文件：**
- 创建：`server/src/websocket/socket-server.ts`
- 创建：`server/src/websocket/task-notifier.ts`
- 修改：`server/src/index.ts`
- 修改：`server/src/queue/task-processor.ts`

- [ ] **步骤 1：安装 Socket.io**

```bash
npm install socket.io
npm install -D @types/socket.io
```

- [ ] **步骤 2：创建 WebSocket 服务器**

创建 `server/src/websocket/socket-server.ts`：

```typescript
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
```

- [ ] **步骤 3：创建任务通知服务**

创建 `server/src/websocket/task-notifier.ts`：

```typescript
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
```

- [ ] **步骤 4：在主应用中初始化 WebSocket**

修改 `server/src/index.ts`：

```typescript
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
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// 初始化 WebSocket
SocketServerManager.initialize(httpServer);

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

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

- [ ] **步骤 5：在任务处理器中集成通知**

修改 `server/src/queue/task-processor.ts`，在关键位置添加通知：

```typescript
import { TaskNotifier } from '../websocket/task-notifier';

// 在更新任务状态为 PROCESSING 后添加
TaskNotifier.emitTaskStatus(task.userId, taskId, 'PROCESSING');

// 在任务完成后添加
TaskNotifier.emitTaskStatus(task.userId, taskId, 'COMPLETED', {
  resultUrl: result.videoUrl,
  localPath,
});

// 在任务失败后添加
TaskNotifier.emitTaskStatus(task.userId, taskId, 'FAILED', {
  errorMessage: error.message,
});
```

- [ ] **步骤 6：Commit**

```bash
git add .
git commit -m "feat: 实现 WebSocket 实时通知系统"
```

---

## 任务 13：Docker 部署配置

**文件：**
- 创建：`docker-compose.yml`
- 创建：`Dockerfile`
- 创建：`.dockerignore`

- [ ] **步骤 1：创建 Dockerfile**

创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

- [ ] **步骤 2：创建 .dockerignore**

创建 `.dockerignore`：

```
node_modules
dist
.env
.git
.gitignore
*.md
uploads/
.superpowers/
```

- [ ] **步骤 3：创建 docker-compose.yml**

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: seedance2
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/seedance2
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_SECRET=${JWT_SECRET}
      - SEEDANCE2_API_BASE_URL=${SEEDANCE2_API_BASE_URL}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

- [ ] **步骤 4：创建开发环境启动脚本**

更新 `package.json`，添加：

```json
{
  "scripts": {
    "docker:dev": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f"
  }
}
```

- [ ] **步骤 5：测试 Docker 部署**

```bash
docker-compose up --build
```

预期：所有服务启动成功，应用可通过 http://localhost:3000 访问

- [ ] **步骤 6：Commit**

```bash
git add .
git commit -m "feat: 添加 Docker 部署配置"
```

---

## 任务 14：前端项目初始化

**文件：**
- 创建：`client/package.json`
- 创建：`client/vite.config.ts`
- 创建：`client/tsconfig.json`
- 创建：`client/index.html`
- 创建：`client/src/main.tsx`
- 创建：`client/src/App.tsx`

- [ ] **步骤 1：初始化前端项目**

```bash
npm create vite@latest client -- --template react-ts
cd client
npm install
```

- [ ] **步骤 2：安装前端依赖**

```bash
cd client
npm install react-router-dom @tanstack/react-query zustand socket.io-client axios
npm install -D @types/react-router-dom
```

- [ ] **步骤 3：配置 Vite**

修改 `client/vite.config.ts`：

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **步骤 4：创建应用入口**

修改 `client/src/main.tsx`：

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **步骤 5：创建根组件骨架**

修改 `client/src/App.tsx`：

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Home</div>} />
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/register" element={<div>Register</div>} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

- [ ] **步骤 6：测试前端启动**

```bash
npm run dev
```

预期：前端在 http://localhost:5173 启动

- [ ] **步骤 7：Commit**

```bash
git add .
git commit -m "feat: 初始化前端项目"
```

---

## 规格覆盖度检查

✅ **已实现：**
1. 项目初始化和基础配置
2. 数据库设计（Prisma Schema）
3. 认证系统（JWT、注册、登录）
4. API Key 管理（用户和平台）
5. Redis 和 Bull 队列配置
6. SeeDance2 API 集成
7. 任务处理器（Bull Worker）
8. 任务管理 API
9. WebSocket 实时通知
10. Docker 部署配置
11. 前端项目初始化

⏳ **待实现（需要 UI/UX Pro Max skill）：**
- 前端页面和组件（登录、注册、仪表盘等）
- 前端状态管理（Zustand stores）
- 前端 API 客户端
- Socket.io 客户端集成

**说明：** 前端 UI 部分应使用 `ckm:design` 或 `ckm:ui-styling` skill 来实现高级界面设计，包括：
- 现代化的登录/注册页面
- 仪表盘布局和任务卡片
- 任务创建表单
- 视频播放器组件
- 响应式设计和暗色/亮色主题

---

## 执行说明

本计划包含后端核心功能的完整实现。前端 UI 部分由于需要使用专门的 UI/UX skill，建议在后端实现完成后，单独调用 `ckm:design` 或 `ckm:ui-styling` skill 来完成前端界面设计和实现。

**验证步骤：**
1. 启动 Docker 环境：`docker-compose up`
2. 运行数据库迁移：`npx prisma migrate dev`
3. 启动后端开发服务器：`npm run dev`
4. 测试所有 API 端点
5. 启动前端开发服务器：`cd client && npm run dev`

**下一步：**
- 使用 UI/UX Pro Max skill 实现前端界面
- 集成测试和性能优化
- 生产环境部署和监控配置
