# 本地素材与任务预览实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将用户素材持久化到项目本地、让每个新任务从本地重新上传 R2，并在创作任务卡中显示媒体预览。

**架构：** 文件系统素材仓库用用户目录与内容哈希实现隔离去重，任务参数保存内部 URI；队列外发前将内部 URI 转换为当次 R2 URL。鉴权任务素材接口向 Vue 预览组件提供 Blob。

**技术栈：** TypeScript、Express、Prisma、Bull、Vue 3、Axios、Vitest

---

### 任务 1：本地素材仓库

**文件：**
- 创建：`server/src/services/local-asset.service.ts`
- 创建：`server/tests/local-asset.test.ts`

- [ ] 测试 Data URL 保存、相同内容去重、不同用户隔离和非法 URI 拒绝。
- [ ] 运行目标测试确认服务缺失导致红灯。
- [ ] 实现解析、哈希路径、原子落盘、读取和内部 URI 校验。
- [ ] 重跑目标测试确认通过。

### 任务 2：任务创建与每次 R2 重传

**文件：**
- 修改：`server/src/services/r2-storage.service.ts`
- 修改：`server/src/controllers/task.controller.ts`
- 修改：`server/src/queue/task-processor.ts`
- 修改：`server/src/domain/seedance.ts`
- 修改：`server/tests/task-material-upload.test.ts`

- [ ] 测试创建阶段将 Data URL 换成本地引用，外发阶段每次调用上传，并保持数据库参数不变。
- [ ] 运行目标测试确认失败。
- [ ] 实现本地准备与外发物化两个独立步骤，并接入控制器和队列。
- [ ] 重跑目标测试确认通过。

### 任务 3：鉴权预览接口

**文件：**
- 修改：`server/src/routes/task.routes.ts`
- 修改：`server/src/controllers/task.controller.ts`
- 创建：`server/tests/task-asset-preview.test.ts`

- [ ] 测试用户只能读取自己的任务素材，非本地素材返回明确错误。
- [ ] 运行测试确认路由/控制器缺失。
- [ ] 实现按任务内容下标解析与发送文件。
- [ ] 重跑目标测试确认通过。

### 任务 4：任务卡媒体预览与旧 URL 防护

**文件：**
- 创建：`client/src/components/create/TaskAssetPreview.vue`
- 修改：`client/src/components/create/ConversationTimeline.vue`
- 修改：`client/src/features/create/task-timeline.ts`
- 修改：`client/src/features/create/seedance.ts`
- 修改：`client/src/api/tasks.ts`
- 修改：`client/src/views/Create.vue`
- 修改：`client/tests/create-task-card-layout.test.ts`
- 修改：`client/tests/create-task-timeline.test.ts`

- [ ] 测试图片、视频、音频预览元素、固定边界和本地引用回填。
- [ ] 测试旧 HTTP 历史素材在编辑/重试时提示重新选择。
- [ ] 运行客户端目标测试确认失败。
- [ ] 实现 Blob 预览组件、任务卡布局和旧 URL 防护。
- [ ] 重跑客户端目标测试确认通过。

### 任务 5：完整验收

- [ ] 运行根目录和客户端全量测试。
- [ ] 运行根目录和客户端构建。
- [ ] 用浏览器检查桌面与移动视口下三类素材预览不超出任务卡。
