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
const ROW_HEIGHT   = 80
const MARGIN: [number, number] = [12, 12]

// Below this window width, skip the grid entirely and stack tiles vertically.
// Tiles have enough content that anything narrower than ~280px per tile is unreadable,
// and the sidebar (220px) plus grid margins eat too much space under ~1200px.
const BP_STACK = 1200

// Preferred heights (px) for each tile in the stacked single-column view.
// These are tuned so each tile shows enough content without wasted whitespace.
const STACK_HEIGHTS: Record<string, number> = {
  overseerr:     520,
  sabnzbd:       320,
  sonarr:        420,
  radarr:        420,
  plex:          340,
  tautulli:      460,
  unraid:        420,
  discordInfo:   420,
  discordAlerts: 460,
  uptime:        300,
  nextcloud:     340,
  mealie:        300,
}

// Fallback layout entry for any tile that's missing a position
function fallbackEntry(id: string, index: number): Layout {
  return { i: id, x: (index * 3) % 12, y: 999, w: 3, h: 3 }
}

export default function Dashboard() {
  const { tiles, layout, setLayout, editMode, sidebarCollapsed } = useTileStore()
  const { width } = useWindowSize()

  const isStack   = width <= BP_STACK   // mobile + tablet + small desktop → vertical stack
  const isMobile  = width <= 768         // sidebar hidden at this size
  const isDesktop = width > BP_STACK     // full 12-col grid

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

  // Stacked order: sort tiles by (y, x) so they appear in the same order as the desktop layout
  const stackOrder = useMemo(
    () => [...visibleLayout].sort((a, b) => a.y - b.y || a.x - b.x),
    [visibleLayout]
  )

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

      {isStack ? (
        /* ── Mobile / tablet / small desktop: vertical stack ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {stackOrder.map(l => {
            const TileComponent = TILE_MAP[l.i]
            if (!TileComponent) return null
            const tileH = STACK_HEIGHTS[l.i] ?? Math.max(280, Math.min(l.h * ROW_HEIGHT, 520))
            return (
              <div key={l.i} style={{ height: tileH, width: '100%' }}>
                <TileComponent />
              </div>
            )
          })}
        </div>
      ) : (
        /* ── Desktop (>1200px): full 12-col grid ── */
        <GridLayout
          layout={visibleLayout}
          cols={DESKTOP_COLS}
          rowHeight={ROW_HEIGHT}
          width={canvasWidth}
          margin={MARGIN}
          isDraggable={canEdit}
          isResizable={canEdit}
          compactType="vertical"
          onLayoutChange={setLayout}
          draggableHandle=".tile-header"
          resizeHandles={['se']}
        >
          {visibleLayout.map((l) => {
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
