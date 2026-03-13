import { useState } from 'react'
import TileWrapper from '@/components/TileWrapper'
import { useSonarr } from '@/hooks/useSonarr'
import useConfigStore from '@/store/useConfigStore'
import type { SonarrQueueItem, SonarrCalendarItem } from '@/hooks/useSonarr'

function pct(item: SonarrQueueItem) {
  if (!item.size) return 0
  return Math.min(100, Math.max(0, ((item.size - item.sizeleft) / item.size) * 100))
}

function episodeLabel(item: SonarrQueueItem) {
  const e = item.episode
  if (!e) return item.title
  return `${item.series?.title ?? item.title ?? '?'} S${String(e.seasonNumber).padStart(2,'0')}E${String(e.episodeNumber).padStart(2,'0')}`
}

function airDay(utc: string) {
  const d = new Date(utc)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function QueueTab({ items }: { items: SonarrQueueItem[] }) {
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
                {episodeLabel(item)}
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
                  : 'linear-gradient(90deg, #35c5f4, #00e5cc)',
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

function CalendarTab({ items }: { items: SonarrCalendarItem[] }) {
  if (items.length === 0) {
    return (
      <div className="not-connected">
        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Nothing airing this week</span>
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
              {item.series?.title ?? item.title ?? '—'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              S{String(item.seasonNumber).padStart(2,'0')}E{String(item.episodeNumber).padStart(2,'0')} · {item.title}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '0.7rem', color: item.hasFile ? 'var(--accent-2)' : 'var(--accent-1)' }}>
              {airDay(item.airDateUtc)}
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

export default function SonarrTile() {
  const { isConfigured } = useConfigStore()
  const { queue, calendar, totalRecords, loading, error } = useSonarr()
  const [tab, setTab] = useState<'queue' | 'calendar'>('queue')
  const configured = isConfigured('sonarr')

  const tabBtn = (t: 'queue' | 'calendar', label: string, badge?: number) => (
    <button type="button" onClick={() => setTab(t)} style={{
      flex: 1, padding: '5px', borderRadius: '6px', border: 'none',
      background: tab === t ? 'rgba(53,197,244,0.12)' : 'transparent',
      color: tab === t ? '#35c5f4' : 'var(--text-muted)',
      fontSize: '0.75rem', fontWeight: tab === t ? 600 : 400,
      cursor: 'pointer', fontFamily: 'inherit',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
    }}>
      {label}
      {!!badge && (
        <span style={{
          background: '#35c5f4', color: '#000', borderRadius: '10px',
          padding: '0 5px', fontSize: '0.65rem', fontWeight: 700,
        }}>{badge}</span>
      )}
    </button>
  )

  return (
    <TileWrapper
      id="sonarr"
      label="Sonarr"
      color="#35c5f4"
      status={!configured ? 'idle' : error ? 'down' : queue.length > 0 ? 'up' : 'idle'}
    >
      {!configured ? (
        <div className="not-connected">
          <span className="icon">📺</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Sonarr not connected</span>
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
