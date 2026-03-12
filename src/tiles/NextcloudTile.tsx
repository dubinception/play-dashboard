import TileWrapper from '@/components/TileWrapper'

export default function NextcloudTile() {
  return (
    <TileWrapper id="nextcloud" label="Nextcloud Files" color="#0082c9">
      <div className="not-connected">
        <span className="icon">☁️</span>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Nextcloud not connected</span>
        <span>Midnight Commander file explorer — configure in Settings</span>
      </div>
    </TileWrapper>
  )
}
