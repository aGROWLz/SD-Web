# 中转站模型重定向实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为每个中转站提供四个 SeeDance 模型重定向配置，并在实际外发请求时应用。

**架构：** Prisma JSON 字段持久化映射，领域函数负责验证、规范化和参数转换，控制器负责输入输出，队列处理器只转换外发参数。Vue 管理弹窗编辑同一结构。

**技术栈：** TypeScript、Prisma、Express、Vitest、Vue 3、Element Plus

---

### 任务 1：领域行为与存储

**文件：**
- 修改：`server/tests/relay-station.test.ts`
- 修改：`server/src/domain/relay-station.ts`
- 修改：`server/prisma/schema.prisma`
- 创建：`server/prisma/migrations/20260819070000_add_relay_model_redirects/migration.sql`

- [x] 编写映射规范化和外发参数转换的失败测试。
- [x] 运行 `npm test -- server/tests/relay-station.test.ts`，确认因 API 缺失失败。
- [x] 实现类型、常量、规范化和转换纯函数，并增加 Prisma JSON 字段与迁移。
- [x] 重跑目标测试确认通过。

### 任务 2：管理接口

**文件：**
- 修改：`server/tests/relay-station-controller.test.ts`
- 修改：`server/tests/request-validation.test.ts`
- 修改：`server/src/controllers/relay-station.controller.ts`
- 修改：`server/src/middlewares/validator.ts`

- [x] 编写创建、更新、序列化和非法输入失败测试。
- [x] 运行目标测试确认预期失败。
- [x] 让控制器保存并返回规范化映射，让验证中间件拒绝无效结构。
- [x] 重跑目标测试确认通过。

### 任务 3：外发请求与管理端

**文件：**
- 修改：`server/src/queue/task-processor.ts`
- 修改：`server/src/services/seedance2.service.ts`
- 修改：`client/src/api/admin.ts`
- 修改：`client/src/views/admin/AdminRelayStations.vue`
- 创建：`client/tests/admin-relay-model-redirects.test.ts`

- [x] 编写管理端四个输入框、回填及保存载荷的失败结构测试。
- [x] 运行客户端目标测试确认失败。
- [x] 在队列提交点应用映射，并实现管理端类型与纵向表单。
- [x] 重跑客户端目标测试确认通过。

### 任务 4：生成与验收

- [x] 运行 `npm run prisma:generate`。
- [x] 运行根目录和客户端全量测试。
- [x] 运行根目录和客户端构建。
- [x] 在浏览器检查添加和编辑窗口的四个字段、布局及回填。
