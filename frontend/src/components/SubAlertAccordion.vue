<template>
  <div class="instances">
    <div class="section-title">
      Instances <span class="section-count">{{ subAlerts.length }}</span>
    </div>
    <Accordion :multiple="true" class="instance-accordion">
      <AccordionTab
        v-for="(subAlert, index) in subAlerts"
        :key="index"
      >
        <template #header>
          <div :class="['instance-header', subAlert.state === 'Alerting' ? 'state-alerting' : 'state-ok']">
            <i class="pi pi-angle-right instance-chevron"></i>
            <span class="instance-state">
              <i :class="['pi', subAlert.state === 'Alerting' ? 'pi-exclamation-triangle' : 'pi-check-circle']"></i>
              {{ subAlert.state === 'Alerting' ? 'Firing' : 'Normal' }}
            </span>
            <span class="instance-labels">
              <span
                v-for="(value, key) in summaryLabels(subAlert.labels)"
                :key="key"
                class="gf-label"
              >
                <span class="gf-label-key">{{ key }}</span><span class="gf-label-value">{{ value }}</span>
              </span>
            </span>
            <span v-if="subAlert.value" class="instance-value" :title="subAlert.value">
              {{ valuePrefix }}{{ subAlert.value }}
            </span>
          </div>
        </template>

        <div class="instance-body">
          <div v-if="Object.keys(subAlert.labels).length > 0" class="instance-section">
            <div class="field-label">Labels</div>
            <div class="instance-label-list">
              <span v-for="(value, key) in subAlert.labels" :key="key" class="gf-label">
                <span class="gf-label-key">{{ key }}</span><span class="gf-label-value">{{ value }}</span>
              </span>
            </div>
          </div>

          <div v-if="Object.keys(subAlert.annotations).length > 0" class="instance-section">
            <div class="field-label">Annotations</div>
            <dl class="annotation-list">
              <template v-for="(value, key) in subAlert.annotations" :key="key">
                <dt>{{ key }}</dt>
                <dd>{{ value }}</dd>
              </template>
            </dl>
          </div>

          <div class="instance-section">
            <div class="field-label">Active since</div>
            <div class="field-value">{{ formatDate(subAlert.activeAt) }}</div>
          </div>
        </div>
      </AccordionTab>
    </Accordion>
  </div>
</template>

<script setup lang="ts">
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'
import { useAlert, type SubAlert } from '../composables/useAlert'

interface Props {
  subAlerts: SubAlert[]
  valuePrefix?: string
}

withDefaults(defineProps<Props>(), {
  valuePrefix: ''
})

const { formatDate } = useAlert()

// Labels Grafana adds to every instance and that only repeat the rule itself
const NOISY_LABELS = new Set(['alertname', 'grafana_folder', '__alert_rule_uid__', '__alert_rule_namespace_uid__'])

// Show a few distinguishing labels in the collapsed header
const summaryLabels = (labels: Record<string, string>): Record<string, string> => {
  return Object.fromEntries(
    Object.entries(labels)
      .filter(([key]) => !NOISY_LABELS.has(key))
      .slice(0, 3)
  )
}
</script>

<style scoped>
.instances {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--gf-text-secondary);
}

.section-count {
  margin-left: 0.25rem;
  padding: 0 0.375rem;
  border-radius: 8px;
  background: var(--gf-active);
  color: var(--gf-text);
  font-variant-numeric: tabular-nums;
}

.instance-accordion {
  border: 1px solid var(--gf-border-weak);
  border-radius: var(--gf-radius);
  background: var(--gf-panel);
  overflow: hidden;
}

.instance-accordion :deep(.p-accordionpanel) {
  border: none;
  border-bottom: 1px solid var(--gf-border-weak);
}

.instance-accordion :deep(.p-accordionpanel:last-child) {
  border-bottom: none;
}

.instance-accordion :deep(.p-accordionheader) {
  padding: 0.5rem 0.75rem;
  background: transparent;
  color: var(--gf-text);
  font-weight: 400;
  gap: 0.75rem;
}

.instance-accordion :deep(.p-accordionheader:hover) {
  background: var(--gf-hover);
}

.instance-accordion :deep(.p-accordionheader-toggle-icon) {
  display: none;
}

.instance-chevron {
  font-size: 12px;
  color: var(--gf-text-secondary);
  transition: transform 0.15s;
}

.instance-accordion :deep(.p-accordionpanel-active) .instance-chevron {
  transform: rotate(90deg);
}

.instance-accordion :deep(.p-accordioncontent-content) {
  padding: 0 0.75rem 0.75rem 2.25rem;
  background: transparent;
  color: var(--gf-text);
}

.instance-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-width: 0;
  font-size: 13px;
}

.instance-state {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 72px;
  font-weight: 500;
  color: var(--state-color);
  flex-shrink: 0;
}

.instance-state .pi {
  font-size: 12px;
}

.instance-labels {
  display: flex;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.instance-value {
  font-family: var(--gf-font-mono);
  font-size: 12px;
  color: var(--gf-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 40%;
}

.instance-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.instance-section {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--gf-text-secondary);
}

.field-value {
  font-size: 13px;
}

.instance-label-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.annotation-list {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.25rem 1rem;
  margin: 0;
  font-size: 13px;
}

.annotation-list dt {
  color: var(--gf-text-secondary);
}

.annotation-list dd {
  margin: 0;
  color: var(--gf-text);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
