import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { RadarrMovie, RadarrQualityProfile, RadarrCredit } from '@/hooks/useRadarr'
import { radarrImageUrl } from '@/hooks/useRadarr'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(bytes: number) {
  if (!bytes) return '—'
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  return `${(bytes / 1e6).toFixed(0)} MB`
}

function runtime(mins: number) {
  if (!mins) return ''
  const h = Math.floor(mins / 60), m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function releaseDate(iso?: string) {
  if (!iso) return 'Unknown'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function historyDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function imdbRating(movie: RadarrMovie) {
  const v = movie.ratings?.imdb?.value
  return v ? v.toFixed(1) : null
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FileInfoCard({ file }: { file: NonNullable<RadarrMovie['movieFile']> }) {
  const [expanded, setExpanded] = useState(false)
  const mi = file.mediaInfo

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
      borderRadius: '10px', overflow: 'hidden', marginBottom: '16px',
    }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 14px', cursor: 'pointer',
        }}
      >
        <span style={{ color: '#00e5a0', fontSize: '1rem' }}>✓</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.78rem', color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {file.relativePath}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.68rem', color: '#ffc230', background: 'rgba(255,194,48,0.12)',
              border: '1px solid rgba(255,194,48,0.3)', borderRadius: '4px', padding: '1px 6px',
            }}>
              {file.quality.quality.name}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{fmt(file.size)}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{historyDate(file.dateAdded)}</span>
          </div>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {expanded && mi && (
        <div style={{
          padding: '0 14px 14px', borderTop: '1px solid var(--border)',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '12px',
        }}>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent-1)', marginBottom: '6px' }}>VIDEO</div>
            {[
              ['Resolution', mi.resolution],
              ['Codec', mi.videoCodec],
              ['Bit Depth', mi.videoBitDepth ? `${mi.videoBitDepth}-bit` : ''],
              ['FPS', mi.videoFps ? mi.videoFps.toFixed(3) : ''],
            ].filter(([,v]) => v).map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent-2)', marginBottom: '6px' }}>AUDIO</div>
            {[
              ['Codec', mi.audioCodec],
              ['Channels', mi.audioChannels ? `${mi.audioChannels}ch` : ''],
              ['Languages', mi.audioLanguages],
              ['Runtime', mi.runTime],
            ].filter(([,v]) => v).map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CastGrid({ credits }: { credits: RadarrCredit[] }) {
  const cast = credits.filter(c => c.type === 'cast').slice(0, 10)
  if (!cast.length) return null
  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>Cast</div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {cast.map((c, i) => {
          const photo = c.images?.find(img => img.coverType === 'headshot')?.remoteUrl
          return (
            <div key={i} style={{ width: '72px', textAlign: 'center' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '8px', overflow: 'hidden',
                background: 'rgba(255,255,255,0.06)', marginBottom: '5px',
                border: '1px solid var(--border)',
              }}>
                {photo
                  ? <img src={photo} alt={c.personName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: 'var(--text-muted)' }}>👤</div>
                }
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.3 }}>{c.personName}</div>
              {c.character && <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{c.character}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────

interface Props {
  movie: RadarrMovie
  qualityProfiles: RadarrQualityProfile[]
  onClose: () => void
  onToggleMonitored: (movie: RadarrMovie) => Promise<void>
  onSetQualityProfile: (movie: RadarrMovie, profileId: number) => Promise<void>
  onSearch: (id: number) => Promise<void>
  onRefresh: (id: number) => Promise<void>
  onDelete: (id: number, deleteFiles: boolean) => Promise<void>
  fetchCredits: (movieId: number) => Promise<RadarrCredit[]>
  serviceUrl: string
}

export default function RadarrDetailModal({
  movie, qualityProfiles, onClose,
  onToggleMonitored, onSetQualityProfile,
  onSearch, onRefresh, onDelete,
  fetchCredits, serviceUrl,
}: Props) {
  const [credits, setCredits]             = useState<RadarrCredit[]>([])
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [showActionMenu, setShowActionMenu]   = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [monitored, setMonitored]         = useState(movie.monitored)
  const [qualityProfileId, setQualityProfileId] = useState(movie.qualityProfileId)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const poster  = radarrImageUrl(movie, 'poster')
  const fanart  = radarrImageUrl(movie, 'fanart')
  const rating  = imdbRating(movie)
  const profile = qualityProfiles.find(p => p.id === qualityProfileId)

  useEffect(() => {
    fetchCredits(movie.id).then(setCredits)
  }, [movie.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const crew = credits.filter(c => c.type === 'crew')
  const directors = crew.filter(c => c.department === 'Directing').map(c => c.personName)
  const writers   = crew.filter(c => c.department === 'Writing').map(c => c.personName)

  async function handleToggleMonitored() {
    setActionLoading('monitored')
    await onToggleMonitored({ ...movie, monitored })
    setMonitored(m => !m)
    setActionLoading(null)
  }

  async function handleQualityProfile(profileId: number) {
    setShowQualityMenu(false)
    setActionLoading('quality')
    setQualityProfileId(profileId)
    await onSetQualityProfile(movie, profileId)
    setActionLoading(null)
  }

  async function handleSearch() {
    setShowActionMenu(false)
    setActionLoading('search')
    await onSearch(movie.id)
    setActionLoading(null)
  }

  async function handleRefresh() {
    setShowActionMenu(false)
    setActionLoading('refresh')
    await onRefresh(movie.id)
    setActionLoading(null)
  }

  async function handleDelete(deleteFiles: boolean) {
    setShowDeleteConfirm(false)
    await onDelete(movie.id, deleteFiles)
    onClose()
  }

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        overflowY: 'auto', padding: '20px',
      }}
    >
      <div style={{
        width: '100%', maxWidth: '860px', borderRadius: '16px', overflow: 'hidden',
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        position: 'relative', flexShrink: 0,
      }}>
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute', top: '14px', right: '14px', zIndex: 10,
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '50%', width: '32px', height: '32px',
            color: '#fff', cursor: 'pointer', fontSize: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>

        {/* Hero: fan art + poster + title */}
        <div style={{ position: 'relative', height: '260px', overflow: 'hidden' }}>
          {fanart
            ? <img src={fanart} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.35) blur(1px)', transform: 'scale(1.05)' }} />
            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #080d1a, #0d1425)' }} />
          }
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 24px',
            background: 'linear-gradient(to top, rgba(8,13,26,0.98) 0%, transparent 100%)',
            display: 'flex', alignItems: 'flex-end', gap: '16px',
          }}>
            <div style={{
              width: '80px', height: '120px', borderRadius: '8px', overflow: 'hidden',
              flexShrink: 0, border: '2px solid rgba(255,255,255,0.15)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            }}>
              {poster
                ? <img src={poster} alt={movie.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🎥</div>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {movie.certification && (
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.4)', color: 'rgba(255,255,255,0.7)',
                  marginBottom: '6px', display: 'inline-block',
                }}>{movie.certification}</span>
              )}
              <h2 style={{
                fontSize: '1.5rem', fontWeight: 700, color: '#fff',
                margin: '4px 0', lineHeight: 1.2, fontFamily: "'Space Grotesk', sans-serif",
              }}>{movie.title}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {rating && (
                  <span style={{
                    background: '#f5c518', color: '#000', fontWeight: 700,
                    fontSize: '0.78rem', padding: '2px 8px', borderRadius: '4px',
                  }}>★ {rating}</span>
                )}
                {movie.year > 0 && <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>{movie.year}</span>}
                {movie.runtime > 0 && <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>{runtime(movie.runtime)}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div ref={scrollRef} style={{ padding: '20px 24px' }}>

          {/* Action bar */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {/* Monitored toggle */}
            <button
              type="button"
              onClick={handleToggleMonitored}
              disabled={actionLoading === 'monitored'}
              title={monitored ? 'Monitored — click to unmonitor' : 'Unmonitored — click to monitor'}
              style={{
                width: '40px', height: '40px', borderRadius: '8px', border: '1px solid var(--border)',
                background: monitored ? 'rgba(0,229,160,0.15)' : 'rgba(255,255,255,0.05)',
                color: monitored ? '#00e5a0' : 'var(--text-muted)',
                cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >🔖</button>

            {/* Quality profile */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => { setShowQualityMenu(m => !m); setShowActionMenu(false) }}
                disabled={actionLoading === 'quality'}
                style={{
                  height: '40px', padding: '0 14px', borderRadius: '8px',
                  border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem',
                  display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit',
                }}
              >
                {actionLoading === 'quality' ? '…' : (profile?.name ?? 'Quality')} ▾
              </button>
              {showQualityMenu && (
                <div style={{
                  position: 'absolute', top: '44px', left: 0, zIndex: 20, minWidth: '160px',
                  background: '#111827', border: '1px solid var(--border)', borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)', overflow: 'hidden',
                }}>
                  {qualityProfiles.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleQualityProfile(p.id)}
                      style={{
                        width: '100%', padding: '10px 14px', textAlign: 'left', border: 'none',
                        background: p.id === qualityProfileId ? 'rgba(0,136,255,0.15)' : 'transparent',
                        color: p.id === qualityProfileId ? 'var(--accent-1)' : 'var(--text-secondary)',
                        fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >{p.name}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Search */}
            <button
              type="button"
              onClick={handleSearch}
              disabled={actionLoading === 'search'}
              style={{
                height: '40px', padding: '0 16px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit',
              }}
            >{actionLoading === 'search' ? '…' : 'Search'}</button>

            {/* IMDb */}
            {movie.imdbId && (
              <a
                href={`https://www.imdb.com/title/${movie.imdbId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  height: '40px', padding: '0 16px', borderRadius: '8px',
                  border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)',
                  color: '#f5c518', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit',
                  textDecoration: 'none', display: 'flex', alignItems: 'center',
                }}
              >IMDb</a>
            )}

            {/* Open in Radarr */}
            <a
              href={`${serviceUrl}/movie/${movie.tmdbId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                height: '40px', padding: '0 16px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit',
                textDecoration: 'none', display: 'flex', alignItems: 'center',
              }}
            >↗ Radarr</a>

            {/* ⋮ menu */}
            <div style={{ position: 'relative', marginLeft: 'auto' }}>
              <button
                type="button"
                onClick={() => { setShowActionMenu(m => !m); setShowQualityMenu(false) }}
                style={{
                  width: '40px', height: '40px', borderRadius: '8px',
                  border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >⋮</button>
              {showActionMenu && (
                <div style={{
                  position: 'absolute', top: '44px', right: 0, zIndex: 20, minWidth: '160px',
                  background: '#111827', border: '1px solid var(--border)', borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)', overflow: 'hidden',
                }}>
                  {[
                    { label: 'Auto Search', action: handleSearch, loading: actionLoading === 'search' },
                    { label: 'Refresh', action: handleRefresh, loading: actionLoading === 'refresh' },
                  ].map(item => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      disabled={item.loading}
                      style={{
                        width: '100%', padding: '10px 14px', textAlign: 'left', border: 'none',
                        background: 'transparent', color: 'var(--text-secondary)',
                        fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >{item.loading ? '…' : item.label}</button>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    <button
                      type="button"
                      onClick={() => { setShowActionMenu(false); setShowDeleteConfirm(true) }}
                      style={{
                        width: '100%', padding: '10px 14px', textAlign: 'left', border: 'none',
                        background: 'transparent', color: '#ff4060',
                        fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >Delete Movie…</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Delete confirm */}
          {showDeleteConfirm && (
            <div style={{
              background: 'rgba(255,64,96,0.08)', border: '1px solid rgba(255,64,96,0.3)',
              borderRadius: '10px', padding: '14px 16px', marginBottom: '16px',
            }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Delete <strong>{movie.title}</strong>?
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => handleDelete(false)} style={{
                  padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(255,64,96,0.4)',
                  background: 'transparent', color: '#ff4060', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'inherit',
                }}>Remove from Radarr</button>
                <button type="button" onClick={() => handleDelete(true)} style={{
                  padding: '6px 14px', borderRadius: '6px', border: 'none',
                  background: '#ff4060', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'inherit',
                }}>Delete Files Too</button>
                <button type="button" onClick={() => setShowDeleteConfirm(false)} style={{
                  padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'inherit',
                }}>Cancel</button>
              </div>
            </div>
          )}

          {/* File info */}
          {movie.movieFile && <FileInfoCard file={movie.movieFile} />}

          {/* Release dates */}
          {(movie.inCinemas || movie.digitalRelease || movie.physicalRelease) && (
            <div style={{
              display: 'flex', gap: '24px', marginBottom: '16px',
              padding: '12px 0', borderBottom: '1px solid var(--border)',
              flexWrap: 'wrap',
            }}>
              {[
                { label: 'Cinemas Release',  value: movie.inCinemas },
                { label: 'Digital Release',  value: movie.digitalRelease },
                { label: 'Physical Release', value: movie.physicalRelease },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '3px' }}>{label}</div>
                  <div style={{ fontSize: '0.8rem', color: value ? '#ffc230' : 'var(--text-muted)', fontWeight: 500 }}>
                    {releaseDate(value)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Overview */}
          {movie.overview && (
            <p style={{
              fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6,
              marginBottom: '14px',
            }}>{movie.overview}</p>
          )}

          {/* Genres */}
          {movie.genres?.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {movie.genres.map(g => (
                <span key={g} style={{
                  fontSize: '0.72rem', padding: '3px 10px', borderRadius: '20px',
                  border: '1px solid var(--border)', color: 'var(--text-muted)',
                }}>{g}</span>
              ))}
            </div>
          )}

          {/* Meta: studio, added, path */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {movie.studio && (
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '3px' }}>Studio</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{movie.studio}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '3px' }}>Added</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{historyDate(movie.added)}</div>
            </div>
          </div>
          {movie.path && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '3px' }}>Path</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-1)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{movie.path}</div>
            </div>
          )}

          {/* Crew */}
          {(directors.length > 0 || writers.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              {directors.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Director</div>
                  {directors.map(d => <div key={d} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{d}</div>)}
                </div>
              )}
              {writers.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Writers</div>
                  {writers.map(w => <div key={w} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{w}</div>)}
                </div>
              )}
            </div>
          )}

          {/* Cast */}
          <CastGrid credits={credits} />

        </div>
      </div>
    </div>,
    document.body
  )
}
