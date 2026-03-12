import TileWrapper from '@/components/TileWrapper'

const mockDisks = [
  { name: 'Array Disk 1', used: 72, total: 100 },
  { name: 'Array Disk 2', used: 45, total: 100 },
  { name: 'Cache SSD',    used: 30, total: 100 },
]

function DiskBar({ name, used }: { name: string; used: number; total: number }) {
  const color = used > 85 ? 'var(--status-down)' : used > 70 ? 'var(--status-warn)' : 'var(--accent-2)'
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{name}</span>
        <span style={{ fontSize: '0.75rem', color, fontFamily: "'JetBrains Mono', monospace" }}>{used}%</span>
      </div>
      <div style={{ height: '4px', background: 'var(--bg-base)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${used}%`, background: color, borderRadius: '2px', transition: 'width 1s ease', boxShadow: `0 0 6px ${color}` }} />
      </div>
    </div>
  )
}

export default function UnraidTile() {
  return (
    <TileWrapper id="unraid" label="Unraid" color="#ff6b35">
      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Disk Usage · Not Connected
      </p>
      {mockDisks.map((d) => <DiskBar key={d.name} {...d} />)}
      <div style={{ marginTop: '12px', padding: '10px', background: 'var(--bg-base)', borderRadius: '8px', textAlign: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Connect Unraid API in Settings to see live data</span>
      </div>
    </TileWrapper>
  )
}
