import { useState, useEffect, useCallback } from 'react'
import TileWrapper from '@/components/TileWrapper'
import { useSonarr, sonarrImageUrl } from '@/hooks/useSonarr'
import useConfigStore from '@/store/useConfigStore'
import type { SonarrSeries, SonarrQueueItem, SonarrCalendarItem } from '@/hooks/useSonarr'
import SonarrDetailModal from './SonarrDetailModal'

const ACCENT = '#35c5f4'

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(item: SonarrQueueItem) {
  if (!item.size) return 0
  return Math.min(100, Math.max(0, ((item.size - item.sizeleft) / item.size) * 100))
}

function fmtSize(bytes: number) {
  if (!bytes) return ''
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB'
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(0) + ' MB'
  return (bytes / 1e3).toFixed(0) + ' KB'
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

// ── Series poster ─────────────────────────────────────────────────────────────

function Poster({ series, size = 42 }: { series: SonarrSeries; size?: number }) {
  const src = sonarrImageUrl(series, 'poster')
  if (!src) {
    return (
      <div style={{
        width: size, height: size * 1.5, borderRadius: 4, flexShrink: 0,
        background: 'rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.1rem', color: 'rgba(255,255,255,0.2)',
      }}>📺</div>
    )
  }
  return (
    <img
      src={src}
      alt=""
      style={{ width: size, height: size * 1.5, objectFit: 'cover', borderRadius: 4, flexShrink: 0, display: 'block' }}
    />
  )
}

// ── Series row (Library / Missing) ────────────────────────────────────────────

function SeriesRow({
  series,
  qualityName,
  onClick,
}: {
  series: SonarrSeries
  qualityName: string
  onClick: () => void
}) {
  const stats = series.statistics
  const pctDone = stats?.totalEpisodeCount
    ? Math.round((stats.episodeFileCount / stats.totalEpisodeCount) * 100)
    : null
  const rating = series.ratings?.value

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
      onMouseEnter={e => (e.currentTarget.style.background = `rgba(53,197,244,0.05)`)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <Poster series={series} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {series.title}
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>
            {series.year}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
          {rating != null && (
            <span style={{ fontSize: '0.67rem', color: '#ffc230' }}>★ {rating.toFixed(1)}</span>
          )}
          <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>{qualityName}</span>
          {stats?.sizeOnDisk > 0 && (
            <span style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.3)' }}>
              {fmtSize(stats.sizeOnDisk)}
            </span>
          )}
          {pctDone != null && pctDone < 100 && (
            <span style={{
              fontSize: '0.62rem', padding: '1px 5px', borderRadius: 3,
              background: 'rgba(53,197,244,0.1)', color: ACCENT,
            }}>
              {stats?.episodeFileCount}/{stats?.totalEpisodeCount} eps
            </span>
          )}
          {series.status === 'ended' && pctDone === 100 && (
            <span style={{
              fontSize: '0.62rem', padding: '1px 5px', borderRadius: 3,
              background: 'rgba(46,204,113,0.1)', color: '#2ecc71',
            }}>Complete</span>
          )}
          {!series.monitored && (
            <span style={{
              fontSize: '0.62rem', padding: '1px 5px', borderRadius: 3,
              background: 'rgba(255,255,255,0.07)', color: 'var(--text-muted)',
            }}>Unmonitored</span>
          )}
        </div>
      </div>
      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>›</span>
    </button>
  )
}

// ── Library tab ───────────────────────────────────────────────────────────────

function LibraryTab({
  library,
  qualityProfiles,
  loading,
  onSelect,
}: {
  library: SonarrSeries[]
  qualityProfiles: { id: number; name: string }[]
  loading: boolean
  onSelect: (s: SonarrSeries) => void
}) {
  const [search, setSearch] = useState('')
  const filtered = search.trim()
    ? library.filter(s => s.title.toLowerCase().includes(search.toLowerCase()))
    : library
  const profileName = (id: number) => qualityProfiles.find(p => p.id === id)?.name ?? '—'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Loading library…</span>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flexShrink: 0, marginBottom: 8 }}>
        <input
          type="text"
          placeholder="Search shows…"
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
        {filtered.length === 0
          ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', paddingTop: 20 }}>No shows found</div>
          : filtered.map(s => (
            <SeriesRow key={s.id} series={s} qualityName={profileName(s.qualityProfileId)} onClick={() => onSelect(s)} />
          ))
        }
      </div>
    </div>
  )
}

// ── Missing tab ───────────────────────────────────────────────────────────────

function MissingTab({
  library,
  qualityProfiles,
  loading,
  onSelect,
}: {
  library: SonarrSeries[]
  qualityProfiles: { id: number; name: string }[]
  loading: boolean
  onSelect: (s: SonarrSeries) => void
}) {
  const missing = library.filter(s =>
    s.monitored &&
    s.statistics &&
    s.statistics.episodeFileCount < s.statistics.totalEpisodeCount
  ).sort((a, b) =>
    (b.statistics.totalEpisodeCount - b.statistics.episodeFileCount) -
    (a.statistics.totalEpisodeCount - a.statistics.episodeFileCount)
  )
  const profileName = (id: number) => qualityProfiles.find(p => p.id === id)?.name ?? '—'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Loading…</span>
    </div>
  )

  if (missing.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: '1.5rem' }}>✓</span>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No missing episodes</span>
    </div>
  )

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {missing.map(s => (
        <SeriesRow key={s.id} series={s} qualityName={profileName(s.qualityProfileId)} onClick={() => onSelect(s)} />
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
  items: SonarrQueueItem[]
  library: SonarrSeries[]
  onSelect: (s: SonarrSeries) => void
}) {
  if (items.length === 0) return (
    <div className="not-connected">
      <span style={{ fontSize: '1.1rem' }}>✓</span>
      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Queue empty</span>
    </div>
  )

  return (
    <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
      {items.map(item => {
        const p = pct(item)
        const isWarn = item.trackedDownloadStatus === 'warning'
        const e = item.episode
        const epCode = e ? `S${String(e.seasonNumber).padStart(2,'0')}E${String(e.episodeNumber).padStart(2,'0')}` : ''
        const seriesTitle = item.series?.title ?? item.title

        const libSeries = library.find(s => s.id === item.series?.id)
        const poster = libSeries ? sonarrImageUrl(libSeries, 'poster') : undefined

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => libSeries && onSelect(libSeries)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              width: '100%', padding: '7px 4px',
              background: 'transparent', border: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              cursor: libSeries ? 'pointer' : 'default',
              fontFamily: 'inherit', textAlign: 'left',
            }}
          >
            {poster ? (
              <img src={poster} alt="" style={{ width: 32, height: 48, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
            ) : (
              <div style={{
                width: 32, height: 48, borderRadius: 3, flexShrink: 0,
                background: 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', color: 'rgba(255,255,255,0.2)',
              }}>📺</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    fontSize: '0.77rem', color: isWarn ? '#f39c12' : 'var(--text-secondary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                  }}>{seriesTitle}</span>
                  {epCode && (
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {epCode}{e?.title ? ` · ${e.title}` : ''}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0, marginLeft: 6 }}>
                  {item.timeleft || '—'}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', margin: '3px 0 2px' }}>
                <div style={{
                  height: '100%', width: `${p}%`, borderRadius: 2,
                  background: isWarn
                    ? 'linear-gradient(90deg,#f39c12,#e67e22)'
                    : `linear-gradient(90deg,${ACCENT},#00e5cc)`,
                  transition: 'width 1s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                  {p.toFixed(0)}%
                  {item.size > 0 && ` · ${fmtSize(item.size - item.sizeleft)} / ${fmtSize(item.size)}`}
                </span>
                {isWarn && <span style={{ fontSize: '0.67rem', color: '#f39c12' }}>⚠ Warning</span>}
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
  items: SonarrCalendarItem[]
  library: SonarrSeries[]
  onSelect: (s: SonarrSeries) => void
}) {
  if (items.length === 0) return (
    <div className="not-connected">
      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Nothing airing soon</span>
    </div>
  )

  return (
    <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
      {items.map(item => {
        const libSeries = library.find(s => s.id === item.series?.id)
        const poster = libSeries ? sonarrImageUrl(libSeries, 'poster') : undefined
        const epCode = `S${String(item.seasonNumber).padStart(2,'0')}E${String(item.episodeNumber).padStart(2,'0')}`

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => libSeries && onSelect(libSeries)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '6px 4px',
              background: 'transparent', border: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              cursor: libSeries ? 'pointer' : 'default',
              fontFamily: 'inherit', textAlign: 'left',
            }}
          >
            {poster ? (
              <img src={poster} alt="" style={{ width: 30, height: 45, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
            ) : (
              <div style={{
                width: 30, height: 45, borderRadius: 3, flexShrink: 0,
                background: 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem',
              }}>📺</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.78rem', color: 'var(--text-secondary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {item.series?.title ?? item.title}
              </div>
              <div style={{ fontSize: '0.69rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {epCode}{item.title ? ` · ${item.title}` : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '0.72rem', color: item.hasFile ? 'var(--accent-2)' : ACCENT }}>
                {airDay(item.airDateUtc)}
              </div>
              {item.hasFile && <div style={{ fontSize: '0.65rem', color: 'var(--accent-2)', marginTop: 1 }}>✓</div>}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Main tile ─────────────────────────────────────────────────────────────────

type Tab = 'library' | 'queue' | 'upcoming' | 'missing'

export default function SonarrTile() {
  const { isConfigured } = useConfigStore()
  const {
    queue, calendar, totalRecords,
    library, qualityProfiles,
    loading, libraryLoading, error,
    fetchLibrary,
    toggleMonitored, setQualityProfile,
    searchSeries, refreshSeries, deleteSeries,
    fetchCredits, getServiceUrl,
  } = useSonarr()

  const [tab, setTab] = useState<Tab>('upcoming')
  const [selectedSeries, setSelectedSeries] = useState<SonarrSeries | null>(null)
  const [libraryFetched, setLibraryFetched] = useState(false)
  const configured = isConfigured('sonarr')

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

  const missingCount = library.filter(s =>
    s.monitored && s.statistics &&
    s.statistics.episodeFileCount < s.statistics.totalEpisodeCount
  ).length

  const tabBtn = (t: Tab, label: string, badge?: number) => (
    <button
      type="button"
      onClick={() => {
        setTab(t)
        if (t === 'library' || t === 'missing') activateLibrary()
      }}
      style={{
        flex: 1, padding: '5px 2px', borderRadius: 6, border: 'none',
        background: tab === t ? `rgba(53,197,244,0.12)` : 'transparent',
        color: tab === t ? ACCENT : 'var(--text-muted)',
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
          background: ACCENT, color: '#000', borderRadius: 10,
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
        id="sonarr"
        label="Sonarr"
        color={ACCENT}
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
                  library={library}
                  qualityProfiles={qualityProfiles}
                  loading={libraryLoading}
                  onSelect={setSelectedSeries}
                />
              )}
              {tab === 'queue' && (
                <QueueTab
                  items={queue}
                  library={library}
                  onSelect={setSelectedSeries}
                />
              )}
              {tab === 'upcoming' && (
                <UpcomingTab
                  items={calendar}
                  library={library}
                  onSelect={setSelectedSeries}
                />
              )}
              {tab === 'missing' && (
                <MissingTab
                  library={library}
                  qualityProfiles={qualityProfiles}
                  loading={libraryLoading}
                  onSelect={setSelectedSeries}
                />
              )}
            </div>
          </div>
        )}
      </TileWrapper>

      {selectedSeries && (
        <SonarrDetailModal
          series={selectedSeries}
          qualityProfiles={qualityProfiles}
          onClose={() => setSelectedSeries(null)}
          onToggleMonitored={async (s) => { await toggleMonitored(s); setSelectedSeries(prev => prev?.id === s.id ? { ...prev, monitored: !prev.monitored } : prev) }}
          onSetQualityProfile={async (s, pid) => { await setQualityProfile(s, pid); setSelectedSeries(prev => prev?.id === s.id ? { ...prev, qualityProfileId: pid } : prev) }}
          onSearch={searchSeries}
          onRefresh={refreshSeries}
          onDelete={async (id, deleteFiles) => { await deleteSeries(id, deleteFiles); setSelectedSeries(null) }}
          fetchCredits={fetchCredits}
          serviceUrl={getServiceUrl()}
        />
      )}
    </>
  )
}
