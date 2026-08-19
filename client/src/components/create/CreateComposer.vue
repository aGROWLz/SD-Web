<template>
  <section class="create-composer" aria-label="视频创作输入框">
    <div v-if="form.assets.length" class="material-strip">
      <div v-for="asset in form.assets" :key="asset.id" class="material-chip">
        <span class="material-icon"><el-icon><component :is="materialIcon(asset.kind)" /></el-icon></span>
        <span class="material-copy">
          <strong>{{ asset.label }}</strong>
          <small>{{ materialLabel(asset.kind) }}</small>
        </span>
        <el-tooltip content="移除素材">
          <el-button text circle :icon="Close" :disabled="submitting" aria-label="移除素材" @click="emit('remove-asset', asset.id)" />
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
      <el-popover v-model:visible="materialMenuVisible" placement="top-start" :width="180" trigger="click">
        <div class="material-menu" role="menu">
          <button type="button" role="menuitem" @click="chooseMaterial('image')"><el-icon><Picture /></el-icon><span>添加图片</span></button>
          <button type="button" role="menuitem" @click="chooseMaterial('audio')"><el-icon><Headset /></el-icon><span>添加音频</span></button>
          <button type="button" role="menuitem" @click="chooseMaterial('video')"><el-icon><VideoCamera /></el-icon><span>添加视频 URL</span></button>
        </div>
        <template #reference>
          <el-tooltip content="添加参考素材">
            <el-button class="add-button" circle :icon="Plus" :disabled="submitting" aria-label="添加参考素材" />
          </el-tooltip>
        </template>
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
import { ref } from 'vue'
import { Close, Headset, Picture, Plus, Promotion, VideoCamera, WarningFilled } from '@element-plus/icons-vue'
import ParameterBar from './ParameterBar.vue'
import type { AssetInput, CreateFormState } from '@/features/create/seedance'

defineProps<{
  form: CreateFormState
  submitting: boolean
  canGenerate: boolean
  error: string
}>()

const emit = defineEmits<{
  'material-command': [command: 'image' | 'audio' | 'video']
  'remove-asset': [id: string]
  'model-change': []
  submit: []
}>()

const materialMenuVisible = ref(false)

const chooseMaterial = (command: 'image' | 'audio' | 'video') => {
  materialMenuVisible.value = false
  emit('material-command', command)
}

const materialIcon = (kind: AssetInput['kind']) => ({ image: Picture, audio: Headset, video: VideoCamera }[kind])
const materialLabel = (kind: AssetInput['kind']) => ({ image: '参考图片', audio: '参考音频', video: '参考视频' }[kind])
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
  display: flex;
  flex: 0 0 204px;
  align-items: center;
  gap: 9px;
  min-width: 0;
  height: 48px;
  padding: 7px 5px 7px 9px;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: var(--bg-elevated);
}

.material-icon {
  display: grid;
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 5px;
  color: var(--accent-primary);
  background: var(--accent-light);
}

.material-copy {
  min-width: 0;
  flex: 1;
}

.material-copy strong,
.material-copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.material-copy strong {
  color: var(--text-primary);
  font-size: 11px;
}

.material-copy small {
  margin-top: 3px;
  color: var(--text-muted);
  font-size: 10px;
}

.material-chip :deep(.el-button) {
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  color: var(--text-muted);
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

  .material-chip {
    flex-basis: 180px;
  }
}
</style>
