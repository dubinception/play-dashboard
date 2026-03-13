import TileWrapper from '@/components/TileWrapper'
import { usePlex } from '@/hooks/usePlex'
import useConfigStore from '@/store/useConfigStore'
import type { PlexSession, PlexSection } from '@/hooks/usePlex'

function pct(session: PlexSession) {
  if (!session.duration) return 0
  return Math.min(100, Math.max(0, (session.viewOffset / session.duration) * 100))
}

function mediaTitle(s: PlexSession) {
  if (s.type === 'episode') return `${s.grandparentTitle ?? '?'}`
  return s.title
}

function mediaSubtitle(s: PlexSession) {
  if (s.type === 'episode') return s.title
  return s.Player?.product ?? ''
}

function stateColor(state?: string) {
  switch (state) {
    case 'playing':   return 'var(--accent-2)'
    case 'paused':    return '#f39c12'
    case 'buffering': return 'var(--accent-1)'
    default:          return 'var(--text-muted)'
  }
}

function SessionRow({ session }: { session: PlexSession }) {
  const p = pct(session)
  const color = stateColor(session.Player?.state)
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {mediaTitle(session)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {mediaSubtitle(session)} · {session.User?.title ?? 'Unknown'}
          </div>
        </div>
        <span style={{
          fontSize: '0.68rem', color, flexShrink: 0, marginLeft: '8px',
          textTransform: 'capitalize', alignSelf: 'center',
        }}>
          {session.Player?.state ?? ''}
        </span>
      </div>
      <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.07)' }}>
        <div style={{
          height: '100%', width: `${p}%`, borderRadius: '2px',
          background: `linear-gradient(90deg, #e5a00d, #f5c518)`,
          transition: 'width 2s ease',
          opacity: session.Player?.state === 'paused' ? 0.5 : 1,
        }} />
      </div>
    </div>
  )
}

function LibraryStats({ sections }: { sections: PlexSection[] }) {
  if (sections.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {sections.map((s) => (
        <div key={s.title} style={{
          flex: 1, minWidth: '70px', padding: '8px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)', borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {s.count.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
            {s.type === 'show' ? 'Shows' : s.type === 'movie' ? 'Movies' : s.title}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function PlexTile() {
  const { isConfigured } = useConfigStore()
  const { sessions, sections, loading, error } = usePlex()
  const configured = isConfigured('plex')

  const streamCount = sessions.length
  const countLabel = streamCount > 0
    ? <span style={{ fontSize: '0.72rem', color: 'var(--accent-2)', marginLeft: 'auto', marginRight: '8px' }}>
        {streamCount} stream{streamCount > 1 ? 's' : ''}
      </span>
    : undefined

  return (
    <TileWrapper
      id="plex"
      label="Plex"
      color="#e5a00d"
      status={!configured ? 'idle' : error ? 'down' : streamCount > 0 ? 'up' : 'idle'}
      actions={countLabel}
    >
      {!configured ? (
        <div className="not-connected">
          <span className="icon">▶️</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Plex not connected</span>
          <span>Configure Plex token in Settings</span>
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
          {sessions.map((s) => <SessionRow key={s.key} session={s} />)}
        </div>
      ) : (
        <>
          <div style={{ textAlign: 'center', padding: '8px 0 12px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Nothing playing
          </div>
          <LibraryStats sections={sections} />
        </>
      )}
    </TileWrapper>
  )
}
