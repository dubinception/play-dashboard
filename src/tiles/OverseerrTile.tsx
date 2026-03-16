import { useState, useEffect, useCallback } from 'react'
import TileWrapper from '@/components/TileWrapper'
import { useOverseerr, MEDIA_STATUS, REQUEST_STATUS } from '@/hooks/useOverseerr'
import useConfigStore from '@/store/useConfigStore'
import type { OverseerrResult, OverseerrRequest, DiscoverMode } from '@/hooks/useOverseerr'

const ACCENT = '#e5a00d'

// ── Helpers ───────────────────────────────────────────────────────────────────

function posterUrl(path?: string): string | undefined {
  return path ? `https://image.tmdb.org/t/p/w185${path}` : undefined
}

function mediaTitle(item: OverseerrResult): string {
  return item.title ?? item.name ?? '?'
}

function mediaYear(item: OverseerrResult): string {
  return (item.releaseDate ?? item.firstAirDate ?? '').slice(0, 4)
}

function reqDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString())    return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ color, label }: { color: string; label: string }) {
  return (
    <span style={{
      fontSize: '0.6rem', padding: '2px 6px', borderRadius: 6,
      color, border: `1px solid ${color}66`,
      background: `${color}18`, whiteSpace: 'nowrap', flexShrink: 0,
    }}>{label}</span>
  )
}

// ── Pill button ───────────────────────────────────────────────────────────────

function Pill({
  label, active, onClick, accent = false,
}: {
  label: string; active: boolean; onClick: () => void; accent?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '4px 11px', borderRadius: 20, border: 'none', flexShrink: 0,
        background: active
          ? (accent ? `${ACCENT}55` : ACCENT)
          : 'rgba(255,255,255,0.08)',
        color: active
          ? (accent ? ACCENT : '#000')
          : 'var(--text-muted)',
        fontSize: '0.7rem', fontWeight: active ? 700 : 400,
        cursor: 'pointer', fontFamily: 'inherit',
        transition: 'background 0.15s, color 0.15s',
      }}
    >{label}</button>
  )
}

// ── Poster card ───────────────────────────────────────────────────────────────

function PosterCard({
  item, requestingId, onRequest,
}: {
  item: OverseerrResult
  requestingId: number | null
  onRequest: (id: number, type: 'movie' | 'tv') => void
}) {
  const [hovered, setHovered] = useState(false)
  const src        = posterUrl(item.posterPath)
  const title      = mediaTitle(item)
  const year       = mediaYear(item)
  const status     = item.mediaInfo?.status
  const statusInfo = status ? MEDIA_STATUS[status] : null
  const isReq      = requestingId === item.id

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: 86, cursor: 'pointer', flexShrink: 0 }}
    >
      <div style={{ position: 'relative', width: 86, height: 128, borderRadius: 6, overflow: 'hidden', marginBottom: 4 }}>
        {src ? (
          <img src={src} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg,rgba(229,160,13,0.15),rgba(0,0,0,0.3))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', color: 'rgba(255,255,255,0.15)',
          }}>{item.mediaType === 'movie' ? '🎬' : '📺'}</div>
        )}

        {/* Hover overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(0deg,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0) 55%)',
          opacity: hovered ? 1 : 0, transition: 'opacity 0.18s',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 5,
        }}>
          {statusInfo ? (
            <StatusBadge color={statusInfo.color} label={statusInfo.label} />
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onRequest(item.id, item.mediaType) }}
              disabled={isReq}
              style={{
                padding: '4px 0', borderRadius: 5, border: 'none',
                background: isReq ? 'rgba(229,160,13,0.5)' : ACCENT,
                color: '#000', fontSize: '0.67rem', fontWeight: 700,
                cursor: isReq ? 'wait' : 'pointer', fontFamily: 'inherit', width: '100%',
              }}
            >{isReq ? '…' : '+ Request'}</button>
          )}
        </div>

        {/* Always-visible status dot */}
        {statusInfo && !hovered && (
          <div style={{
            position: 'absolute', top: 5, right: 5,
            width: 7, height: 7, borderRadius: '50%',
            background: statusInfo.color, boxShadow: `0 0 6px ${statusInfo.color}`,
          }} />
        )}
      </div>

      <div style={{
        fontSize: '0.66rem', color: 'var(--text-secondary)', lineHeight: 1.3,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>{title}</div>
      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 1 }}>
        {year}{year && item.voteAverage && item.voteAverage > 0 ? ' · ' : ''}
        {item.voteAverage && item.voteAverage > 0 ? `★${item.voteAverage.toFixed(1)}` : ''}
      </div>
    </div>
  )
}

// ── Poster grid (wraps to fill available height) ──────────────────────────────

function PosterGrid({
  items, requestingId, onRequest, loading, emptyMsg = 'No results',
}: {
  items: OverseerrResult[]
  requestingId: number | null
  onRequest: (id: number, type: 'movie' | 'tv') => void
  loading?: boolean
  emptyMsg?: string
}) {
  const gridStyle: React.CSSProperties = {
    display: 'flex', flexWrap: 'wrap', gap: 8, alignContent: 'flex-start',
  }

  if (loading) return (
    <div style={gridStyle}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{
          width: 86, height: 128, borderRadius: 6,
          background: 'rgba(255,255,255,0.05)',
          animation: 'pulse 1.5s ease-in-out infinite',
          animationDelay: `${i * 0.07}s`,
        }} />
      ))}
    </div>
  )

  if (items.length === 0) return (
    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', paddingTop: 8 }}>{emptyMsg}</div>
  )

  return (
    <div style={gridStyle}>
      {items.map(item => (
        <PosterCard
          key={`${item.mediaType}-${item.id}`}
          item={item}
          requestingId={requestingId}
          onRequest={onRequest}
        />
      ))}
    </div>
  )
}

// ── Requests tab ──────────────────────────────────────────────────────────────

function RequestsTab({ requests }: { requests: OverseerrRequest[] }) {
  if (requests.length === 0) return (
    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', paddingTop: 20 }}>
      No recent requests
    </div>
  )

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {requests.map(req => {
        const available  = req.media.mediaStatus === 5
        const statusInfo = available
          ? { label: 'Available', color: '#00e5a0' }
          : REQUEST_STATUS[req.status] ?? { label: 'Pending', color: '#f39c12' }
        const src  = posterUrl(req.media.posterPath)
        const name = req.requestedBy.displayName

        return (
          <div key={req.id} style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            {src ? (
              <img src={src} alt="" style={{ width: 36, height: 54, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
            ) : (
              <div style={{
                width: 36, height: 54, borderRadius: 4, flexShrink: 0,
                background: 'rgba(229,160,13,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
              }}>{req.type === 'movie' ? '🎬' : '📺'}</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{req.media.title ?? '?'}</div>
              <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: 1 }}>
                {name} · {reqDate(req.createdAt)}
              </div>
            </div>
            <StatusBadge color={statusInfo.color} label={statusInfo.label} />
          </div>
        )
      })}
    </div>
  )
}

// ── Search results ────────────────────────────────────────────────────────────

function SearchResults({
  results, searching, requestingId, onRequest,
}: {
  results: OverseerrResult[]
  searching: boolean
  requestingId: number | null
  onRequest: (id: number, type: 'movie' | 'tv') => void
}) {
  if (searching) return (
    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', paddingTop: 8 }}>Searching…</div>
  )
  if (results.length === 0) return (
    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', paddingTop: 8 }}>No results</div>
  )

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {results.map(r => {
        const status     = r.mediaInfo?.status
        const statusInfo = status ? MEDIA_STATUS[status] : null
        const src        = posterUrl(r.posterPath)
        const year       = mediaYear(r)
        const isReq      = requestingId === r.id

        return (
          <div key={`${r.mediaType}-${r.id}`} style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            {src ? (
              <img src={src} alt="" style={{ width: 36, height: 54, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
            ) : (
              <div style={{
                width: 36, height: 54, borderRadius: 4, flexShrink: 0,
                background: 'rgba(229,160,13,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
              }}>{r.mediaType === 'movie' ? '🎬' : '📺'}</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{mediaTitle(r)}</div>
              <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: 1 }}>
                {year}{year ? ' · ' : ''}{r.mediaType === 'tv' ? 'TV' : 'Movie'}
                {r.voteAverage && r.voteAverage > 0 ? ` · ★${r.voteAverage.toFixed(1)}` : ''}
              </div>
            </div>
            {statusInfo ? (
              <StatusBadge color={statusInfo.color} label={statusInfo.label} />
            ) : (
              <button
                onClick={() => onRequest(r.id, r.mediaType)}
                disabled={isReq}
                style={{
                  padding: '4px 10px', borderRadius: 6,
                  border: `1px solid ${ACCENT}88`,
                  background: isReq ? `${ACCENT}22` : 'transparent',
                  color: ACCENT, fontSize: '0.7rem',
                  cursor: isReq ? 'wait' : 'pointer', fontFamily: 'inherit', flexShrink: 0,
                }}
              >{isReq ? '…' : '+ Request'}</button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Discover tab ──────────────────────────────────────────────────────────────

const MODES: { value: DiscoverMode; label: string }[] = [
  { value: 'trending',    label: '🔥 Trending' },
  { value: 'movies',      label: '🎬 Movies' },
  { value: 'tv',          label: '📺 TV' },
  { value: 'movie_genre', label: '🎭 Movie Genre' },
  { value: 'tv_genre',    label: '📺 TV Genre' },
  { value: 'tv_network',  label: '📡 Network' },
]

function DiscoverTab({
  results, discoverLoading, movieGenres, tvGenres, networks,
  requestingId, onRequest, onDiscover,
}: {
  results: OverseerrResult[]
  discoverLoading: boolean
  movieGenres: { id: number; name: string }[]
  tvGenres: { id: number; name: string }[]
  networks: { id: number; name: string }[]
  requestingId: number | null
  onRequest: (id: number, type: 'movie' | 'tv') => void
  onDiscover: (mode: DiscoverMode, id?: number) => void
}) {
  const [mode, setMode]         = useState<DiscoverMode>('trending')
  const [genreId, setGenreId]   = useState(0)
  const [networkId, setNetworkId] = useState(0)

  const needsGenre   = mode === 'movie_genre' || mode === 'tv_genre'
  const needsNetwork = mode === 'tv_network'
  const genreList    = mode === 'movie_genre' ? movieGenres : tvGenres

  // Fire discover when mode changes (for non-filtered modes)
  useEffect(() => {
    if (!needsGenre && !needsNetwork) {
      onDiscover(mode)
    }
    // reset sub-selections when mode changes
    setGenreId(0)
    setNetworkId(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const handleMode = (m: DiscoverMode) => setMode(m)

  const handleGenre = (id: number) => {
    setGenreId(id)
    if (id) onDiscover(mode, id)
  }

  const handleNetwork = (id: number) => {
    setNetworkId(id)
    if (id) onDiscover(mode, id)
  }

  const subPillStyle = (active: boolean): React.CSSProperties => ({
    padding: '3px 9px', borderRadius: 20, border: 'none', flexShrink: 0,
    background: active ? `${ACCENT}40` : 'rgba(255,255,255,0.05)',
    color: active ? ACCENT : 'var(--text-muted)',
    fontSize: '0.65rem', fontWeight: active ? 600 : 400,
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'background 0.15s',
  })

  const showGrid = (!needsGenre || genreId > 0) && (!needsNetwork || networkId > 0)
  const emptyHint = needsGenre
    ? (genreList.length ? 'Pick a genre above' : 'Loading genres…')
    : (networks.length ? 'Pick a network above' : 'Loading networks…')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 7 }}>

      {/* Mode pills */}
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', flexShrink: 0, paddingBottom: 1 }}>
        {MODES.map(m => (
          <Pill key={m.value} label={m.label} active={mode === m.value} onClick={() => handleMode(m.value)} />
        ))}
      </div>

      {/* Genre sub-pills */}
      {needsGenre && (
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', flexShrink: 0, paddingBottom: 1 }}>
          {genreList.length === 0 ? (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Loading genres…</span>
          ) : genreList.map(g => (
            <button key={g.id} onClick={() => handleGenre(g.id)} style={subPillStyle(genreId === g.id)}>
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* Network sub-pills */}
      {needsNetwork && (
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', flexShrink: 0, paddingBottom: 1 }}>
          {networks.length === 0 ? (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Loading networks…</span>
          ) : networks.map(n => (
            <button key={n.id} onClick={() => handleNetwork(n.id)} style={subPillStyle(networkId === n.id)}>
              {n.name}
            </button>
          ))}
        </div>
      )}

      {/* Poster grid — fills remaining space */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {showGrid ? (
          <PosterGrid
            items={results}
            requestingId={requestingId}
            onRequest={onRequest}
            loading={discoverLoading}
          />
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', paddingTop: 4 }}>{emptyHint}</div>
        )}
      </div>
    </div>
  )
}

// ── Main tile ─────────────────────────────────────────────────────────────────

type Tab = 'discover' | 'requests'

export default function OverseerrTile() {
  const { isConfigured } = useConfigStore()
  const {
    results, requests, discoverResults,
    movieGenres, tvGenres, networks,
    searching, discoverLoading, requestingId, error,
    search, clearResults, discover, requestMedia,
  } = useOverseerr()

  const [query, setQuery] = useState('')
  const [tab, setTab]     = useState<Tab>('discover')
  const configured        = isConfigured('overseerr')
  const isSearching       = query.trim().length > 0

  const handleSearch = useCallback((val: string) => {
    setQuery(val)
    search(val)
    if (!val) clearResults()
  }, [search, clearResults])

  const tabBtn = (t: Tab, label: string, badge?: number) => (
    <button
      type="button"
      onClick={() => setTab(t)}
      style={{
        flex: 1, padding: '5px 2px', borderRadius: 6, border: 'none',
        background: tab === t ? `rgba(229,160,13,0.12)` : 'transparent',
        color: tab === t ? ACCENT : 'var(--text-muted)',
        fontSize: '0.72rem', fontWeight: tab === t ? 600 : 400,
        cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {label}
      {!!badge && (
        <span style={{
          background: ACCENT, color: '#000', borderRadius: 10,
          padding: '0 5px', fontSize: '0.62rem', fontWeight: 700, lineHeight: '16px',
        }}>{badge > 99 ? '99+' : badge}</span>
      )}
    </button>
  )

  return (
    <TileWrapper
      id="overseerr"
      label="Overseerr"
      color={ACCENT}
      status={!configured ? 'idle' : error ? 'down' : 'up'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Search bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexShrink: 0 }}>
          <input
            type="text"
            placeholder={configured ? '🔍  Search movies & TV…' : 'Connect Overseerr in Settings…'}
            value={query}
            onChange={e => handleSearch(e.target.value)}
            disabled={!configured}
            style={{
              flex: 1, padding: '7px 10px', borderRadius: 7,
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${query ? `${ACCENT}55` : 'rgba(255,255,255,0.1)'}`,
              color: configured ? 'var(--text-secondary)' : 'var(--text-muted)',
              fontSize: '0.78rem', fontFamily: 'inherit', outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); clearResults() }}
              style={{
                padding: '0 10px', borderRadius: 7,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem',
              }}
            >✕</button>
          )}
        </div>

        {!configured ? (
          <div className="not-connected">
            <span className="icon">🎬</span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Overseerr not connected</span>
            <span>Configure API key in Settings</span>
          </div>
        ) : error ? (
          <div className="not-connected">
            <span className="icon" style={{ fontSize: '1rem' }}>⚠️</span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Connection failed</span>
            <span style={{ fontSize: '0.72rem' }}>{error}</span>
          </div>
        ) : isSearching ? (
          <SearchResults
            results={results}
            searching={searching}
            requestingId={requestingId}
            onRequest={requestMedia}
          />
        ) : (
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2, marginBottom: 10, flexShrink: 0 }}>
              {tabBtn('discover', 'Discover')}
              {tabBtn('requests', 'Requests', requests.length || undefined)}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {tab === 'discover' && (
                <DiscoverTab
                  results={discoverResults}
                  discoverLoading={discoverLoading}
                  movieGenres={movieGenres}
                  tvGenres={tvGenres}
                  networks={networks}
                  requestingId={requestingId}
                  onRequest={requestMedia}
                  onDiscover={discover}
                />
              )}
              {tab === 'requests' && (
                <RequestsTab requests={requests} />
              )}
            </div>
          </>
        )}
      </div>
    </TileWrapper>
  )
}
