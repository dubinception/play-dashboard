import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Apply persisted theme to <html> before first paint to prevent flash
;(() => {
  try {
    const raw = localStorage.getItem('play-dashboard-theme-v1')
    if (raw) {
      const { state } = JSON.parse(raw)
      const h = document.documentElement
      if (state?.theme)         h.dataset.theme         = state.theme
      if (state?.mode)          h.dataset.mode          = state.mode
      if (state?.glowSpeed)     h.dataset.glowSpeed     = state.glowSpeed
      if (state?.glowIntensity) h.dataset.glowIntensity = state.glowIntensity
    }
  } catch { /* ignore */ }
})()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
