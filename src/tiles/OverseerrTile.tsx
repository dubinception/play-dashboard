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

// ── Poster card (for discovery / trending shelves) ────────────────────────────

function PosterCard({
  item, requestingId, onRequest,
}: {
  item: OverseerrResult
  requestingId: number | null
  onRequest: (id: number, type: 'movie' | 'tv') => void
}) {
  const [hovered, setHovered] = useState(false)
  const src    = posterUrl(item.posterPath)
  const title  = mediaTitle(item)
  const year   = mediaYear(item)
  const status = item.mediaInfo?.status
  const statusInfo = status ? MEDIA_STATUS[status] : null
  const isRequesting = requestingId === item.id

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ flexShrink: 0, width: 88, cursor: 'pointer' }}
    >
      {/* Poster */}
      <div style={{ position: 'relative', width: 88, height: 132, borderRadius: 6, overflow: 'hidden', marginBottom: 5 }}>
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
          background: 'linear-gradient(0deg,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0) 55%)',
          opacity: hovered ? 1 : 0, transition: 'opacity 0.2s',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '6px',
        }}>
          {statusInfo ? (
            <StatusBadge color={statusInfo.color} label={statusInfo.label} />
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onRequest(item.id, item.mediaType) }}
              disabled={isRequesting}
              style={{
                padding: '4px 0', borderRadius: 5, border: 'none',
                background: isRequesting ? 'rgba(229,160,13,0.5)' : ACCENT,
                color: '#000', fontSize: '0.68rem', fontWeight: 700,
                cursor: isRequesting ? 'wait' : 'pointer', fontFamily: 'inherit',
                width: '100%',
              }}
            >{isRequesting ? '…' : '+ Request'}</button>
          )}
        </div>

        {/* Status dot (always visible) */}
        {statusInfo && !hovered && (
          <div style={{
            position: 'absolute', top: 5, right: 5,
            width: 8, height: 8, borderRadius: '50%',
            background: statusInfo.color,
            boxShadow: `0 0 6px ${statusInfo.color}`,
          }} />
        )}
      </div>

      {/* Title */}
      <div style={{
        fontSize: '0.68rem', color: 'var(--text-secondary)',
        lineHeight: 1.3, overflow: 'hidden',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>{title}</div>
      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 1 }}>
        {year}{year && item.mediaType ? ' · ' : ''}{item.mediaType === 'tv' ? 'TV' : item.mediaType === 'movie' ? 'Movie' : ''}
        {item.voteAverage && item.voteAverage > 0 ? ` · ★${item.voteAverage.toFixed(1)}` : ''}
      </div>
    </div>
  )
}

// ── Horizontal poster shelf ───────────────────────────────────────────────────

function PosterShelf({
  items, requestingId, onRequest, loading, emptyMsg = 'No results',
}: {
  items: OverseerrResult[]
  requestingId: number | null
  onRequest: (id: number, type: 'movie' | 'tv') => void
  loading?: boolean
  emptyMsg?: string
}) {
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflowX: 'hidden' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{
          flexShrink: 0, width: 88, height: 132, borderRadius: 6,
          background: 'rgba(255,255,255,0.05)',
          animation: 'pulse 1.5s ease-in-out infinite',
          animationDelay: `${i * 0.1}s`,
        }} />
      ))}
    </div>
  )

  if (items.length === 0) return (
    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', paddingTop: 8 }}>{emptyMsg}</div>
  )

  return (
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
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

function RequestsTab({
  requests,
}: {
  requests: OverseerrRequest[]
}) {
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
            {/* Poster or fallback */}
            {src ? (
              <img src={src} alt="" style={{
                width: 36, height: 54, objectFit: 'cover', borderRadius: 4, flexShrink: 0, display: 'block',
              }} />
            ) : (
              <div style={{
                width: 36, height: 54, borderRadius: 4, flexShrink: 0,
                background: 'rgba(229,160,13,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem',
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

// ── Search results (replaces tab content when searching) ──────────────────────

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
        const status = r.mediaInfo?.status
        const statusInfo = status ? MEDIA_STATUS[status] : null
        const src  = posterUrl(r.posterPath)
        const year = mediaYear(r)
        const isRequesting = requestingId === r.id

        return (
          <div key={`${r.mediaType}-${r.id}`} style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            {src ? (
              <img src={src} alt="" style={{ width: 36, height: 54, objectFit: 'cover', borderRadius: 4, flexShrink: 0, display: 'block' }} />
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
                disabled={isRequesting}
                style={{
                  padding: '4px 10px', borderRadius: 6,
                  border: `1px solid ${ACCENT}88`,
                  background: isRequesting ? `${ACCENT}22` : 'transparent',
                  color: ACCENT, fontSize: '0.7rem',
                  cursor: isRequesting ? 'wait' : 'pointer', fontFamily: 'inherit', flexShrink: 0,
                }}
              >{isRequesting ? '…' : '+ Request'}</button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Discover tab ──────────────────────────────────────────────────────────────

const DISCOVER_MODES: { value: DiscoverMode | 'divider'; label: string }[] = [
  { value: 'trending',    label: '🔥 Trending' },
  { value: 'movies',      label: '🎬 Popular Movies' },
  { value: 'tv',          label: '📺 Popular TV' },
  { value: 'movie_genre', label: '🎭 Movies by Genre' },
  { value: 'tv_genre',    label: '🎭 TV by Genre' },
  { value: 'tv_network',  label: '📡 TV by Network' },
]

function DiscoverTab({
  results, discoverLoading, movieGenres, tvGenres, networks,
  requestingId, onRequest, onDiscover, onFetchMetadata,
}: {
  results: OverseerrResult[]
  discoverLoading: boolean
  movieGenres: { id: number; name: string }[]
  tvGenres: { id: number; name: string }[]
  networks: { id: number; name: string }[]
  requestingId: number | null
  onRequest: (id: number, type: 'movie' | 'tv') => void
  onDiscover: (mode: DiscoverMode, id?: number) => void
  onFetchMetadata: () => Promise<void>
}) {
  const [mode, setMode] = useState<DiscoverMode>('trending')
  const [genreId, setGenreId]     = useState<number>(0)
  const [networkId, setNetworkId] = useState<number>(0)
  const [metaFetched, setMetaFetched] = useState(false)

  const needsGenre   = mode === 'movie_genre' || mode === 'tv_genre'
  const needsNetwork = mode === 'tv_network'
  const genreList    = mode === 'movie_genre' ? movieGenres : tvGenres

  // Fetch on mode change
  useEffect(() => {
    if (needsGenre) {
      if (!metaFetched) { onFetchMetadata(); setMetaFetched(true) }
      if (genreId) onDiscover(mode, genreId)
    } else if (needsNetwork) {
      if (!metaFetched) { onFetchMetadata(); setMetaFetched(true) }
      if (networkId) onDiscover(mode, networkId)
    } else {
      onDiscover(mode)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const handleGenreChange = (id: number) => {
    setGenreId(id)
    if (id) onDiscover(mode, id)
  }

  const handleNetworkChange = (id: number) => {
    setNetworkId(id)
    if (id) onDiscover(mode, id)
  }

  const selectStyle: React.CSSProperties = {
    padding: '5px 8px', borderRadius: 6, fontSize: '0.73rem',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: 'var(--text-secondary)', fontFamily: 'inherit', cursor: 'pointer',
    maxWidth: '100%',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 8 }}>
      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
        <select
          value={mode}
          onChange={e => setMode(e.target.value as DiscoverMode)}
          style={selectStyle}
        >
          {DISCOVER_MODES.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        {/* Genre selector */}
        {needsGenre && (
          <select
            value={genreId}
            onChange={e => handleGenreChange(Number(e.target.value))}
            style={selectStyle}
          >
            <option value={0}>— Pick a genre —</option>
            {genreList.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}

        {/* Network selector */}
        {needsNetwork && (
          <select
            value={networkId}
            onChange={e => handleNetworkChange(Number(e.target.value))}
            style={selectStyle}
          >
            <option value={0}>— Pick a network —</option>
            {networks.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
        )}
      </div>

      {/* Results shelf */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {(needsGenre && !genreId) || (needsNetwork && !networkId) ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', paddingTop: 8 }}>
            {needsGenre ? 'Select a genre above' : 'Select a network above'}
          </div>
        ) : (
          <PosterShelf
            items={results}
            requestingId={requestingId}
            onRequest={onRequest}
            loading={discoverLoading}
          />
        )}
      </div>
    </div>
  )
}

// ── Main tile ─────────────────────────────────────────────────────────────────

type Tab = 'requests' | 'trending' | 'discover'

export default function OverseerrTile() {
  const { isConfigured } = useConfigStore()
  const {
    results, requests, discoverResults,
    movieGenres, tvGenres, networks,
    searching, discoverLoading, requestingId, error,
    search, clearResults, discover, fetchMetadata, requestMedia,
  } = useOverseerr()

  const [query, setQuery]   = useState('')
  const [tab, setTab]       = useState<Tab>('requests')
  const [trendingFetched, setTrendingFetched] = useState(false)
  const configured = isConfigured('overseerr')
  const isSearching = query.trim().length > 0

  // Auto-load trending when that tab is first opened
  const activateTrending = useCallback(() => {
    if (!trendingFetched) {
      discover('trending')
      setTrendingFetched(true)
    }
  }, [trendingFetched, discover])

  const handleTabChange = useCallback((t: Tab) => {
    setTab(t)
    if (t === 'trending') activateTrending()
  }, [activateTrending])

  const handleSearch = (val: string) => {
    setQuery(val)
    search(val)
    if (!val) clearResults()
  }

  const tabBtn = (t: Tab, label: string, badge?: number) => (
    <button
      type="button"
      onClick={() => handleTabChange(t)}
      style={{
        flex: 1, padding: '5px 2px', borderRadius: 6, border: 'none',
        background: tab === t ? `rgba(229,160,13,0.12)` : 'transparent',
        color: tab === t ? ACCENT : 'var(--text-muted)',
        fontSize: '0.72rem', fontWeight: tab === t ? 600 : 400,
        cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        transition: 'background 0.15s, color 0.15s', whiteSpace: 'nowrap',
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
          /* Search results overlay */
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
              {tabBtn('requests', 'Requests', requests.length || undefined)}
              {tabBtn('trending', 'Trending')}
              {tabBtn('discover', 'Discover')}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {tab === 'requests' && (
                <RequestsTab
                  requests={requests}
                />
              )}
              {tab === 'trending' && (
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  <PosterShelf
                    items={discoverResults}
                    requestingId={requestingId}
                    onRequest={requestMedia}
                    loading={discoverLoading}
                    emptyMsg="Loading trending…"
                  />
                </div>
              )}
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
                  onFetchMetadata={fetchMetadata}
                />
              )}
            </div>
          </>
        )}
      </div>
    </TileWrapper>
  )
}
