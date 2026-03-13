import TileWrapper from '@/components/TileWrapper'
import { useUnraid } from '@/hooks/useUnraid'
import useConfigStore from '@/store/useConfigStore'
import type { UnraidDisk } from '@/hooks/useUnraid'

function fmtBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function usedPct(disk: UnraidDisk) {
  if (!disk.fsSize) return 0
  return Math.min(100, Math.max(0, (disk.fsUsed / disk.fsSize) * 100))
}

function diskColor(pct: number) {
  if (pct > 85) return 'var(--status-down)'
  if (pct > 70) return '#f39c12'
  return 'var(--accent-2)'
}

function DiskBar({ disk }: { disk: UnraidDisk }) {
  const pct = usedPct(disk)
  const color = diskColor(pct)
  const free = disk.fsSize - disk.fsUsed
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
          {disk.name}
        </span>
        <span style={{ fontSize: '0.72rem', color, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
          {fmtBytes(free)} free
        </span>
      </div>
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: color, borderRadius: '2px',
          transition: 'width 1s ease',
        }} />
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      flex: 1, padding: '8px', background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
        {value}
      </div>
      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
    </div>
  )
}

export default function UnraidTile() {
  const { isConfigured } = useConfigStore()
  const { info, loading, error } = useUnraid()
  const configured = isConfigured('unraid')

  const arrayStateColor = info?.arrayState === 'Started' ? 'var(--accent-2)' : info?.arrayState ? '#f39c12' : 'var(--text-muted)'

  const disks = info?.disks ?? []
  const dataDisksPct = disks.length > 0
    ? Math.round(disks.reduce((acc, d) => acc + usedPct(d), 0) / disks.length)
    : 0

  return (
    <TileWrapper
      id="unraid"
      label="Unraid"
      color="#ff6b35"
      status={!configured ? 'idle' : error ? 'down' : info ? 'up' : 'idle'}
      actions={
        info ? (
          <span style={{ fontSize: '0.68rem', color: arrayStateColor, marginLeft: 'auto', marginRight: '8px', textTransform: 'capitalize' }}>
            {info.arrayState}
          </span>
        ) : undefined
      }
    >
      {!configured ? (
        <div className="not-connected">
          <span className="icon">🖥️</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Unraid not connected</span>
          <span>Configure URL and API key in Settings</span>
        </div>
      ) : loading && !info ? (
        <div className="not-connected">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Connecting…</span>
        </div>
      ) : error ? (
        <div className="not-connected">
          <span className="icon" style={{ fontSize: '1rem' }}>⚠️</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Connection failed</span>
          <span style={{ fontSize: '0.72rem' }}>{error}</span>
        </div>
      ) : info ? (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <MiniStat label="Array" value={info.arrayState} />
            <MiniStat label="Disk avg" value={`${dataDisksPct}%`} />
          </div>
          <div style={{ overflowY: 'auto', maxHeight: '160px' }}>
            {disks.map((d) => <DiskBar key={d.name} disk={d} />)}
          </div>
        </>
      ) : null}
    </TileWrapper>
  )
}
