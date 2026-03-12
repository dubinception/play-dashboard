import TileWrapper from '@/components/TileWrapper'

export default function SonarrTile() {
  return (
    <TileWrapper id="sonarr" label="Sonarr" color="#35c5f4">
      <div className="not-connected">
        <span className="icon">📺</span>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Sonarr not connected</span>
        <span>Configure API key in Settings</span>
      </div>
    </TileWrapper>
  )
}
