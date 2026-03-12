import TileWrapper from '@/components/TileWrapper'

const services = [
  { name: 'Plex',       status: 'up'   },
  { name: 'Overseerr',  status: 'up'   },
  { name: 'Sonarr',     status: 'up'   },
  { name: 'Radarr',     status: 'up'   },
  { name: 'SABnzbd',    status: 'warn' },
  { name: 'Tautulli',   status: 'up'   },
  { name: 'Nextcloud',  status: 'down' },
  { name: 'Mealie',     status: 'up'   },
]

const statusLabel: Record<string, string> = { up: 'UP', down: 'DOWN', warn: 'SLOW' }

export default function UptimeTile() {
  return (
    <TileWrapper id="uptime" label="Uptime" color="#00e5a0">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        {services.map((s) => (
          <div key={s.name} style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '7px 10px', borderRadius: '7px',
            background: 'var(--bg-base)',
            border: '1px solid var(--border)',
          }}>
            <span className={`status-dot ${s.status}`} />
            <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{s.name}</span>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em',
              color: s.status === 'up' ? 'var(--status-up)' : s.status === 'down' ? 'var(--status-down)' : 'var(--status-warn)',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {statusLabel[s.status]}
            </span>
          </div>
        ))}
      </div>
      <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '10px' }}>
        Sample data · Live pings coming in Phase 4
      </p>
    </TileWrapper>
  )
}
