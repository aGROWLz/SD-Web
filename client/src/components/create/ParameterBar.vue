<template>
  <div class="parameter-bar" aria-label="视频参数">
    <el-popover v-model:visible="panels.model" placement="top" :width="300" trigger="click" popper-class="parameter-picker-popper" @before-enter="showOnly('model')">
      <div class="panel-heading"><span>选择生成模型</span><small>4 个模型</small></div>
      <div class="model-options">
        <button v-for="item in MODEL_OPTIONS" :key="item.value" type="button" class="parameter-model-option" :class="{ selected: form.model === item.value }" @click="selectModel(item.value)">
          <i class="model-radio" aria-hidden="true"></i><span>{{ item.label }}</span>
        </button>
      </div>
      <template #reference>
        <button type="button" class="parameter-trigger model-field" :disabled="disabled" aria-label="模型">
          <i class="model-radio selected" aria-hidden="true"></i>
          <span class="trigger-copy"><small>模型</small><strong>{{ selectedModel.label }}</strong></span>
          <el-icon class="trigger-chevron"><ArrowUp /></el-icon>
        </button>
      </template>
    </el-popover>

    <el-popover v-model:visible="panels.resolution" placement="top" :width="280" trigger="click" popper-class="parameter-picker-popper" @before-enter="showOnly('resolution')">
      <div class="panel-heading"><span>选择分辨率</span><small>输出清晰度</small></div>
      <div class="resolution-grid">
        <button v-for="resolution in availableResolutions" :key="resolution" type="button" class="resolution-card" :class="{ selected: form.resolution === resolution }" @click="selectResolution(resolution)">
          {{ resolution.toUpperCase() }}
        </button>
      </div>
      <template #reference>
        <button type="button" class="parameter-trigger" :disabled="disabled" aria-label="分辨率">
          <el-icon><Monitor /></el-icon>
          <span class="trigger-copy"><small>分辨率</small><strong>{{ form.resolution.toUpperCase() }}</strong></span>
          <el-icon class="trigger-chevron"><ArrowUp /></el-icon>
        </button>
      </template>
    </el-popover>

    <el-popover v-model:visible="panels.ratio" placement="top" :width="360" trigger="click" popper-class="parameter-picker-popper ratio-picker-popper" @before-enter="showOnly('ratio')">
      <div class="panel-heading"><span>选择画面比例</span><small>当前：{{ ratioLabel }}</small></div>
      <div class="ratio-grid">
        <button v-for="item in RATIO_OPTIONS" :key="item.value" type="button" class="ratio-card" :class="{ selected: form.ratio === item.value }" @click="selectRatio(item.value)">
          <i class="ratio-shape" :class="`ratio-${item.shape}`" aria-hidden="true"></i><span>{{ item.label }}</span>
        </button>
      </div>
      <template #reference>
        <button type="button" class="parameter-trigger" :disabled="disabled" aria-label="宽高比">
          <el-icon><Crop /></el-icon>
          <span class="trigger-copy"><small>宽高比</small><strong>{{ ratioLabel }}</strong></span>
          <el-icon class="trigger-chevron"><ArrowUp /></el-icon>
        </button>
      </template>
    </el-popover>

    <el-popover v-model:visible="panels.duration" placement="top" :width="410" trigger="click" popper-class="parameter-picker-popper duration-picker-popper" @before-enter="showOnly('duration')">
      <div class="duration-heading"><span>视频时长</span><strong>{{ durationLabel }}</strong></div>
      <div class="duration-track-shell">
        <div class="duration-track-rail" aria-hidden="true">
          <i class="duration-track-gap start-gap"></i>
          <i class="duration-track-range short-range"><b :style="{ width: `${durationShortFill}%` }"></b></i>
          <i class="duration-track-gap extended-gap"></i>
          <i class="duration-track-range extended-range" :class="{ locked: !supportsExtendedDuration }"><b :style="{ width: `${durationExtendedFill}%` }"></b></i>
        </div>
        <input :value="durationTrackPosition" class="duration-slider" type="range" min="0" :max="DURATION_TRACK_MAX" step="1" aria-label="视频时长" @input="handleDurationInput" />
      </div>
      <div class="duration-labels extended">
        <span class="duration-intelligent">智能</span><span class="duration-four">4 秒</span><span class="duration-fifteen">15 秒</span>
        <span class="duration-sixteen" :class="{ locked: !supportsExtendedDuration }">16 秒</span><span class="duration-thirty" :class="{ locked: !supportsExtendedDuration }">30 秒</span><small class="duration-exclusive" :class="{ locked: !supportsExtendedDuration }">2.5 专属</small>
      </div>
      <template #reference>
        <button type="button" class="parameter-trigger" :disabled="disabled" aria-label="视频时长">
          <el-icon><Timer /></el-icon>
          <span class="trigger-copy"><small>视频时长</small><strong>{{ durationLabel }}</strong></span>
          <el-icon class="trigger-chevron"><ArrowUp /></el-icon>
        </button>
      </template>
    </el-popover>

    <button type="button" class="parameter-trigger toggle-trigger" :class="{ active: form.generate_audio }" :disabled="disabled" :aria-pressed="form.generate_audio" aria-label="音频" @click="form.generate_audio = !form.generate_audio">
      <span class="speaker-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 5 6 9H3v6h3l5 4V5Z" /><path class="sound-wave" d="M15 9.5a4 4 0 0 1 0 5" /><path class="sound-wave" d="M18 7a7.5 7.5 0 0 1 0 10" />
        </svg>
      </span>
      <span class="trigger-copy"><small>音频</small><strong>{{ form.generate_audio ? '开启' : '关闭' }}</strong></span>
      <span class="toggle-control" aria-hidden="true"><i></i></span>
    </button>

    <button type="button" class="parameter-trigger toggle-trigger" :class="{ active: form.watermark }" :disabled="disabled" :aria-pressed="form.watermark" aria-label="AI 水印" @click="form.watermark = !form.watermark">
      <span class="watermark-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path class="watermark-star" d="M12 2.5 14.7 9.3 21.5 12l-6.8 2.7L12 21.5l-2.7-6.8L2.5 12l6.8-2.7L12 2.5Z" /></svg></span>
      <span class="trigger-copy"><small>AI 水印</small><strong>{{ form.watermark ? '开启' : '关闭' }}</strong></span>
      <span class="toggle-control" aria-hidden="true"><i></i></span>
    </button>

    <el-popover v-model:visible="panels.format" placement="top" :width="190" trigger="click" popper-class="parameter-picker-popper" @before-enter="showOnly('format')">
      <div class="panel-heading"><span>选择输出格式</span></div>
      <div class="format-grid">
        <button v-for="format in FORMAT_OPTIONS" :key="format" type="button" class="format-card" :class="{ selected: form.output_format === format }" :disabled="format === 'mov' && form.model !== 'doubao-seedance-2-5'" @click="selectFormat(format)">
          <el-icon><Document /></el-icon><span>{{ format.toUpperCase() }}</span>
        </button>
      </div>
      <template #reference>
        <button type="button" class="parameter-trigger" :disabled="disabled" aria-label="输出格式">
          <el-icon><Document /></el-icon>
          <span class="trigger-copy"><small>输出格式</small><strong>{{ form.output_format.toUpperCase() }}</strong></span>
          <el-icon class="trigger-chevron"><ArrowUp /></el-icon>
        </button>
      </template>
    </el-popover>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { ArrowUp, Crop, Document, Monitor, Timer } from '@element-plus/icons-vue'
import { DURATION_TRACK_MAX, durationToTrackPosition, trackPositionToDuration } from '@/features/create/duration-track'
import { MODEL_OPTIONS, type CreateFormState, type ModelId, type Ratio, type Resolution } from '@/features/create/seedance'

type PanelName = 'model' | 'resolution' | 'ratio' | 'duration' | 'format'

const props = defineProps<{ form: CreateFormState; disabled?: boolean }>()
const emit = defineEmits<{ 'model-change': [] }>()
const panels = reactive<Record<PanelName, boolean>>({ model: false, resolution: false, ratio: false, duration: false, format: false })

const RATIO_OPTIONS: Array<{ value: Ratio; label: string; shape: string }> = [
  { value: 'adaptive', label: '自适应', shape: 'adaptive' }, { value: '16:9', label: '16:9', shape: '16-9' },
  { value: '9:16', label: '9:16', shape: '9-16' }, { value: '1:1', label: '1:1', shape: '1-1' },
  { value: '4:3', label: '4:3', shape: '4-3' }, { value: '3:4', label: '3:4', shape: '3-4' },
  { value: '21:9', label: '21:9', shape: '21-9' },
]
const FORMAT_OPTIONS = ['mp4', 'mov'] as const
const selectedModel = computed(() => MODEL_OPTIONS.find((item) => item.value === props.form.model) ?? MODEL_OPTIONS[0])
const availableResolutions = computed(() => selectedModel.value.resolutions)
const supportsExtendedDuration = computed(() => selectedModel.value.maxDuration > 15)
const durationLabel = computed(() => props.form.duration === -1 ? '智能时长' : `${props.form.duration} 秒`)
const ratioLabel = computed(() => RATIO_OPTIONS.find((item) => item.value === props.form.ratio)?.label ?? props.form.ratio)
const durationShortFill = computed(() => {
  if (props.form.duration < 5) return 0
  return Math.min(100, ((props.form.duration - 4) / 11) * 100)
})
const durationExtendedFill = computed(() => {
  if (!supportsExtendedDuration.value || props.form.duration < 17) return 0
  return Math.min(100, ((props.form.duration - 16) / 14) * 100)
})
const durationTrackPosition = computed({
  get: () => durationToTrackPosition(props.form.duration),
  set: (position: number) => { props.form.duration = trackPositionToDuration(position, props.form.duration, selectedModel.value.maxDuration) },
})
const handleDurationInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  durationTrackPosition.value = Number(input.value)
  input.value = String(durationTrackPosition.value)
}

const showOnly = (name: PanelName) => {
  for (const panelName of Object.keys(panels) as PanelName[]) if (panelName !== name) panels[panelName] = false
}
const closePanel = (name: PanelName) => { panels[name] = false }
const selectModel = (model: ModelId) => { props.form.model = model; emit('model-change'); closePanel('model') }
const selectResolution = (resolution: Resolution) => { props.form.resolution = resolution; closePanel('resolution') }
const selectRatio = (ratio: Ratio) => { props.form.ratio = ratio; closePanel('ratio') }
const selectFormat = (format: typeof FORMAT_OPTIONS[number]) => {
  if (format === 'mov' && props.form.model !== 'doubao-seedance-2-5') return
  props.form.output_format = format
  closePanel('format')
}
</script>

<style scoped>
.parameter-bar { position:relative; display:grid; flex:1 1 760px; grid-template-columns:minmax(150px,1.45fr) repeat(3,minmax(92px,.85fr)) minmax(105px,.95fr) minmax(112px,1fr) minmax(104px,.9fr); align-items:center; gap:6px; min-width:0; }
.parameter-trigger { display:flex; align-items:center; gap:8px; width:100%; min-width:0; height:38px; padding:0 9px; border:1px solid transparent; border-radius:6px; color:var(--text-secondary); background:rgba(255,255,255,.025); cursor:pointer; text-align:left; transition:border-color var(--transition-fast),background var(--transition-fast); }
.parameter-trigger:hover,.parameter-trigger[aria-expanded="true"] { border-color:var(--border-emphasis); background:var(--bg-elevated); }
.parameter-trigger:disabled { cursor:not-allowed; opacity:.58; }
.parameter-trigger>.el-icon,.speaker-icon,.watermark-icon,.model-radio.selected { flex:0 0 auto; color:var(--accent-primary); }
.parameter-trigger>.el-icon { font-size:15px; }
.trigger-copy { min-width:0; flex:1; }
.trigger-copy small,.trigger-copy strong { display:block; overflow:hidden; letter-spacing:0; text-overflow:ellipsis; white-space:nowrap; }
.trigger-copy small { color:var(--text-muted); font-size:9px; font-weight:500; }
.trigger-copy strong { margin-top:1px; color:var(--text-primary); font-size:11px; font-weight:650; }
.trigger-chevron { color:var(--text-muted)!important; font-size:10px!important; transition:transform var(--transition-fast); }
.parameter-trigger[aria-expanded="true"] .trigger-chevron { transform:rotate(180deg); }
.model-radio { position:relative; display:block; flex:0 0 14px; width:14px; height:14px; border:1.5px solid currentColor; border-radius:50%; }
.model-radio.selected::after,.parameter-model-option.selected .model-radio::after { position:absolute; inset:3px; border-radius:50%; background:currentColor; content:''; }
.panel-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; color:var(--text-secondary); font-size:12px; }
.panel-heading small { color:var(--text-muted); font-size:10px; }
.model-options { display:grid; gap:6px; }
.parameter-model-option { display:flex; align-items:center; gap:10px; width:100%; min-height:42px; padding:8px 10px; border:1px solid transparent; border-radius:6px; color:var(--text-secondary); background:var(--bg-elevated); cursor:pointer; font-size:12px; text-align:left; }
.parameter-model-option:hover,.parameter-model-option.selected { border-color:var(--accent-primary); color:var(--text-primary); background:var(--accent-light); }
.resolution-grid,.format-grid { display:grid; gap:8px; }
.resolution-grid { grid-template-columns:repeat(3,minmax(0,1fr)); }
.resolution-card,.ratio-card,.format-card { border:1px solid transparent; border-radius:7px; color:var(--text-secondary); background:var(--bg-elevated); cursor:pointer; }
.resolution-card { min-height:62px; font-size:12px; font-weight:650; }
.resolution-card:hover,.resolution-card.selected,.ratio-card:hover,.ratio-card.selected,.format-card:hover,.format-card.selected { border-color:var(--accent-primary); color:var(--text-primary); background:var(--accent-light); }
.ratio-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; }
.ratio-card { display:grid; min-height:68px; place-items:center; gap:7px; padding:8px 4px; font-size:11px; }
.ratio-shape { display:block; border:2px solid currentColor; border-radius:2px; opacity:.9; }
.ratio-adaptive { width:30px; height:19px; border-style:dashed; }.ratio-16-9 { width:30px; height:17px; }.ratio-9-16 { width:17px; height:28px; }.ratio-1-1 { width:23px; height:23px; }.ratio-4-3 { width:28px; height:21px; }.ratio-3-4 { width:21px; height:28px; }.ratio-21-9 { width:32px; height:14px; }
.duration-heading { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:14px; color:var(--text-secondary); font-size:12px; }
.duration-heading strong { color:var(--text-primary); font-size:20px; }
.duration-track-shell { position:relative; height:28px; }
.duration-track-rail { position:absolute; top:11.5px; left:0; right:0; display:grid; grid-template-columns:5fr 11fr 5fr 14fr; height:5px; pointer-events:none; }
.duration-track-gap { height:5px; border-radius:99px; background:repeating-linear-gradient(90deg,#60716f 0 3px,transparent 3px 7px); opacity:.72; }
.duration-track-range { height:5px; overflow:hidden; border-radius:99px; background:#2b3c3d; }
.duration-track-range b { display:block; height:100%; border-radius:inherit; background:var(--accent-primary); transition:width var(--transition-fast); }
.duration-track-range.locked { opacity:.32; }
.duration-slider { position:relative; z-index:1; width:100%; height:28px; margin:0; appearance:none; background:transparent; cursor:pointer; }
.duration-slider::-webkit-slider-runnable-track { height:5px; border-radius:99px; background:transparent; }
.duration-slider::-webkit-slider-thumb { width:18px; height:18px; margin-top:-6.5px; appearance:none; border:3px solid var(--bg-secondary); border-radius:50%; background:var(--accent-primary); box-shadow:0 0 0 2px var(--accent-primary); }
.duration-slider::-moz-range-track { height:5px; border-radius:99px; background:#2b3c3d; }.duration-slider::-moz-range-progress { height:5px; border-radius:99px; background:var(--accent-primary); }.duration-slider::-moz-range-thumb { width:14px; height:14px; border:3px solid var(--bg-secondary); border-radius:50%; background:var(--accent-primary); box-shadow:0 0 0 2px var(--accent-primary); }
.duration-labels { position:relative; height:25px; color:var(--text-muted); font-size:10px; }
.duration-labels span,.duration-exclusive { position:absolute; white-space:nowrap; transform:translateX(-50%); }
.duration-intelligent { left:0; transform:none!important; }.duration-four { left:31.25%; color:var(--text-secondary); }.duration-fifteen { right:0; transform:none!important; }
.duration-labels.extended .duration-four { left:14.285%; }.duration-labels.extended .duration-fifteen { right:auto; left:45.714%; transform:translateX(-50%)!important; }.duration-sixteen { left:60%; color:var(--text-secondary); }.duration-thirty { right:0; transform:none!important; }.duration-exclusive { top:14px; left:80%; color:var(--accent-primary); font-size:9px; }.duration-labels .locked { color:var(--text-muted); opacity:.42; }
.toggle-trigger { white-space:nowrap; }.speaker-icon,.watermark-icon { display:grid; width:18px; height:18px; place-items:center; }.speaker-icon svg,.watermark-icon svg { width:18px; height:18px; overflow:visible; }.sound-wave { opacity:0; transition:opacity var(--transition-fast); }.toggle-trigger.active .sound-wave { opacity:1; }
.watermark-star { fill:transparent; stroke:currentColor; stroke-width:1.6; stroke-dasharray:2.2 2.2; stroke-linejoin:round; transition:fill var(--transition-fast),stroke-dasharray var(--transition-fast); }.toggle-trigger.active .watermark-star { fill:currentColor; stroke-dasharray:0; }
.toggle-control { position:relative; flex:0 0 34px; width:34px; height:20px; border-radius:99px; background:#354547; transition:background var(--transition-fast); }.toggle-control i { position:absolute; top:3px; left:3px; width:14px; height:14px; border-radius:50%; background:#dfe8e7; transition:transform var(--transition-fast),background var(--transition-fast); }.toggle-trigger.active .toggle-control { background:var(--accent-primary); }.toggle-trigger.active .toggle-control i { background:var(--bg-secondary); transform:translateX(14px); }
.format-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }.format-card { display:grid; min-height:66px; place-items:center; gap:5px; font-size:11px; }.format-card .el-icon { font-size:18px; }.format-card:disabled { cursor:not-allowed; opacity:.38; }
:global(.parameter-picker-popper.el-popover.el-popper) { padding:14px; border-color:var(--border-emphasis); border-radius:8px; background:var(--bg-secondary); box-shadow:0 18px 42px rgba(0,0,0,.4); }
:global(.parameter-picker-popper .el-popper__arrow::before) { border-color:var(--border-emphasis)!important; background:var(--bg-secondary)!important; }
@media(max-width:980px){.parameter-bar{grid-template-columns:repeat(4,minmax(0,1fr));}}
@media(max-width:760px){.parameter-bar{grid-template-columns:repeat(2,minmax(0,1fr));flex-basis:100%;width:100%;}:global(.ratio-picker-popper.el-popover.el-popper),:global(.duration-picker-popper.el-popover.el-popper){max-width:calc(100vw - 28px)}.ratio-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
@media(max-width:390px){.parameter-bar{grid-template-columns:1fr;}}
</style>
