import { useState, useEffect, useCallback } from 'react'
import TileWrapper from '@/components/TileWrapper'
import { useTautulli, tautulliThumbUrl } from '@/hooks/useTautulli'
import useConfigStore from '@/store/useConfigStore'
import type {
  TautulliSession, TautulliUser, TautulliHistoryItem,
  TautulliStat, TautulliGraphData,
} from '@/hooks/useTautulli'

const ACCENT = '#f5a623'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(seconds: number) {
  if (!seconds) return ''
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0)  return `${d}d ${h}h`
  if (h > 0)  return `${h}h ${m}m`
  return `${m}m`
}

function timeAgo(unixTs: number) {
  const diff = Math.floor(Date.now() / 1000) - unixTs
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(unixTs * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase()
}

// Stable color from a string
function avatarColor(name: string) {
  const colors = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#1abc9c','#3498db','#9b59b6','#e91e63']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return colors[Math.abs(h) % colors.length]
}

// ── SVG Charts ────────────────────────────────────────────────────────────────

const CHART_COLORS: Record<string, string> = {
  TV: '#35c5f4', Movies: '#ffc230', Music: '#2ecc71', Total: 'rgba(255,255,255,0.35)',
}

function Legend({ series }: { series: string[] }) {
  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 4 }}>
      {series.map(name => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS[name] ?? '#888' }} />
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{name}</span>
        </div>
      ))}
    </div>
  )
}

function LineChart({ data }: { data: TautulliGraphData }) {
  const W = 340, H = 110
  const PAD = { t: 10, r: 8, b: 26, l: 26 }
  const cW = W - PAD.l - PAD.r
  const cH = H - PAD.t - PAD.b
  const n = data.categories.length
  if (n < 2) return null

  const allVals = data.series.flatMap(s => s.data)
  const maxY = Math.max(...allVals, 1)

  const px = (i: number) => PAD.l + (i / (n - 1)) * cW
  const py = (v: number) => PAD.t + cH - (v / maxY) * cH

  const gridVals = [0.5, 1.0].map(f => Math.round(f * maxY))
  const step = Math.max(1, Math.ceil(n / 6))
  const xLabels = data.categories
    .map((c, i) => ({ label: c.slice(5), i }))
    .filter((_, i) => i % step === 0 || i === n - 1)

  const nonTotal = data.series.filter(s => s.name !== 'Total')
  const totalSeries = data.series.find(s => s.name === 'Total')

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        {/* Grid */}
        {gridVals.map(v => (
          <line key={v} x1={PAD.l} y1={py(v)} x2={PAD.l + cW} y2={py(v)}
            stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        ))}
        {gridVals.map(v => (
          <text key={v} x={PAD.l - 4} y={py(v) + 3}
            textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={7}>{v}</text>
        ))}
        {/* Colored lines */}
        {nonTotal.map(s => (
          <polyline key={s.name}
            points={s.data.map((v, i) => `${px(i)},${py(v)}`).join(' ')}
            fill="none" stroke={CHART_COLORS[s.name] ?? '#888'}
            strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {/* Total as dashed */}
        {totalSeries && (
          <polyline
            points={totalSeries.data.map((v, i) => `${px(i)},${py(v)}`).join(' ')}
            fill="none" stroke={CHART_COLORS['Total']}
            strokeWidth={1.5} strokeDasharray="3 2" strokeLinecap="round" />
        )}
        {/* X labels */}
        {xLabels.map(({ label, i }) => (
          <text key={i} x={px(i)} y={H - 4}
            textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize={7}>{label}</text>
        ))}
      </svg>
      <Legend series={[...nonTotal.map(s => s.name), ...(totalSeries ? ['Total'] : [])]} />
    </div>
  )
}

function StackedBarChart({ data, shortenLabel }: { data: TautulliGraphData; shortenLabel?: boolean }) {
  const W = 340, H = 110
  const PAD = { t: 10, r: 8, b: 26, l: 26 }
  const cW = W - PAD.l - PAD.r
  const cH = H - PAD.t - PAD.b
  const bottom = PAD.t + cH

  const n = data.categories.length
  const tv  = data.series.find(s => s.name === 'TV')?.data     ?? []
  const mov = data.series.find(s => s.name === 'Movies')?.data ?? []
  const mus = data.series.find(s => s.name === 'Music')?.data  ?? []

  const totals = data.categories.map((_, i) => (tv[i] ?? 0) + (mov[i] ?? 0) + (mus[i] ?? 0))
  const maxY = Math.max(...totals, 1)
  const scaleH = (v: number) => (v / maxY) * cH

  const barW = (cW / n) * 0.65
  const barX = (i: number) => PAD.l + i * (cW / n) + ((cW / n) - barW) / 2

  const gridTop = Math.round(maxY)
  const gridMid = Math.round(maxY / 2)

  const legendItems = ['TV', 'Movies', 'Music'].filter((_, k) =>
    [tv, mov, mus][k].some(v => v > 0)
  )

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        {/* Grid */}
        {[gridMid, gridTop].map((v, gi) => (
          <g key={gi}>
            <line x1={PAD.l} y1={bottom - scaleH(v)} x2={PAD.l + cW} y2={bottom - scaleH(v)}
              stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <text x={PAD.l - 4} y={bottom - scaleH(v) + 3}
              textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={7}>{v}</text>
          </g>
        ))}
        {/* Bars */}
        {data.categories.map((cat, i) => {
          const tvH  = scaleH(tv[i]  ?? 0)
          const movH = scaleH(mov[i] ?? 0)
          const musH = scaleH(mus[i] ?? 0)
          const bx = barX(i)
          const label = shortenLabel
            ? cat.slice(0, 3)
            : cat.length > 7 ? cat.slice(0, 7) : cat

          return (
            <g key={i}>
              {tvH  > 0 && <rect x={bx} y={bottom - tvH - movH - musH} width={barW} height={tvH}  fill="#35c5f4" rx={1} />}
              {movH > 0 && <rect x={bx} y={bottom - movH - musH}        width={barW} height={movH} fill="#ffc230" rx={1} />}
              {musH > 0 && <rect x={bx} y={bottom - musH}               width={barW} height={musH} fill="#2ecc71" rx={1} />}
              <text x={bx + barW / 2} y={H - 4}
                textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize={7}>{label}</text>
            </g>
          )
        })}
      </svg>
      <Legend series={legendItems} />
    </div>
  )
}

// ── Activity tab ──────────────────────────────────────────────────────────────

function ActivityTab({ sessions, streamCount }: { sessions: TautulliSession[]; streamCount: number }) {
  if (sessions.length === 0) {
    return (
      <div className="not-connected" style={{ flex: 1 }}>
        <span style={{ fontSize: '2rem', opacity: 0.2 }}>▭</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No active streams</span>
      </div>
    )
  }

  return (
    <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
      {streamCount > 0 && (
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8 }}>
          {streamCount} active stream{streamCount !== 1 ? 's' : ''}
        </div>
      )}
      {sessions.map((s, i) => {
        const pct = Math.min(100, Math.max(0, parseInt(s.progress_percent ?? '0')))
        const isPlaying  = s.state === 'playing'
        const isPaused   = s.state === 'paused'
        const stateColor = isPlaying ? '#2ecc71' : isPaused ? '#f39c12' : 'var(--accent-1)'
        const title    = s.media_type === 'episode' ? s.grandparent_title : s.title
        const subtitle = s.media_type === 'episode' ? s.title : s.player
        const thumb    = s.grandparent_thumb || s.thumb
        const thumbSrc = thumb ? tautulliThumbUrl(thumb, 80, 120) : undefined

        return (
          <div key={i} style={{
            display: 'flex', gap: 9, marginBottom: 12,
            paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            {thumbSrc && (
              <img src={thumbSrc} alt="" style={{
                width: 38, height: 57, objectFit: 'cover', borderRadius: 4, flexShrink: 0,
              }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{
                  fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%',
                }}>{title}</span>
                <span style={{ fontSize: '0.68rem', color: stateColor, flexShrink: 0, textTransform: 'capitalize' }}>
                  {s.state}
                </span>
              </div>
              <div style={{ fontSize: '0.69rem', color: 'var(--text-muted)', marginBottom: 5 }}>
                {subtitle} · {s.friendly_name || s.user}
                {s.quality_profile && ` · ${s.quality_profile}`}
              </div>
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)' }}>
                <div style={{
                  height: '100%', width: `${pct}%`, borderRadius: 2,
                  background: `linear-gradient(90deg,${ACCENT},#ffd166)`,
                  opacity: isPaused ? 0.5 : 1, transition: 'width 2s ease',
                }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Users tab ─────────────────────────────────────────────────────────────────

type UserSort = 'name' | 'last_seen' | 'plays' | 'time'

function UsersTab({ users, loading }: { users: TautulliUser[]; loading: boolean }) {
  const [sort, setSort] = useState<UserSort>('last_seen')
  const [showSort, setShowSort] = useState(false)

  const sorted = [...users].sort((a, b) => {
    if (sort === 'name')      return (a.friendly_name || a.username).localeCompare(b.friendly_name || b.username)
    if (sort === 'last_seen') return b.last_seen - a.last_seen
    if (sort === 'plays')     return b.plays - a.plays
    if (sort === 'time')      return b.duration - a.duration
    return 0
  })

  const sortLabels: Record<UserSort, string> = { name: 'Name', last_seen: 'Last Seen', plays: 'Plays', time: 'Time' }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Loading users…</span>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{users.length} Users</span>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowSort(v => !v)}
            style={{
              padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)',
              fontSize: '0.72rem', fontFamily: 'inherit', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            Sort: {sortLabels[sort]} ▾
          </button>
          {showSort && (
            <div style={{
              position: 'absolute', right: 0, top: '110%', zIndex: 10,
              background: '#0d1b2a', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '4px 0', minWidth: 120,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}>
              {(Object.keys(sortLabels) as UserSort[]).map(k => (
                <button key={k} onClick={() => { setSort(k); setShowSort(false) }} style={{
                  display: 'block', width: '100%', padding: '7px 14px',
                  background: sort === k ? `rgba(245,166,35,0.1)` : 'transparent',
                  border: 'none', cursor: 'pointer', color: sort === k ? ACCENT : 'var(--text-secondary)',
                  fontSize: '0.75rem', fontFamily: 'inherit', textAlign: 'left',
                }}>{sortLabels[k]}</button>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* List */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {sorted.map(user => {
          const name = user.friendly_name || user.username
          const bg = avatarColor(name)
          return (
            <div key={user.user_id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              {/* Avatar */}
              {user.user_thumb ? (
                <img src={user.user_thumb} alt={name} style={{
                  width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
                }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              ) : (
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', fontWeight: 700, color: '#fff',
                }}>{initials(name)}</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{name}</div>
                <div style={{
                  fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {user.last_seen ? timeAgo(user.last_seen) : '—'}
                  {user.last_played ? ` · ${user.last_played}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '0.72rem', color: ACCENT, fontWeight: 600 }}>
                  {user.plays.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  {fmtDuration(user.duration)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── History tab ───────────────────────────────────────────────────────────────

function HistoryTab({ history, loading }: { history: TautulliHistoryItem[]; loading: boolean }) {
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Loading history…</span>
    </div>
  )

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {history.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', paddingTop: 20 }}>No history</div>
      )}
      {history.map(item => {
        const isFinished = item.watched_status === 1
        const title    = item.grandparent_title ? item.grandparent_title : item.title
        const subtitle = item.grandparent_title ? item.title : ''
        const thumbSrc = item.thumb ? tautulliThumbUrl(item.thumb, 120, 180) : undefined
        const name = item.friendly_name || item.user
        const userBg = avatarColor(name)

        return (
          <div key={item.row_id} style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '6px 0',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            position: 'relative',
          }}>
            {/* Thumb */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {thumbSrc ? (
                <img src={thumbSrc} alt="" style={{
                  width: 38, height: 57, objectFit: 'cover', borderRadius: 4, display: 'block',
                }} />
              ) : (
                <div style={{
                  width: 38, height: 57, borderRadius: 4,
                  background: 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', color: 'rgba(255,255,255,0.2)',
                }}>🎬</div>
              )}
              {/* Status bar at bottom of thumb */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: '0 0 4px 4px',
                background: isFinished ? '#2ecc71' : '#f39c12',
              }} />
            </div>
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{title}{item.year ? ` (${item.year})` : ''}</div>
              {subtitle && (
                <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {subtitle}
                </div>
              )}
              <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {timeAgo(item.date)} · {isFinished ? '✓ Finished' : '⏸ Incomplete'}
              </div>
            </div>
            {/* User avatar */}
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: userBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.72rem', fontWeight: 700, color: '#fff',
            }}>{initials(name)}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── Stats tab ─────────────────────────────────────────────────────────────────

const STAT_LABELS: Record<string, string> = {
  top_movies:    'Most Watched Movies',
  popular_movies:'Most Popular Movies',
  top_tv:        'Most Watched TV Shows',
  popular_tv:    'Most Popular TV Shows',
  top_users:     'Top Users',
  top_music:     'Most Played Music',
}
const STAT_COL: Record<string, string> = {
  top_movies: 'Plays', popular_movies: 'Users',
  top_tv: 'Plays', popular_tv: 'Users', top_users: 'Plays', top_music: 'Plays',
}

const TIME_RANGES = [
  { label: 'Week', value: 7 },
  { label: 'Month', value: 30 },
  { label: 'Year', value: 365 },
  { label: 'All-time', value: 0 },
]

function StatCard({ stat }: { stat: TautulliStat }) {
  const rows = stat.rows.slice(0, 5)
  if (rows.length === 0) return null
  const top = rows[0]
  const topThumb = top.thumb ? tautulliThumbUrl(top.thumb, 120, 180) : undefined
  const colLabel = STAT_COL[stat.stat_id] ?? 'Plays'

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 8, padding: '10px 12px', marginBottom: 10,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em',
        color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8,
      }}>
        <span>{STAT_LABELS[stat.stat_id] ?? stat.stat_id}</span>
        <span>{colLabel}</span>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {topThumb && (
          <img src={topThumb} alt="" style={{
            width: 44, height: 66, objectFit: 'cover', borderRadius: 4, flexShrink: 0,
          }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {rows.map((row, i) => {
            const label = stat.stat_id === 'top_users'
              ? (row.friendly_name || row.user || row.title)
              : (row.grandparent_title || row.title)
            const count = colLabel === 'Users' ? (row.users_watched ?? row.total_plays) : row.total_plays
            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '2px 0', borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', width: 12, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{
                    fontSize: i === 0 ? '0.77rem' : '0.72rem',
                    fontWeight: i === 0 ? 600 : 400,
                    color: i === 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{label}</span>
                </div>
                <span style={{
                  fontSize: '0.72rem', fontWeight: i === 0 ? 700 : 400,
                  color: i === 0 ? ACCENT : 'var(--text-muted)', flexShrink: 0, marginLeft: 6,
                }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatsTab({
  stats, loading, timeRange, onTimeRangeChange,
}: {
  stats: TautulliStat[]
  loading: boolean
  timeRange: number
  onTimeRangeChange: (v: number) => void
}) {
  const [showDropdown, setShowDropdown] = useState(false)
  const currentLabel = TIME_RANGES.find(t => t.value === timeRange)?.label ?? 'Month'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Watch Statistics</span>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowDropdown(v => !v)}
            style={{
              padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)',
              fontSize: '0.72rem', fontFamily: 'inherit', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >Last {currentLabel} ▾</button>
          {showDropdown && (
            <div style={{
              position: 'absolute', right: 0, top: '110%', zIndex: 10,
              background: '#0d1b2a', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '4px 0', minWidth: 110,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}>
              {TIME_RANGES.map(t => (
                <button key={t.value} onClick={() => { onTimeRangeChange(t.value); setShowDropdown(false) }} style={{
                  display: 'block', width: '100%', padding: '7px 14px',
                  background: timeRange === t.value ? `rgba(245,166,35,0.1)` : 'transparent',
                  border: 'none', cursor: 'pointer',
                  color: timeRange === t.value ? ACCENT : 'var(--text-secondary)',
                  fontSize: '0.75rem', fontFamily: 'inherit', textAlign: 'left',
                }}>{t.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Loading stats…</span>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {stats.map(s => <StatCard key={s.stat_id} stat={s} />)}
        </div>
      )}
    </div>
  )
}

// ── Graphs tab ────────────────────────────────────────────────────────────────

function GraphsTab({
  byDay, byMonth, byDow, loading,
}: {
  byDay: TautulliGraphData | null
  byMonth: TautulliGraphData | null
  byDow: TautulliGraphData | null
  loading: boolean
}) {
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Loading graphs…</span>
    </div>
  )

  const sectionTitle = (title: string, sub: string) => (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{title}</div>
      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  )

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {byDay && (
        <div style={{ marginBottom: 16 }}>
          {sectionTitle('Plays by Day', 'Past 30 days')}
          <LineChart data={byDay} />
        </div>
      )}
      {byMonth && (
        <div style={{ marginBottom: 16 }}>
          {sectionTitle('Plays by Month', 'Past 6 months')}
          <StackedBarChart data={byMonth} />
        </div>
      )}
      {byDow && (
        <div style={{ marginBottom: 16 }}>
          {sectionTitle('Plays by Day of Week', 'Past 30 days')}
          <StackedBarChart data={byDow} shortenLabel />
        </div>
      )}
      {!byDay && !byMonth && !byDow && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', paddingTop: 20 }}>
          No graph data available
        </div>
      )}
    </div>
  )
}

// ── Main tile ─────────────────────────────────────────────────────────────────

type Tab = 'activity' | 'users' | 'history' | 'stats' | 'graphs'

export default function TautulliTile() {
  const { isConfigured } = useConfigStore()
  const {
    sessions, streamCount, loading, error,
    users, usersLoading,
    history, historyLoading,
    stats, statsLoading,
    graphsByDay, graphsByMonth, graphsByDow, graphsLoading,
    fetchUsers, fetchHistory, fetchStats, fetchGraphs,
  } = useTautulli()

  const [tab, setTab] = useState<Tab>('activity')
  const [timeRange, setTimeRange] = useState(30)
  const [fetchedTabs, setFetchedTabs] = useState<Set<string>>(new Set())
  const configured = isConfigured('tautulli')

  const activateTab = useCallback((t: Tab) => {
    setTab(t)
    if (fetchedTabs.has(t)) return
    setFetchedTabs(prev => new Set([...prev, t]))
    if (t === 'users')   fetchUsers()
    if (t === 'history') fetchHistory()
    if (t === 'stats')   fetchStats(timeRange)
    if (t === 'graphs')  fetchGraphs()
  }, [fetchedTabs, fetchUsers, fetchHistory, fetchStats, fetchGraphs, timeRange])

  const handleTimeRangeChange = useCallback((v: number) => {
    setTimeRange(v)
    fetchStats(v === 0 ? 36500 : v)
  }, [fetchStats])

  // Prefetch stats on mount so they're ready when user clicks the tab
  useEffect(() => {
    if (configured && !fetchedTabs.has('stats')) {
      setFetchedTabs(prev => new Set([...prev, 'stats']))
      fetchStats(timeRange)
    }
  }, [configured]) // eslint-disable-line react-hooks/exhaustive-deps

  const tabBtn = (t: Tab, label: string, badge?: number) => (
    <button
      type="button"
      onClick={() => activateTab(t)}
      style={{
        flex: 1, padding: '5px 2px', borderRadius: 6, border: 'none',
        background: tab === t ? `rgba(245,166,35,0.12)` : 'transparent',
        color: tab === t ? ACCENT : 'var(--text-muted)',
        fontSize: '0.68rem', fontWeight: tab === t ? 600 : 400,
        cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
        transition: 'background 0.15s, color 0.15s', whiteSpace: 'nowrap',
      }}
    >
      {label}
      {!!badge && (
        <span style={{
          background: ACCENT, color: '#000', borderRadius: 10,
          padding: '0 4px', fontSize: '0.6rem', fontWeight: 700, lineHeight: '15px',
        }}>{badge}</span>
      )}
    </button>
  )

  return (
    <TileWrapper
      id="tautulli"
      label="Tautulli"
      color={ACCENT}
      status={!configured ? 'idle' : error ? 'down' : streamCount > 0 ? 'up' : 'idle'}
    >
      {!configured ? (
        <div className="not-connected">
          <span className="icon">📊</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Tautulli not connected</span>
          <span>Configure URL and API key in Settings</span>
        </div>
      ) : loading && sessions.length === 0 && stats.length === 0 ? (
        <div className="not-connected">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Connecting…</span>
        </div>
      ) : error ? (
        <div className="not-connected">
          <span className="icon" style={{ fontSize: '1rem' }}>⚠️</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Connection failed</span>
          <span style={{ fontSize: '0.72rem' }}>{error}</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 10, flexShrink: 0 }}>
            {tabBtn('activity', 'Activity', streamCount || undefined)}
            {tabBtn('users',    'Users')}
            {tabBtn('history',  'History')}
            {tabBtn('stats',    'Stats')}
            {tabBtn('graphs',   'Graphs')}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {tab === 'activity' && <ActivityTab sessions={sessions} streamCount={streamCount} />}
            {tab === 'users'    && <UsersTab users={users} loading={usersLoading} />}
            {tab === 'history'  && <HistoryTab history={history} loading={historyLoading} />}
            {tab === 'stats'    && (
              <StatsTab
                stats={stats} loading={statsLoading}
                timeRange={timeRange} onTimeRangeChange={handleTimeRangeChange}
              />
            )}
            {tab === 'graphs'   && (
              <GraphsTab byDay={graphsByDay} byMonth={graphsByMonth} byDow={graphsByDow} loading={graphsLoading} />
            )}
          </div>
        </div>
      )}
    </TileWrapper>
  )
}
