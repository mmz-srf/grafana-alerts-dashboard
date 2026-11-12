<template>
  <div
    :class="[
      'alert-item',
      `state-${alert.state}`,
      { 'is-silenced': alert.isSilenced, 'is-new': isNew, 'is-expanded': expanded }
    ]"
  >
    <div
      :class="['alert-row', { 'is-clickable': hasSubAlerts, 'no-actions': isWallDisplayMode }]"
      :role="hasSubAlerts ? 'button' : undefined"
      :tabindex="hasSubAlerts ? 0 : undefined"
      :aria-expanded="hasSubAlerts ? expanded : undefined"
      @click="toggleAccordion"
      @keydown.enter.space.prevent="toggleAccordion"
    >
      <div class="cell-name" :style="{ fontSize: `${fontSize}rem` }">
        <i
          :class="['chevron', 'pi', expanded ? 'pi-angle-down' : 'pi-angle-right', { 'is-hidden': !hasSubAlerts }]"
        ></i>
        <i :class="['state-icon', getStateIcon(alert.state)]"></i>
        <span class="name-text" :title="alert.name">{{ alert.name }}</span>
        <span v-if="alert.instanceName && alert.instanceName !== 'default'" class="gf-instance">
          {{ alert.instanceName }}
        </span>
        <i v-if="alert.isSilenced" class="pi pi-volume-off silenced-icon" title="Silenced"></i>
      </div>

      <div class="cell-group" :title="alert.ruleGroup">
        {{ alert.ruleGroup }}
      </div>

      <div class="cell-totals">
        <span
          v-if="alert.totals?.alerting && alert.totals.alerting >= 1"
          class="gf-count is-firing"
          title="Firing instances"
        >{{ alert.totals.alerting }}</span>
        <span
          v-if="alert.totals?.normal && alert.totals.normal >= 1"
          class="gf-count is-normal"
          title="Normal instances"
        >{{ alert.totals.normal }}</span>
      </div>

      <div class="cell-labels">
        <span v-for="(value, key) in alert.labels" :key="key" class="gf-label">
          <span class="gf-label-key">{{ key }}</span><span class="gf-label-value">{{ value }}</span>
        </span>
      </div>

      <div class="cell-state">
        <span class="state-text">{{ getStateLabel(alert.state) }}</span>
        <span class="state-duration">{{ getDuration(alert.newStateDate) }}</span>
      </div>

      <div v-if="!isWallDisplayMode" class="cell-actions">
        <a
          :href="alert.url"
          target="_blank"
          rel="noopener noreferrer"
          class="gf-btn row-link"
          title="View alert rule in Grafana"
          @click.stop
        >
          <i class="pi pi-external-link"></i>
        </a>
      </div>
    </div>

    <div v-if="expanded" class="alert-details">
      <AlertTimeline
        :alert-id="alert.id"
        :instance-name="alert.instanceName"
      />

      <SilenceAccordion
        v-if="alert.isSilencedBy && alert.isSilencedBy.length > 0"
        :silence-ids="alert.isSilencedBy"
        :instance-name="alert.instanceName || 'default'"
      />

      <SubAlertAccordion
        v-if="filteredSubAlerts.length > 0"
        :sub-alerts="filteredSubAlerts"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRef, watch } from 'vue'
import SubAlertAccordion from './SubAlertAccordion.vue'
import AlertTimeline from './AlertTimeline.vue'
import SilenceAccordion from './SilenceRow.vue'
import { useAlert, type GrafanaAlert } from '../composables/useAlert'

interface Props {
  alert: GrafanaAlert
  fontSize?: number
  showNormalSubalerts?: boolean
  isNew?: boolean
  isWallDisplayMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  fontSize: 2,
  showNormalSubalerts: false,
  isNew: false,
  isWallDisplayMode: false
})

watch(() => props.isNew, (newVal) => {
  if (newVal) {
    console.log('Alert is NEW:', props.alert.name, props.alert.id)
  }
})

const expanded = ref(false)

const { getStateIcon, getStateLabel, getDuration, useFilteredSubAlerts } = useAlert()

const filteredSubAlerts = useFilteredSubAlerts(
  computed(() => props.alert),
  toRef(props, 'showNormalSubalerts')
)

const hasSubAlerts = computed(() => !!props.alert.alerts && props.alert.alerts.length > 0)

const toggleAccordion = () => {
  if (hasSubAlerts.value) {
    expanded.value = !expanded.value
  }
}
</script>

<style scoped>
.alert-item {
  border-bottom: 1px solid var(--gf-border-weak);
}

.alert-item:last-child {
  border-bottom: none;
}

.alert-row {
  display: grid;
  grid-template-columns: var(--cols);
  gap: 1rem;
  align-items: center;
  padding: 0.5rem 1rem;
  /* State colour bar on the left edge */
  box-shadow: inset 3px 0 0 var(--state-color);
  padding-left: calc(1rem + 3px);
  transition: background-color 0.15s;
}

.alert-row:hover {
  background: var(--gf-hover);
}

.alert-row.is-clickable {
  cursor: pointer;
}

.alert-row:focus-visible {
  outline: 2px solid var(--gf-primary);
  outline-offset: -2px;
}

.is-expanded .alert-row {
  background: var(--gf-active);
}

/* Firing rows get a faint wash of red, like Grafana's alert list */
.state-alerting:not(.is-silenced) .alert-row {
  background: linear-gradient(90deg, color-mix(in srgb, var(--gf-red) 12%, transparent), transparent 60%);
}

.state-alerting:not(.is-silenced) .alert-row:hover {
  background: linear-gradient(90deg, color-mix(in srgb, var(--gf-red) 18%, transparent), var(--gf-hover) 60%);
}

.is-silenced .alert-row > * {
  opacity: 0.5;
}

.alert-item.is-new .alert-row {
  background-image: none;
  animation: gf-attention 1.2s ease-in-out infinite;
  box-shadow: inset 3px 0 0 var(--gf-yellow);
}

/* ---- Cells ---- */
.cell-name {
  display: flex;
  align-items: center;
  gap: 0.4em;
  min-width: 0;
  font-weight: 500;
  line-height: 1.25;
  color: var(--gf-text);
}

.chevron {
  font-size: 0.5em;
  width: 1em;
  flex-shrink: 0;
  color: var(--gf-text-secondary);
}

.chevron.is-hidden {
  visibility: hidden;
}

.state-icon {
  font-size: 0.75em;
  flex-shrink: 0;
  color: var(--state-color);
  margin-right: 0.15em;
}

.name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.silenced-icon {
  font-size: 0.5em;
  color: var(--gf-text-secondary);
  flex-shrink: 0;
}

.cell-group {
  font-size: 14px;
  color: var(--gf-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-totals {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.cell-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  min-width: 0;
  max-height: 3.5em;
  overflow: hidden;
}

.cell-state {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.125rem;
  line-height: 1.2;
  white-space: nowrap;
}

.state-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--state-color);
}

.state-duration {
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  color: var(--gf-text);
}

.state-alerting .state-duration,
.state-pending .state-duration {
  color: var(--state-color);
  font-weight: 500;
}

.cell-actions {
  display: flex;
  justify-content: flex-end;
}

.row-link {
  padding: 0;
  width: 32px;
  text-decoration: none;
  background: transparent;
  border-color: transparent;
}

.row-link:hover {
  color: var(--gf-primary-text) !important;
}

.row-link .pi {
  font-size: 13px;
}

/* ---- Expanded details ---- */
.alert-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem 1rem 1rem calc(1rem + 3px + 2.25rem);
  background: var(--gf-canvas);
  border-top: 1px solid var(--gf-border-weak);
  box-shadow: inset 3px 0 0 var(--state-color);
}

/* ---- Responsive ---- */
@media (max-width: 1024px) {
  .cell-group,
  .cell-labels {
    display: none;
  }
}

@media (max-width: 768px) {
  .alert-row {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }

  .cell-totals,
  .cell-state {
    display: none;
  }

  .alert-details {
    padding-left: 1rem;
  }
}
</style>
