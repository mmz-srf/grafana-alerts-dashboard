<template>
  <div
    :class="[
      'gf-panel',
      'alert-card',
      `state-${alert.state}`,
      { 'is-silenced': alert.isSilenced, 'is-new': isNew }
    ]"
  >
    <div class="card-header">
      <i :class="['state-icon', getStateIcon(alert.state)]"></i>
      <span class="card-title" :title="alert.name" :style="{ fontSize: `${fontSize * 0.5}rem` }">
        {{ alert.name }}
      </span>
      <span v-if="alert.instanceName && alert.instanceName !== 'default'" class="gf-instance">
        {{ alert.instanceName }}
      </span>
      <a
        v-if="!isWallDisplayMode"
        :href="alert.url"
        target="_blank"
        rel="noopener noreferrer"
        class="card-link"
        title="View alert rule in Grafana"
      >
        <i class="pi pi-external-link"></i>
      </a>
    </div>

    <div class="card-body">
      <div class="card-state">
        <span class="state-text">
          {{ getStateLabel(alert.state) }}
          <template v-if="alert.isSilenced">
            · <i class="pi pi-volume-off"></i> silenced
          </template>
        </span>
        <span class="card-since">since {{ formatDate(alert.newStateDate) }}</span>
      </div>

      <div class="card-value" :style="{ fontSize: `${fontSize * 1.1}rem` }">
        {{ getDuration(alert.newStateDate) }}
      </div>

      <div class="card-meta">
        <span v-if="alert.ruleGroup" class="card-group" :title="alert.ruleGroup">
          <i class="pi pi-folder"></i>
          {{ alert.ruleGroup }}
        </span>
        <span class="card-totals">
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
        </span>
      </div>

      <div v-if="alert.labels && Object.keys(alert.labels).length > 0" class="card-labels">
        <span v-for="(value, key) in alert.labels" :key="key" class="gf-label">
          <span class="gf-label-key">{{ key }}</span><span class="gf-label-value">{{ value }}</span>
        </span>
      </div>
    </div>

    <button
      v-if="hasDetails"
      class="card-expand"
      :aria-expanded="expanded"
      @click="toggleExpanded"
    >
      <i :class="['pi', expanded ? 'pi-angle-up' : 'pi-angle-down']"></i>
      {{ expanded ? 'Hide instances' : 'Show instances' }}
    </button>

    <div v-if="expanded" class="card-details">
      <SubAlertAccordion
        v-if="filteredSubAlerts.length > 0"
        :sub-alerts="filteredSubAlerts"
      />
      <p v-else class="card-empty">No firing instances.</p>

      <SilenceAccordion
        v-if="alert.isSilencedBy && alert.isSilencedBy.length > 0"
        :silence-ids="alert.isSilencedBy"
        :instance-name="alert.instanceName || 'default'"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRef, watch } from 'vue'
import SubAlertAccordion from './SubAlertAccordion.vue'
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
    console.log('Card Alert is NEW:', props.alert.name, props.alert.id)
  }
})

const expanded = ref(false)

const { getStateIcon, getStateLabel, formatDate, getDuration, useFilteredSubAlerts } = useAlert()

const filteredSubAlerts = useFilteredSubAlerts(
  computed(() => props.alert),
  toRef(props, 'showNormalSubalerts')
)

const hasDetails = computed(() => !!props.alert.alerts && props.alert.alerts.length > 0)

const toggleExpanded = () => {
  expanded.value = !expanded.value
}
</script>

<style scoped>
.alert-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border-top: 2px solid var(--state-color);
  transition: border-color 0.15s;
}

.alert-card:hover {
  border-left-color: var(--gf-border-medium);
  border-right-color: var(--gf-border-medium);
  border-bottom-color: var(--gf-border-medium);
}

/* Grafana stat panel "background gradient" for firing / pending */
.state-alerting:not(.is-silenced),
.state-pending:not(.is-silenced) {
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--state-color) 16%, var(--gf-panel)) 0%,
    var(--gf-panel) 65%
  );
}

.is-silenced {
  opacity: 0.6;
}

.alert-card.is-new {
  background-image: none;
  animation: gf-attention 1.2s ease-in-out infinite;
  border-top-color: var(--gf-yellow);
}

/* ---- Header (panel title bar) ---- */
.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 36px;
  padding: 0.5rem 0.75rem 0;
}

.state-icon {
  font-size: 14px;
  color: var(--state-color);
  flex-shrink: 0;
}

.card-title {
  flex: 1;
  min-width: 0;
  font-weight: 500;
  line-height: 1.25;
  color: var(--gf-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  color: var(--gf-text-secondary);
  border-radius: var(--gf-radius-sm);
  text-decoration: none;
}

.card-link:hover {
  color: var(--gf-primary-text);
  background: var(--gf-active);
}

.card-link .pi {
  font-size: 12px;
}

/* ---- Body ---- */
.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem 0.75rem;
}

.card-state {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.75rem;
  font-size: 12px;
}

.state-text {
  font-weight: 500;
  color: var(--state-color);
  white-space: nowrap;
}

.state-text .pi {
  font-size: 10px;
}

.card-since {
  color: var(--gf-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-value {
  font-weight: 500;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: var(--state-color);
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  font-size: 13px;
  color: var(--gf-text-secondary);
}

.card-group {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-group .pi {
  font-size: 11px;
}

.card-totals {
  display: inline-flex;
  gap: 0.75rem;
  flex-shrink: 0;
}

.card-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

/* ---- Expand ---- */
.card-expand {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: auto;
  padding: 0.5rem 0.75rem;
  font: inherit;
  font-size: 12px;
  color: var(--gf-text-secondary);
  background: transparent;
  border: none;
  border-top: 1px solid var(--gf-border-weak);
  cursor: pointer;
  text-align: left;
}

.card-expand:hover {
  color: var(--gf-text);
  background: var(--gf-hover);
}

.card-expand .pi {
  font-size: 12px;
}

.card-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--gf-canvas);
  border-top: 1px solid var(--gf-border-weak);
}

.card-empty {
  margin: 0;
  font-size: 13px;
  color: var(--gf-text-secondary);
}
</style>
