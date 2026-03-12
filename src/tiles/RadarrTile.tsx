import TileWrapper from '@/components/TileWrapper'

export default function RadarrTile() {
  return (
    <TileWrapper id="radarr" label="Radarr" color="#ffc230">
      <div className="not-connected">
        <span className="icon">🎥</span>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Radarr not connected</span>
        <span>Configure API key in Settings</span>
      </div>
    </TileWrapper>
  )
}
