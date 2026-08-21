# 中转站前缀与统一素材上传实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 增加站点级 API 前缀开关，并把三类素材入口统一为文件上传。

**架构：** Prisma 持久化 `appendApiV3`，后端规范化函数根据该字段决定是否补齐路径。创作台使用一个多选文件输入，通过纯函数识别媒体类型，继续复用提交时 R2 上传服务。

**技术栈：** Prisma、Express、Vue 3、Element Plus、Vitest、TypeScript。

---

### 任务 1：中转站前缀开关

**文件：**
- 修改：`server/src/domain/relay-station.ts`
- 修改：`server/src/controllers/relay-station.controller.ts`
- 修改：`server/src/middlewares/validator.ts`
- 修改：`server/prisma/schema.prisma`
- 创建：`server/prisma/migrations/20260819060000_add_relay_api_prefix_option/migration.sql`
- 修改：`server/tests/relay-station.test.ts`
- 修改：`client/src/api/admin.ts`
- 修改：`client/src/views/admin/AdminRelayStations.vue`

- [x] 写入关闭补齐时保留自定义路径的失败测试。
- [x] 运行测试确认因函数签名和行为缺失而失败。
- [x] 实现数据库字段、校验、序列化和表单开关。
- [x] 生成 Prisma Client 并运行服务端测试。

### 任务 2：统一素材文件选择器

**文件：**
- 修改：`client/src/features/create/seedance.ts`
- 修改：`client/src/views/Create.vue`
- 修改：`client/src/components/create/CreateComposer.vue`
- 修改：`client/tests/seedance-form.test.ts`
- 修改：`client/tests/create-composer-material-menu.test.ts`

- [x] 编写图片、音频、视频自动识别及单一入口的失败测试。
- [x] 运行测试确认失败。
- [x] 用一个多选文件输入替代分类菜单和视频 URL 对话框。
- [x] 运行客户端测试与构建。

### 任务 3：整体验证

- [x] 运行 Prisma 迁移。
- [x] 运行根目录与客户端全量测试。
- [x] 运行前后端构建并检查开发服务器加载最新组件。
