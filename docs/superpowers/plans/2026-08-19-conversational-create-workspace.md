# 对话式视频创作工作台实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将现有分步骤创作页改造成单列对话式工作台，把素材、提示词和 7 项常用参数集中到一个底部 Composer 中。

**架构：** `Create.vue` 保留权限、表单状态和任务提交编排；`CreateComposer.vue`、`ParameterBar.vue` 与 `ConversationTimeline.vue` 分别负责输入、参数和消息展示。`features/create/seedance.ts` 提供全模态参考的默认状态、纯校验和请求构造，后端接口保持不变。

**技术栈：** Vue 3、TypeScript、Element Plus、Vitest、Vite

---

## 文件结构

- 修改 `client/src/features/create/seedance.ts`：将创作表单收敛为全模态参考状态，提供纯校验和请求构造。
- 修改 `client/tests/seedance-form.test.ts`：覆盖默认状态、全模态素材、空请求、模型约束和高级参数移除。
- 创建 `client/src/components/create/ConversationTimeline.vue`：展示欢迎消息、用户请求快照和任务结果。
- 创建 `client/src/components/create/ParameterBar.vue`：展示并联动 7 项常用参数。
- 创建 `client/src/components/create/CreateComposer.vue`：组织素材预览、提示词、唯一素材入口、参数栏和生成按钮。
- 修改 `client/src/views/Create.vue`：编排对话状态、文件读取、视频地址对话框和任务提交。

### 任务 1：收敛全模态表单与请求构造

**文件：**

- 修改：`client/tests/seedance-form.test.ts`
- 修改：`client/src/features/create/seedance.ts`

- [ ] **步骤 1：编写失败的全模态默认状态与请求测试**

在 `client/tests/seedance-form.test.ts` 中以以下行为替换旧模式测试：

```ts
import {
  buildTaskRequest,
  createDefaultForm,
  validateCreateForm,
} from '../src/features/create/seedance'

it('defaults to the full-modal reference workflow', () => {
  const form = createDefaultForm()
  expect(form.mode).toBe('reference')
  expect(form.omni_reference_task_type).toBe('auto')
})

it('builds reference content and only submits visible settings', () => {
  const request = buildTaskRequest({
    ...createDefaultForm(),
    prompt: '海面上的白色帆船',
    assets: [{
      id: 'image-1',
      kind: 'image',
      source: 'asset://image-1',
      label: '帆船',
      role: 'reference_image',
    }],
  })

  expect(request.params.content).toContainEqual({
    type: 'image_url',
    image_url: { url: 'asset://image-1' },
    role: 'reference_image',
  })
  expect(request.params.omni_reference_task_type).toBe('auto')
  expect(request.params).not.toHaveProperty('priority')
  expect(request.params).not.toHaveProperty('callback_url')
  expect(request.params).not.toHaveProperty('execution_expires_after')
  expect(request.params).not.toHaveProperty('safety_identifier')
  expect(request.params).not.toHaveProperty('return_last_frame')
  expect(request.params).not.toHaveProperty('tools')
})

it('accepts prompt-only and material-only requests but rejects empty input', () => {
  expect(validateCreateForm({ ...createDefaultForm(), prompt: '云层穿过山谷' })).toBe('')
  expect(validateCreateForm({
    ...createDefaultForm(),
    assets: [{ id: 'image-1', kind: 'image', source: 'asset://image-1', label: '山谷' }],
  })).toBe('')
  expect(validateCreateForm(createDefaultForm())).toBe('请输入提示词或添加至少一项参考素材')
})

it('rejects audio-only input for Seedance 2.0 models', () => {
  expect(validateCreateForm({
    ...createDefaultForm(),
    model: 'doubao-seedance-2-0',
    assets: [{ id: 'audio-1', kind: 'audio', source: 'asset://audio-1', label: '旁白' }],
  })).toBe('Seedance 2.0 不能仅使用音频，请再添加图片或视频')
})
```

- [ ] **步骤 2：运行测试并确认失败**

运行：`npm test --prefix client -- --run tests/seedance-form.test.ts`

预期：FAIL，默认模式仍为 `text`，且 `validateCreateForm` 尚未导出。

- [ ] **步骤 3：实现最小的全模态状态、校验与请求构造**

在 `client/src/features/create/seedance.ts` 中：

```ts
export interface CreateFormState {
  mode: 'reference'
  prompt: string
  model: ModelId
  resolution: Resolution
  ratio: Ratio
  duration: number
  generate_audio: boolean
  watermark: boolean
  output_format: 'mp4' | 'mov'
  omni_reference_task_type: 'auto'
  assets: AssetInput[]
}

export const createDefaultForm = (): CreateFormState => ({
  mode: 'reference',
  prompt: '',
  model: 'doubao-seedance-2-5',
  resolution: '720p',
  ratio: 'adaptive',
  duration: -1,
  generate_audio: true,
  watermark: false,
  output_format: 'mp4',
  omni_reference_task_type: 'auto',
  assets: [],
})

export const validateCreateForm = (form: CreateFormState): string => {
  if (exceedsDataUrlLimit(form.assets)) return '本地素材总大小过大，请减少素材数量或改用 asset:// 素材 ID'
  if (!form.prompt.trim() && form.assets.length === 0) return '请输入提示词或添加至少一项参考素材'
  const audioOnly = form.assets.length > 0 && form.assets.every((asset) => asset.kind === 'audio')
  if (form.model !== 'doubao-seedance-2-5' && audioOnly) return 'Seedance 2.0 不能仅使用音频，请再添加图片或视频'
  return ''
}
```

让 `buildTaskRequest()` 始终映射 `assets`，只组装 `model`、`content`、`resolution`、`ratio`、`duration`、`generate_audio`、`watermark`、`output_format`；仅 Seedance 2.5 增加 `omni_reference_task_type: 'auto'`。新增 `referenceRoleForKind(kind)`，分别返回 `reference_image`、`reference_video` 和 `reference_audio`。

- [ ] **步骤 4：运行单元测试并确认通过**

运行：`npm test --prefix client -- --run tests/seedance-form.test.ts`

预期：PASS，`seedance-form.test.ts` 中所有测试通过。

- [ ] **步骤 5：提交领域逻辑变更**

```bash
git add client/src/features/create/seedance.ts client/tests/seedance-form.test.ts
git commit -m "refactor(创作台): 收敛全模态参考请求"
```

### 任务 2：实现参数栏与 Composer

**文件：**

- 创建：`client/src/components/create/ParameterBar.vue`
- 创建：`client/src/components/create/CreateComposer.vue`
- 修改：`client/src/features/create/seedance.ts`

- [ ] **步骤 1：为模型联动编写失败测试**

在 `client/tests/seedance-form.test.ts` 增加：

```ts
import { normalizeModelSettings } from '../src/features/create/seedance'

it('normalizes settings when the model changes', () => {
  const form = {
    ...createDefaultForm(),
    model: 'doubao-seedance-2-0-mini' as const,
    resolution: '1080p' as const,
    duration: 30,
    output_format: 'mov' as const,
  }

  normalizeModelSettings(form)

  expect(form.resolution).toBe('720p')
  expect(form.duration).toBe(-1)
  expect(form.output_format).toBe('mp4')
})
```

- [ ] **步骤 2：运行测试并确认失败**

运行：`npm test --prefix client -- --run tests/seedance-form.test.ts`

预期：FAIL，`normalizeModelSettings` 尚未导出。

- [ ] **步骤 3：实现模型联动助手**

在 `client/src/features/create/seedance.ts` 中增加：

```ts
export const normalizeModelSettings = (form: CreateFormState): void => {
  const model = MODEL_OPTIONS.find((option) => option.value === form.model) ?? MODEL_OPTIONS[0]
  if (!model.resolutions.includes(form.resolution)) {
    form.resolution = model.resolutions.includes('720p') ? '720p' : model.resolutions[0]
  }
  if (form.duration !== -1 && form.duration > model.maxDuration) form.duration = -1
  if (form.model !== 'doubao-seedance-2-5') form.output_format = 'mp4'
}
```

- [ ] **步骤 4：创建紧凑参数栏**

`ParameterBar.vue` 接收 `form: CreateFormState`，并渲染以下控件：

```vue
<div class="parameter-bar" aria-label="视频参数">
  <el-select v-model="form.model" aria-label="模型" @change="$emit('model-change')">
    <el-option v-for="item in MODEL_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
  </el-select>
  <el-select v-model="form.resolution" aria-label="分辨率">...</el-select>
  <el-select v-model="form.ratio" aria-label="宽高比">...</el-select>
  <el-select v-model="form.duration" aria-label="视频时长">...</el-select>
  <label><span>声音</span><el-switch v-model="form.generate_audio" /></label>
  <label><span>AI 水印</span><el-switch v-model="form.watermark" /></label>
  <el-radio-group v-model="form.output_format" aria-label="输出格式">...</el-radio-group>
</div>
```

使用 CSS Grid 的 `repeat(auto-fit, minmax(...))` 或 Flex 换行，确保控件有稳定高度；在 `640px` 以下将选择器调整为两列，开关和输出格式保持完整，不产生横向滚动。

- [ ] **步骤 5：创建一体化 Composer**

`CreateComposer.vue` 接收 `form`、`submitting`、`canGenerate` 与 `error`，并发出 `material-command`、`remove-asset`、`model-change` 和 `submit` 事件。结构如下：

```vue
<section class="create-composer">
  <div v-if="form.assets.length" class="material-strip">...</div>
  <el-input v-model="form.prompt" type="textarea" :rows="5" maxlength="500" resize="none" />
  <div v-if="error" class="composer-error">{{ error }}</div>
  <div class="composer-toolbar">
    <el-dropdown trigger="click" @command="$emit('material-command', $event)">
      <el-button circle :icon="Plus" aria-label="添加参考素材" />
      <template #dropdown>图片、音频、视频 3 个菜单项</template>
    </el-dropdown>
    <ParameterBar :form="form" @model-change="$emit('model-change')" />
    <el-tooltip content="生成视频">
      <el-button circle type="primary" :icon="Promotion" :loading="submitting" :disabled="!canGenerate" @click="$emit('submit')" />
    </el-tooltip>
  </div>
</section>
```

素材条目显示类型、名称和删除图标；`+` 是唯一素材入口。不要在 Composer 外重复参数或素材按钮。

- [ ] **步骤 6：运行测试与生产构建**

运行：`npm test --prefix client -- --run tests/seedance-form.test.ts`

预期：PASS。

运行：`npm run build --prefix client`

预期：TypeScript 与 Vite 构建成功。

- [ ] **步骤 7：提交 Composer 组件**

```bash
git add client/src/features/create/seedance.ts client/tests/seedance-form.test.ts client/src/components/create/ParameterBar.vue client/src/components/create/CreateComposer.vue
git commit -m "feat(创作台): 添加对话式输入组件"
```

### 任务 3：接入消息时间线与任务提交

**文件：**

- 创建：`client/src/components/create/ConversationTimeline.vue`
- 修改：`client/src/views/Create.vue`

- [ ] **步骤 1：定义可渲染的会话消息接口**

在 `ConversationTimeline.vue` 中导出并使用：

```ts
export interface ConversationEntry {
  id: string
  role: 'user' | 'assistant'
  prompt?: string
  materials?: Array<{ kind: 'image' | 'video' | 'audio'; label: string }>
  parameterSummary?: string[]
  status?: 'queued' | 'failed'
  taskId?: string
  message?: string
}
```

组件在空数组时显示一条简短欢迎消息；有内容时按时间顺序显示用户请求与助手结果。用户消息显示提示词、素材摘要和参数标签，助手消息显示任务 ID、排队成功或错误状态。

- [ ] **步骤 2：重写创作页编排**

在 `Create.vue` 中：

```ts
const form = reactive(createDefaultForm())
const entries = ref<ConversationEntry[]>([])

const clearComposerContent = () => {
  form.prompt = ''
  form.assets = []
}

const buildParameterSummary = () => {
  const model = MODEL_OPTIONS.find((item) => item.value === form.model)
  return [
    model?.label ?? form.model,
    form.resolution,
    form.ratio,
    form.duration === -1 ? '智能时长' : `${form.duration} 秒`,
    form.generate_audio ? '有声' : '无声',
    form.watermark ? 'AI 水印' : '无水印',
    form.output_format.toUpperCase(),
  ]
}

const submitTask = async () => {
  formError.value = validateCreateForm(form)
  if (formError.value || !canGenerate.value) return

  const snapshot = {
    id: `user-${Date.now()}`,
    role: 'user' as const,
    prompt: form.prompt.trim(),
    materials: form.assets.map(({ kind, label }) => ({ kind, label })),
    parameterSummary: buildParameterSummary(),
  }
  entries.value.push(snapshot)
  submitting.value = true

  try {
    const response = await tasksApi.createTask(buildTaskRequest(form))
    entries.value.push({
      id: `assistant-${response.data.task.id}`,
      role: 'assistant',
      status: 'queued',
      taskId: response.data.task.id,
      message: '任务已进入生成队列',
    })
    clearComposerContent()
  } catch (error: any) {
    formError.value = error.response?.data?.error || error.message || '创建任务失败'
    entries.value.push({
      id: `assistant-error-${Date.now()}`,
      role: 'assistant',
      status: 'failed',
      message: formError.value,
    })
  } finally {
    submitting.value = false
  }
}
```

页面模板仅保留标题、权限提醒、`ConversationTimeline`、`CreateComposer`、隐藏的图片/音频输入和视频来源对话框。删除模式卡片、步骤区块、右侧检查器、高级参数及其事件处理。

- [ ] **步骤 3：接入唯一素材入口**

`material-command` 取值固定为 `image`、`audio` 和 `video`。图片与音频打开隐藏文件输入；视频打开现有 URL / 素材 ID 对话框。所有新素材使用 `referenceRoleForKind()` 设置角色，并沿用单文件 `30 MB` 和组合 Data URL 上限。

- [ ] **步骤 4：实现页面与时间线视觉样式**

页面使用单列 `max-width` 容器和纵向 Flex 布局。消息区占据剩余高度，Composer 在可视区域底部保持可达；消息、Composer 与页面区域不使用嵌套卡片。移动端减少外边距，工具栏换行，所有文字允许收缩或省略，`body` 不出现横向滚动。

- [ ] **步骤 5：运行前端测试与构建**

运行：`npm test --prefix client -- --run tests/seedance-form.test.ts`

预期：PASS。

运行：`npm run build --prefix client`

预期：TypeScript 与 Vite 构建成功，无未使用导入或模板类型错误。

- [ ] **步骤 6：提交页面集成**

```bash
git add client/src/components/create/ConversationTimeline.vue client/src/views/Create.vue
git commit -m "feat(创作台): 接入对话式任务流程"
```

### 任务 4：完整回归与视觉验收

**文件：**

- 修改：`client/src/components/create/ConversationTimeline.vue`
- 修改：`client/src/components/create/ParameterBar.vue`
- 修改：`client/src/components/create/CreateComposer.vue`
- 修改：`client/src/views/Create.vue`

- [ ] **步骤 1：运行全部自动化测试**

运行：`npm test`

预期：根项目全部测试通过。

运行：`npm test --prefix client`

预期：前端全部测试通过。

- [ ] **步骤 2：运行全部生产构建**

运行：`npm run build`

预期：服务端 TypeScript 构建成功。

运行：`npm run build --prefix client`

预期：客户端 TypeScript 与 Vite 构建成功。

- [ ] **步骤 3：进行桌面端浏览器验收**

使用现有本地服务登录普通用户，打开 `/create`，以 `1440 × 900` 检查：

- 页面为单列消息流，没有右侧参数栏、模式选择器和高级参数。
- Composer 底部完整显示 7 项参数。
- 素材操作只有一个 `+` 按钮。
- 添加素材、修改参数和提交按钮均可交互。
- 视觉层级、文本截断和控件尺寸稳定。

- [ ] **步骤 4：进行移动端浏览器验收**

以 `390 × 844` 打开 `/create`，检查参数自然换行、按钮可点击、对话框不超宽，并通过页面宽度与 `scrollWidth` 检查确认没有横向溢出。

- [ ] **步骤 5：修复视觉验收发现的问题并重跑验证**

仅调整上述 4 个前端文件中的布局与可访问性细节。每次修改后重新运行：

```bash
npm test --prefix client
npm run build --prefix client
```

预期：全部通过，桌面与移动端截图无重叠、裁切或横向溢出。

- [ ] **步骤 6：提交验收修正**

```bash
git add client/src/components/create client/src/views/Create.vue
git commit -m "fix(创作台): 完善对话界面响应式布局"
```

- [ ] **步骤 7：请求代码审查**

使用 `requesting-code-review` 检查规格覆盖、请求字段、状态保留、移动端布局和测试缺口。修复所有高优先级问题后，再次运行完整测试与构建。
