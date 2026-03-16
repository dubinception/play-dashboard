import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { SonarrSeries, SonarrQualityProfile, SonarrCredit, SonarrSeason } from '@/hooks/useSonarr'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRuntime(mins: number) {
  if (!mins) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h ? `${h}h ${m}m` : `${m}m`
}

function fmtSize(bytes: number) {
  if (!bytes) return ''
  if (bytes >= 1e12) return (bytes / 1e12).toFixed(1) + ' TB'
  if (bytes >= 1e9)  return (bytes / 1e9).toFixed(1)  + ' GB'
  if (bytes >= 1e6)  return (bytes / 1e6).toFixed(0)  + ' MB'
  return (bytes / 1e3).toFixed(0) + ' KB'
}

function statusColor(status: string) {
  if (status === 'continuing') return '#2ecc71'
  if (status === 'ended')      return '#e74c3c'
  if (status === 'upcoming')   return '#f39c12'
  return '#888'
}

// ── Season card ───────────────────────────────────────────────────────────────

function SeasonCard({ season }: { season: SonarrSeason }) {
  const s = season.statistics
  const label = season.seasonNumber === 0 ? 'Specials' : `Season ${season.seasonNumber}`
  const total   = s?.totalEpisodeCount ?? 0
  const hasFile = s?.episodeFileCount  ?? 0
  const pct     = total > 0 ? Math.round((hasFile / total) * 100) : 0
  const size    = s?.sizeOnDisk ?? 0

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8, padding: '10px 12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {size > 0 && (
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{fmtSize(size)}</span>
          )}
          <span style={{
            fontSize: '0.7rem', fontWeight: 600,
            color: pct === 100 ? '#35c5f4' : pct > 0 ? '#f39c12' : 'var(--text-muted)',
          }}>
            {hasFile}/{total}
          </span>
          {!season.monitored && (
            <span style={{
              fontSize: '0.62rem', padding: '1px 5px', borderRadius: 3,
              background: 'rgba(255,255,255,0.07)', color: 'var(--text-muted)',
            }}>Unmonitored</span>
          )}
        </div>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
        <div style={{
          height: '100%', borderRadius: 2, width: `${pct}%`,
          background: pct === 100
            ? 'linear-gradient(90deg,#35c5f4,#00e5cc)'
            : 'linear-gradient(90deg,#35c5f4aa,#35c5f466)',
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}

// ── Cast grid ─────────────────────────────────────────────────────────────────

function CastGrid({ credits }: { credits: SonarrCredit[] }) {
  const cast = credits.filter(c => c.type === 'cast').slice(0, 20)
  if (cast.length === 0) return null
  return (
    <div>
      <div style={{
        fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
        color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10,
      }}>Cast</div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {cast.map((c, i) => {
          const photo = c.images.find(img => img.coverType === 'headshot')?.remoteUrl
          return (
            <div key={i} style={{ flexShrink: 0, width: 68, textAlign: 'center' }}>
              {photo ? (
                <img
                  src={photo}
                  alt={c.personName}
                  style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{
                  width: 68, height: 68, borderRadius: '50%',
                  background: 'rgba(53,197,244,0.1)',
                  border: '1px solid rgba(53,197,244,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem', color: 'rgba(255,255,255,0.3)',
                }}>👤</div>
              )}
              <div style={{
                fontSize: '0.65rem', color: 'var(--text-secondary)',
                marginTop: 5, lineHeight: 1.2,
                overflow: 'hidden', textOverflow: 'ellipsis',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>{c.personName}</div>
              {c.character && (
                <div style={{
                  fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{c.character}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Crew section ──────────────────────────────────────────────────────────────

function CrewSection({ credits }: { credits: SonarrCredit[] }) {
  const directors = credits.filter(c => c.type === 'crew' && c.job === 'Creator')
  const writers   = credits.filter(c => c.type === 'crew' && c.department === 'Writing').slice(0, 4)
  if (directors.length === 0 && writers.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      {directors.length > 0 && (
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Creator</div>
          {directors.map((c, i) => (
            <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{c.personName}</div>
          ))}
        </div>
      )}
      {writers.length > 0 && (
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Writers</div>
          {writers.map((c, i) => (
            <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{c.personName}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  series: SonarrSeries
  qualityProfiles: SonarrQualityProfile[]
  onClose: () => void
  onToggleMonitored: (series: SonarrSeries) => Promise<void>
  onSetQualityProfile: (series: SonarrSeries, profileId: number) => Promise<void>
  onSearch: (id: number) => Promise<void>
  onRefresh: (id: number) => Promise<void>
  onDelete: (id: number, deleteFiles: boolean) => Promise<void>
  fetchCredits: (seriesId: number) => Promise<SonarrCredit[]>
  serviceUrl: string
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function SonarrDetailModal({
  series, qualityProfiles, onClose,
  onToggleMonitored, onSetQualityProfile,
  onSearch, onRefresh, onDelete,
  fetchCredits, serviceUrl,
}: Props) {
  const [credits, setCredits]           = useState<SonarrCredit[]>([])
  const [monitored, setMonitored]       = useState(series.monitored)
  const [profileId, setProfileId]       = useState(series.qualityProfileId)
  const [showMenu, setShowMenu]         = useState(false)
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy]                 = useState(false)
  const [toast, setToast]               = useState('')

  const poster  = series.images.find(i => i.coverType === 'poster')?.remoteUrl
  const fanart  = series.images.find(i => i.coverType === 'fanart')?.remoteUrl
  const rating  = series.ratings?.value
  const imdb    = series.imdbId ? `https://www.imdb.com/title/${series.imdbId}/` : undefined
  const tvdb    = `https://thetvdb.com/?id=${series.tvdbId}&tab=series`
  const sonarrUrl = `${serviceUrl}/series/${series.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  const seasons = [...series.seasons].sort((a, b) => a.seasonNumber - b.seasonNumber)
  const displaySeasons = seasons.filter(s => s.seasonNumber > 0 || (s.statistics?.totalEpisodeCount ?? 0) > 0)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const handleMonitored = async () => {
    setBusy(true)
    try {
      await onToggleMonitored({ ...series, monitored })
      setMonitored(v => !v)
      showToast(monitored ? 'Unmonitored' : 'Monitored')
    } finally { setBusy(false) }
  }

  const handleProfile = async (id: number) => {
    setProfileId(id)
    await onSetQualityProfile({ ...series, qualityProfileId: profileId }, id)
  }

  const handleSearch = async () => {
    setShowMenu(false)
    setBusy(true)
    try { await onSearch(series.id); showToast('Search started') }
    finally { setBusy(false) }
  }

  const handleRefresh = async () => {
    setShowMenu(false)
    setBusy(true)
    try { await onRefresh(series.id); showToast('Refresh queued') }
    finally { setBusy(false) }
  }

  const loadCredits = useCallback(async () => {
    const data = await fetchCredits(series.id)
    setCredits(data)
  }, [fetchCredits, series.id])

  useEffect(() => { loadCredits() }, [loadCredits])

  // ESC to close, lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [onClose])

  const ACCENT = '#35c5f4'

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 680, maxHeight: '90vh',
          borderRadius: 14, overflow: 'hidden',
          background: 'linear-gradient(180deg, #0d1b2a 0%, #080f18 100%)',
          border: '1px solid rgba(53,197,244,0.18)',
          boxShadow: '0 0 60px rgba(53,197,244,0.12), 0 24px 60px rgba(0,0,0,0.7)',
          display: 'flex', flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Hero banner */}
        <div style={{ position: 'relative', height: 200, flexShrink: 0, overflow: 'hidden' }}>
          {fanart ? (
            <>
              <img src={fanart} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'blur(2px) brightness(0.45)', transform: 'scale(1.05)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, #0d1b2a 0%, transparent 60%)' }} />
            </>
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,rgba(53,197,244,0.15),rgba(0,229,204,0.08))' }} />
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 12, right: 12, width: 32, height: 32,
              borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>

          {/* Poster + title block */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            display: 'flex', alignItems: 'flex-end', gap: 14, padding: '0 16px 14px',
          }}>
            {poster && (
              <img
                src={poster}
                alt={series.title}
                style={{
                  width: 72, height: 108, objectFit: 'cover', borderRadius: 6, flexShrink: 0,
                  border: '2px solid rgba(53,197,244,0.25)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                {series.certification && (
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                    border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.7)',
                  }}>{series.certification}</span>
                )}
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                  background: statusColor(series.status) + '33',
                  border: `1px solid ${statusColor(series.status)}66`,
                  color: statusColor(series.status),
                  textTransform: 'capitalize',
                }}>{series.status}</span>
                {rating != null && (
                  <span style={{ fontSize: '0.72rem', color: '#ffc230', fontWeight: 600 }}>
                    ★ {rating.toFixed(1)}
                  </span>
                )}
              </div>
              <div style={{
                fontSize: '1.2rem', fontWeight: 700, color: '#fff',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              }}>{series.title}</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', marginTop: 3, display: 'flex', gap: 8 }}>
                {series.year > 0 && <span>{series.year}</span>}
                {series.runtime > 0 && <span>· {fmtRuntime(series.runtime)}/ep</span>}
                {series.network && <span>· {series.network}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 20px' }}>

          {/* Action bar */}
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16,
            paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            {/* Monitor toggle */}
            <button
              onClick={handleMonitored}
              disabled={busy}
              title={monitored ? 'Unmonitor' : 'Monitor'}
              style={{
                padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: monitored ? 'rgba(53,197,244,0.15)' : 'rgba(255,255,255,0.06)',
                color: monitored ? ACCENT : 'var(--text-muted)',
                fontSize: '0.8rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {monitored ? '🔔' : '🔕'} {monitored ? 'Monitored' : 'Unmonitored'}
            </button>

            {/* Quality profile */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowQualityMenu(m => !m); setShowMenu(false) }}
                disabled={busy}
                style={{
                  padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)',
                  fontSize: '0.78rem', fontFamily: 'inherit', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                {qualityProfiles.find(p => p.id === profileId)?.name ?? 'Quality'} ▾
              </button>
              {showQualityMenu && (
                <div style={{
                  position: 'absolute', top: '110%', left: 0, zIndex: 20, minWidth: 160,
                  background: '#0d1b2a', border: '1px solid rgba(53,197,244,0.2)',
                  borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', overflow: 'hidden',
                }}>
                  {qualityProfiles.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { handleProfile(p.id); setShowQualityMenu(false) }}
                      style={{
                        width: '100%', padding: '9px 14px', textAlign: 'left', border: 'none',
                        background: p.id === profileId ? 'rgba(53,197,244,0.15)' : 'transparent',
                        color: p.id === profileId ? ACCENT : 'var(--text-secondary)',
                        fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >{p.name}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Search */}
            <button
              onClick={handleSearch}
              disabled={busy}
              style={{
                padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: 'rgba(53,197,244,0.12)', color: ACCENT,
                fontSize: '0.78rem', fontFamily: 'inherit',
              }}
            >🔍 Search</button>

            {/* TVDB */}
            <a href={tvdb} target="_blank" rel="noreferrer" style={{
              padding: '6px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)',
              fontSize: '0.78rem', textDecoration: 'none', display: 'flex', alignItems: 'center',
            }}>TVDB ↗</a>

            {/* IMDb */}
            {imdb && (
              <a href={imdb} target="_blank" rel="noreferrer" style={{
                padding: '6px 10px', borderRadius: 6,
                background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)',
                fontSize: '0.78rem', textDecoration: 'none', display: 'flex', alignItems: 'center',
              }}>IMDb ↗</a>
            )}

            {/* Sonarr link */}
            <a href={sonarrUrl} target="_blank" rel="noreferrer" style={{
              padding: '6px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)',
              fontSize: '0.78rem', textDecoration: 'none', display: 'flex', alignItems: 'center',
            }}>↗ Sonarr</a>

            {/* ⋮ menu */}
            <div style={{ position: 'relative', marginLeft: 'auto' }}>
              <button
                onClick={() => setShowMenu(v => !v)}
                style={{
                  padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)',
                  fontSize: '1rem', fontFamily: 'inherit',
                }}
              >⋮</button>
              {showMenu && (
                <div style={{
                  position: 'absolute', right: 0, top: '110%', zIndex: 10,
                  background: '#0d1b2a', border: '1px solid rgba(53,197,244,0.2)',
                  borderRadius: 8, padding: '4px 0', minWidth: 160,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}>
                  {[
                    { label: '🔍 Auto Search',   action: handleSearch },
                    { label: '🔄 Refresh Series', action: handleRefresh },
                  ].map(({ label, action }) => (
                    <button key={label} onClick={action} style={{
                      display: 'block', width: '100%', padding: '8px 14px',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--text-secondary)', fontSize: '0.78rem',
                      fontFamily: 'inherit', textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(53,197,244,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >{label}</button>
                  ))}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />
                  <button onClick={() => { setShowMenu(false); setConfirmDelete(true) }} style={{
                    display: 'block', width: '100%', padding: '8px 14px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: '#e74c3c', fontSize: '0.78rem',
                    fontFamily: 'inherit', textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(231,76,60,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >🗑 Delete Series…</button>
                </div>
              )}
            </div>
          </div>

          {/* Delete confirmation */}
          {confirmDelete && (
            <div style={{
              background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.3)',
              borderRadius: 8, padding: '12px 14px', marginBottom: 14,
            }}>
              <div style={{ fontSize: '0.82rem', color: '#e74c3c', fontWeight: 600, marginBottom: 10 }}>
                Delete "{series.title}" from Sonarr?
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onDelete(series.id, false)} style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: 'rgba(231,76,60,0.2)', color: '#e74c3c', fontSize: '0.78rem', fontFamily: 'inherit',
                }}>Remove from Sonarr</button>
                <button onClick={() => onDelete(series.id, true)} style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: '#e74c3c', color: '#fff', fontSize: '0.78rem', fontFamily: 'inherit',
                }}>Delete Files Too</button>
                <button onClick={() => setConfirmDelete(false)} style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'inherit',
                }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Overview */}
          {series.overview && (
            <p style={{
              fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6,
              margin: '0 0 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 14,
            }}>{series.overview}</p>
          )}

          {/* Seasons */}
          {displaySeasons.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
                color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10,
              }}>
                Seasons
                {series.statistics?.sizeOnDisk > 0 && (
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>
                    · {fmtSize(series.statistics.sizeOnDisk)} total
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                {displaySeasons.map(s => <SeasonCard key={s.seasonNumber} season={s} />)}
              </div>
            </div>
          )}

          {/* Genres + metadata */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {series.genres?.map(g => (
              <span key={g} style={{
                padding: '3px 9px', borderRadius: 20, fontSize: '0.7rem',
                background: 'rgba(53,197,244,0.08)', border: '1px solid rgba(53,197,244,0.18)',
                color: 'rgba(255,255,255,0.6)',
              }}>{g}</span>
            ))}
          </div>

          {/* Metadata row */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '6px 24px',
            fontSize: '0.72rem', color: 'var(--text-muted)',
            marginBottom: 16, paddingBottom: 14,
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            {series.network && <span>Network: <span style={{ color: 'var(--text-secondary)' }}>{series.network}</span></span>}
            {series.added  && <span>Added: <span style={{ color: 'var(--text-secondary)' }}>{new Date(series.added).toLocaleDateString()}</span></span>}
            {series.path   && <span>Path: <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.68rem' }}>{series.path}</span></span>}
          </div>

          {/* Crew */}
          {credits.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <CrewSection credits={credits} />
            </div>
          )}

          {/* Cast */}
          <CastGrid credits={credits} />
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(53,197,244,0.15)', border: '1px solid rgba(53,197,244,0.3)',
            borderRadius: 8, padding: '7px 16px', fontSize: '0.8rem', color: ACCENT,
            pointerEvents: 'none', whiteSpace: 'nowrap',
          }}>{toast}</div>
        )}
      </div>
    </div>,
    document.body
  )
}
