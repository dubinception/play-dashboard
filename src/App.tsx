import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { motion } from 'framer-motion'
import Sidebar from '@/components/Sidebar'
import MobileLayout from '@/components/MobileLayout'
import Dashboard from '@/pages/Dashboard'
import Settings from '@/pages/Settings'
import useTileStore from '@/store/useTileStore'
import useConfigStore from '@/store/useConfigStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useWindowSize } from '@/hooks/useWindowSize'

import OverseerrTile      from '@/tiles/OverseerrTile'
import SabnzbdTile        from '@/tiles/SabnzbdTile'
import SonarrTile         from '@/tiles/SonarrTile'
import RadarrTile         from '@/tiles/RadarrTile'
import PlexTile           from '@/tiles/PlexTile'
import TautulliTile       from '@/tiles/TautulliTile'
import UnraidTile         from '@/tiles/UnraidTile'
import DiscordTile        from '@/tiles/DiscordTile'
import DiscordAlertsTile  from '@/tiles/DiscordAlertsTile'
import UptimeTile         from '@/tiles/UptimeTile'
import NextcloudTile      from '@/tiles/NextcloudTile'
import MealieTile         from '@/tiles/MealieTile'

// Shared tile map — used by both MobileLayout and Dashboard
const TILE_MAP: Record<string, React.ComponentType> = {
  overseerr:     OverseerrTile,
  sabnzbd:       SabnzbdTile,
  sonarr:        SonarrTile,
  radarr:        RadarrTile,
  plex:          PlexTile,
  tautulli:      TautulliTile,
  unraid:        UnraidTile,
  discordInfo:   DiscordTile,
  discordAlerts: DiscordAlertsTile,
  uptime:        UptimeTile,
  nextcloud:     NextcloudTile,
  mealie:        MealieTile,
}

export default function App() {
  const { editMode, sidebarCollapsed } = useTileStore()
  const loadFromKV = useConfigStore((s) => s.loadFromKV)
  const { theme, mode, glowSpeed, glowIntensity } = useThemeStore()
  const { width } = useWindowSize()

  const isMobile = width <= 768

  useEffect(() => { loadFromKV() }, [])

  useEffect(() => {
    const h = document.documentElement
    h.dataset.theme         = theme
    h.dataset.mode          = mode
    h.dataset.glowSpeed     = glowSpeed
    h.dataset.glowIntensity = glowIntensity
  }, [theme, mode, glowSpeed, glowIntensity])

  const sidebarWidth = sidebarCollapsed ? 60 : 220

  return (
    <BrowserRouter>
      {isMobile ? (
        /* ── Mobile: full-screen single-tile app with hamburger drawer ── */
        <MobileLayout tileMap={TILE_MAP} />
      ) : (
        /* ── Desktop / tablet: sidebar + grid ── */
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'var(--bg-base)', transition: 'background 0.4s ease' }} />

          <div id="glow-root">
            <div className="glow-ambient" />
            <div className="glow-bottom" />
            <div className="glow-teal" />
            <div className="glow-topleft" />
            <div className="glow-topright" />
            <div className="dot-grid" />
          </div>

          <Sidebar />

          <motion.main
            className="main-content"
            animate={{ marginLeft: sidebarWidth }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}
          >
            {editMode && (
              <div style={{
                position: 'sticky', top: 0, zIndex: 40,
                background: 'rgba(0,136,255,0.05)', backdropFilter: 'blur(8px)',
                borderBottom: '1px solid rgba(0,136,255,0.15)',
                padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-1)', fontWeight: 500 }}>
                  ✦ Edit mode — drag tiles to rearrange, grab the corner to resize. Click "Done Editing" in the sidebar when finished.
                </span>
              </div>
            )}
            <Routes>
              <Route path="/"         element={<Dashboard tileMap={TILE_MAP} />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </motion.main>
        </>
      )}
    </BrowserRouter>
  )
}
