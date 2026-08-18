# SeeDance2 视频生成平台设计规格说明

**日期：** 2026-08-18  
**项目名称：** SD-Web  
**项目类型：** 企业级 SaaS 视频生成平台

## 1. 项目概述

SeeDance2 视频生成平台是一个企业级 SaaS 应用，为用户提供基于 SeeDance2 API 的视频生成服务。平台支持多账号管理、并发任务处理、账号隔离，采用现代化的 Web 技术栈和高级 UI 设计。

### 1.1 核心特性

- **多账号管理**：支持平台托管 API Key 和用户自带 Key 两种模式
- **并发异步处理**：每个 API Key 独立队列，互不干扰
- **账号隔离**：用户数据完全隔离，确保安全性和隐私
- **高级 UI**：使用 UI/UX Pro Max skill 实现现代化界面
- **实时反馈**：WebSocket 推送任务状态变更

### 1.2 用户角色

- **Free 用户**：使用平台托管 Key，有配额限制
- **Premium 用户**：可绑定自己的 API Key，无配额限制
- **Admin 管理员**：管理平台 Key 池、用户和系统监控

## 2. 系统架构

### 2.1 整体架构

采用**单体应用 + 内置队列**架构（方案 A）：

```
用户浏览器 (React SPA)
    ↓ HTTP/WebSocket
Node.js 应用服务器
    ├─ Express API 层
    │   ├─ 用户认证 (JWT)
    │   ├─ 任务提交接口
    │   ├─ 任务状态查询
    │   └─ API Key 管理
    ├─ Bull Queue Manager
    │   ├─ Key1 独立队列
    │   ├─ Key2 独立队列
    │   └─ Platform Key 队列池
    └─ SeeDance2 Client
        ├─ API 调用封装
        ├─ 重试逻辑
        └─ 结果下载

外部依赖：
    ├─ Redis（任务队列 + 缓存）
    ├─ PostgreSQL（数据持久化）
    └─ 本地文件系统（视频存储）
```

### 2.2 架构优势

- **简单易维护**：单体应用，开发和部署效率高
- **成熟技术栈**：Bull + Express + React 生态完善
- **可演进**：后期流量增长可平滑升级到微服务架构
- **成本可控**：初期部署成本低

## 3. 数据库设计

### 3.1 用户表 (users)

| 字段          | 类型      | 说明                          |
| ------------- | --------- | ----------------------------- |
| id            | UUID      | 主键                          |
| email         | String    | 邮箱（唯一）                  |
| password_hash | String    | 密码哈希                      |
| role          | Enum      | 角色：admin/premium/free      |
| created_at    | Timestamp | 创建时间                      |
| updated_at    | Timestamp | 更新时间                      |

### 3.2 API Key 表 (api_keys)

| 字段       | 类型      | 说明                              |
| ---------- | --------- | --------------------------------- |
| id         | UUID      | 主键                              |
| name       | String    | Key 标识名称                      |
| key_value  | String    | API Key（加密存储）               |
| type       | Enum      | 类型：platform/user_owned         |
| owner_id   | UUID      | 所有者 ID（platform key 为 null） |
| is_active  | Boolean   | 是否启用                          |
| rate_limit | Integer   | 每分钟请求数限制                  |
| created_at | Timestamp | 创建时间                          |

### 3.3 任务表 (tasks)

| 字段          | 类型      | 说明                               |
| ------------- | --------- | ---------------------------------- |
| id            | UUID      | 主键                               |
| user_id       | UUID      | 用户 ID（外键）                    |
| api_key_id    | UUID      | 使用的 API Key（外键）             |
| status        | Enum      | pending/processing/completed/failed |
| prompt        | Text      | 用户输入的提示词                   |
| params        | JSONB     | SeeDance2 其他参数                 |
| result_url    | String    | 生成的视频 URL                     |
| local_path    | String    | 本地存储路径                       |
| error_message | Text      | 错误信息                           |
| started_at    | Timestamp | 开始时间                           |
| completed_at  | Timestamp | 完成时间                           |
| created_at    | Timestamp | 创建时间                           |

### 3.4 使用量统计表 (usage_logs)

| 字段       | 类型      | 说明                |
| ---------- | --------- | ------------------- |
| id         | UUID      | 主键                |
| user_id    | UUID      | 用户 ID（外键）     |
| api_key_id | UUID      | API Key ID（外键）  |
| task_id    | UUID      | 任务 ID（外键）     |
| cost       | Decimal   | 消耗的配额/积分     |
| created_at | Timestamp | 创建时间            |

## 4. 核心功能模块

### 4.1 认证模块 (Auth)

**功能：**
- 用户注册和登录
- JWT token 生成和验证
- 基于角色的权限控制（RBAC）
- 密码加密（bcrypt）

**接口：**
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 获取当前用户信息

### 4.2 API Key 管理模块

**功能：**
- 平台 Key 池管理（admin 专用）
- 用户自带 Key 绑定（premium 用户）
- Key 健康检查和自动禁用
- Key 使用量统计

**接口：**
- `GET /api/keys` - 获取我的 Key 列表
- `POST /api/keys` - 添加用户 Key（premium）
- `DELETE /api/keys/:id` - 删除 Key
- `GET /api/admin/keys` - 获取平台 Key 池（admin）
- `POST /api/admin/keys` - 添加平台 Key（admin）
- `PATCH /api/admin/keys/:id` - 更新 Key 状态（admin）

### 4.3 任务队列模块 (Queue)

**设计原则：**
- 每个 API Key 对应一个独立的 Bull 队列
- 任务提交时自动路由到对应队列
- 队列间完全隔离，互不干扰

**功能：**
- 任务入队和优先级管理
- 失败自动重试（最多 3 次）
- 任务超时处理（10 分钟超时）
- 队列监控和统计

**队列命名规则：**
- 平台 Key：`seedance2:key:{key_id}`
- 用户自带 Key：`seedance2:user:{user_id}:key:{key_id}`

### 4.4 SeeDance2 集成模块

**功能：**
- API 调用封装（提交任务、查询状态）
- 任务状态轮询（每 5 秒查询一次）
- 视频下载到本地文件系统
- 错误处理和日志记录
- 自动重试机制（网络错误、超时）

**SeeDance2 API 调用流程：**
1. 提交任务到 SeeDance2 API
2. 获取任务 ID
3. 轮询任务状态
4. 任务完成后下载视频文件
5. 更新数据库记录

**错误处理：**
- API Key 无效 → 禁用 Key，通知用户
- 配额不足 → 标记任务失败，提示充值
- 网络超时 → 自动重试
- 其他错误 → 记录日志，标记任务失败

### 4.5 任务管理模块

**功能：**
- 任务创建和提交
- 任务列表查询（分页、筛选）
- 任务详情查看
- 任务取消
- 视频下载

**接口：**
- `POST /api/tasks` - 创建任务
- `GET /api/tasks` - 获取任务列表
- `GET /api/tasks/:id` - 获取任务详情
- `DELETE /api/tasks/:id` - 取消任务
- `GET /api/tasks/:id/download` - 下载视频

### 4.6 WebSocket 实时通知

**功能：**
- 任务状态变更推送
- 队列位置更新
- 系统通知

**事件类型：**
- `task:status` - 任务状态变更
- `task:progress` - 任务进度更新
- `queue:position` - 队列位置变化

## 5. 前端设计

### 5.1 页面结构

**公共页面：**
- 登录页 (`/login`)
- 注册页 (`/register`)

**用户页面：**
- 仪表盘 (`/dashboard`)
  - 任务列表（实时状态）
  - 创建新任务表单
  - 使用量统计图表
- API Key 管理 (`/keys`) - premium 用户专用
- 个人设置 (`/settings`)

**管理员页面：**
- 平台 Key 管理 (`/admin/keys`)
- 用户管理 (`/admin/users`)
- 系统监控 (`/admin/monitor`)

### 5.2 UI 设计原则

- 使用 **UI/UX Pro Max skill** 实现现代化高级界面
- 响应式设计，支持桌面和移动端
- 暗色/亮色主题切换
- 流畅的动画和过渡效果

### 5.3 关键交互

- 任务提交后显示队列位置和预计等待时间
- 实时显示任务进度条
- 任务完成后自动刷新并显示视频预览
- 支持视频在线播放和下载
- 拖拽上传参考图片（如果 SeeDance2 支持）

## 6. 技术栈

### 6.1 后端技术栈

| 技术           | 用途                 |
| -------------- | -------------------- |
| Node.js 18+    | 运行时环境           |
| TypeScript     | 类型安全             |
| Express.js     | Web 框架             |
| Prisma         | ORM（数据库访问）    |
| Bull           | 任务队列（基于 Redis） |
| jsonwebtoken   | JWT 认证             |
| bcrypt         | 密码加密             |
| ws             | WebSocket 服务       |
| axios          | HTTP 客户端          |

### 6.2 前端技术栈

| 技术              | 用途                 |
| ----------------- | -------------------- |
| React 18+         | UI 框架              |
| TypeScript        | 类型安全             |
| Vite              | 构建工具             |
| React Router      | 路由管理             |
| TanStack Query    | 数据获取和缓存       |
| Zustand           | 状态管理             |
| Socket.io-client  | WebSocket 客户端     |
| UI/UX Pro Max     | 高级 UI 组件设计     |

### 6.3 数据库和缓存

| 技术          | 用途           |
| ------------- | -------------- |
| PostgreSQL 14+ | 主数据库       |
| Redis 6+      | 任务队列 + 缓存 |

### 6.4 开发工具

- ESLint + Prettier（代码规范）
- Docker + Docker Compose（容器化）
- Git（版本控制）

## 7. 部署方案

### 7.1 开发环境

使用 Docker Compose 一键启动：

```yaml
services:
  - app: Node.js 应用
  - postgres: PostgreSQL 数据库
  - redis: Redis 缓存和队列
```

### 7.2 生产环境

**部署方式：**
- PM2 进程管理（集群模式）
- Nginx 反向代理
- 静态文件 CDN（可选）

**监控和日志：**
- PM2 监控面板
- 应用日志（Winston）
- 错误追踪（可选：Sentry）

**数据备份：**
- PostgreSQL 每日自动备份
- 视频文件定期归档

## 8. 安全性设计

### 8.1 认证和授权

- JWT token 认证，token 有效期 24 小时
- 刷新 token 机制
- 基于角色的权限控制

### 8.2 数据安全

- API Key 加密存储（AES-256）
- 密码使用 bcrypt 加密（salt rounds: 10）
- HTTPS 传输加密

### 8.3 API 安全

- 请求频率限制（rate limiting）
- CORS 配置
- SQL 注入防护（Prisma ORM）
- XSS 防护

### 8.4 账号隔离

- 用户只能访问自己的任务和数据
- API Key 与用户严格绑定
- 队列隔离确保任务不互相干扰

## 9. 配额管理

### 9.1 Free 用户

- 使用平台托管 Key
- 每日配额限制：10 个任务
- 单任务最大时长：30 秒
- 队列优先级：低

### 9.2 Premium 用户

- 可绑定自己的 API Key
- 使用自己的 Key 时无配额限制
- 使用平台 Key 时配额更高：50 个任务/天
- 队列优先级：中

### 9.3 Admin 用户

- 完全访问权限
- 无配额限制
- 队列优先级：高

## 10. 性能优化

### 10.1 并发处理

- 每个 API Key 独立队列，最大化并发
- Bull 队列支持并发处理（concurrency: 3）
- Redis 连接池优化

### 10.2 缓存策略

- 任务状态缓存（Redis，TTL: 60s）
- 用户信息缓存（Redis，TTL: 5min）
- API Key 信息缓存

### 10.3 数据库优化

- 合理的索引设计
- 分页查询优化
- 连接池配置

## 11. 监控和运维

### 11.1 监控指标

- 任务成功率
- API Key 可用性
- 队列长度和等待时间
- 系统资源使用率（CPU、内存、磁盘）

### 11.2 日志管理

- 应用日志（访问日志、错误日志）
- 任务执行日志
- API 调用日志

### 11.3 告警机制

- API Key 失效告警
- 队列堆积告警
- 磁盘空间不足告警

## 12. 后续扩展

### 12.1 短期扩展（3 个月内）

- 用户计费系统（订阅和充值）
- 数据分析和报表
- 邮件通知

### 12.2 中期扩展（6 个月内）

- 多语言支持
- 视频编辑功能
- 批量任务处理

### 12.3 长期扩展（12 个月内）

- 微服务化改造
- 多区域部署
- AI 辅助提示词优化

## 13. 风险和挑战

### 13.1 技术风险

- **SeeDance2 API 稳定性**：第三方 API 可能不稳定，需要完善的重试和降级机制
- **并发压力**：高并发时可能需要扩展架构
- **视频存储成本**：本地存储空间有限，需要定期清理或迁移到云存储

### 13.2 业务风险

- **API Key 成本**：平台托管 Key 需要承担 API 调用成本
- **滥用风险**：需要完善的配额限制和滥用检测机制

### 13.3 应对措施

- 完善的错误处理和重试机制
- 监控告警系统
- 自动扩缩容方案（后期）
- 配额管理和反滥用策略

## 14. 项目里程碑

### Phase 1: 核心功能（4 周）
- Week 1: 项目初始化、数据库设计、基础认证
- Week 2: API Key 管理、任务队列基础架构
- Week 3: SeeDance2 集成、任务提交和处理
- Week 4: 基础前端界面（使用 UI/UX Pro Max skill）

### Phase 2: 完善功能（2 周）
- Week 5: WebSocket 实时通知、任务管理优化
- Week 6: 管理后台、监控和日志

### Phase 3: 测试和部署（2 周）
- Week 7: 集成测试、性能优化
- Week 8: 生产环境部署、文档编写

## 15. 总结

SeeDance2 视频生成平台采用成熟的单体应用架构，使用 JavaScript 全栈技术，重点实现多账号管理、并发任务处理和账号隔离。通过 Bull 队列实现每个 API Key 的独立队列，确保任务互不干扰。前端使用 UI/UX Pro Max skill 实现高级界面设计，提供流畅的用户体验。

该设计方案技术栈成熟、架构清晰、易于实现和维护，适合作为 MVP 快速上线，同时具备良好的可扩展性，可根据业务增长逐步演进。
