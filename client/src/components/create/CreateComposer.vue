<template>
  <section class="create-composer" aria-label="视频创作输入框">
    <div v-if="form.assets.length" class="material-strip">
      <div v-for="asset in form.assets" :key="asset.id" class="material-chip">
        <TaskAssetPreview :asset="asset" :task-id="asset.previewTaskId" :compact="true" />
        <el-tooltip content="移除素材">
          <el-button class="remove-material" text circle :icon="Close" :disabled="submitting" aria-label="移除素材" @click="emit('remove-asset', asset.id)" />
        </el-tooltip>
      </div>
    </div>

    <el-input
      v-model="form.prompt"
      class="prompt-input"
      type="textarea"
      :rows="5"
      maxlength="500"
      resize="none"
      :disabled="submitting"
      placeholder="描述画面、动作、镜头、光线和声音，也可以引用已添加的素材…"
      aria-label="视频提示词"
      @keydown.meta.enter.prevent="emit('submit')"
      @keydown.ctrl.enter.prevent="emit('submit')"
    />

    <div v-if="error" class="composer-error" role="alert">
      <el-icon><WarningFilled /></el-icon>
      <span>{{ error }}</span>
    </div>

    <div class="composer-toolbar">
      <el-popover trigger="click" placement="top-start" :width="156" popper-class="material-popover">
        <template #reference>
          <el-button class="add-button" circle :icon="Plus" :disabled="submitting" aria-label="添加参考素材" title="添加参考素材" />
        </template>
        <div class="material-menu">
          <button type="button" @click="emit('local-upload')"><el-icon><Upload /></el-icon>本地上传</button>
          <button type="button" @click="emit('asset-library')"><el-icon><FolderOpened /></el-icon>素材库选择</button>
        </div>
      </el-popover>

      <ParameterBar :form="form" :disabled="submitting" @model-change="emit('model-change')" />

      <el-tooltip content="生成视频">
        <el-button
          class="send-button"
          circle
          type="primary"
          :icon="Promotion"
          :loading="submitting"
          :disabled="!canGenerate"
          aria-label="生成视频"
          @click="emit('submit')"
        />
      </el-tooltip>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Close, FolderOpened, Plus, Promotion, Upload, WarningFilled } from '@element-plus/icons-vue'
import ParameterBar from './ParameterBar.vue'
import TaskAssetPreview from './TaskAssetPreview.vue'
import type { CreateFormState } from '@/features/create/seedance'

defineProps<{
  form: CreateFormState
  submitting: boolean
  canGenerate: boolean
  error: string
}>()

const emit = defineEmits<{
  'add-material': []
  'local-upload': []
  'asset-library': []
  'remove-asset': [id: string]
  'model-change': []
  submit: []
}>()

// 保留旧事件名，兼容已有嵌入方；创作页现在使用 local-upload/library 两个明确动作。
// emit('add-material')

</script>

<style scoped>
.create-composer {
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--border-emphasis);
  border-radius: 8px;
  background: var(--bg-secondary);
  box-shadow: 0 18px 46px rgba(0, 0, 0, .28);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.create-composer:focus-within {
  border-color: rgba(101, 214, 179, .48);
  box-shadow: 0 18px 46px rgba(0, 0, 0, .28), 0 0 0 3px var(--accent-light);
}

.material-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 14px 14px 0;
}

.material-chip {
  position: relative;
  display: block;
  flex: 0 0 48px;
  width: 48px;
  min-width: 0;
  height: 48px;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: var(--bg-elevated);
}

.material-chip :deep(.asset-preview) {
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: 5px;
}

.remove-material {
  position: absolute;
  z-index: 2;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, .28);
  color: #fff;
  background: rgba(7, 10, 11, .58);
}

.remove-material :deep(.el-icon) {
  font-size: 10px;
}

.prompt-input :deep(.el-textarea__inner) {
  min-height: 138px !important;
  padding: 18px 20px 10px;
  border: 0;
  background: transparent;
  box-shadow: none;
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.65;
}

.prompt-input :deep(.el-textarea__inner::placeholder) {
  color: var(--text-muted);
}

.composer-error {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 14px 8px;
  padding: 8px 10px;
  border: 1px solid rgba(240, 120, 120, .24);
  border-radius: 5px;
  color: var(--error);
  background: var(--error-light);
  font-size: 12px;
}

.composer-toolbar {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 10px 14px 14px;
  border-top: 1px solid var(--border-subtle);
}

.add-button,
.send-button {
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
}

.material-menu { display:grid; gap:3px; }.material-menu button { display:flex; width:100%; align-items:center; gap:9px; padding:9px 10px; border:0; border-radius:4px; color:var(--text-secondary); background:transparent; cursor:pointer; text-align:left; font-size:12px; }.material-menu button:hover { color:var(--text-primary); background:var(--accent-light); }.material-menu .el-icon { color:var(--accent-primary); }
:global(.el-popover.material-popover), :global(.el-popover.material-popover.el-popper) {
  border-color: var(--border-default) !important;
  background: var(--bg-elevated) !important;
  color: var(--text-primary) !important;
  box-shadow: 0 14px 36px rgba(0, 0, 0, .42) !important;
}
:global(.el-popover.material-popover .el-popper__arrow::before) { border-color: var(--border-default) !important; background: var(--bg-elevated) !important; }

.add-button {
  border-color: var(--border-default);
  color: var(--text-secondary);
  background: var(--bg-elevated);
}

.send-button {
  align-self: flex-end;
}

@media (max-width: 760px) {
  .prompt-input :deep(.el-textarea__inner) {
    min-height: 124px !important;
    padding: 15px 15px 8px;
    font-size: 14px;
  }

  .composer-toolbar {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr) 38px;
    align-items: end;
    padding: 9px 10px 11px;
  }

  .composer-toolbar :deep(.parameter-bar) {
    grid-column: 1 / -1;
    grid-row: 1;
  }

  .composer-toolbar > :first-child {
    grid-column: 1;
    grid-row: 2;
  }

  .send-button {
    grid-column: 3;
    grid-row: 2;
  }

  .material-strip {
    padding: 10px 10px 0;
  }

  .material-chip { flex-basis: 48px; }
}
</style>
