# R2 素材上传实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将本地创作素材改为生成时上传到管理员配置的 Cloudflare R2 Worker，并在未配置 R2 时仅允许图片回退为 Data URL。

**架构：** 管理员配置保存为服务端加密设置，普通用户永远不能读取 key。任务创建接口在校验后解析本地 Data URL：若 R2 已配置则通过 Worker 预签名 URL 上传并替换为公网 URL；若未配置仅保留图片 Data URL，音频和视频直接拒绝。前端只在点击生成时提交本地素材，并修复 `+` 菜单触发。

**技术栈：** Express、Prisma/PostgreSQL、AES 配置加密、Vue 3、Element Plus、Vitest、Cloudflare R2 Worker Presigned URL

---

## 文件结构

- 修改 `server/prisma/schema.prisma`：增加单例 `StorageSetting` 模型。
- 创建 Prisma migration：增加 R2 配置表。
- 创建 `server/src/services/r2-storage.service.ts`：读取配置、获取 Worker 预签名 URL、上传 Data URL、返回公网 URL。
- 修改 `server/src/controllers/admin.controller.ts` 与 `server/src/routes/admin.routes.ts`：管理员读取掩码配置、保存配置。
- 修改 `client/src/api/admin.ts` 与 `client/src/views/admin/AdminRelayStations.vue`：增加 R2 配置表单。
- 修改 `server/src/controllers/task.controller.ts`：任务创建时解析本地素材并替换 URL。
- 修改 `server/src/domain/seedance.ts`：导出素材遍历/回退判断所需纯函数。
- 修改 `client/src/views/Create.vue`：本地素材仅在生成时发送；本地图片可回退，音视频无 R2 时拦截。
- 修改 `client/src/components/create/CreateComposer.vue`：修复 `+` 按钮为可靠的显式菜单触发。
- 增加 `server/tests/r2-storage.test.ts`、`server/tests/task-material-upload.test.ts` 和前端表单测试。

### 任务 1：配置模型与 R2 服务

- [ ] 为 Worker URL、key 掩码、空配置和 Data URL 解析编写失败测试。
- [ ] 增加 `StorageSetting` 单例表和 migration。
- [ ] 实现 `getR2StorageConfig()`、`saveR2StorageConfig()`、`uploadDataUrlToR2()`。
- [ ] 使用 `encodeURIComponent` 处理文件名，Worker 请求为 `GET /get-upload-url?file=...&api_key=...`，预签名地址使用 `PUT` 并发送正确的 `Content-Type`。
- [ ] R2 配置不完整时返回“未配置”，不把 key 写入日志或响应。
- [ ] 运行服务端 R2 测试和 Prisma 生成，提交 `feat(素材): 接入 R2 Worker 上传服务`。

### 任务 2：管理员配置界面

- [ ] 为管理员 API 和权限路由编写失败测试。
- [ ] 增加 `GET /api/admin/storage` 和 `PUT /api/admin/storage`，仅管理员可访问，GET 只返回 `workerUrl`、`configured`、`keyMasked`。
- [ ] 在管理员中转站页面增加独立「素材存储」区域，提供 Worker URL、key 输入、保存和清除状态。
- [ ] 保存时不回显完整 key；空 key 表示保留原 key，显式清空使用单独清除动作。
- [ ] 运行前后端测试和客户端构建，提交 `feat(管理): 增加 R2 素材存储配置`。

### 任务 3：任务创建时上传与回退

- [ ] 编写失败测试：R2 配置存在时本地图片/音频/视频全部替换为公网 URL；R2 未配置时图片保留 Data URL；音频和视频抛出配置错误；远程 URL 和 `asset://` 原样保留；任何上传失败都不创建 Seedance 任务。
- [ ] 在任务控制器中新增 `prepareTaskParams()`，递归处理 `params.content`，限制支持的本地 Data URL MIME 类型和单文件大小，调用 R2 服务并构造新的 params。
- [ ] 在数据库创建任务和加入队列之前完成所有素材上传，上传失败直接返回 400/502，不创建任务记录。
- [ ] 保持规范化后的 API 字段、素材角色和现有权限/配额行为不变。
- [ ] 运行服务端全量测试，提交 `feat(任务): 生成时上传本地素材到 R2`。

### 任务 4：前端生成链路与 `+` 按钮

- [ ] 增加前端测试：未配置 R2 时图片允许生成、音频/视频显示明确错误；点击生成前不调用上传接口；提交请求仍包含本地 Data URL。
- [ ] 在创建页生成校验中保留图片回退规则；不在文件选择事件中上传网络。
- [ ] 将素材菜单改为按钮直接触发 `el-dropdown`，避免 Tooltip 嵌套导致点击失效；菜单明确包含图片、音频、视频 URL。
- [ ] 生成中锁定素材菜单和输入，失败时保留本地素材。
- [ ] 运行客户端测试与构建，提交 `fix(创作台): 修复素材入口并支持 R2 回退`。

### 任务 5：完整验证

- [ ] 运行根测试、前端测试、服务端构建和客户端构建。
- [ ] 手动验证管理员保存/清除 R2 配置，GET 不泄露完整 key。
- [ ] 手动验证无 R2 时图片可生成、音视频被拦截；有 R2 时三类本地素材只在点击生成后上传。
- [ ] 验证上传失败不产生任务记录，远程素材不重复上传。
- [ ] 检查桌面/移动端 `+` 菜单、管理员配置区和错误提示无溢出。
