import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Layout } from 'react-grid-layout'

export type TileId =
  | 'plex' | 'overseerr' | 'sonarr' | 'radarr'
  | 'sabnzbd' | 'tautulli' | 'unraid'
  | 'discordInfo' | 'discordAlerts'
  | 'uptime' | 'nextcloud' | 'mealie'

export interface TileConfig {
  id: TileId
  label: string
  visible: boolean
  color: string
}

export const TILE_REGISTRY: TileConfig[] = [
  { id: 'overseerr', label: 'Overseerr',  visible: true,  color: '#e5a00d' },
  { id: 'sabnzbd',   label: 'SABnzbd',    visible: true,  color: '#f39c12' },
  { id: 'sonarr',    label: 'Sonarr',     visible: true,  color: '#35c5f4' },
  { id: 'radarr',    label: 'Radarr',     visible: true,  color: '#ffc230' },
  { id: 'plex',      label: 'Plex',       visible: true,  color: '#e5a00d' },
  { id: 'tautulli',  label: 'Tautulli',   visible: true,  color: '#f5a623' },
  { id: 'unraid',    label: 'Unraid',     visible: true,  color: '#ff6b35' },
  { id: 'discordInfo',   label: 'Discord Info',   visible: true, color: '#5865f2' },
  { id: 'discordAlerts', label: 'Discord Alerts', visible: true, color: '#ed4245' },
  { id: 'uptime',    label: 'Uptime',     visible: true,  color: '#00e5a0' },
  { id: 'nextcloud', label: 'Nextcloud',  visible: false, color: '#0082c9' },
  { id: 'mealie',    label: 'Mealie',     visible: false, color: '#4caf50' },
]

const PRESETS: Record<string, Layout[]> = {
  'Media Focus': [
    { i: 'overseerr', x: 0, y: 0,  w: 5, h: 6 },
    { i: 'plex',      x: 5, y: 0,  w: 4, h: 3 },
    { i: 'tautulli',  x: 5, y: 3,  w: 4, h: 3 },
    { i: 'sabnzbd',   x: 9, y: 0,  w: 3, h: 3 },
    { i: 'sonarr',    x: 9, y: 3,  w: 3, h: 3 },
    { i: 'radarr',    x: 0, y: 6,  w: 3, h: 3 },
    { i: 'uptime',    x: 3, y: 6,  w: 4, h: 3 },
    { i: 'unraid',    x: 7, y: 6,  w: 5, h: 3 },
    { i: 'discordInfo',   x: 0, y: 9,  w: 6, h: 4 },
    { i: 'discordAlerts', x: 6, y: 9,  w: 6, h: 4 },
    { i: 'nextcloud', x: 0, y: 13, w: 6, h: 4 },
    { i: 'mealie',    x: 6, y: 13, w: 3, h: 2 },
  ],
  'Admin Mode': [
    { i: 'unraid',    x: 0, y: 0,  w: 6, h: 5 },
    { i: 'uptime',    x: 6, y: 0,  w: 6, h: 3 },
    { i: 'discordInfo',   x: 6, y: 3,  w: 3, h: 5 },
    { i: 'discordAlerts', x: 9, y: 3,  w: 3, h: 5 },
    { i: 'sabnzbd',   x: 0, y: 5,  w: 4, h: 4 },
    { i: 'sonarr',    x: 4, y: 5,  w: 4, h: 4 },
    { i: 'radarr',    x: 8, y: 8,  w: 4, h: 4 },
    { i: 'overseerr', x: 0, y: 9,  w: 5, h: 5 },
    { i: 'plex',      x: 5, y: 9,  w: 4, h: 3 },
    { i: 'tautulli',  x: 5, y: 12, w: 4, h: 3 },
    { i: 'nextcloud', x: 0, y: 14, w: 6, h: 4 },
    { i: 'mealie',    x: 9, y: 12, w: 3, h: 2 },
  ],
}

interface TileStore {
  tiles: TileConfig[]
  layout: Layout[]
  savedLayouts: Record<string, Layout[]>
  activePreset: string
  editMode: boolean
  sidebarCollapsed: boolean
  setLayout: (newLayout: Layout[]) => void
  toggleTile: (id: TileId) => void
  applyPreset: (name: string) => void
  resetPreset: (name: string) => void
  toggleEditMode: () => void
  toggleSidebar: () => void
}

const useTileStore = create<TileStore>()(
  persist(
    (set, get) => ({
      tiles: TILE_REGISTRY,
      layout: PRESETS['Media Focus'],
      savedLayouts: {},
      activePreset: 'Media Focus',
      editMode: false,
      sidebarCollapsed: false,

      // Merges visible tile positions and saves them under the active preset
      setLayout: (newLayout) =>
        set((s) => {
          const merged = s.layout.map((existing) => {
            const updated = newLayout.find((l) => l.i === existing.i)
            return updated ? { ...existing, ...updated } : existing
          })
          return {
            layout: merged,
            savedLayouts: { ...s.savedLayouts, [s.activePreset]: merged },
          }
        }),

      toggleTile: (id) =>
        set((s) => ({
          tiles: s.tiles.map((t) => (t.id === id ? { ...t, visible: !t.visible } : t)),
        })),

      // Restores the saved layout for that preset, falling back to the default
      applyPreset: (name) => {
        const preset = PRESETS[name]
        if (!preset) return
        const saved = get().savedLayouts[name]
        set({ layout: saved ?? preset, activePreset: name })
      },

      // Resets a preset back to its default, clearing any saved edits
      resetPreset: (name) => {
        const preset = PRESETS[name]
        if (!preset) return
        set((s) => ({
          layout: s.activePreset === name ? preset : s.layout,
          savedLayouts: { ...s.savedLayouts, [name]: undefined as unknown as Layout[] },
        }))
      },

      toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),
      toggleSidebar:  () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: 'play-dashboard-tiles-v4' }
  )
)

export { PRESETS }
export default useTileStore
