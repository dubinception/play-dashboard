import { useMemo } from 'react'
import GridLayout from 'react-grid-layout'
import { useWindowSize } from '@/hooks/useWindowSize'
import useTileStore, { TILE_REGISTRY } from '@/store/useTileStore'
import type { Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

import OverseerrTile from '@/tiles/OverseerrTile'
import SabnzbdTile   from '@/tiles/SabnzbdTile'
import SonarrTile    from '@/tiles/SonarrTile'
import RadarrTile    from '@/tiles/RadarrTile'
import PlexTile      from '@/tiles/PlexTile'
import TautulliTile  from '@/tiles/TautulliTile'
import UnraidTile    from '@/tiles/UnraidTile'
import DiscordTile        from '@/tiles/DiscordTile'
import DiscordAlertsTile  from '@/tiles/DiscordAlertsTile'
import UptimeTile    from '@/tiles/UptimeTile'
import NextcloudTile from '@/tiles/NextcloudTile'
import MealieTile    from '@/tiles/MealieTile'

const TILE_MAP: Record<string, React.ComponentType> = {
  overseerr: OverseerrTile,
  sabnzbd:   SabnzbdTile,
  sonarr:    SonarrTile,
  radarr:    RadarrTile,
  plex:      PlexTile,
  tautulli:  TautulliTile,
  unraid:    UnraidTile,
  discordInfo:   DiscordTile,
  discordAlerts: DiscordAlertsTile,
  uptime:    UptimeTile,
  nextcloud: NextcloudTile,
  mealie:    MealieTile,
}

const DESKTOP_COLS = 12
const TABLET_COLS  = 6
const ROW_HEIGHT   = 80
const MARGIN: [number, number] = [12, 12]

// Breakpoints
const BP_MOBILE  = 768   // ≤ this → mobile stack
const BP_TABLET  = 1100  // ≤ this (and > mobile) → 6-col grid

// Scale a 12-col layout down to 6-col for tablet display.
// The stored layout is never modified — this is display-only.
function scaleLayout(layout: Layout[], fromCols: number, toCols: number): Layout[] {
  const ratio = toCols / fromCols
  return layout.map(l => ({
    ...l,
    x: Math.floor(l.x * ratio),
    w: Math.max(1, Math.round(l.w * ratio)),
  }))
}

// Fallback layout entry for any tile that's missing a position
function fallbackEntry(id: string, index: number): Layout {
  return { i: id, x: (index * 3) % 12, y: 999, w: 3, h: 3 }
}

export default function Dashboard() {
  const { tiles, layout, setLayout, editMode, sidebarCollapsed } = useTileStore()
  const { width } = useWindowSize()

  const isMobile = width <= BP_MOBILE
  const isTablet = width > BP_MOBILE && width <= BP_TABLET
  const isDesktop = width > BP_TABLET

  const sidebarWidth = isMobile ? 0 : (sidebarCollapsed ? 60 : 220)
  const padding = isMobile ? 10 : 16
  const canvasWidth = Math.max(280, (width || 1200) - sidebarWidth - padding * 2)

  // Ensure every tile in the registry has a layout entry
  const fullLayout = useMemo(() => {
    return TILE_REGISTRY.map((tile, i) => {
      const existing = layout.find((l) => l.i === tile.id)
      return existing ?? fallbackEntry(tile.id, i)
    })
  }, [layout])

  const visibleLayout = useMemo(
    () => fullLayout.filter((l) => tiles.find((t) => t.id === l.i)?.visible),
    [fullLayout, tiles]
  )

  // Tablet: scale 12-col layout → 6-col for display only
  const tabletLayout = useMemo(
    () => scaleLayout(visibleLayout, DESKTOP_COLS, TABLET_COLS),
    [visibleLayout]
  )

  // Mobile: sort tiles by (y, x) so stacking order matches the desktop layout
  const mobileOrder = useMemo(
    () => [...visibleLayout].sort((a, b) => a.y - b.y || a.x - b.x),
    [visibleLayout]
  )

  const activeCols   = isTablet ? TABLET_COLS : DESKTOP_COLS
  const activeLayout = isTablet ? tabletLayout : visibleLayout
  // Edit mode only makes sense on desktop (drag/resize needs full grid)
  const canEdit = isDesktop && editMode

  return (
    <div
      style={{ padding: `${padding}px`, minHeight: '100vh', paddingBottom: isMobile ? 80 : padding }}
      className={canEdit ? 'edit-mode' : ''}
    >
      {canEdit && (
        <div style={{
          marginBottom: '12px', padding: '8px 16px', borderRadius: '8px',
          background: 'rgba(0,136,255,0.08)', border: '1px solid rgba(0,136,255,0.2)',
          fontSize: '0.8rem', color: 'var(--accent-1)',
        }}>
          ✦ Edit mode — drag tiles to rearrange, grab the corner to resize
        </div>
      )}

      {isMobile ? (
        /* ── Mobile: vertical stack ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mobileOrder.map(l => {
            const TileComponent = TILE_MAP[l.i]
            if (!TileComponent) return null
            // Use stored height but enforce a reasonable min/max
            const tileH = Math.max(220, Math.min(l.h * ROW_HEIGHT, 520))
            return (
              <div key={l.i} style={{ height: tileH, width: '100%' }}>
                <TileComponent />
              </div>
            )
          })}
        </div>
      ) : (
        /* ── Tablet / Desktop: grid ── */
        <GridLayout
          layout={activeLayout}
          cols={activeCols}
          rowHeight={ROW_HEIGHT}
          width={canvasWidth}
          margin={MARGIN}
          isDraggable={canEdit}
          isResizable={canEdit}
          compactType="vertical"
          // Only persist layout changes on desktop so the stored 12-col layout stays clean
          onLayoutChange={isDesktop ? setLayout : () => {}}
          draggableHandle=".tile-header"
          resizeHandles={['se']}
        >
          {activeLayout.map((l) => {
            const TileComponent = TILE_MAP[l.i]
            return TileComponent ? (
              <div key={l.i} style={{ cursor: canEdit ? 'grab' : 'default' }}>
                <TileComponent />
              </div>
            ) : null
          })}
        </GridLayout>
      )}
    </div>
  )
}
