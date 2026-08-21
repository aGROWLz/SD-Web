# 中转站连通测试实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在管理员中转站配置页提供不创建视频任务的 URL/API Key 连通测试。

**架构：** 后端新增只读探测服务，对规范化中转站地址发送 `GET /models` 并携带解密后的 Bearer Key；管理员接口返回结构化探测结果，外部站点失败不会影响管理员会话。前端为每个站点提供独立 loading 的“测试连通”操作并展示成功或具体失败原因。

**技术栈：** Express、Axios、Prisma、Vue 3、Element Plus、Vitest、TypeScript。

---

### 任务 1：连通探测服务

**文件：**
- 创建：`server/src/services/relay-station-connection.service.ts`
- 创建：`server/tests/relay-station-connection.test.ts`

- [x] **步骤 1：编写失败的测试**

覆盖成功请求、401/403 认证失败、404 未提供模型接口、超时/网络失败；断言请求使用 `GET /models`、Bearer Key 和超时配置。

- [x] **步骤 2：运行测试验证失败**

运行 `npx vitest run server/tests/relay-station-connection.test.ts`，预期因服务模块尚不存在而失败。

- [x] **步骤 3：编写最少实现代码**

使用 Axios 发起只读请求并把响应归一化为 `{ ok: true }` 或带 `code/message` 的失败结果，不创建任务。

- [x] **步骤 4：运行测试验证通过**

运行同一 Vitest 命令，预期所有探测服务测试通过。

### 任务 2：管理员接口

**文件：**
- 修改：`server/src/controllers/relay-station.controller.ts`
- 修改：`server/src/routes/relay-station.routes.ts`

- [x] **步骤 1：编写接口行为回归测试**

沿用现有路由/控制器测试约定，验证不存在的站点返回 404、成功探测不写入任务、外部失败以结构化结果返回且不泄露 Key。

- [x] **步骤 2：运行测试验证路由依赖**

运行对应测试，确认新路由尚未注册或控制器尚未实现。

- [x] **步骤 3：编写最少实现代码**

查询中转站、解密 Key、调用探测服务，并注册 `POST /:id/test`；只返回 `ok/code/message`，绝不返回明文 Key。

- [x] **步骤 4：运行服务端测试**

运行 `npm test -- --run`，预期服务端现有测试与新增测试通过。

### 任务 3：管理员前端操作

**文件：**
- 修改：`client/src/api/admin.ts`
- 修改：`client/src/views/admin/AdminRelayStations.vue`

- [x] **步骤 1：扩展 API 类型和方法**

增加 `testRelayStation(id)` 及结构化响应类型。

- [x] **步骤 2：增加操作按钮和状态**

在中转站操作栏增加“测试连通”，仅当前行显示 loading；成功和失败分别通过 `ElMessage` 提示。

- [x] **步骤 3：运行客户端测试和构建**

运行 `npm test -- --run`（工作目录 `client`）和 `npm run build`（工作目录 `client`），预期均通过。

### 任务 4：整体验证

- [x] **步骤 1：运行根目录测试**

运行 `npm test -- --run`，确认全量测试通过。

- [x] **步骤 2：运行服务端和客户端构建**

运行根目录 `npm run build` 与 `npm run build --prefix client`，确认 TypeScript 编译成功。
