import TileWrapper from '@/components/TileWrapper'
import { useTautulli } from '@/hooks/useTautulli'
import useConfigStore from '@/store/useConfigStore'
import type { TautulliSession, TautulliStat } from '@/hooks/useTautulli'

function stateColor(state: string) {
  switch (state) {
    case 'playing':   return 'var(--accent-2)'
    case 'paused':    return '#f39c12'
    case 'buffering': return 'var(--accent-1)'
    default:          return 'var(--text-muted)'
  }
}

function fmtDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function SessionRow({ session }: { session: TautulliSession }) {
  const pct = Math.min(100, Math.max(0, parseInt(session.progress_percent ?? '0')))
  const color = stateColor(session.state)
  const title = session.media_type === 'episode' ? session.grandparent_title : session.title
  const subtitle = session.media_type === 'episode' ? session.title : session.player

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {title}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {subtitle} · {session.friendly_name || session.user}
          </div>
        </div>
        <span style={{
          fontSize: '0.68rem', color, flexShrink: 0, marginLeft: '8px',
          textTransform: 'capitalize', alignSelf: 'center',
        }}>
          {session.state}
        </span>
      </div>
      <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.07)' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: '2px',
          background: 'linear-gradient(90deg, #f5a623, #ffd166)',
          transition: 'width 2s ease',
          opacity: session.state === 'paused' ? 0.5 : 1,
        }} />
      </div>
    </div>
  )
}

function StatRow({ stat }: { stat: TautulliStat }) {
  const top = stat.rows[0]
  if (!top) return null
  const label = stat.stat_id === 'top_users' ? (top.user ?? top.title) : (top.grandparent_title || top.title)
  const detail = stat.stat_id === 'top_users'
    ? `${top.total_plays} play${top.total_plays !== 1 ? 's' : ''} · ${fmtDuration(top.total_duration)}`
    : `${top.total_plays} play${top.total_plays !== 1 ? 's' : ''}`

  const icon = stat.stat_id === 'top_users' ? '👤' : stat.stat_id === 'popular_movies' ? '🎬' : '📺'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
      <span style={{ fontSize: '0.85rem' }}>{icon}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {label}
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{detail}</div>
      </div>
    </div>
  )
}

export default function TautulliTile() {
  const { isConfigured } = useConfigStore()
  const { sessions, streamCount, stats, loading, error } = useTautulli()
  const configured = isConfigured('tautulli')

  const countLabel = streamCount > 0
    ? <span style={{ fontSize: '0.72rem', color: 'var(--accent-2)', marginLeft: 'auto', marginRight: '8px' }}>
        {streamCount} stream{streamCount > 1 ? 's' : ''}
      </span>
    : undefined

  return (
    <TileWrapper
      id="tautulli"
      label="Tautulli"
      color="#f5a623"
      status={!configured ? 'idle' : error ? 'down' : streamCount > 0 ? 'up' : 'idle'}
      actions={countLabel}
    >
      {!configured ? (
        <div className="not-connected">
          <span className="icon">📊</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Tautulli not connected</span>
          <span>Configure URL and API key in Settings</span>
        </div>
      ) : loading && sessions.length === 0 ? (
        <div className="not-connected">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Connecting…</span>
        </div>
      ) : error ? (
        <div className="not-connected">
          <span className="icon" style={{ fontSize: '1rem' }}>⚠️</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Connection failed</span>
          <span style={{ fontSize: '0.72rem' }}>{error}</span>
        </div>
      ) : sessions.length > 0 ? (
        <div style={{ overflowY: 'auto', maxHeight: '200px' }}>
          {sessions.map((s, i) => <SessionRow key={i} session={s} />)}
        </div>
      ) : (
        <>
          <div style={{ textAlign: 'center', padding: '8px 0 12px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Nothing playing
          </div>
          {stats.length > 0 && (
            <div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                Top this week
              </div>
              {stats.map((stat) => <StatRow key={stat.stat_id} stat={stat} />)}
            </div>
          )}
        </>
      )}
    </TileWrapper>
  )
}
