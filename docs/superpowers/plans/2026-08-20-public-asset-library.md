# 公共素材库与中转站素材接口实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 `superpowers:executing-plans` 执行此计划。步骤使用复选框（`- [ ]`）语法跟踪进度。

**目标：** 接入 KK/XKU p4 素材库上传与查询接口，建立公共共享素材库，并在创作页提供可伸缩素材栏。

**架构：** `PublicAsset` 保存公共素材的本地文件索引和供应商素材 ID；`asset-library.service.ts` 处理 KK/XKU 配置映射；任务队列依据任务绑定的主中转站执行 R2、素材库和 Base64 降级链路。前端新增素材库页面并复用素材预览组件，创作页通过素材 API 将选中的本地素材引用写入现有 `form.assets`。

**技术栈：** Node.js、Express、Prisma/PostgreSQL、Vue 3、Element Plus、Axios、Vitest。

---

### 任务 1：扩展数据库模型和领域类型

**文件：**
- 修改：`server/prisma/schema.prisma`
- 创建：`server/prisma/migrations/20260820080000_add_public_assets/migration.sql`
- 修改：`server/src/domain/relay-station.ts`
- 测试：`server/tests/public-asset-model.test.ts`

- [ ] **步骤 1：编写失败测试**

```ts
it('accepts relay station asset library config and public asset statuses', () => {
  expect(normalizeAssetLibraryConfig({ provider: 'XKU_P4' }).uploadUrl)
    .toBe('https://api-ai.xku.com/ark/p4/v1/assets');
  expect(['PENDING', 'ACTIVE', 'FAILED']).toContain('PENDING');
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：`npm --prefix server test -- public-asset-model.test.ts`

预期：FAIL，提示 `normalizeAssetLibraryConfig` 未定义。

- [ ] **步骤 3：实现模型和配置规范化**

在 `RelayStation` 增加 `assetLibraryConfig Json?`，新增 `PublicAsset` 模型及 `User.publicAssets` 关系。领域层实现 `AssetLibraryProvider`、`AssetLibraryConfig`、KK/XKU 默认字段映射和 URL 校验，空配置返回 `null`。

- [ ] **步骤 4：生成迁移并验证**

运行：`npx prisma migrate dev --schema server/prisma/schema.prisma --name add_public_assets`

预期：生成 `public_assets` 表和 `relay_stations.asset_library_config` 字段。

- [ ] **步骤 5：运行测试确认通过**

运行：`npm --prefix server test -- public-asset-model.test.ts`

预期：PASS。

### 任务 2：实现 KK/XKU 素材库服务

**文件：**
- 创建：`server/src/services/asset-library.service.ts`
- 测试：`server/tests/asset-library.test.ts`

- [ ] **步骤 1：编写失败测试**

覆盖以下断言：KK 请求体使用 `url/asset_type/name`；XKU p4 使用 `URL/AssetType/Name/ProjectName`；自定义字段映射生效；响应可解析 `data.Id`、`data.id`、顶层 `id`；查询 URL 替换 `{id}`；非 2xx、无 ID、无效 JSON 返回结构化错误。

- [ ] **步骤 2：运行测试确认失败**

运行：`npm --prefix server test -- asset-library.test.ts`

预期：FAIL，服务文件和上传/查询函数尚不存在。

- [ ] **步骤 3：实现最小服务**

实现 `uploadAsset(config, apiKey, input, fetchImpl)` 和 `queryAsset(config, apiKey, assetId, fetchImpl)`。服务只负责 HTTP、字段映射、鉴权头、响应解析，不读写数据库；`assetType` 由 MIME 前缀映射为 `Image`、`Video`、`Audio`。

- [ ] **步骤 4：运行服务测试**

运行：`npm --prefix server test -- asset-library.test.ts`

预期：PASS。

### 任务 3：接入管理员中转站素材库配置

**文件：**
- 修改：`server/src/controllers/relay-station.controller.ts`
- 修改：`server/src/middlewares/validator.ts`
- 修改：`server/src/routes/relay-station.routes.ts`
- 修改：`client/src/api/admin.ts`
- 修改：`client/src/views/admin/AdminRelayStations.vue`
- 测试：`server/tests/relay-station-controller.test.ts`
- 测试：`client/tests/admin-relay-asset-library.test.ts`

- [ ] **步骤 1：编写失败测试**

验证创建/更新中转站时保存素材库配置，序列化响应包含脱敏后的配置；KK/XKU 预设自动填充；上传 URL、查询 URL、字段名为空时返回 400；API Key 不出现在响应中。

- [ ] **步骤 2：运行测试确认失败**

运行：`npm --prefix server test -- relay-station-controller.test.ts`; `npm --prefix client test -- admin-relay-asset-library.test.ts`

预期：失败，因为控制器、类型和表单尚未支持 `assetLibraryConfig`。

- [ ] **步骤 3：实现后端保存与校验**

在创建/更新控制器中调用 `normalizeAssetLibraryConfig`，响应序列化配置；保持中转站 API Key 现有加密逻辑不变。验证字段只允许安全的 JSON 字段名和 HTTP(S) URL。

- [ ] **步骤 4：实现管理员表单**

在添加/编辑弹窗增加启用开关、KK/XKU p4 预设、上传/查询 URL、鉴权头/前缀、URL/类型/名称/ProjectName 字段和值。预设切换只覆盖对应默认值，用户手工修改后可继续编辑。

- [ ] **步骤 5：运行测试确认通过**

运行：`npm --prefix server test -- relay-station-controller.test.ts`; `npm --prefix client test -- admin-relay-asset-library.test.ts`; `npm --prefix client run build`

预期：全部 PASS，前端构建成功。

### 任务 4：建立公共素材本地索引和 API

**文件：**
- 创建：`server/src/services/public-asset.service.ts`
- 创建：`server/src/controllers/asset.controller.ts`
- 创建：`server/src/routes/asset.routes.ts`
- 修改：`server/src/index.ts`
- 修改：`server/src/services/local-asset.service.ts`
- 测试：`server/tests/public-asset.test.ts`
- 测试：`server/tests/public-asset-controller.test.ts`

- [ ] **步骤 1：编写失败测试**

覆盖 Data URL 保存、分页列表、文件预览、上传者删除、管理员删除、他人删除 403、单文件 30 MB 限制、MIME 限制和文件缺失时仍能删除数据库记录。

- [ ] **步骤 2：运行测试确认失败**

运行：`npm --prefix server test -- public-asset.test.ts public-asset-controller.test.ts`

预期：FAIL，因为 `PublicAsset` 服务和 `/assets` 路由不存在。

- [ ] **步骤 3：实现本地素材索引**

复用 `local-asset.service.ts` 的 MIME、哈希和大小限制，公共素材路径固定为 `uploads/assets/shared/<sha256>.<ext>`，数据库记录保存 `ownerId`、元数据和供应商状态。相同哈希直接复用现有公共文件并返回已有记录。

- [ ] **步骤 4：实现 API**

挂载认证路由：`GET /assets`、`POST /assets`、`GET /assets/:id/file`、`POST /assets/:id/retry`、`DELETE /assets/:id`。列表按 `createdAt desc` 分页，文件接口只返回本地文件。

- [ ] **步骤 5：运行测试确认通过**

运行：`npm --prefix server test -- public-asset.test.ts public-asset-controller.test.ts`

预期：PASS。

### 任务 5：连接 R2、素材库注册和查询状态

**文件：**
- 修改：`server/src/services/public-asset.service.ts`
- 修改：`server/src/services/r2-storage.service.ts`
- 修改：`server/src/services/asset-library.service.ts`
- 测试：`server/tests/public-asset-provider.test.ts`

- [ ] **步骤 1：编写失败测试**

验证有 R2 和主站素材库时先上传 R2 再注册供应商；只有 R2 时状态保持本地/R2；无 R2 时图片允许待注册、音频视频返回错误；注册失败保留 R2 URL 和错误信息；重试只重新执行注册。

- [ ] **步骤 2：运行测试确认失败**

运行：`npm --prefix server test -- public-asset-provider.test.ts`

预期：FAIL，因为公共素材尚未读取主中转站配置并执行 provider 流程。

- [ ] **步骤 3：实现供应商注册流程**

公共素材上传后读取 `isPrimary` 中转站和 R2 配置：使用 `uploadBytesToWorker` 获取公网 URL，再调用 `uploadAsset`；写入 `providerAssetId/providerStatus/providerUrl/providerError`。调用 `queryAsset` 更新状态，只有 `ACTIVE` 才允许任务使用 `asset://`。

- [ ] **步骤 4：实现失败降级和重试**

素材库异常不删除本地文件；R2 成功但 provider 失败时保存 R2 URL。主站不存在或 R2 未配置时返回可展示状态，不在后台静默丢失素材。

- [ ] **步骤 5：运行测试确认通过**

运行：`npm --prefix server test -- public-asset-provider.test.ts`

预期：PASS。

### 任务 6：改造任务物化，支持素材库 ID

**文件：**
- 修改：`server/src/services/local-asset.service.ts`
- 修改：`server/src/queue/task-processor.ts`
- 修改：`server/src/controllers/task.controller.ts`
- 测试：`server/tests/local-asset.test.ts`
- 测试：`server/tests/relay-task-submission.test.ts`

- [ ] **步骤 1：编写失败测试**

验证公共素材引用和用户本地素材都能解析；任务绑定 KK/XKU 主站；素材库 `ACTIVE` 时请求体使用 `asset://ID`，否则使用 R2 URL；无 R2 时图片 Base64、音频/视频报错。

- [ ] **步骤 2：运行测试确认失败**

运行：`npm --prefix server test -- local-asset.test.ts relay-task-submission.test.ts`

预期：FAIL，因为物化函数还只支持用户本地文件和 R2 URL。

- [ ] **步骤 3：实现公共素材解析**

允许任务参数保存 `public-asset://<uuid>`；物化时读取 `PublicAsset`，获取本地文件，并优先使用其当前主站 provider ID。用户本地素材保持现有 `local-asset://` 规则。

- [ ] **步骤 4：实现主站绑定和降级**

队列中依据 `task.relayStationId` 读取素材库配置，不能重新读取当前主站覆盖历史任务。R2 上传后先查询/注册 provider，`ACTIVE` 使用 `asset://ID`，其他状态保留 R2 URL；没有 R2 时按 MIME 规则处理。

- [ ] **步骤 5：运行测试确认通过**

运行：`npm --prefix server test -- local-asset.test.ts relay-task-submission.test.ts seedance.test.ts`

预期：PASS，既有纯文本和本地素材任务行为不变。

### 任务 7：实现公共素材库前端页面

**文件：**
- 创建：`client/src/api/assets.ts`
- 创建：`client/src/views/Assets.vue`
- 创建：`client/src/components/assets/PublicAssetCard.vue`
- 修改：`client/src/router/index.ts`
- 修改：`client/src/layouts/DefaultLayout.vue`
- 测试：`client/tests/public-assets-view.test.ts`

- [ ] **步骤 1：编写失败测试**

验证列表请求、统一文件选择上传、图片/视频/音频预览、删除和失败重试按钮、空状态和分页状态。

- [ ] **步骤 2：运行测试确认失败**

运行：`npm --prefix client test -- public-assets-view.test.ts`

预期：FAIL，因为页面、API 和组件不存在。

- [ ] **步骤 3：实现 API 与卡片**

`assetsApi` 封装列表、上传、文件 URL、重试和删除；`PublicAssetCard` 根据 MIME 渲染 `<img>`、视频首帧/播放控件或音频控件，状态标签和权限按钮保持卡片尺寸稳定。

- [ ] **步骤 4：实现页面和路由**

添加 `/assets` 路由和侧边栏入口。文件输入只使用一个“添加素材”按钮，上传后刷新列表并显示注册状态。管理员和上传者按接口返回权限显示删除按钮。

- [ ] **步骤 5：运行测试确认通过**

运行：`npm --prefix client test -- public-assets-view.test.ts`; `npm --prefix client run build`

预期：PASS，构建成功。

### 任务 8：在创作页增加可伸缩素材栏

**文件：**
- 创建：`client/src/components/create/PublicAssetShelf.vue`
- 修改：`client/src/views/Create.vue`
- 修改：`client/src/features/create/seedance.ts`
- 修改：`client/src/components/create/CreateComposer.vue`
- 测试：`client/tests/public-asset-shelf.test.ts`

- [ ] **步骤 1：编写失败测试**

验证素材栏默认收起/展开、独立滚动、点击素材加入配置、再次点击取消、素材预览 URL 使用 `/assets/:id/file`，且不会破坏现有素材删除和提交校验。

- [ ] **步骤 2：运行测试确认失败**

运行：`npm --prefix client test -- public-asset-shelf.test.ts`

预期：FAIL，因为素材栏组件和公共素材引用类型不存在。

- [ ] **步骤 3：扩展表单素材类型**

为 `CreateAsset` 增加 `publicAssetId` 和 `source` 字段；`buildTaskRequest` 将公共素材转换为 `{ image_url|video_url|audio_url: { url: 'public-asset://<id>' } }`，本地上传仍使用 Data URL 后端持久化。

- [ ] **步骤 4：实现素材栏布局**

在创作页右侧放置可伸缩栏，展开宽度使用 `clamp`，素材卡固定小预览尺寸，栏体独立 `overflow-y: auto`；移动端改为底部抽屉，避免挤压固定配置框。

- [ ] **步骤 5：运行测试确认通过**

运行：`npm --prefix client test -- public-asset-shelf.test.ts client/tests/seedance-form.test.ts`; `npm --prefix client run build`

预期：PASS，原有创建、编辑、重试流程保持可用。

### 任务 9：全量验证和运行检查

**文件：**
- 修改：`server/prisma/schema.prisma`、`server/src/services/asset-library.service.ts`、`server/src/services/public-asset.service.ts`、`client/src/views/Assets.vue`（仅用于修复全量验证暴露的类型或迁移兼容问题）。
- 测试：`server/tests`、`client/tests`

- [ ] **步骤 1：运行后端测试**

运行：`npm --prefix server test`

预期：全部 PASS。

- [ ] **步骤 2：运行前端测试和构建**

运行：`npm --prefix client test`; `npm --prefix client run build`

预期：全部 PASS，构建产物生成成功。

- [ ] **步骤 3：检查数据库迁移状态**

运行：`npx prisma migrate status --schema server/prisma/schema.prisma`

预期：无未应用迁移。

- [ ] **步骤 4：手工验证关键路径**

启动现有服务后，使用普通用户验证公共素材上传、预览、删除权限、创作栏选择；使用管理员验证中转站素材库配置、主站切换和任意素材删除；检查任务请求在 KK/XKU、R2-only、图片 Base64 三种路径下的参数。
