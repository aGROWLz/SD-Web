# 创作任务卡状态区与 R2 连通测试实现计划

> **面向 AI 代理的工作者：** 在当前会话内按 TDD 顺序执行，步骤使用复选框（`- [ ]`）跟踪进度。

**目标：** 用单条任务记录呈现生成全生命周期，并增加配置态 R2 Worker 连通测试。

**架构：** 客户端新增纯函数管理任务快照和状态映射，`Create.vue` 负责提交及事件绑定，`ConversationTimeline.vue` 只负责两列呈现和操作事件。服务端 R2 服务新增可注入 `fetch` 的探测函数，管理员控制器和 API 暴露结构化测试结果。

**技术栈：** Vue 3、Element Plus、TypeScript、Express、Vitest。

---

### 任务 1：任务记录模型与状态更新

**文件：**
- 创建：`client/src/features/create/task-timeline.ts`
- 创建：`client/tests/create-task-timeline.test.ts`

- [x] 编写快照深拷贝和按任务 ID 更新状态的失败测试。
- [x] 运行目标测试，确认因模块缺失而失败。
- [x] 实现任务记录类型、快照克隆、摘要和状态归并函数。
- [x] 运行目标测试确认通过。

### 任务 2：任务卡、状态窗口、编辑和重试

**文件：**
- 修改：`client/src/components/create/ConversationTimeline.vue`
- 修改：`client/src/views/Create.vue`
- 创建：`client/tests/create-task-card-layout.test.ts`

- [x] 编写左侧配置卡、右侧方形状态区、视频、失败原因和操作事件的失败测试。
- [x] 运行目标测试确认失败。
- [x] 重构时间线为单条任务记录并实现响应式布局。
- [x] 接入提交、编辑、重试和现有任务实时事件。
- [x] 运行客户端全量测试和构建。

### 任务 3：R2 Worker 连通测试

**文件：**
- 修改：`server/src/services/r2-storage.service.ts`
- 修改：`server/src/controllers/admin.controller.ts`
- 修改：`server/src/routes/admin.routes.ts`
- 修改：`server/tests/r2-storage.test.ts`
- 创建：`server/tests/r2-storage-controller.test.ts`
- 修改：`client/src/api/admin.ts`
- 修改：`client/src/views/admin/AdminRelayStations.vue`
- 创建：`client/tests/admin-storage-test.test.ts`

- [x] 编写成功、鉴权失败、网络失败、无效响应和控制器脱敏测试。
- [x] 运行目标测试确认失败。
- [x] 实现只获取上传地址、不写入对象的探测服务与管理员接口。
- [x] 增加管理员 R2 测试按钮、独立加载态和消息反馈。
- [x] 运行服务端和客户端目标测试确认通过。

### 任务 4：整体验证

- [x] 运行根目录与客户端全量测试。
- [x] 运行前后端构建。
- [x] 在桌面和移动视口验证任务记录布局、状态内容和按钮行为。
- [x] 检查 `git diff`，确认未修改 R2 401 业务处理或回滚既有改动。
