<template>
  <div class="parameter-bar" aria-label="视频参数">
    <div class="parameter-field model-field">
      <el-icon><Box /></el-icon>
      <el-select
        v-model="form.model"
        aria-label="模型"
        :disabled="disabled"
        popper-class="create-parameter-popper"
        @change="emit('model-change')"
      >
        <el-option v-for="item in MODEL_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
    </div>

    <div class="parameter-field">
      <el-icon><Monitor /></el-icon>
      <el-select v-model="form.resolution" aria-label="分辨率" :disabled="disabled" popper-class="create-parameter-popper">
        <el-option v-for="item in availableResolutions" :key="item" :label="item.toUpperCase()" :value="item" />
      </el-select>
    </div>

    <div class="parameter-field">
      <el-icon><Crop /></el-icon>
      <el-select v-model="form.ratio" aria-label="宽高比" :disabled="disabled" popper-class="create-parameter-popper">
        <el-option v-for="item in RATIO_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
    </div>

    <div class="parameter-field">
      <el-icon><Timer /></el-icon>
      <el-select v-model="form.duration" aria-label="视频时长" :disabled="disabled" popper-class="create-parameter-popper">
        <el-option v-for="item in durationOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
    </div>

    <label class="toggle-field">
      <el-icon><Headset /></el-icon>
      <span>声音</span>
      <el-switch v-model="form.generate_audio" aria-label="生成声音" :disabled="disabled" />
    </label>

    <label class="toggle-field">
      <el-icon><Stamp /></el-icon>
      <span>AI 水印</span>
      <el-switch v-model="form.watermark" aria-label="添加 AI 水印" :disabled="disabled" />
    </label>

    <div class="format-field">
      <el-icon><Film /></el-icon>
      <el-radio-group v-model="form.output_format" size="small" aria-label="输出格式" :disabled="disabled">
        <el-radio-button value="mp4">MP4</el-radio-button>
        <el-radio-button value="mov" :disabled="form.model !== 'doubao-seedance-2-5'">MOV</el-radio-button>
      </el-radio-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Box, Crop, Film, Headset, Monitor, Stamp, Timer } from '@element-plus/icons-vue'
import { MODEL_OPTIONS, type CreateFormState, type Ratio } from '@/features/create/seedance'

const props = defineProps<{ form: CreateFormState; disabled?: boolean }>()
const emit = defineEmits<{ 'model-change': [] }>()

const RATIO_OPTIONS: Array<{ value: Ratio; label: string }> = [
  { value: 'adaptive', label: '自适应' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '21:9', label: '21:9' },
]

const selectedModel = computed(() => MODEL_OPTIONS.find((item) => item.value === props.form.model) ?? MODEL_OPTIONS[0])
const availableResolutions = computed(() => selectedModel.value.resolutions)
const durationOptions = computed(() => [
  { value: -1, label: '智能时长' },
  ...Array.from({ length: selectedModel.value.maxDuration - 3 }, (_, index) => ({
    value: index + 4,
    label: `${index + 4} 秒`,
  })),
])
</script>

<style scoped>
.parameter-bar {
  display: flex;
  flex: 1 1 640px;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex-wrap: wrap;
}

.parameter-field,
.toggle-field,
.format-field {
  display: flex;
  align-items: center;
  height: 34px;
  min-width: 0;
  border: 1px solid transparent;
  border-radius: 5px;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, .025);
}

.parameter-field {
  width: 104px;
  padding-left: 9px;
}

.parameter-field.model-field {
  width: 172px;
}

.parameter-field > .el-icon,
.format-field > .el-icon {
  flex: 0 0 auto;
  color: var(--accent-primary);
  font-size: 14px;
}

.parameter-field :deep(.el-select) {
  min-width: 0;
}

.parameter-field :deep(.el-select__wrapper) {
  min-height: 32px;
  padding: 0 8px;
  background: transparent;
  box-shadow: none;
}

.parameter-field :deep(.el-select__selected-item) {
  color: var(--text-primary);
  font-size: 12px;
}

.toggle-field {
  gap: 7px;
  padding: 0 8px;
  font-size: 11px;
  white-space: nowrap;
}

.toggle-field > .el-icon {
  color: var(--accent-primary);
  font-size: 14px;
}

.toggle-field :deep(.el-switch) {
  --el-switch-on-color: var(--accent-primary);
  --el-switch-off-color: #334148;
  height: 24px;
}

.format-field {
  gap: 7px;
  padding-left: 8px;
}

.format-field :deep(.el-radio-button__inner) {
  min-width: 43px;
  padding: 7px 8px;
  border-color: var(--border-default);
  background: transparent;
  color: var(--text-secondary);
  font-size: 10px;
}

.format-field :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: var(--accent-light);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  box-shadow: -1px 0 0 0 var(--accent-primary);
}

@media (max-width: 760px) {
  .parameter-bar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    flex-basis: 100%;
    width: 100%;
  }

  .parameter-field,
  .parameter-field.model-field,
  .toggle-field,
  .format-field {
    width: 100%;
  }

  .toggle-field {
    justify-content: space-between;
  }

  .format-field {
    justify-content: space-between;
    grid-column: 1 / -1;
    padding-right: 4px;
  }
}

@media (max-width: 390px) {
  .parameter-bar {
    grid-template-columns: 1fr;
  }

  .format-field {
    grid-column: auto;
  }
}
</style>
