# Seedance 完整创作台与中转站管理实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现完整多模态 Seedance 创作台、管理员统一中转站、用户生成权限和一致的响应式界面。

**架构：** 将 Seedance 参数能力与校验抽成无框架依赖的领域模块，Controller 负责权限和持久化，任务处理器按任务绑定的中转站调用兼容 API。前端使用同一能力表驱动模式、参数和素材联动，管理端通过专用 REST API 管理主站与用户开关。

**技术栈：** Vue 3、TypeScript、Element Plus、Express、Prisma、Bull、Axios、Vitest、PostgreSQL

---

## 文件结构

- 创建 `server/src/domain/seedance.ts`：官方参数类型、模型能力、正规化和组合校验。
- 创建 `server/src/domain/relay-station.ts`：主站切换和 URL 正规化的纯规则。
- 创建 `server/src/controllers/relay-station.controller.ts`：管理员中转站 CRUD。
- 创建 `server/src/routes/relay-station.routes.ts`：管理员中转站路由。
- 创建 `server/tests/seedance.test.ts`：参数与素材组合测试。
- 创建 `server/tests/relay-station.test.ts`：URL 与主站规则测试。
- 创建 `client/src/features/create/seedance.ts`：创作表单类型、能力表和请求构建器。
- 创建 `client/src/views/admin/AdminRelayStations.vue`：中转站管理页面。
- 创建 `client/tests/seedance-form.test.ts`：前端请求构建测试。
- 修改 `server/prisma/schema.prisma`：中转站、生成权限和任务关联。
- 修改 `server/src/controllers/task.controller.ts`：权限、主站选择和完整参数保存。
- 修改 `server/src/controllers/admin.controller.ts`：真实用户生成权限更新。
- 修改 `server/src/services/seedance2.service.ts`：自定义 Base URL 和完整请求。
- 修改 `server/src/queue/task-processor.ts`：原样提交正规化参数并使用绑定站点。
- 修改 `server/src/middlewares/validator.ts`：新接口字段校验。
- 修改 `server/src/routes/admin.routes.ts`：注册用户权限和中转站路由。
- 修改 `client/src/views/Create.vue`：重建为专业多模态创作台。
- 修改 `client/src/views/admin/AdminUsers.vue`：真实权限开关。
- 修改 `client/src/layouts/DefaultLayout.vue`、`client/src/router/index.ts`：移除用户密钥并调整导航。
- 修改 `client/src/styles/theme.css`、`client/src/style.css`：统一全局视觉系统。
- 修改 `client/src/views/Dashboard.vue`、`client/src/views/Keys.vue`、`client/src/views/Login.vue`、`client/src/views/Register.vue`：统一页面层级和响应式表现。

### 任务 1：建立 Seedance 参数领域规则

**文件：**

- 创建：`server/src/domain/seedance.ts`
- 创建：`server/tests/seedance.test.ts`
- 修改：`package.json`

- [ ] **步骤 1：安装测试运行器并添加测试脚本**

```json
{
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.2.4"
  }
}
```

- [ ] **步骤 2：编写失败的模型能力与组合测试**

```ts
import { describe, expect, it } from 'vitest';
import { normalizeSeedanceRequest } from '../src/domain/seedance';

describe('normalizeSeedanceRequest', () => {
  it('rejects 1080p for the fast model', () => {
    expect(() => normalizeSeedanceRequest('prompt', {
      model: 'doubao-seedance-2-0-fast',
      content: [{ type: 'text', text: 'prompt' }],
      resolution: '1080p'
    })).toThrow('该模型不支持 1080p');
  });

  it('forces edit tasks to adaptive ratio and automatic duration', () => {
    const result = normalizeSeedanceRequest('edit the colors', {
      model: 'doubao-seedance-2-5',
      content: [{ type: 'video_url', video_url: { url: 'https://cdn.test/a.mp4' }, role: 'reference_video' }],
      omni_reference_task_type: 'edit',
      ratio: '16:9',
      duration: 10
    });
    expect(result.ratio).toBe('adaptive');
    expect(result.duration).toBe(-1);
  });
});
```

- [ ] **步骤 3：运行测试并确认因模块缺失而失败**

运行：`npm test -- server/tests/seedance.test.ts`  
预期：FAIL，无法解析 `server/src/domain/seedance.ts`。

- [ ] **步骤 4：实现参数类型、能力矩阵、素材数量和互斥校验**

```ts
export const MODEL_CAPABILITIES = {
  'doubao-seedance-2-5': { resolutions: ['480p', '720p', '1080p'], minDuration: 4, maxDuration: 30 },
  'doubao-seedance-2-0': { resolutions: ['480p', '720p', '1080p', '4k'], minDuration: 4, maxDuration: 15 },
  'doubao-seedance-2-0-fast': { resolutions: ['480p', '720p'], minDuration: 4, maxDuration: 15 },
  'doubao-seedance-2-0-mini': { resolutions: ['480p', '720p'], minDuration: 4, maxDuration: 15 }
} as const;
```

实现时覆盖文本覆盖、URL 协议、角色组合、2.0 仅音频限制、任务类型锁定、分辨率与时长范围。

- [ ] **步骤 5：运行测试确认通过**

运行：`npm test -- server/tests/seedance.test.ts`  
预期：所有 Seedance 领域测试 PASS。

### 任务 2：建立中转站数据与权限

**文件：**

- 修改：`server/prisma/schema.prisma`
- 创建：`server/prisma/migrations/20260819_add_relay_stations/migration.sql`
- 创建：`server/src/domain/relay-station.ts`
- 创建：`server/tests/relay-station.test.ts`

- [ ] **步骤 1：编写失败的 URL 正规化测试**

```ts
it('normalizes a relay base URL without duplicating api/v3', () => {
  expect(normalizeRelayBaseUrl('https://relay.test/api/v3/')).toBe('https://relay.test/api/v3');
});

it('rejects unsupported URL protocols', () => {
  expect(() => normalizeRelayBaseUrl('file:///tmp/api')).toThrow('中转站 URL');
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：`npm test -- server/tests/relay-station.test.ts`  
预期：FAIL，`normalizeRelayBaseUrl` 尚不存在。

- [ ] **步骤 3：实现 URL 规则并扩展 Prisma 模型**

```prisma
model RelayStation {
  id              String   @id @default(uuid())
  name            String
  baseUrl         String   @map("base_url")
  apiKeyEncrypted String   @map("api_key_encrypted")
  isActive        Boolean  @default(true) @map("is_active")
  isPrimary       Boolean  @default(false) @map("is_primary")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  tasks           Task[]
  usageLogs       UsageLog[]
  @@map("relay_stations")
}
```

`User` 增加 `canGenerate Boolean @default(true)`；`Task` 和 `UsageLog` 增加可迁移的 `relayStationId` 关联，旧记录允许为空，新任务必须在业务层绑定站点。

- [ ] **步骤 4：生成 Prisma Client 并运行领域测试**

运行：`npm run prisma:generate && npm test -- server/tests/relay-station.test.ts`  
预期：Prisma 生成成功，测试 PASS。

### 任务 3：实现管理员中转站与用户权限 API

**文件：**

- 创建：`server/src/controllers/relay-station.controller.ts`
- 创建：`server/src/routes/relay-station.routes.ts`
- 修改：`server/src/controllers/admin.controller.ts`
- 修改：`server/src/routes/admin.routes.ts`
- 修改：`server/src/middlewares/validator.ts`

- [ ] **步骤 1：为主站切换事务和管理员保护编写失败测试**

测试纯函数应拒绝将管理员更新为 `canGenerate=false`，并生成「先清除旧主站、再设置目标站」的事务输入。

- [ ] **步骤 2：运行测试确认规则缺失**

运行：`npm test -- server/tests/relay-station.test.ts`  
预期：FAIL，主站与管理员保护规则尚未实现。

- [ ] **步骤 3：实现中转站 CRUD、主站切换和用户权限接口**

主站更新使用：

```ts
await prisma.$transaction([
  prisma.relayStation.updateMany({ data: { isPrimary: false } }),
  prisma.relayStation.update({ where: { id }, data: { isPrimary: true, isActive: true } })
]);
```

列表仅返回 `apiKeyMasked`，编辑时空 Key 保留原密文。删除被历史任务引用的站点返回 409。

- [ ] **步骤 4：运行领域测试和 TypeScript 构建**

运行：`npm test && npm run build`  
预期：测试 PASS，服务端 TypeScript 无错误。

### 任务 4：接通完整任务参数和动态 Base URL

**文件：**

- 修改：`server/src/controllers/task.controller.ts`
- 修改：`server/src/services/seedance2.service.ts`
- 修改：`server/src/queue/task-processor.ts`
- 修改：`server/src/middlewares/validator.ts`

- [ ] **步骤 1：编写失败的请求透传测试**

```ts
it('preserves official snake_case fields', () => {
  const result = normalizeSeedanceRequest('prompt', {
    model: 'doubao-seedance-2-5',
    content: [{ type: 'text', text: 'stale' }],
    generate_audio: false,
    watermark: true,
    output_format: 'mov'
  });
  expect(result).toMatchObject({ generate_audio: false, watermark: true, output_format: 'mov' });
  expect(result.content[0]).toMatchObject({ type: 'text', text: 'prompt' });
});
```

- [ ] **步骤 2：运行测试确认旧参数路径不满足断言**

运行：`npm test -- server/tests/seedance.test.ts`  
预期：FAIL，完整参数正规化尚未接通。

- [ ] **步骤 3：更新任务创建、处理器和服务构造函数**

`createTask` 检查 `canGenerate` 和主站，将正规化后的完整请求写入 `params` 并保存 `relayStationId`。`SeeDance2Service` 构造函数接收 `baseUrl` 与 Key，处理器不再调用简化的 `createTextToVideoTask`。

- [ ] **步骤 4：运行测试和服务端构建**

运行：`npm test && npm run build`  
预期：全部测试 PASS，服务端构建通过。

### 任务 5：实现前端请求构建器与专业创作台

**文件：**

- 创建：`client/src/features/create/seedance.ts`
- 创建：`client/tests/seedance-form.test.ts`
- 修改：`client/src/api/tasks.ts`
- 修改：`client/src/views/Create.vue`

- [ ] **步骤 1：添加客户端测试脚本并编写失败测试**

```ts
it('builds first and last frame content with official roles', () => {
  const request = buildTaskRequest({
    mode: 'frames',
    prompt: 'camera moves forward',
    firstFrame: 'data:image/png;base64,AA',
    lastFrame: 'asset://last'
  });
  expect(request.params.content).toEqual([
    { type: 'text', text: 'camera moves forward' },
    { type: 'image_url', image_url: { url: 'data:image/png;base64,AA' }, role: 'first_frame' },
    { type: 'image_url', image_url: { url: 'asset://last' }, role: 'last_frame' }
  ]);
});
```

- [ ] **步骤 2：运行客户端测试确认失败**

运行：`npm --prefix client test -- client/tests/seedance-form.test.ts`  
预期：FAIL，请求构建器不存在。

- [ ] **步骤 3：实现表单状态、素材转换、模型联动和请求构建器**

能力表与服务端保持同名字段；切换模式时只清理不兼容素材，不清空提示词。Data URL 转换在选择文件时执行，并显示文件名、类型和删除按钮。

- [ ] **步骤 4：重建 `Create.vue`**

实现模式标签、提示词、素材区、参数检查器、字段级错误、请求摘要、无权限状态和提交成功跳转。删除聊天消息、课程图片、假进度和未工作的历史弹窗。

- [ ] **步骤 5：运行客户端测试与构建**

运行：`npm --prefix client test && npm --prefix client run build`  
预期：客户端测试 PASS，Vite 构建成功。

### 任务 6：更新管理员后台和导航

**文件：**

- 创建：`client/src/views/admin/AdminRelayStations.vue`
- 修改：`client/src/views/admin/AdminUsers.vue`
- 修改：`client/src/api/admin.ts`
- 修改：`client/src/layouts/DefaultLayout.vue`
- 修改：`client/src/router/index.ts`

- [ ] **步骤 1：定义真实 API 类型和方法**

新增 `RelayStation`、`CreateRelayStationData`、`UpdateRelayStationData`、`updateGenerationAccess` 和中转站 CRUD 方法，删除管理页面对 `keysApi` 的依赖。

- [ ] **步骤 2：实现中转站表格和编辑对话框**

表格显示主站、状态、URL、掩码 Key 和任务数；所有危险操作使用确认框，设为主站后刷新列表。

- [ ] **步骤 3：将用户页改成真实生成权限开关**

删除未实现的新增、删除和编辑按钮。开关失败时恢复原值，管理员自身开关禁用。

- [ ] **步骤 4：更新导航与路由**

删除 `/my-keys`，将 `/admin/keys` 替换为 `/admin/relay-stations`，为旧地址增加重定向。移动端提供折叠菜单。

- [ ] **步骤 5：运行前端构建**

运行：`npm --prefix client run build`  
预期：TypeScript 与 Vite 构建通过。

### 任务 7：统一全站视觉与清理占位功能

**文件：**

- 修改：`client/src/styles/theme.css`
- 修改：`client/src/style.css`
- 修改：`client/src/App.vue`
- 修改：`client/src/views/Dashboard.vue`
- 修改：`client/src/views/Keys.vue`
- 修改：`client/src/views/Login.vue`
- 修改：`client/src/views/Register.vue`

- [ ] **步骤 1：移除 Vite 默认样式并建立中性深色令牌**

定义背景、边框、文本、薄荷强调色、状态色、4–8 px 圆角和稳定间距。全局覆盖 Element Plus 的表格、输入、弹窗、分页和空状态。

- [ ] **步骤 2：统一概览、任务、登录和注册页面**

减少渐变标题和悬浮卡片，使用清晰页面标题、紧凑统计区、可扫描列表和明确空状态。任务页移除未实现的重试入口。

- [ ] **步骤 3：运行静态占位扫描**

运行：`rg -n '开发中|TODO|lorem|placeholder action' client/src`  
预期：无可见占位功能；代码注释中也不保留未实现入口。

- [ ] **步骤 4：运行前端构建**

运行：`npm --prefix client run build`  
预期：构建成功且无 TypeScript 错误。

### 任务 8：完整验证与浏览器验收

**文件：**

- 修改：前述文件中验收发现问题的最小集合

- [ ] **步骤 1：运行完整自动化验证**

运行：`npm test && npm run build && npm --prefix client test && npm --prefix client run build`  
预期：所有命令退出码为 0。

- [ ] **步骤 2：启动前后端开发服务**

运行：`npm run dev` 和 `npm --prefix client run dev -- --host 127.0.0.1`。若默认端口占用，使用 Vite 自动分配的下一个端口。

- [ ] **步骤 3：执行桌面浏览器验收**

检查 `/create`、`/dashboard`、`/keys`、`/admin/users`、`/admin/relay-stations`、`/login`、`/register`，确认无控制台错误、按钮可用、表单联动正确、Key 不泄露。

- [ ] **步骤 4：执行响应式验收**

在 1440×900、1024×768 和 390×844 下截图检查。确认导航、模式标签、素材列表、参数检查器、表格和弹窗无重叠或水平溢出。

- [ ] **步骤 5：复核需求清单与 Git 差异**

对照设计规格第 11 节逐项检查，并运行 `git diff --check`。预期：所有完成标准有对应实现与验证证据，差异无空白错误。
