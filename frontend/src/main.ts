import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import { definePreset } from '@primevue/themes'
import App from './App.vue'

// Tailwind CSS + Grafana design tokens
import './index.css'

// PrimeIcons
import 'primeicons/primeicons.css'

/**
 * Aura, re-tinted with Grafana's palette so PrimeVue widgets
 * (drawer, selects, switches, accordions) match the rest of the UI.
 */
const GrafanaPreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0',
      xs: '2px',
      sm: '2px',
      md: '4px',
      lg: '4px',
      xl: '6px'
    }
  },
  semantic: {
    primary: {
      50: '#eef3fd',
      100: '#d6e2fa',
      200: '#adc6f5',
      300: '#8ab0ff',
      400: '#6e9fff',
      500: '#3d71d9',
      600: '#3166c8',
      700: '#2a58b0',
      800: '#224890',
      900: '#1a3870',
      950: '#12274f'
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#f4f5f5',
          100: '#ebeced',
          200: '#dcdee0',
          300: '#c7cacd',
          400: '#a0a4a9',
          500: '#7b8087',
          600: '#5a5f66',
          700: '#3f444b',
          800: '#2c3035',
          900: '#24292e',
          950: '#181b1f'
        }
      },
      dark: {
        surface: {
          0: '#ffffff',
          50: '#ccccdc',
          100: '#b4b4c4',
          200: '#9a9aaa',
          300: '#7d7f8a',
          400: '#5f626b',
          500: '#464951',
          600: '#3a3d44',
          700: '#2f3238',
          800: '#22252b',
          900: '#181b1f',
          950: '#111217'
        }
      }
    }
  }
})

const app = createApp(App)

app.use(PrimeVue, {
  theme: {
    preset: GrafanaPreset,
    options: {
      darkModeSelector: '.dark',
      cssLayer: false
    }
  }
})

app.mount('#app')
