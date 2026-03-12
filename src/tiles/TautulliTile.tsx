import TileWrapper from '@/components/TileWrapper'

export default function TautulliTile() {
  return (
    <TileWrapper id="tautulli" label="Tautulli" color="#f5a623">
      <div className="not-connected">
        <span className="icon">📊</span>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Tautulli not connected</span>
        <span>Configure API key in Settings</span>
      </div>
    </TileWrapper>
  )
}
