<template>
  <div v-if="silenceIds.length > 0" class="silence-section">
    <h4 class="silence-title">
      <i class="pi pi-volume-off"></i>
      Silences ({{ silenceIds.length }})
    </h4>
    
    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner"></i>
      Loading silences...
    </div>
    
    <div v-else class="silences-list">
      <div v-for="silenceId in silenceIds" :key="silenceId" class="silence-item">
        <div class="silence-header">
          <i class="pi pi-bell-slash"></i>
          <span class="silence-id">{{ silenceId }}</span>
        </div>
        
        <div v-if="silences[silenceId]" class="silence-details">
          <div class="detail-row">
            <strong>Status:</strong>
            <span :class="['status-badge', silences[silenceId].status.state]">
              {{ silences[silenceId].status.state }}
            </span>
          </div>
          
          <div class="detail-row">
            <strong>Comment:</strong>
            <span>{{ silences[silenceId].comment || 'No comment' }}</span>
          </div>
          
          <div class="detail-row">
            <strong>Created by:</strong>
            <span>{{ silences[silenceId].createdBy }}</span>
          </div>
          
          <div class="detail-row">
            <strong>Starts at:</strong>
            <span>{{ formatDate(silences[silenceId].startsAt) }}</span>
          </div>
          
          <div class="detail-row">
            <strong>Ends at:</strong>
            <span>{{ formatDate(silences[silenceId].endsAt) }}</span>
          </div>
          
          <div v-if="silences[silenceId].matchers?.length > 0" class="detail-row matchers-row">
            <strong>Matchers:</strong>
            <div class="matchers-list">
              <div v-for="(matcher, index) in silences[silenceId].matchers" :key="index" class="matcher-item">
                <span class="matcher-name">{{ matcher.name }}</span>
                <span class="matcher-operator">{{ matcher.isRegex ? '=~' : '=' }}</span>
                <span class="matcher-value">{{ matcher.value }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="error-state">
          Failed to load silence details
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useAlert } from '../composables/useAlert'

interface Props {
  silenceIds: string[]
  instanceName: string
}

interface Silence {
  id: string
  matchers: Array<{
    name: string
    value: string
    isRegex: boolean
  }>
  startsAt: string
  endsAt: string
  createdBy: string
  comment: string
  status: {
    state: string
  }
}

const props = defineProps<Props>()

const { formatDate } = useAlert()

const silences = reactive<Record<string, Silence>>({})
const loading = ref(true)

const loadAllSilences = async () => {
  loading.value = true
  
  try {
    // Load all silences in parallel
    await Promise.all(
      props.silenceIds.map(async (silenceId) => {
        try {
          const response = await fetch(
            `/api/silences/${silenceId}?instanceName=${encodeURIComponent(props.instanceName)}&silenceId=${encodeURIComponent(silenceId)}`
          )
          
          if (response.ok) {
            const data = await response.json()
            silences[silenceId] = data
          } else {
            console.error(`Failed to load silence ${silenceId}:`, response.statusText)
          }
        } catch (error) {
          console.error(`Error loading silence ${silenceId}:`, error)
        }
      })
    )
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAllSilences()
})
</script>

<style scoped>
.silence-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.silence-title {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--gf-text-secondary);
}

.silence-title i {
  font-size: 12px;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 13px;
  color: var(--gf-text-secondary);
}

.silences-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.silence-item {
  background: var(--gf-panel);
  border: 1px solid var(--gf-border-weak);
  border-radius: var(--gf-radius);
  box-shadow: inset 3px 0 0 var(--gf-gray);
  padding: 0.75rem 0.75rem 0.75rem calc(0.75rem + 3px);
}

.silence-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.silence-header i {
  color: var(--gf-text-secondary);
  font-size: 13px;
}

.silence-id {
  font-family: var(--gf-font-mono);
  color: var(--gf-text);
  font-size: 12px;
}

.error-state {
  font-size: 13px;
  color: var(--gf-red);
}

.silence-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-row {
  display: flex;
  gap: 0.75rem;
  font-size: 13px;
}

.detail-row strong {
  color: var(--gf-text-secondary);
  font-weight: 500;
  min-width: 96px;
  flex-shrink: 0;
}

.detail-row > span {
  color: var(--gf-text);
  flex: 1;
}

.matchers-row {
  flex-direction: column;
  gap: 0.375rem;
  margin-top: 0.25rem;
}

.status-badge {
  flex: 0 0 auto !important;
  display: inline-block;
  padding: 1px 6px;
  border-radius: var(--gf-radius-sm);
  font-size: 11px;
  font-weight: 500;
  text-transform: capitalize;
  color: var(--gf-gray) !important;
  background: color-mix(in srgb, var(--gf-gray) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--gf-gray) 40%, transparent);
}

.status-badge.active {
  color: var(--gf-green) !important;
  background: color-mix(in srgb, var(--gf-green) 15%, transparent);
  border-color: color-mix(in srgb, var(--gf-green) 40%, transparent);
}

.status-badge.pending {
  color: var(--gf-orange) !important;
  background: color-mix(in srgb, var(--gf-orange) 15%, transparent);
  border-color: color-mix(in srgb, var(--gf-orange) 40%, transparent);
}

.matchers-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.matcher-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 2px 6px;
  background: var(--gf-panel-secondary);
  border: 1px solid var(--gf-border-weak);
  border-radius: var(--gf-radius-sm);
  font-family: var(--gf-font-mono);
  font-size: 12px;
}

.matcher-name {
  color: var(--gf-blue);
}

.matcher-operator {
  color: var(--gf-text-secondary);
}

.matcher-value {
  color: var(--gf-text);
}
</style>
