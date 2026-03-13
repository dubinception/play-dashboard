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

const ROW_HEIGHT = 80
const COLS = 12
const MARGIN: [number, number] = [12, 12]

// Fallback layout entry for any tile that's missing a position
function fallbackEntry(id: string, index: number): Layout {
  return { i: id, x: (index * 3) % 12, y: 999, w: 3, h: 3 }
}

export default function Dashboard() {
  const { tiles, layout, setLayout, editMode, sidebarCollapsed } = useTileStore()
  const { width } = useWindowSize()

  const sidebarWidth = width < 769 ? 0 : (sidebarCollapsed ? 60 : 220)
  const canvasWidth = Math.max(300, (width || 1200) - sidebarWidth - 32)

  // Ensure every tile in the registry has a layout entry (prevents missing tiles)
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

  return (
    <div style={{ padding: '16px', minHeight: '100vh' }} className={editMode ? 'edit-mode' : ''}>
      {editMode && (
        <div style={{
          marginBottom: '12px', padding: '8px 16px', borderRadius: '8px',
          background: 'rgba(0,136,255,0.08)', border: '1px solid rgba(0,136,255,0.2)',
          fontSize: '0.8rem', color: 'var(--accent-1)',
        }}>
          ✦ Edit mode — drag tiles to rearrange, grab the corner to resize
        </div>
      )}
      <GridLayout
        layout={visibleLayout}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        width={canvasWidth}
        margin={MARGIN}
        isDraggable={editMode}
        isResizable={editMode}
        compactType="vertical"
        onLayoutChange={setLayout}
        draggableHandle=".tile-header"
        resizeHandles={['se']}
      >
        {visibleLayout.map((l) => {
          const TileComponent = TILE_MAP[l.i]
          return TileComponent ? (
            <div key={l.i} style={{ cursor: editMode ? 'grab' : 'default' }}>
              <TileComponent />
            </div>
          ) : null
        })}
      </GridLayout>
    </div>
  )
}
