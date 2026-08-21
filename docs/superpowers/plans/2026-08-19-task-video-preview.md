# 任务视频结果预览实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将创作页完成任务的右侧结果区改为本地首帧缩略图、点击后读取本地视频到浮窗播放并支持右上角下载。

**架构：** 服务端在项目视频存储旁生成 JPG 首帧并提供缩略图接口；前端新增专注的视频结果预览组件，内部管理缩略图、按需读取、弹窗和下载状态。时间线组件只传递任务 ID，完整视频只通过本地下载 API 读取。

**技术栈：** Vue 3、TypeScript、Element Plus、Vitest、ffmpeg-static

---

### 任务 1：定义结果预览行为

**文件：**
- 修改：`client/tests/create-task-card-layout.test.ts`

- [x] 添加失败测试，要求时间线使用 `TaskVideoPreview`，并要求新组件具有缩略图按钮、下载按钮、播放浮窗和关闭暂停行为。
- [x] 运行 `npm test -- --run client/tests/create-task-card-layout.test.ts`，确认因组件尚不存在或时间线仍直接渲染视频而失败。

### 任务 2：实现视频结果预览组件

**文件：**
- 创建：`client/src/components/create/TaskVideoPreview.vue`
- 修改：`client/src/components/create/ConversationTimeline.vue`

- [x] 使用本地首帧 JPG 作为缩略图，不在任务卡中挂载 `<video>`。
- [x] 点击缩略图读取本地 MP4 后打开 `el-dialog` 播放；关闭时暂停播放器并释放 Blob URL。
- [x] 在右上角使用 `Download` 图标调用 `tasksApi.downloadVideo(taskId)`，创建临时对象 URL 下载并在完成后释放。
- [x] 用 `TaskVideoPreview` 替换时间线内直接显示的 `<video controls>`。
- [x] 运行定向测试，确认通过。

### 任务 3：生成并提供本地首帧

**文件：**
- 创建：`server/src/services/video-thumbnail.service.ts`
- 创建：`server/src/services/video-storage.service.ts`
- 修改：`server/src/controllers/task.controller.ts`
- 修改：`server/src/routes/task.routes.ts`
- 修改：`server/src/queue/task-processor.ts`
- 修改：`client/src/api/tasks.ts`
- 修改：`package.json`
- 测试：`server/tests/video-thumbnail.test.ts`、`server/tests/video-storage.test.ts`

- [x] 任务完成下载本地 MP4 后提取并缓存同目录 JPG 首帧；提取失败不影响视频任务完成。
- [x] 新增带用户权限校验的 `GET /tasks/:id/thumbnail`，只返回 JPG，不返回完整视频。
- [x] 统一解析新旧 `localPath` 格式，避免重复拼接上传目录。
- [x] 前端首帧只调用缩略图接口，完整视频读取与下载都支持 `AbortSignal`。

### 任务 4：完整验证

**文件：**
- 验证：`client/src/components/create/TaskVideoPreview.vue`
- 验证：`client/src/components/create/ConversationTimeline.vue`

- [x] 运行 `npm test`，确认全部测试通过。
- [x] 运行 `npm --prefix client run build`，确认 TypeScript 与 Vite 构建通过。
- [x] 在创作页检查缩略图、弹窗播放、关闭暂停和下载按钮布局。
- [x] 运行 `git diff --check`，确认无空白错误。
