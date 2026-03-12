import TileWrapper from '@/components/TileWrapper'

export default function PlexTile() {
  return (
    <TileWrapper id="plex" label="Plex" color="#e5a00d">
      <div className="not-connected">
        <span className="icon">▶️</span>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Plex not connected</span>
        <span>Configure Plex token in Settings</span>
      </div>
    </TileWrapper>
  )
}
