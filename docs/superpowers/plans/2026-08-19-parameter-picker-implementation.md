# 参数选择器实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将已确认的 V13 参数选择器交互和视觉样式应用到正式创作界面。

**架构：** 新建纯 TypeScript 时长轨道映射模块，负责表单时长与分段滑杆位置之间的双向转换。`ParameterBar.vue` 使用受控弹层、卡片选项和原生 range 滑杆呈现界面，继续直接读写现有 `CreateFormState`。

**技术栈：** Vue 3、TypeScript、Element Plus 图标、Vitest、CSS。

---

### 任务 1：时长分段映射

**文件：**
- 创建：`client/src/features/create/duration-track.ts`
- 创建：`client/tests/duration-track.test.ts`

- [ ] **步骤 1：编写失败测试**

测试智能节点、4-15 秒、16-30 秒映射，并验证 15/16 秒之间的间隔必须到达下一段节点才跨段。

- [ ] **步骤 2：运行红灯测试**

运行：`npm test -- --run tests/duration-track.test.ts`
预期：因模块不存在而失败。

- [ ] **步骤 3：实现纯函数**

导出 `durationToTrackPosition`、`trackPositionToDuration` 和轨道最大值；非 2.5 模型将最大时长限制为 15 秒。

- [ ] **步骤 4：运行绿灯测试**

运行：`npm test -- --run tests/duration-track.test.ts`
预期：全部通过。

### 任务 2：正式参数栏组件

**文件：**
- 修改：`client/src/components/create/ParameterBar.vue`
- 创建：`client/tests/parameter-bar-visual.test.ts`

- [ ] **步骤 1：编写失败测试**

检查组件包含模型圆形单选、纯文字分辨率卡片、比例图形卡片、分段时长滑杆、“2.5 专属”、音频声波状态、水印虚线/实心状态和文件格式图标，并且不再使用宽高比与时长的 `el-select`。

- [ ] **步骤 2：运行红灯测试**

运行：`npm test -- --run tests/parameter-bar-visual.test.ts`
预期：缺少新结构而失败。

- [ ] **步骤 3：实现组件**

用同级触发按钮与向上弹层替换现有选择控件；弹层互斥并支持外部点击关闭。表单仍写入原有 `model`、`resolution`、`ratio`、`duration`、`generate_audio`、`watermark`、`output_format` 字段。

- [ ] **步骤 4：运行绿灯测试**

运行：`npm test -- --run tests/parameter-bar-visual.test.ts tests/duration-track.test.ts`
预期：全部通过。

### 任务 3：回归与视觉验证

**文件：**
- 验证：`client/src/components/create/ParameterBar.vue`

- [ ] **步骤 1：运行客户端全量测试**

运行：`npm test`
预期：全部通过。

- [ ] **步骤 2：运行生产构建**

运行：`npm run build`
预期：TypeScript 与 Vite 构建成功。

- [ ] **步骤 3：浏览器验证**

在桌面与窄视口检查弹层居中、无横向溢出、所有参数可点击回写，15/16 秒严格跨段，模型能力切换后参数被正确归一化。

- [ ] **步骤 4：检查差异**

运行：`git diff --check`
预期：无空白错误；保留工作区已有的换行符警告。
