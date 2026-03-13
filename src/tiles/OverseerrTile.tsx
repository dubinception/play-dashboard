import { useState } from 'react'
import TileWrapper from '@/components/TileWrapper'
import { useOverseerr, MEDIA_STATUS, REQUEST_STATUS } from '@/hooks/useOverseerr'
import useConfigStore from '@/store/useConfigStore'
import type { OverseerrResult, OverseerrRequest } from '@/hooks/useOverseerr'

function mediaTitle(item: OverseerrResult | OverseerrRequest) {
  if ('title' in item && item.title) return item.title
  if ('name' in item && (item as OverseerrResult).name) return (item as OverseerrResult).name!
  if ('media' in item) return (item as OverseerrRequest).media.title ?? (item as OverseerrRequest).media.originalTitle ?? '?'
  return '?'
}

function ResultRow({
  result, onRequest, requesting,
}: {
  result: OverseerrResult
  onRequest: () => void
  requesting: boolean
}) {
  const status = result.mediaInfo?.status
  const statusInfo = status ? MEDIA_STATUS[status] : null
  const year = result.releaseDate?.slice(0, 4) ?? result.firstAirDate?.slice(0, 4) ?? ''

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '6px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: '0.9rem' }}>{result.mediaType === 'movie' ? '🎥' : '📺'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.8rem', color: 'var(--text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {mediaTitle(result)} {year ? <span style={{ color: 'var(--text-muted)' }}>({year})</span> : null}
        </div>
      </div>
      {statusInfo ? (
        <span style={{
          fontSize: '0.65rem', padding: '2px 7px', borderRadius: '8px',
          color: statusInfo.color, border: `1px solid ${statusInfo.color}`,
          background: `${statusInfo.color}18`, flexShrink: 0,
        }}>
          {statusInfo.label}
        </span>
      ) : (
        <button
          onClick={onRequest}
          disabled={requesting}
          style={{
            padding: '3px 10px', borderRadius: '6px', border: '1px solid var(--accent-1)',
            background: requesting ? 'rgba(0,136,255,0.1)' : 'transparent',
            color: 'var(--accent-1)', fontSize: '0.7rem', cursor: requesting ? 'wait' : 'pointer',
            fontFamily: 'inherit', flexShrink: 0,
          }}
        >
          {requesting ? '…' : '+ Request'}
        </button>
      )}
    </div>
  )
}

function reqDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function RequestRow({ req }: { req: OverseerrRequest }) {
  // mediaStatus 5 = Available in Plex; takes priority over request status
  const available = req.media.mediaStatus === 5
  const statusInfo = available
    ? { label: 'Available', color: '#35c5f4' }
    : REQUEST_STATUS[req.status] ?? { label: 'Pending', color: '#f39c12' }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '5px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: '0.85rem' }}>{req.type === 'movie' ? '🎥' : '📺'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.78rem', color: 'var(--text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {mediaTitle(req)}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          {req.requestedBy.displayName} · {reqDate(req.createdAt)}
        </div>
      </div>
      {statusInfo && (
        <span style={{
          fontSize: '0.65rem', padding: '2px 7px', borderRadius: '8px',
          color: statusInfo.color, border: `1px solid ${statusInfo.color}`,
          background: `${statusInfo.color}18`, flexShrink: 0,
        }}>
          {statusInfo.label}
        </span>
      )}
    </div>
  )
}

export default function OverseerrTile() {
  const { isConfigured } = useConfigStore()
  const { results, requests, searching, requestingId, error, search, clearResults, requestMedia } = useOverseerr()
  const [query, setQuery] = useState('')
  const configured = isConfigured('overseerr')
  const showResults = query.trim().length > 0

  const handleChange = (val: string) => {
    setQuery(val)
    search(val)
    if (!val) clearResults()
  }

  return (
    <TileWrapper
      id="overseerr"
      label="Overseerr"
      color="#e5a00d"
      status={!configured ? 'idle' : error ? 'down' : 'up'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Search bar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexShrink: 0 }}>
          <input
            type="text"
            placeholder={configured ? 'Search movies & TV shows…' : 'Connect Overseerr in Settings…'}
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            disabled={!configured}
            style={{
              flex: 1,
              background: 'var(--bg-base)',
              border: `1px solid ${configured ? 'rgba(229,160,13,0.3)' : 'var(--border)'}`,
              borderRadius: '8px',
              padding: '8px 12px',
              color: configured ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '0.85rem',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); clearResults() }}
              style={{
                padding: '8px 10px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >✕</button>
          )}
        </div>

        {/* Content area */}
        {!configured ? (
          <div className="not-connected">
            <span className="icon">🔍</span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Overseerr not connected</span>
            <span>Configure API key in Settings</span>
          </div>
        ) : error ? (
          <div className="not-connected">
            <span className="icon" style={{ fontSize: '1rem' }}>⚠️</span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Connection failed</span>
            <span style={{ fontSize: '0.72rem' }}>{error}</span>
          </div>
        ) : searching ? (
          <div className="not-connected">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Searching…</span>
          </div>
        ) : showResults ? (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {results.length === 0 ? (
              <div className="not-connected">
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No results</span>
              </div>
            ) : results.map((r) => (
              <ResultRow
                key={`${r.mediaType}-${r.id}`}
                result={r}
                onRequest={() => requestMedia(r.id, r.mediaType)}
                requesting={requestingId === r.id}
              />
            ))}
          </div>
        ) : (
          <>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px', flexShrink: 0 }}>
              Recent Requests
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {requests.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '16px 0' }}>
                  No recent requests
                </div>
              ) : requests.map((r) => (
                <RequestRow key={r.id} req={r} />
              ))}
            </div>
          </>
        )}
      </div>
    </TileWrapper>
  )
}
