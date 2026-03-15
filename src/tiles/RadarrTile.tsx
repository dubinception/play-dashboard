import { useState, useEffect, useCallback } from 'react'
import TileWrapper from '@/components/TileWrapper'
import { useRadarr, radarrImageUrl } from '@/hooks/useRadarr'
import useConfigStore from '@/store/useConfigStore'
import type { RadarrMovie, RadarrQueueItem, RadarrCalendarItem } from '@/hooks/useRadarr'
import RadarrDetailModal from './RadarrDetailModal'

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(item: RadarrQueueItem) {
  if (!item.size) return 0
  return Math.min(100, Math.max(0, ((item.size - item.sizeleft) / item.size) * 100))
}

function fmtSize(bytes: number) {
  if (!bytes) return ''
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB'
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(0) + ' MB'
  return (bytes / 1e3).toFixed(0) + ' KB'
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

// ── Poster thumbnail ──────────────────────────────────────────────────────────

function Poster({ movie, size = 42 }: { movie: RadarrMovie; size?: number }) {
  const src = radarrImageUrl(movie, 'poster')
  if (!src) {
    return (
      <div style={{
        width: size, height: size * 1.5, borderRadius: 4, flexShrink: 0,
        background: 'rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.1rem', color: 'rgba(255,255,255,0.2)',
      }}>🎬</div>
    )
  }
  return (
    <img
      src={src}
      alt=""
      style={{
        width: size, height: size * 1.5, objectFit: 'cover',
        borderRadius: 4, flexShrink: 0, display: 'block',
      }}
    />
  )
}

// ── Movie row (Library / Missing) ─────────────────────────────────────────────

function MovieRow({
  movie,
  qualityName,
  onClick,
}: {
  movie: RadarrMovie
  qualityName: string
  onClick: () => void
}) {
  const imdb = movie.ratings?.imdb?.value
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '6px 4px',
        background: 'transparent', border: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,194,48,0.05)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <Poster movie={movie} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.78rem', fontWeight: 500,
          color: 'var(--text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {movie.title}
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>
            {movie.year}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
          {imdb != null && (
            <span style={{ fontSize: '0.67rem', color: '#ffc230' }}>
              ★ {imdb.toFixed(1)}
            </span>
          )}
          <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
            {qualityName}
          </span>
          {movie.hasFile && movie.sizeOnDisk > 0 && (
            <span style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.3)' }}>
              {fmtSize(movie.sizeOnDisk)}
            </span>
          )}
          {!movie.hasFile && (
            <span style={{
              fontSize: '0.62rem', padding: '1px 5px', borderRadius: 3,
              background: movie.monitored ? 'rgba(255,100,100,0.15)' : 'rgba(255,255,255,0.07)',
              color: movie.monitored ? '#ff6b6b' : 'var(--text-muted)',
            }}>
              {movie.monitored ? 'Missing' : 'Unmonitored'}
            </span>
          )}
        </div>
      </div>
      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>›</span>
    </button>
  )
}

// ── Library tab ───────────────────────────────────────────────────────────────

function LibraryTab({
  movies,
  qualityProfiles,
  loading,
  onSelect,
}: {
  movies: RadarrMovie[]
  qualityProfiles: { id: number; name: string }[]
  loading: boolean
  onSelect: (m: RadarrMovie) => void
}) {
  const [search, setSearch] = useState('')
  const filtered = search.trim()
    ? movies.filter(m => m.title.toLowerCase().includes(search.toLowerCase()))
    : movies

  const profileName = (id: number) =>
    qualityProfiles.find(p => p.id === id)?.name ?? '—'

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Loading library…</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flexShrink: 0, marginBottom: 8 }}>
        <input
          type="text"
          placeholder="Search movies…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '6px 10px', borderRadius: 6,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-secondary)', fontSize: '0.78rem',
            fontFamily: 'inherit', outline: 'none',
          }}
        />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', paddingTop: 20 }}>
            No movies found
          </div>
        ) : (
          filtered.map(m => (
            <MovieRow
              key={m.id}
              movie={m}
              qualityName={profileName(m.qualityProfileId)}
              onClick={() => onSelect(m)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Missing tab ───────────────────────────────────────────────────────────────

function MissingTab({
  movies,
  qualityProfiles,
  loading,
  onSelect,
}: {
  movies: RadarrMovie[]
  qualityProfiles: { id: number; name: string }[]
  loading: boolean
  onSelect: (m: RadarrMovie) => void
}) {
  const missing = movies.filter(m => m.monitored && !m.hasFile && m.status === 'released')
  const profileName = (id: number) =>
    qualityProfiles.find(p => p.id === id)?.name ?? '—'

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Loading…</span>
      </div>
    )
  }

  if (missing.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: '1.5rem' }}>✓</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No missing movies</span>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {missing.map(m => (
        <MovieRow
          key={m.id}
          movie={m}
          qualityName={profileName(m.qualityProfileId)}
          onClick={() => onSelect(m)}
        />
      ))}
    </div>
  )
}

// ── Queue tab ─────────────────────────────────────────────────────────────────

function QueueTab({
  items,
  library,
  onSelect,
}: {
  items: RadarrQueueItem[]
  library: RadarrMovie[]
  onSelect: (m: RadarrMovie) => void
}) {
  if (items.length === 0) {
    return (
      <div className="not-connected">
        <span style={{ fontSize: '1.1rem' }}>✓</span>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Queue empty</span>
      </div>
    )
  }

  return (
    <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
      {items.map(item => {
        const p = pct(item)
        const isWarn = item.trackedDownloadStatus === 'warning'
        const movieTitle = item.movie?.title ?? item.title
        const movieYear  = item.movie?.year

        // Try to find matching library movie for poster
        const libraryMovie = library.find(m =>
          m.title === item.movie?.title && m.year === item.movie?.year
        )
        const poster = libraryMovie ? radarrImageUrl(libraryMovie, 'poster') : undefined

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => libraryMovie && onSelect(libraryMovie)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              width: '100%', padding: '7px 4px',
              background: 'transparent', border: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              cursor: libraryMovie ? 'pointer' : 'default',
              fontFamily: 'inherit', textAlign: 'left',
            }}
          >
            {poster ? (
              <img
                src={poster}
                alt=""
                style={{ width: 32, height: 48, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 32, height: 48, borderRadius: 3, flexShrink: 0,
                background: 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', color: 'rgba(255,255,255,0.2)',
              }}>🎬</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{
                  fontSize: '0.77rem', color: isWarn ? '#f39c12' : 'var(--text-secondary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%',
                }}>
                  {movieTitle}{movieYear ? ` (${movieYear})` : ''}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {item.timeleft || '—'}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', marginBottom: 2 }}>
                <div style={{
                  height: '100%', width: `${p}%`, borderRadius: 2,
                  background: isWarn
                    ? 'linear-gradient(90deg,#f39c12,#e67e22)'
                    : 'linear-gradient(90deg,#ffc230,#f39c12)',
                  transition: 'width 1s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                  {p.toFixed(0)}%
                  {item.size > 0 && ` · ${fmtSize(item.size - item.sizeleft)} / ${fmtSize(item.size)}`}
                </span>
                {isWarn && (
                  <span style={{ fontSize: '0.67rem', color: '#f39c12' }}>⚠ Warning</span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Upcoming tab ──────────────────────────────────────────────────────────────

function UpcomingTab({
  items,
  library,
  onSelect,
}: {
  items: RadarrCalendarItem[]
  library: RadarrMovie[]
  onSelect: (m: RadarrMovie) => void
}) {
  if (items.length === 0) {
    return (
      <div className="not-connected">
        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No upcoming releases</span>
      </div>
    )
  }

  return (
    <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
      {items.map(item => {
        const libraryMovie = library.find(m => m.title === item.title && m.year === item.year)
        const poster = libraryMovie ? radarrImageUrl(libraryMovie, 'poster') : undefined

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => libraryMovie && onSelect(libraryMovie)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '6px 4px',
              background: 'transparent', border: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              cursor: libraryMovie ? 'pointer' : 'default',
              fontFamily: 'inherit', textAlign: 'left',
            }}
          >
            {poster ? (
              <img
                src={poster}
                alt=""
                style={{ width: 30, height: 45, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 30, height: 45, borderRadius: 3, flexShrink: 0,
                background: 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem',
              }}>🎬</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.78rem', color: 'var(--text-secondary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {item.title}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>
                  {item.year}
                </span>
              </div>
              <div style={{ fontSize: '0.69rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {releaseType(item)}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '0.72rem', color: item.hasFile ? 'var(--accent-2)' : '#ffc230' }}>
                {releaseLabel(item)}
              </div>
              {item.hasFile && (
                <div style={{ fontSize: '0.65rem', color: 'var(--accent-2)', marginTop: 1 }}>✓</div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Main tile ─────────────────────────────────────────────────────────────────

type Tab = 'library' | 'queue' | 'upcoming' | 'missing'

export default function RadarrTile() {
  const { isConfigured } = useConfigStore()
  const {
    queue, calendar, totalRecords,
    library, qualityProfiles,
    loading, libraryLoading, error,
    fetchLibrary,
    toggleMonitored, setQualityProfile,
    searchMovie, refreshMovie, deleteMovie,
    fetchCredits, getServiceUrl,
  } = useRadarr()

  const [tab, setTab] = useState<Tab>('queue')
  const [selectedMovie, setSelectedMovie] = useState<RadarrMovie | null>(null)
  const [libraryFetched, setLibraryFetched] = useState(false)
  const configured = isConfigured('radarr')

  const activateLibrary = useCallback(() => {
    if (!libraryFetched) {
      fetchLibrary()
      setLibraryFetched(true)
    }
  }, [libraryFetched, fetchLibrary])

  useEffect(() => {
    if ((tab === 'library' || tab === 'missing') && !libraryFetched) {
      activateLibrary()
    }
  }, [tab, libraryFetched, activateLibrary])

  const missingCount = library.filter(m => m.monitored && !m.hasFile && m.status === 'released').length

  const tabBtn = (t: Tab, label: string, badge?: number) => (
    <button
      type="button"
      onClick={() => {
        setTab(t)
        if (t === 'library' || t === 'missing') activateLibrary()
      }}
      style={{
        flex: 1, padding: '5px 2px', borderRadius: 6, border: 'none',
        background: tab === t ? 'rgba(255,194,48,0.12)' : 'transparent',
        color: tab === t ? '#ffc230' : 'var(--text-muted)',
        fontSize: '0.72rem', fontWeight: tab === t ? 600 : 400,
        cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        transition: 'background 0.15s, color 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      {!!badge && (
        <span style={{
          background: '#ffc230', color: '#000', borderRadius: 10,
          padding: '0 5px', fontSize: '0.62rem', fontWeight: 700, lineHeight: '16px',
        }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  )

  return (
    <>
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
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 2, marginBottom: 10, flexShrink: 0 }}>
              {tabBtn('library',  'Library',  library.length || undefined)}
              {tabBtn('queue',    'Queue',    totalRecords   || undefined)}
              {tabBtn('upcoming', 'Upcoming', calendar.length || undefined)}
              {tabBtn('missing',  'Missing',  missingCount   || undefined)}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {tab === 'library' && (
                <LibraryTab
                  movies={library}
                  qualityProfiles={qualityProfiles}
                  loading={libraryLoading}
                  onSelect={setSelectedMovie}
                />
              )}
              {tab === 'queue' && (
                <QueueTab
                  items={queue}
                  library={library}
                  onSelect={setSelectedMovie}
                />
              )}
              {tab === 'upcoming' && (
                <UpcomingTab
                  items={calendar}
                  library={library}
                  onSelect={setSelectedMovie}
                />
              )}
              {tab === 'missing' && (
                <MissingTab
                  movies={library}
                  qualityProfiles={qualityProfiles}
                  loading={libraryLoading}
                  onSelect={setSelectedMovie}
                />
              )}
            </div>
          </div>
        )}
      </TileWrapper>

      {selectedMovie && (
        <RadarrDetailModal
          movie={selectedMovie}
          qualityProfiles={qualityProfiles}
          onClose={() => setSelectedMovie(null)}
          onToggleMonitored={async (m) => { await toggleMonitored(m); setSelectedMovie(prev => prev?.id === m.id ? { ...prev, monitored: !prev.monitored } : prev) }}
          onSetQualityProfile={async (m, pid) => { await setQualityProfile(m, pid); setSelectedMovie(prev => prev?.id === m.id ? { ...prev, qualityProfileId: pid } : prev) }}
          onSearch={searchMovie}
          onRefresh={refreshMovie}
          onDelete={async (id, deleteFiles) => { await deleteMovie(id, deleteFiles); setSelectedMovie(null) }}
          fetchCredits={fetchCredits}
          serviceUrl={getServiceUrl()}
        />
      )}
    </>
  )
}
