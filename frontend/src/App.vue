<template>
  <div :class="['dashboard', `theme-${effectiveTheme}`, { 'is-wall': isWallDisplayMode }]">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark"><i class="pi pi-bell"></i></span>
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <span class="crumb-muted">Alerting</span>
          <i class="pi pi-angle-right crumb-sep"></i>
          <span class="crumb-current">Alert overview</span>
        </nav>
      </div>

      <div class="topbar-right">
        <label v-if="!isWallDisplayMode" class="search-box">
          <i class="pi pi-search"></i>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search alert rules"
            aria-label="Search alert rules by name"
            @keyup.escape="searchQuery = ''"
          />
          <button
            v-if="searchQuery"
            class="search-clear"
            title="Clear search"
            @click="searchQuery = ''"
          >
            <i class="pi pi-times"></i>
          </button>
        </label>

        <div
          :class="['live-indicator', connectionStatus.connected ? 'is-live' : 'is-offline']"
          :title="connectionStatus.text"
        >
          <span class="live-dot"></span>
          <span class="live-text">{{ connectionStatus.connected ? 'Live' : connectionStatus.text }}</span>
          <span class="live-time">{{ lastUpdate }}</span>
        </div>

        <template v-if="!isWallDisplayMode">
          <button
            class="gf-btn"
            @click="refreshAlerts"
            :disabled="refreshing || !connectionStatus.connected"
            title="Refresh alerts"
          >
            <i :class="['pi', 'pi-refresh', { 'pi-spin': refreshing }]"></i>
          </button>
          <button
            class="gf-btn"
            @click="showSidebar = true"
            title="Open settings"
          >
            <i class="pi pi-cog"></i>
          </button>
        </template>
      </div>
    </header>

    <SettingsSidebar
      v-model:visible="showSidebar"
      v-model:selectedStates="selectedStates"
      v-model:selectedInstances="selectedInstances"
      v-model:selectedLabels="selectedLabels"
      v-model:fontSize="fontSize"
      v-model:viewMode="viewMode"
      v-model:theme="theme"
      v-model:showNormalSubalerts="showNormalSubalerts"
      v-model:highlightDuration="highlightDuration"
      v-model:notificationSound="notificationSound"
      v-model:notificationVolume="notificationVolume"
      :availableInstances="availableInstances"
      :availableLabels="availableLabels"
    />

    <main class="content">
      <!-- Summary row: Grafana stat panels -->
      <section class="stat-row" aria-label="Alert summary">
        <div :class="['gf-panel', 'stat-panel', 'status-panel', `status-${overallStatus.tone}`]">
          <div class="gf-panel-title">Overall status</div>
          <div class="status-value">
            <i :class="overallStatus.icon"></i>
            <span>{{ overallStatus.text }}</span>
          </div>
        </div>

        <div class="gf-panel stat-panel">
          <div class="gf-panel-title">Alert rules</div>
          <div class="stat-value">
            {{ sortedAlerts.length }}<span class="stat-total">/ {{ alerts.length }}</span>
          </div>
        </div>

        <div
          v-for="stat in statPanels"
          :key="stat.key"
          :class="[
            'gf-panel',
            'stat-panel',
            `state-${stat.key}`,
            { 'is-hot': stat.hot && stat.value > 0, 'is-zero': stat.value === 0 }
          ]"
        >
          <div class="gf-panel-title">
            <i :class="stat.icon"></i>
            {{ stat.label }}
          </div>
          <div class="stat-value">{{ stat.value }}</div>
        </div>
      </section>

      <div class="row-title">
        <span>Alert rules</span>
        <span class="row-title-meta">
          {{ sortedAlerts.length }} shown<template v-if="searchQuery"> · matching “{{ searchQuery }}”</template>
        </span>
      </div>

      <div v-if="loading" class="gf-panel state-message">
        <i class="pi pi-spin pi-spinner"></i>
        <p>Loading alerts…</p>
      </div>

      <div v-else-if="error" class="gf-panel state-message is-error">
        <i class="pi pi-exclamation-triangle"></i>
        <p>{{ error }}</p>
      </div>

      <div v-else-if="alerts.length === 0" class="gf-panel state-message is-ok">
        <i class="pi pi-check-circle"></i>
        <p>No alert rules found. All systems operational.</p>
      </div>

      <div v-else-if="sortedAlerts.length === 0" class="gf-panel state-message">
        <i class="pi pi-filter-slash"></i>
        <p>No alert rules match the current filters.</p>
      </div>

      <div
        v-else-if="viewMode === 'compact'"
        :class="['gf-panel', 'alert-table', { 'no-actions': isWallDisplayMode }]"
      >
        <div class="table-head" role="row">
          <div class="head-name">Alert rule</div>
          <div class="head-group">Rule group</div>
          <div class="head-totals">Instances</div>
          <div class="head-labels">Labels</div>
          <div class="head-state">State</div>
          <div v-if="!isWallDisplayMode" class="head-actions"></div>
        </div>
        <AlertRow
          v-for="alert in sortedAlerts"
          :key="`${alert.instanceName || 'default'}-${alert.id}`"
          :alert="alert"
          :fontSize="fontSize"
          :showNormalSubalerts="showNormalSubalerts"
          :isNew="highlightDuration > 0 && newAlertIds.has(alert.id)"
          :isWallDisplayMode="isWallDisplayMode"
        />
      </div>

      <div v-else class="alerts-grid">
        <AlertCard
          v-for="alert in sortedAlerts"
          :key="`${alert.instanceName || 'default'}-${alert.id}`"
          :alert="alert"
          :fontSize="fontSize"
          :showNormalSubalerts="showNormalSubalerts"
          :isWallDisplayMode="isWallDisplayMode"
          :isNew="highlightDuration > 0 && newAlertIds.has(alert.id)"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, watchEffect, onMounted, onUnmounted } from 'vue'
import AlertCard from './components/AlertCard.vue'
import AlertRow from './components/AlertRow.vue'
import SettingsSidebar from './components/SettingsSidebar.vue'
import { io, Socket } from 'socket.io-client'
import type { GrafanaAlert } from './composables/useAlert'
import { getFallbackDefaults, type AppSettings } from './config/settings'
import { useFullscreenDetection } from './composables/useFullscreenDetection'

// Cookie utility functions
const setCookie = (name: string, value: string, days: number = 365) => {
  const date = new Date()
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))
  document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`
}

const getCookie = (name: string): string | null => {
  const nameEQ = name + "="
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

// Backend default settings (received via WebSocket)
const backendDefaults = ref<AppSettings | null>(null)

const loadSettings = (defaults: AppSettings = getFallbackDefaults()) => {
  try {
    const saved = getCookie('alertsSettings')
    if (saved) {
      const cookieSettings = JSON.parse(decodeURIComponent(saved))
      // Cookie always takes precedence over defaults
      return { ...defaults, ...cookieSettings }
    }
  } catch (e) {
    console.error('Failed to load settings from cookie:', e)
  }
  // Return backend defaults (or fallback if backend not available yet)
  return defaults
}

const applySettings = (settings: AppSettings) => {
  viewMode.value = settings.viewMode
  selectedStates.value = settings.selectedStates
  selectedInstances.value = settings.selectedInstances
  selectedLabels.value = settings.selectedLabels
  fontSize.value = settings.fontSize
  theme.value = settings.theme
  showNormalSubalerts.value = settings.showNormalSubalerts
  highlightDuration.value = settings.highlightDuration
  notificationSound.value = settings.notificationSound
  notificationVolume.value = settings.notificationVolume
}

const saveSettings = () => {
  const settings = {
    viewMode: viewMode.value,
    selectedStates: selectedStates.value,
    selectedInstances: selectedInstances.value,
    selectedLabels: selectedLabels.value,
    fontSize: fontSize.value,
    theme: theme.value,
    showNormalSubalerts: showNormalSubalerts.value,
    highlightDuration: highlightDuration.value,
    notificationSound: notificationSound.value,
    notificationVolume: notificationVolume.value
  }
  setCookie('alertsSettings', encodeURIComponent(JSON.stringify(settings)))
}

// Load saved settings with fallback defaults
const savedSettings = loadSettings()

const alerts = ref<GrafanaAlert[]>([])
const newAlertIds = ref<Set<number>>(new Set())
const previousAlertStates = ref<Map<number, string>>(new Map())
const loading = ref(true)
const error = ref<string | null>(null)
const lastUpdate = ref('—')
const connectionStatus = ref({ connected: false, text: 'Connecting…' })
const viewMode = ref<'compact' | 'grid'>(savedSettings.viewMode)
const selectedStates = ref<string[]>(savedSettings.selectedStates)
const selectedInstances = ref<string[]>(savedSettings.selectedInstances)
const selectedLabels = ref<string[]>(savedSettings.selectedLabels)
const fontSize = ref(savedSettings.fontSize)
const showSidebar = ref(false)
const refreshing = ref(false)
const theme = ref<'light' | 'system' | 'dark'>(savedSettings.theme)
const showNormalSubalerts = ref(savedSettings.showNormalSubalerts)
const highlightDuration = ref(savedSettings.highlightDuration)
const notificationSound = ref(savedSettings.notificationSound)
const notificationVolume = ref(savedSettings.notificationVolume)
const notificationAudio = ref<HTMLAudioElement | null>(null)
const searchQuery = ref('')

const { isWallDisplayMode } = useFullscreenDetection()

const systemPrefersDark = ref(window.matchMedia('(prefers-color-scheme: dark)').matches)

// Watch for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  systemPrefersDark.value = e.matches
})

const effectiveTheme = computed(() => {
  if (theme.value === 'system') {
    return systemPrefersDark.value ? 'dark' : 'light'
  }
  return theme.value
})

// The theme lives on <html> so the design tokens and PrimeVue's dark mode
// also reach portaled overlays (settings drawer, dropdowns).
watchEffect(() => {
  document.documentElement.classList.toggle('dark', effectiveTheme.value === 'dark')
})

let socket: Socket | null = null

const refreshAlerts = () => {
  if (socket && connectionStatus.value.connected) {
    refreshing.value = true
    socket.emit('getAlerts')
    setTimeout(() => {
      refreshing.value = false
    }, 1000)
  }
}

const availableInstances = computed(() => {
  const instances = new Set<string>()
  alerts.value.forEach(alert => {
    if (alert.instanceName) {
      instances.add(alert.instanceName)
    }
  })
  return Array.from(instances).sort()
})

const availableLabels = computed(() => {
  const labels = new Set<string>()
  alerts.value.forEach(alert => {
    if (alert.labels) {
      Object.entries(alert.labels).forEach(([key, value]) => {
        labels.add(`${key}:${value}`)
      })
    }
  })
  return Array.from(labels).sort()
})

const sortedAlerts = computed(() => {
  const stateOrder = { alerting: 0, pending: 1, no_data: 2, paused: 3, silenced: 4, ok: 5 }

  let filtered = [...alerts.value]
    .filter(alert => {
      // Show silenced alerts if 'silenced' is selected
      if (alert.isSilenced && selectedStates.value.includes('silenced')) return true
      // Show non-silenced alerts if their state is selected
      if (!alert.isSilenced && selectedStates.value.includes(alert.state)) return true
      return false
    })
    .filter(alert => {
      // If no instances selected, show all
      if (selectedInstances.value.length === 0) return true
      // Filter by selected instances
      return selectedInstances.value.includes(alert.instanceName || 'default')
    })
    .filter(alert => {
      // If no labels selected, show all
      if (selectedLabels.value.length === 0) return true
      // Check if alert has any of the selected labels
      if (!alert.labels) return false
      return selectedLabels.value.some(selectedLabel => {
        const [key, value] = selectedLabel.split(':')
        return alert.labels![key] === value
      })
    })
    .filter(alert => {
      // Filter by search query (case-insensitive title search)
      if (!searchQuery.value.trim()) return true
      return alert.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    })
    .sort((a, b) => {
      const aOrder = stateOrder[a.state] ?? 99
      const bOrder = stateOrder[b.state] ?? 99

      // Primary sort: by severity/state
      if (aOrder !== bOrder) {
        return aOrder - bOrder
      }

      // Secondary sort: by age (newest first)
      return new Date(b.newStateDate).getTime() - new Date(a.newStateDate).getTime()
    })

  return filtered
})

const alertingCount = computed(() => alerts.value.filter(a => a.state === 'alerting').length)
const pendingCount = computed(() => alerts.value.filter(a => a.state === 'pending').length)
const noDataCount = computed(() => alerts.value.filter(a => a.state === 'no_data').length)
const pausedCount = computed(() => alerts.value.filter(a => a.state === 'paused').length)
const silencedCount = computed(() => alerts.value.filter(a => a.isSilenced).length)
const okCount = computed(() => alerts.value.filter(a => a.state === 'ok').length)

// `hot` stats switch to Grafana's "background" colour mode when non-zero,
// so a firing alert is visible from across the room.
const statPanels = computed(() => [
  { key: 'alerting', label: 'Firing', icon: 'pi pi-exclamation-triangle', value: alertingCount.value, hot: true },
  { key: 'pending', label: 'Pending', icon: 'pi pi-clock', value: pendingCount.value, hot: true },
  { key: 'no_data', label: 'No data', icon: 'pi pi-question-circle', value: noDataCount.value, hot: false },
  { key: 'paused', label: 'Paused', icon: 'pi pi-pause-circle', value: pausedCount.value, hot: false },
  { key: 'silenced', label: 'Silenced', icon: 'pi pi-volume-off', value: silencedCount.value, hot: false },
  { key: 'ok', label: 'Normal', icon: 'pi pi-check-circle', value: okCount.value, hot: false },
])

const overallStatus = computed(() => {
  if (!connectionStatus.value.connected && !loading.value) {
    return { tone: 'offline', icon: 'pi pi-wifi', text: 'Disconnected' }
  }
  if (alertingCount.value > 0) {
    return {
      tone: 'alerting',
      icon: 'pi pi-exclamation-triangle',
      text: `${alertingCount.value} firing`
    }
  }
  if (pendingCount.value > 0) {
    return { tone: 'pending', icon: 'pi pi-clock', text: `${pendingCount.value} pending` }
  }
  return { tone: 'ok', icon: 'pi pi-check-circle', text: 'All OK' }
})

const updateLastUpdate = () => {
  const now = new Date()
  lastUpdate.value = now.toLocaleTimeString()
}

// Watch for sidebar closing to save settings
watch(showSidebar, (newValue, oldValue) => {
  if (oldValue === true && newValue === false) {
    saveSettings()
  }
})

// Watch for notification settings changes
watch(notificationSound, (newSound) => {
  if (newSound) {
    notificationAudio.value = new Audio(`/${newSound}`)
    notificationAudio.value.volume = notificationVolume.value
  } else {
    notificationAudio.value = null
  }
})

watch(notificationVolume, (newVolume) => {
  if (notificationAudio.value) {
    notificationAudio.value.volume = newVolume
  }
})

onMounted(() => {
  // Create audio element for notifications
  if (notificationSound.value) {
    notificationAudio.value = new Audio(`/${notificationSound.value}`)
    notificationAudio.value.volume = notificationVolume.value
  }

  // In production (Docker), backend is on same host via nginx proxy
  // In development, use VITE_BACKEND_URL or localhost:3001
  const backendUrl = import.meta.env.PROD ? '' : (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001')

  socket = io(backendUrl)

  socket.on('connect', () => {
    connectionStatus.value = { connected: true, text: 'Connected' }
    loading.value = false
    error.value = null
  })

  socket.on('disconnect', () => {
    connectionStatus.value = { connected: false, text: 'Disconnected' }
  })

  socket.on('defaultSettings', (settings: AppSettings) => {
    console.log('Received default settings from backend:', settings)
    backendDefaults.value = settings

    // Only apply if no cookie exists (first-time user)
    const hasCookie = getCookie('alertsSettings')
    if (!hasCookie) {
      console.log('No cookie found, applying backend defaults')
      applySettings(loadSettings(settings))
    }
  })

  socket.on('alerts', (data: GrafanaAlert[]) => {
    console.log('Received alerts:', data.length, 'highlightDuration:', highlightDuration.value)

    data.forEach(alert => {
      const previousState = previousAlertStates.value.get(alert.id)

      // Mark as new if state changed to alerting/pending (not on first load)
      if (previousState &&
          previousState !== alert.state &&
          (alert.state === 'alerting' || alert.state === 'pending')) {
        console.log('New alert detected:', alert.name, 'old state:', previousState, 'new state:', alert.state)
        newAlertIds.value.add(alert.id)

        // Play notification sound
        if (notificationAudio.value && notificationSound.value && highlightDuration.value > 0) {
          notificationAudio.value.currentTime = 0
          notificationAudio.value.play().catch(err => {
            console.log('Could not play notification sound:', err)
          })
        }

        // Remove from new alerts after configured duration (in milliseconds)
        if (highlightDuration.value > 0) {
          setTimeout(() => {
            console.log('Removing alert from new:', alert.id)
            newAlertIds.value.delete(alert.id)
          }, highlightDuration.value * 1000)
        }
      }

      previousAlertStates.value.set(alert.id, alert.state)
    })

    console.log('New alert IDs:', Array.from(newAlertIds.value))

    alerts.value = data
    loading.value = false
    error.value = null
    updateLastUpdate()
  })

  socket.on('error', (data: { message: string }) => {
    error.value = data.message
    loading.value = false
  })

  socket.emit('getAlerts')
})

onUnmounted(() => {
  if (socket) {
    socket.disconnect()
  }
})
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--gf-canvas);
  color: var(--gf-text);
}

/* ---------- Top bar (Grafana nav bar) ---------- */
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  height: 48px;
  padding: 0 1rem;
  background: var(--gf-panel);
  border-bottom: 1px solid var(--gf-border-weak);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--gf-radius);
  background: linear-gradient(135deg, #f05a28 0%, #fbca0a 100%);
  color: #111217;
  flex-shrink: 0;
}

.brand-mark .pi {
  font-size: 14px;
  font-weight: 700;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 14px;
  white-space: nowrap;
  min-width: 0;
}

.crumb-muted {
  color: var(--gf-text-secondary);
}

.crumb-sep {
  font-size: 12px;
  color: var(--gf-text-disabled);
}

.crumb-current {
  font-weight: 500;
  color: var(--gf-text);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 32px;
  width: 280px;
  padding: 0 0.5rem;
  background: var(--gf-canvas);
  border: 1px solid var(--gf-border-medium);
  border-radius: var(--gf-radius-sm);
  color: var(--gf-text-secondary);
  transition: border-color 0.15s, box-shadow 0.15s;
  cursor: text;
}

.search-box:hover {
  border-color: var(--gf-border-strong);
}

.search-box:focus-within {
  border-color: var(--gf-primary);
  box-shadow: 0 0 0 1px var(--gf-primary);
}

.search-box > .pi-search {
  font-size: 13px;
}

.search-box input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: var(--gf-text);
  font: inherit;
  font-size: 14px;
}

.search-box input::placeholder {
  color: var(--gf-text-disabled);
}

.search-clear {
  display: inline-flex;
  padding: 2px;
  background: none;
  border: none;
  color: var(--gf-text-secondary);
  cursor: pointer;
}

.search-clear:hover {
  color: var(--gf-text);
}

.search-clear .pi {
  font-size: 11px;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 32px;
  padding: 0 0.75rem;
  font-size: 12px;
  color: var(--gf-text-secondary);
  border: 1px solid var(--gf-border-weak);
  border-radius: var(--gf-radius-sm);
  white-space: nowrap;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--gf-red);
}

.is-live .live-dot {
  background: var(--gf-green);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--gf-green) 60%, transparent);
  animation: live-pulse 2s ease-out infinite;
}

.live-text {
  font-weight: 500;
  color: var(--gf-text);
}

.is-offline .live-text {
  color: var(--gf-red);
}

.live-time {
  font-variant-numeric: tabular-nums;
}

@keyframes live-pulse {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--gf-green) 60%, transparent); }
  70% { box-shadow: 0 0 0 6px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
}

/* ---------- Content ---------- */
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem 1rem 1rem;
}

/* ---------- Stat panels ---------- */
.stat-row {
  display: grid;
  grid-template-columns: minmax(200px, 1.6fr) repeat(7, minmax(110px, 1fr));
  gap: 0.5rem;
}

.stat-panel {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 96px;
  padding: 0.625rem 0.75rem 0.75rem;
  min-width: 0;
  position: relative;
  overflow: hidden;
}

.stat-value {
  font-size: clamp(1.75rem, 2.4vw, 2.75rem);
  font-weight: 500;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: var(--state-color, var(--gf-text));
  white-space: nowrap;
}

.stat-total {
  margin-left: 0.25em;
  font-size: 0.5em;
  color: var(--gf-text-secondary);
}

/* Zero firing / pending / no-data is good news: show it green like Grafana thresholds */
.stat-panel.is-zero.state-alerting .stat-value,
.stat-panel.is-zero.state-pending .stat-value,
.stat-panel.is-zero.state-no_data .stat-value {
  color: var(--gf-green);
}

.stat-panel.is-zero.state-paused .stat-value,
.stat-panel.is-zero.state-silenced .stat-value {
  color: var(--gf-text-disabled);
}

/* Background colour mode (Grafana stat "Background gradient") */
.stat-panel.is-hot {
  background: linear-gradient(
    120deg,
    var(--state-color) 0%,
    color-mix(in srgb, var(--state-color) 78%, #000) 100%
  );
  border-color: transparent;
}

.stat-panel.is-hot .gf-panel-title,
.stat-panel.is-hot .gf-panel-title .pi,
.stat-panel.is-hot .stat-value {
  color: #fff;
}

/* Overall status: the "All nodes OK" banner from our cluster boards */
.status-panel .status-value {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6em;
  flex: 1;
  padding: 0.25rem 0.5rem;
  font-size: clamp(1.25rem, 1.9vw, 2.1rem);
  font-weight: 500;
  line-height: 1.1;
  color: #fff;
  border-radius: var(--gf-radius-sm);
  background: var(--gf-green);
  text-align: center;
}

.status-panel .status-value .pi {
  font-size: 0.8em;
}

.status-alerting .status-value {
  background: var(--gf-red);
  animation: status-glow 2s ease-in-out infinite;
}

.status-pending .status-value {
  background: var(--gf-orange);
}

.status-offline .status-value {
  background: var(--gf-gray);
}

:root:not(.dark) .status-panel .status-value {
  color: #fff;
}

@keyframes status-glow {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.15); }
}

/* ---------- Row title (collapsible-row look) ---------- */
.row-title {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  padding: 0.5rem 0.25rem 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--gf-text);
}

.row-title-meta {
  font-size: 12px;
  font-weight: 400;
  color: var(--gf-text-secondary);
}

/* ---------- Messages ---------- */
.state-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 320px;
  color: var(--gf-text-secondary);
}

.state-message .pi {
  font-size: 2.5rem;
}

.state-message.is-error {
  color: var(--gf-red);
}

.state-message.is-ok {
  color: var(--gf-green);
}

/* ---------- Compact table ---------- */
.alert-table {
  --cols: minmax(0, 1fr) minmax(0, 220px) 120px minmax(0, 360px) 170px 44px;
  overflow: hidden;
}

.alert-table.no-actions {
  --cols: minmax(0, 1fr) minmax(0, 220px) 120px minmax(0, 360px) 170px;
}

.table-head {
  display: grid;
  grid-template-columns: var(--cols);
  gap: 1rem;
  align-items: center;
  padding: 0.5rem 1rem 0.5rem calc(1rem + 3px);
  font-size: 13px;
  font-weight: 500;
  color: var(--gf-primary-text);
  border-bottom: 1px solid var(--gf-border-weak);
  background: var(--gf-panel);
}

.table-head > div {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.head-state {
  text-align: right;
}

/* ---------- Grid ---------- */
.alerts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 0.5rem;
}

/* ---------- Responsive ---------- */
@media (max-width: 1400px) {
  .stat-row {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 1024px) {
  .alert-table,
  .alert-table.no-actions {
    --cols: minmax(0, 1fr) 100px 150px 44px;
  }

  .alert-table.no-actions {
    --cols: minmax(0, 1fr) 100px 150px;
  }

  .head-group,
  .head-labels {
    display: none;
  }

  .search-box {
    width: 200px;
  }
}

@media (max-width: 768px) {
  .topbar {
    height: auto;
    flex-wrap: wrap;
    padding: 0.5rem 1rem;
  }

  .topbar-right {
    flex-wrap: wrap;
    width: 100%;
  }

  .search-box {
    flex: 1;
    width: auto;
  }

  .stat-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .status-panel {
    grid-column: 1 / -1;
  }

  .alert-table,
  .alert-table.no-actions {
    --cols: minmax(0, 1fr) 44px;
  }

  .alert-table.no-actions {
    --cols: minmax(0, 1fr);
  }

  .head-totals,
  .head-state {
    display: none;
  }

  .alerts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
