import { useState } from 'react'
import TileWrapper from '@/components/TileWrapper'
import { useRadarr } from '@/hooks/useRadarr'
import useConfigStore from '@/store/useConfigStore'
import type { RadarrQueueItem, RadarrCalendarItem } from '@/hooks/useRadarr'

function pct(item: RadarrQueueItem) {
  if (!item.size) return 0
  return Math.min(100, Math.max(0, ((item.size - item.sizeleft) / item.size) * 100))
}

function releaseLabel(item: RadarrCalendarItem) {
  const d = item.digitalRelease ?? item.physicalRelease ?? item.inCinemas
  if (!d) return '—'
  const date = new Date(d)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function releaseType(item: RadarrCalendarItem) {
  if (item.digitalRelease)  return 'Digital'
  if (item.physicalRelease) return 'Physical'
  if (item.inCinemas)       return 'Cinemas'
  return ''
}

function QueueTab({ items }: { items: RadarrQueueItem[] }) {
  if (items.length === 0) {
    return (
      <div className="not-connected">
        <span className="icon" style={{ fontSize: '1.1rem' }}>✓</span>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Queue empty</span>
      </div>
    )
  }
  return (
    <div style={{ overflowY: 'auto' }}>
      {items.map((item) => {
        const p = pct(item)
        const isWarn = item.trackedDownloadStatus === 'warning'
        return (
          <div key={item.id} style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{
                fontSize: '0.78rem', color: isWarn ? '#f39c12' : 'var(--text-secondary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%',
              }}>
                {item.movie?.title ?? item.title} {item.movie?.year ? `(${item.movie.year})` : ''}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                {item.timeleft || '—'}
              </span>
            </div>
            <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.07)' }}>
              <div style={{
                height: '100%', width: `${p}%`, borderRadius: '2px',
                background: isWarn
                  ? 'linear-gradient(90deg, #f39c12, #e67e22)'
                  : 'linear-gradient(90deg, #ffc230, #f39c12)',
                transition: 'width 1s ease',
              }} />
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{p.toFixed(0)}%</span>
          </div>
        )
      })}
    </div>
  )
}

function CalendarTab({ items }: { items: RadarrCalendarItem[] }) {
  if (items.length === 0) {
    return (
      <div className="not-connected">
        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No upcoming releases</span>
      </div>
    )
  }
  return (
    <div style={{ overflowY: 'auto' }}>
      {items.map((item) => (
        <div key={item.id} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '5px 0', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '0.78rem', color: 'var(--text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {item.title} ({item.year})
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {releaseType(item)}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '0.7rem', color: item.hasFile ? 'var(--accent-2)' : '#ffc230' }}>
              {releaseLabel(item)}
            </div>
            {item.hasFile && (
              <div style={{ fontSize: '0.65rem', color: 'var(--accent-2)' }}>✓ Downloaded</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function RadarrTile() {
  const { isConfigured } = useConfigStore()
  const { queue, calendar, totalRecords, loading, error } = useRadarr()
  const [tab, setTab] = useState<'queue' | 'calendar'>('queue')
  const configured = isConfigured('radarr')

  const tabBtn = (t: 'queue' | 'calendar', label: string, badge?: number) => (
    <button type="button" onClick={() => setTab(t)} style={{
      flex: 1, padding: '5px', borderRadius: '6px', border: 'none',
      background: tab === t ? 'rgba(255,194,48,0.1)' : 'transparent',
      color: tab === t ? '#ffc230' : 'var(--text-muted)',
      fontSize: '0.75rem', fontWeight: tab === t ? 600 : 400,
      cursor: 'pointer', fontFamily: 'inherit',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
    }}>
      {label}
      {!!badge && (
        <span style={{
          background: '#ffc230', color: '#000', borderRadius: '10px',
          padding: '0 5px', fontSize: '0.65rem', fontWeight: 700,
        }}>{badge}</span>
      )}
    </button>
  )

  return (
    <TileWrapper
      id="radarr"
      label="Radarr"
      color="#ffc230"
      status={!configured ? 'idle' : error ? 'down' : queue.length > 0 ? 'up' : 'idle'}
    >
      {!configured ? (
        <div className="not-connected">
          <span className="icon">🎥</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Radarr not connected</span>
          <span>Configure API key in Settings</span>
        </div>
      ) : loading && queue.length === 0 && calendar.length === 0 ? (
        <div className="not-connected">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Connecting…</span>
        </div>
      ) : error ? (
        <div className="not-connected">
          <span className="icon" style={{ fontSize: '1rem' }}>⚠️</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Connection failed</span>
          <span style={{ fontSize: '0.75rem' }}>{error}</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexShrink: 0 }}>
            {tabBtn('queue', 'Queue', totalRecords || undefined)}
            {tabBtn('calendar', 'Upcoming', calendar.length || undefined)}
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {tab === 'queue'    ? <QueueTab    items={queue}    /> : null}
            {tab === 'calendar' ? <CalendarTab items={calendar} /> : null}
          </div>
        </div>
      )}
    </TileWrapper>
  )
}
