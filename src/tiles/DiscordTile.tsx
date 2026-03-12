import TileWrapper from '@/components/TileWrapper'

const mockLogs = [
  { type: 'info',  time: '10:42', text: 'Series added: The Last of Us S02' },
  { type: 'warn',  time: '10:38', text: 'Download slow: 2.1 MB/s' },
  { type: 'info',  time: '10:21', text: 'Movie grabbed: Dune Part Three' },
  { type: 'error', time: '09:55', text: 'SABnzbd: nzb failed - corrupt' },
  { type: 'info',  time: '09:30', text: 'Plex: Library scan complete' },
]

const typeColor: Record<string, string> = {
  info: 'var(--accent-2)',
  warn: 'var(--status-warn)',
  error: 'var(--status-down)',
}

export default function DiscordTile() {
  return (
    <TileWrapper id="discord" label="Discord Log" color="#5865f2">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {mockLogs.map((log, i) => (
          <div key={i} style={{
            display: 'flex', gap: '8px', alignItems: 'flex-start',
            padding: '7px 10px', borderRadius: '6px',
            background: 'var(--bg-base)',
            borderLeft: `2px solid ${typeColor[log.type]}`,
          }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginTop: '1px', fontFamily: "'JetBrains Mono', monospace" }}>
              {log.time}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{log.text}</span>
          </div>
        ))}
        <div style={{ textAlign: 'center', marginTop: '4px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sample data · Connect webhook in Settings</span>
        </div>
      </div>
    </TileWrapper>
  )
}
