import TileWrapper from '@/components/TileWrapper'

export default function SabnzbdTile() {
  return (
    <TileWrapper id="sabnzbd" label="SABnzbd" color="#f39c12">
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {['Pause', 'Resume', 'Clear'].map((a) => (
          <button key={a} disabled style={{
            flex: 1, padding: '6px', borderRadius: '6px',
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'not-allowed', fontFamily: 'inherit',
          }}>{a}</button>
        ))}
      </div>
      <div className="not-connected">
        <span className="icon">⬇️</span>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>SABnzbd not connected</span>
        <span>Configure API key in Settings</span>
      </div>
    </TileWrapper>
  )
}
