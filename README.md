# SeeDance2 AIGC 视频生成平台

一个功能完善的 AIGC 视频生成平台，集成火山引擎 SeeDance2 API，支持多账号、并发处理、实时通知等企业级功能。

## 🌟 核心功能

### 用户功能
- ✅ **视频生成任务管理**
  - 文生视频：根据文本提示词生成视频
  - 图生视频：支持首帧、首尾帧生成
  - 多模态参考：支持图片、视频、音频作为参考
  - 实时任务状态推送（WebSocket）
  - 任务历史记录查看

- ✅ **API Key 管理**
  - 添加/删除个人 SeeDance2 API Key
  - 密钥加密存储（AES-256-GCM）
  - 密钥状态监控和自动禁用

- ✅ **高级参数配置**
  - 模型选择：Seedance 2.5 / 2.0 / 2.0 Fast / 2.0 Mini
  - 视频时长：4-30 秒或自动选择
  - 分辨率：480p / 720p / 1080p
  - 宽高比：16:9、9:16、1:1、自适应等
  - 音频：有声/无声视频
  - 优先级：0-9 级别控制

### 管理员功能
- ✅ **用户管理**
  - 查看所有用户列表
  - 用户角色管理（USER/ADMIN）
  - 用户状态控制

- ✅ **平台密钥管理**
  - 统一管理平台级 API Key
  - 密钥使用统计
  - 密钥限流控制

## 🏗️ 技术架构

### 前端技术栈
- **框架**: Vue 3 + TypeScript + Vite
- **UI 库**: Element Plus
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **HTTP 客户端**: Axios
- **实时通信**: Socket.IO Client
- **设计**: 深色电影主题 + 响应式布局

### 后端技术栈
- **运行时**: Node.js + TypeScript
- **框架**: Express.js
- **数据库**: PostgreSQL + Prisma ORM
- **队列**: Bull + Redis
- **实时通信**: Socket.IO
- **认证**: JWT
- **加密**: crypto（AES-256-GCM）
- **视频处理**: Axios（下载）

## 📁 项目结构

```
SD-Web/
├── client/                 # 前端项目
│   ├── src/
│   │   ├── api/           # API 接口模块
│   │   ├── components/    # 可复用组件
│   │   ├── composables/   # 组合式函数（useSocket）
│   │   ├── layouts/       # 布局组件
│   │   ├── router/        # 路由配置
│   │   ├── stores/        # Pinia 状态管理
│   │   ├── styles/        # 全局样式（深色主题）
│   │   └── views/         # 页面组件
│   └── package.json
│
├── server/                # 后端项目
│   ├── src/
│   │   ├── controllers/   # 控制器层
│   │   ├── middlewares/   # 中间件（认证、错误处理、验证）
│   │   ├── routes/        # 路由定义
│   │   ├── services/      # 业务逻辑层
│   │   │   ├── seedance2.service.ts     # SeeDance2 API 集成
│   │   │   ├── video-downloader.service.ts
│   │   │   └── key-encryption.service.ts
│   │   ├── queue/         # 任务队列处理
│   │   ├── socket/        # Socket.IO 服务器
│   │   ├── lib/           # 工具库（Prisma、Redis）
│   │   └── index.ts       # 入口文件
│   ├── prisma/
│   │   └── schema.prisma  # 数据库模型
│   └── package.json
│
├── SEEDANCE API.md        # SeeDance2 官方 API 文档
└── README.md              # 本文件
```

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- PostgreSQL >= 14
- Redis >= 6

### 1. 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd client && npm install

# 安装后端依赖
cd ../server && npm install
```

### 2. 配置环境变量

创建 `server/.env` 文件：

```env
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/seedance2"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# 密钥加密
ENCRYPTION_KEY="your-32-character-encryption-key-here-change-this"

# Redis
REDIS_URL="redis://localhost:6379"

# 服务器
PORT=3000
CLIENT_URL="http://localhost:5173"

# 文件存储
UPLOAD_DIR="./uploads"
VIDEO_STORAGE_DIR="./uploads/videos"
```

### 3. 初始化数据库

```bash
cd server
npx prisma migrate dev
npx prisma generate
```

### 4. 启动服务

**开发模式**：
```bash
# 启动后端（终端 1）
cd server && npm run dev

# 启动前端（终端 2）
cd client && npm run dev
```

**生产模式**：
```bash
# 构建前端
cd client && npm run build

# 启动后端
cd server && npm start
```

### 5. 访问应用

- 前端: http://localhost:5179
- 后端 API: http://localhost:3000

### 6. 创建管理员账号

首次运行后，注册的第一个用户会自动成为管理员。或使用 Prisma Studio 手动修改：

```bash
cd server
npx prisma studio
```

在 User 表中将目标用户的 `role` 字段改为 `ADMIN`。

## 🔑 SeeDance2 API 配置

1. 访问 [火山引擎控制台](https://console.volcengine.com/ark/region:cn-beijing/apiKey)
2. 创建 SeeDance2 API Key
3. 在平台中添加 API Key（个人密钥或平台密钥）

## 📊 数据库模型

### User（用户）
- id, email, password（bcrypt 加密）
- role: ADMIN / USER
- createdAt, updatedAt

### ApiKey（API 密钥）
- id, name, keyValue（AES-256-GCM 加密）
- userId（关联用户）
- isActive, rateLimit
- createdAt, updatedAt

### Task（视频任务）
- id, prompt, params（JSON）
- status: PENDING / PROCESSING / COMPLETED / FAILED
- videoUrl, localPath, errorMessage
- userId, apiKeyId
- createdAt, startedAt, completedAt

### UsageLog（使用日志）
- id, userId, apiKeyId, taskId
- cost, createdAt

## 🔐 安全特性

- ✅ JWT 认证
- ✅ 密码 bcrypt 哈希
- ✅ API Key AES-256-GCM 加密
- ✅ 输入验证（express-validator）
- ✅ SQL 注入防护（Prisma ORM）
- ✅ CORS 配置
- ✅ 错误信息脱敏

## 🎨 UI/UX 设计

采用深色电影主题，灵感来源于专业视频剪辑软件：

- **配色方案**: 温暖的暗色调 + 橙红色强调
- **字体**: Inter（UI）+ SF Mono（代码）
- **动画**: 流畅的过渡和悬浮效果
- **组件**: 卡片式布局 + 毛玻璃效果
- **响应式**: 支持各种屏幕尺寸

## 📡 实时通知

使用 Socket.IO 实现任务状态实时推送：

- **task:update**: 任务状态更新
- **task:completed**: 任务完成
- **task:failed**: 任务失败

## 🔄 任务处理流程

1. 用户创建任务 → 提交到后端
2. 后端创建数据库记录 → 加入 Bull 队列
3. 队列处理器获取任务 → 解密 API Key
4. 调用 SeeDance2 API → 提交视频生成任务
5. 轮询 SeeDance2 任务状态（每 5 秒）
6. 任务完成 → 下载视频到本地
7. 更新数据库 → 发送 WebSocket 通知
8. 用户收到实时通知 → 查看/下载视频

## 🐛 故障排查

### 前端页面全黑
- 检查浏览器控制台错误
- 确认后端 API 正常运行
- 检查 API 基础 URL 配置

### 任务一直处于 PENDING 状态
- 检查 Redis 是否运行
- 查看后端日志中的队列错误
- 确认 API Key 有效且未超限

### WebSocket 连接失败
- 检查后端 Socket.IO 服务是否启动
- 确认 CORS 配置正确
- 查看浏览器网络面板

### SeeDance2 API 调用失败
- 确认 API Key 有效且有余额
- 检查网络连接（需要访问火山引擎 API）
- 查看后端日志中的详细错误信息

## 📝 开发计划

- [ ] 图生视频功能（上传图片）
- [ ] 视频编辑功能
- [ ] 批量任务生成
- [ ] 任务模板系统
- [ ] 使用统计和数据分析
- [ ] 成本计算和预算控制
- [ ] 多语言支持

## 📄 许可证

MIT License

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

如有问题或建议，请提交 Issue。
