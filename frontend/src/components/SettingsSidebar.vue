<template>
  <Drawer
    v-model:visible="isVisible"
    position="right"
    class="settings-drawer"
    :pt="{ header: { class: 'settings-drawer-header' } }"
  >
    <template #header>
      <div class="drawer-heading">
        <span class="drawer-title">Display settings</span>
        <span class="drawer-subtitle">Saved in this browser when the panel closes</span>
      </div>
    </template>

    <div class="drawer-content">
      <section class="drawer-group">
        <h3 class="group-title">Filters</h3>

        <div class="field">
          <label class="field-label" for="state-filter">State</label>
          <MultiSelect
            inputId="state-filter"
            :modelValue="selectedStates"
            @update:modelValue="$emit('update:selectedStates', $event)"
            :options="stateOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select states"
            :maxSelectedLabels="3"
            class="field-input"
          >
            <template #option="slotProps">
              <div class="filter-option">
                <i :class="slotProps.option.icon" :style="{ color: slotProps.option.color }"></i>
                <span>{{ slotProps.option.label }}</span>
              </div>
            </template>
          </MultiSelect>
        </div>

        <div class="field" v-if="availableInstances.length > 0">
          <label class="field-label" for="instance-filter">Grafana instance</label>
          <MultiSelect
            inputId="instance-filter"
            :modelValue="selectedInstances"
            @update:modelValue="$emit('update:selectedInstances', $event)"
            :options="availableInstances"
            placeholder="All instances"
            :maxSelectedLabels="3"
            class="field-input"
          >
            <template #option="slotProps">
              <div class="filter-option">
                <i class="pi pi-server" style="color: var(--gf-purple)"></i>
                <span>{{ slotProps.option }}</span>
              </div>
            </template>
          </MultiSelect>
        </div>

        <div class="field" v-if="availableLabels.length > 0">
          <label class="field-label" for="label-filter">Labels</label>
          <MultiSelect
            inputId="label-filter"
            :modelValue="selectedLabels"
            @update:modelValue="$emit('update:selectedLabels', $event)"
            :options="availableLabels"
            placeholder="All labels"
            display="chip"
            filter
            :maxSelectedLabels="3"
            class="field-input"
          >
            <template #option="slotProps">
              <div class="filter-option">
                <i class="pi pi-tag" style="color: var(--gf-blue)"></i>
                <span>{{ slotProps.option }}</span>
              </div>
            </template>
          </MultiSelect>
        </div>

        <label class="field field-inline" for="show-normal-subalerts">
          <span class="field-text">
            <span class="field-label">Show normal instances</span>
            <span class="field-description">Include non-firing instances in the expanded details</span>
          </span>
          <ToggleSwitch
            inputId="show-normal-subalerts"
            :modelValue="showNormalSubalerts"
            @update:modelValue="$emit('update:showNormalSubalerts', $event)"
          />
        </label>
      </section>

      <section class="drawer-group">
        <h3 class="group-title">Appearance</h3>

        <div class="field">
          <span class="field-label">Theme</span>
          <div class="segmented" role="radiogroup" aria-label="Theme">
            <button
              v-for="option in themeOptions"
              :key="option.value"
              :class="['segment', { active: theme === option.value }]"
              role="radio"
              :aria-checked="theme === option.value"
              @click="$emit('update:theme', option.value)"
            >
              <i :class="option.icon"></i>
              <span>{{ option.label }}</span>
            </button>
          </div>
        </div>

        <div class="field">
          <span class="field-label">Layout</span>
          <div class="segmented" role="radiogroup" aria-label="Layout">
            <button
              v-for="option in viewOptions"
              :key="option.value"
              :class="['segment', { active: viewMode === option.value }]"
              role="radio"
              :aria-checked="viewMode === option.value"
              @click="$emit('update:viewMode', option.value)"
            >
              <i :class="option.icon"></i>
              <span>{{ option.label }}</span>
            </button>
          </div>
        </div>

        <div class="field">
          <div class="field-row">
            <label class="field-label" for="font-size">Text size</label>
            <span class="field-value">{{ Math.round(fontSize * 50) }}%</span>
          </div>
          <input
            id="font-size"
            type="range"
            :value="fontSize"
            @input="$emit('update:fontSize', parseFloat(($event.target as HTMLInputElement).value))"
            min="1"
            max="3"
            step="0.1"
            class="slider"
          />
        </div>
      </section>

      <section class="drawer-group">
        <h3 class="group-title">Notifications</h3>

        <div class="field">
          <div class="field-row">
            <label class="field-label" for="highlight-duration">Highlight new alerts</label>
            <span class="field-value">{{ highlightDuration === 0 ? 'Off' : `${highlightDuration}s` }}</span>
          </div>
          <input
            id="highlight-duration"
            type="range"
            :value="highlightDuration"
            @input="$emit('update:highlightDuration', parseInt(($event.target as HTMLInputElement).value))"
            min="0"
            max="300"
            step="5"
            class="slider"
          />
        </div>

        <div class="field">
          <label class="field-label" for="notification-sound">Sound</label>
          <Select
            inputId="notification-sound"
            :modelValue="notificationSound"
            @update:modelValue="handleSoundChange"
            :options="soundOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select a sound"
            class="field-input"
          />
        </div>

        <div class="field">
          <div class="field-row">
            <label class="field-label" for="notification-volume">Volume</label>
            <span class="field-value">{{ Math.round(notificationVolume * 100) }}%</span>
          </div>
          <input
            id="notification-volume"
            type="range"
            :value="notificationVolume"
            @input="$emit('update:notificationVolume', parseFloat(($event.target as HTMLInputElement).value))"
            min="0"
            max="1"
            step="0.1"
            class="slider"
          />
        </div>
      </section>

      <a
        href="https://github.com/mms-gianni/grafana-alerts-dashboard"
        target="_blank"
        rel="noopener noreferrer"
        class="github-link"
      >
        <i class="pi pi-github"></i>
        <span>View on GitHub</span>
      </a>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Drawer from 'primevue/drawer'
import MultiSelect from 'primevue/multiselect'
import ToggleSwitch from 'primevue/toggleswitch'
import Select from 'primevue/select'

interface Props {
  visible: boolean
  selectedStates: string[]
  selectedInstances: string[]
  selectedLabels: string[]
  fontSize: number
  viewMode: 'compact' | 'grid'
  theme: 'light' | 'system' | 'dark'
  availableInstances: string[]
  availableLabels: string[]
  showNormalSubalerts: boolean
  highlightDuration: number
  notificationSound: string
  notificationVolume: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:selectedStates': [value: string[]]
  'update:selectedInstances': [value: string[]]
  'update:selectedLabels': [value: string[]]
  'update:fontSize': [value: number]
  'update:viewMode': [value: 'compact' | 'grid']
  'update:theme': [value: 'light' | 'system' | 'dark']
  'update:showNormalSubalerts': [value: boolean]
  'update:highlightDuration': [value: number]
  'update:notificationSound': [value: string]
  'update:notificationVolume': [value: number]
}>()

const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const stateOptions = [
  { label: 'Firing', value: 'alerting', icon: 'pi pi-exclamation-triangle', color: 'var(--gf-red)' },
  { label: 'Pending', value: 'pending', icon: 'pi pi-clock', color: 'var(--gf-orange)' },
  { label: 'No data', value: 'no_data', icon: 'pi pi-question-circle', color: 'var(--gf-blue)' },
  { label: 'Paused', value: 'paused', icon: 'pi pi-pause-circle', color: 'var(--gf-gray)' },
  { label: 'Silenced', value: 'silenced', icon: 'pi pi-volume-off', color: 'var(--gf-gray)' },
  { label: 'Normal', value: 'ok', icon: 'pi pi-check-circle', color: 'var(--gf-green)' },
]

const themeOptions = [
  { label: 'Dark', value: 'dark', icon: 'pi pi-moon' },
  { label: 'Light', value: 'light', icon: 'pi pi-sun' },
  { label: 'System', value: 'system', icon: 'pi pi-desktop' },
] as const

const viewOptions = [
  { label: 'List', value: 'compact', icon: 'pi pi-list' },
  { label: 'Grid', value: 'grid', icon: 'pi pi-th-large' },
] as const

const soundOptions = [
  { label: 'None', value: '' },
  { label: 'Sound 1', value: 'notification-1.mp3' },
  { label: 'Sound 2', value: 'notification-2.mp3' },
  { label: 'Sound 3', value: 'notification-3.mp3' },
  { label: 'Sound 4', value: 'notification-4.mp3' },
  { label: 'Sound 5', value: 'notification-5.mp3' },
]

const handleSoundChange = (newSound: string) => {
  emit('update:notificationSound', newSound)

  // Play preview of selected sound
  if (newSound) {
    const previewAudio = new Audio(`/${newSound}`)
    previewAudio.volume = props.notificationVolume
    previewAudio.play().catch(err => {
      console.log('Could not play preview sound:', err)
    })
  }
}
</script>

<style>
/* Drawer is teleported to <body>, so these are global (tokens live on <html>) */
.settings-drawer.p-drawer {
  width: 400px;
  max-width: 100vw;
  background: var(--gf-panel);
  color: var(--gf-text);
  border-left: 1px solid var(--gf-border-weak);
  box-shadow: var(--gf-shadow-overlay);
}

.settings-drawer .settings-drawer-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--gf-border-weak);
}

.settings-drawer .p-drawer-content {
  padding: 0;
}
</style>

<style scoped>
.drawer-heading {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.drawer-title {
  font-size: 18px;
  font-weight: 500;
  color: var(--gf-text);
}

.drawer-subtitle {
  font-size: 12px;
  color: var(--gf-text-secondary);
}

.drawer-content {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.drawer-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  border-bottom: 1px solid var(--gf-border-weak);
}

.group-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--gf-text);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field-inline {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  cursor: pointer;
}

.field-text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.field-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--gf-text);
}

.field-description {
  font-size: 12px;
  color: var(--gf-text-secondary);
}

.field-value {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--gf-text-secondary);
}

.field-input {
  width: 100%;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-option i {
  font-size: 13px;
}

/* Grafana RadioButtonGroup */
.segmented {
  display: flex;
  padding: 2px;
  gap: 2px;
  border: 1px solid var(--gf-border-medium);
  border-radius: var(--gf-radius-sm);
  background: var(--gf-canvas);
}

.segment {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  height: 28px;
  padding: 0 0.5rem;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--gf-text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--gf-radius-sm);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.segment:hover {
  color: var(--gf-text);
}

.segment.active {
  color: var(--gf-text);
  background: var(--gf-panel-secondary);
  box-shadow: 0 0 0 1px var(--gf-border-weak);
}

.segment:focus-visible {
  outline: 2px solid var(--gf-primary);
  outline-offset: 1px;
}

.segment .pi {
  font-size: 12px;
}

.slider {
  width: 100%;
  accent-color: var(--gf-primary);
  cursor: pointer;
}

.github-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: auto;
  padding: 1rem 1.25rem;
  font-size: 13px;
  color: var(--gf-text-secondary);
  text-decoration: none;
}

.github-link:hover {
  color: var(--gf-text);
}
</style>
