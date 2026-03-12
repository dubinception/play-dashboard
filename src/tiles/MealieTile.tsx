import TileWrapper from '@/components/TileWrapper'

export default function MealieTile() {
  return (
    <TileWrapper id="mealie" label="Mealie" color="#4caf50">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
        <span style={{ fontSize: '2.5rem', opacity: 0.5 }}>🍽️</span>
        <a
          href="#"
          className="btn-glow"
          style={{ textDecoration: 'none', background: 'linear-gradient(135deg, #4caf50, #2e7d32)' }}
        >
          Open Mealie ↗
        </a>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Configure URL in Settings</span>
      </div>
    </TileWrapper>
  )
}
