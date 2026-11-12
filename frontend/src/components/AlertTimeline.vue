<template>
  <div class="timeline">
    <div class="section-title">State history <span class="muted">· last 24h</span></div>
    <div v-if="loading" class="timeline-message">
      <i class="pi pi-spin pi-spinner"></i> Loading history…
    </div>
    <div v-else-if="error" class="timeline-message is-error">{{ error }}</div>
    <div v-else class="timeline-wrapper">
      <div class="timeline-bar">
        <div
          v-for="(segment, index) in timelineSegments"
          :key="index"
          class="timeline-segment"
          :class="`timeline-${segment.state.toLowerCase()}`"
          :style="{ width: `${segment.percentage}%` }"
          :title="`${segment.state} – ${formatDuration(segment.duration)}`"
        >
          <span v-if="segment.percentage > 12" class="segment-label">{{ segment.state }}</span>
        </div>
      </div>
      <div class="timeline-axis">
        <span>-24h</span>
        <span>-18h</span>
        <span>-12h</span>
        <span>-6h</span>
        <span>now</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

interface Annotation {
  id: number
  alertId: number
  newState: string
  prevState: string
  time: number
  timeEnd: number
}

interface TimelineSegment {
  state: string
  start: number
  end: number
  duration: number
  percentage: number
}

interface Props {
  alertId: number
  instanceName?: string
}

const props = defineProps<Props>()

const annotations = ref<Annotation[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const TWENTY_FOUR_HOURS = 86400000 // 24 hours in milliseconds

const fetchAnnotations = async () => {
  loading.value = true
  error.value = null

  try {
    if (!props.instanceName) {
      error.value = 'Instance name is required'
      loading.value = false
      return
    }
    const response = await fetch(`/api/annotations?alertId=${props.alertId}&instanceName=${encodeURIComponent(props.instanceName)}`)

    if (!response.ok) {
      throw new Error('Failed to fetch annotations')
    }

    const data = await response.json()
    annotations.value = data.sort((a: Annotation, b: Annotation) => a.time - b.time)
  } catch (e) {
    error.value = 'Failed to load timeline data'
    console.error('Error fetching annotations:', e)
  } finally {
    loading.value = false
  }
}

const timelineSegments = computed((): TimelineSegment[] => {
  const now = Date.now()
  const startTime = now - TWENTY_FOUR_HOURS

  // If no annotations, show a green (Normal/OK) timeline for the entire 24h
  if (annotations.value.length === 0) {
    return [{
      state: 'Normal',
      start: startTime,
      end: now,
      duration: TWENTY_FOUR_HOURS,
      percentage: 100
    }]
  }

  const segments: TimelineSegment[] = []

  // Sort annotations by time
  const sortedAnnotations = [...annotations.value].sort((a, b) => a.time - b.time)

  // Find the first annotation before or at startTime
  let currentState = 'Normal'
  for (let i = 0; i < sortedAnnotations.length; i++) {
    if (sortedAnnotations[i].time <= startTime) {
      currentState = sortedAnnotations[i].newState
    } else {
      break
    }
  }

  let segmentStart = startTime

  // Process annotations within the 24-hour window
  for (const annotation of sortedAnnotations) {
    if (annotation.time > startTime && annotation.time <= now) {
      // Create segment for the previous state
      const segmentEnd = annotation.time
      const duration = segmentEnd - segmentStart
      const percentage = (duration / TWENTY_FOUR_HOURS) * 100

      segments.push({
        state: currentState,
        start: segmentStart,
        end: segmentEnd,
        duration,
        percentage
      })

      // Update for next segment
      currentState = annotation.newState
      segmentStart = segmentEnd
    }
  }

  // Add final segment from last state change to now
  const finalDuration = now - segmentStart
  const finalPercentage = (finalDuration / TWENTY_FOUR_HOURS) * 100

  segments.push({
    state: currentState,
    start: segmentStart,
    end: now,
    duration: finalDuration,
    percentage: finalPercentage
  })

  return segments
})

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m`
  } else {
    return `${seconds}s`
  }
}

onMounted(() => {
  fetchAnnotations()
})
</script>

<style scoped>
.timeline {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--gf-text-secondary);
}

.section-title .muted {
  font-weight: 400;
  color: var(--gf-text-disabled);
}

.timeline-message {
  font-size: 13px;
  color: var(--gf-text-secondary);
}

.timeline-message.is-error {
  color: var(--gf-red);
}

.timeline-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* Grafana "State timeline" look: solid blocks with hairline gaps */
.timeline-bar {
  display: flex;
  gap: 1px;
  height: 24px;
  border-radius: var(--gf-radius-sm);
  overflow: hidden;
  background: var(--gf-active);
}

.timeline-segment {
  --seg: var(--gf-green);
  display: flex;
  align-items: center;
  height: 100%;
  min-width: 2px;
  padding: 0 0.5rem;
  background: color-mix(in srgb, var(--seg) 80%, transparent);
  overflow: hidden;
  transition: filter 0.15s;
}

.timeline-segment:hover {
  filter: brightness(1.15);
}

.segment-label {
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
}

.timeline-alerting { --seg: var(--gf-red); }
.timeline-pending { --seg: var(--gf-orange); }
.timeline-normal,
.timeline-ok { --seg: var(--gf-green); }
.timeline-paused { --seg: var(--gf-gray); }
.timeline-no_data,
.timeline-nodata { --seg: var(--gf-blue); }
.timeline-error { --seg: var(--gf-purple); }

.timeline-axis {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--gf-text-disabled);
}
</style>
