import { useState } from 'react'
import TileWrapper from '@/components/TileWrapper'
import { useSabnzbd } from '@/hooks/useSabnzbd'
import useConfigStore from '@/store/useConfigStore'
import type { SabSlot, SabHistorySlot } from '@/hooks/useSabnzbd'

const ACCENT = '#f39c12'

function statusToDot(status: string): 'up' | 'down' | 'warn' | 'idle' {
  switch (status?.toLowerCase()) {
    case 'downloading': return 'up'
    case 'paused':      return 'warn'
    default:            return 'idle'
  }
}

function relTime(unixSec: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSec
  if (diff < 60)        return 'just now'
  if (diff < 3600)      return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)     return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`
  return new Date(unixSec * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── Queue slot row ────────────────────────────────────────────────────────────

function SlotRow({ slot }: { slot: SabSlot }) {
  const pct      = Math.min(100, Math.max(0, parseFloat(slot.percentage) || 0))
  const isPaused = slot.status === 'Paused'
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{
          fontSize: '0.78rem', color: 'var(--text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%',
        }}>
          {slot.filename}
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
          {slot.sizeleft} left
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 2,
          background: isPaused
            ? 'linear-gradient(90deg, var(--accent-2), #00aaff)'
            : 'linear-gradient(90deg, #00aaff, var(--accent-2))',
          transition: 'width 1s ease', opacity: isPaused ? 0.5 : 1,
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{pct.toFixed(0)}%</span>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{slot.timeleft}</span>
      </div>
    </div>
  )
}

// ── History item row ──────────────────────────────────────────────────────────

function HistoryRow({ item }: { item: SabHistorySlot }) {
  const isComplete = item.status === 'Completed'
  const isFailed   = item.status === 'Failed'

  const statusColor = isComplete ? '#00e5a0' : isFailed ? '#e74c3c' : ACCENT
  const statusIcon  = isComplete ? '✓' : isFailed ? '✕' : '↻'

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      {/* Status icon */}
      <div style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        background: `${statusColor}18`, border: `1px solid ${statusColor}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.65rem', color: statusColor, fontWeight: 700, marginTop: 1,
      }}>{statusIcon}</div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.76rem', color: 'var(--text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}>{item.name}</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 2, alignItems: 'center' }}>
          {item.category && item.category !== '*' && (
            <span style={{
              fontSize: '0.6rem', padding: '1px 5px', borderRadius: 4,
              background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}33`,
            }}>{item.category}</span>
          )}
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.size}</span>
          {isFailed && item.fail_message && (
            <span style={{ fontSize: '0.62rem', color: '#e74c3c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.fail_message}
            </span>
          )}
        </div>
      </div>

      {/* Time */}
      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }}>
        {item.completed ? relTime(item.completed) : ''}
      </span>
    </div>
  )
}

// ── Main tile ─────────────────────────────────────────────────────────────────

type Tab = 'history' | 'queue'

export default function SabnzbdTile() {
  const { isConfigured } = useConfigStore()
  const { queue, history, historyLoading, loading, error, pause, resume, deleteAll } = useSabnzbd()
  const [tab, setTab] = useState<Tab>('history')
  const configured = isConfigured('sabnzbd')

  const isPaused      = queue?.status === 'Paused'
  const isDownloading = queue?.status === 'Downloading'
  const queueCount    = queue?.noofslots_total ?? 0
  const speedLabel    = isDownloading && queue?.speed ? queue.speed : null

  // Speed shown in tile header via actions prop
  const actions = speedLabel ? (
    <span style={{
      marginLeft: 'auto', marginRight: 8,
      fontSize: '0.72rem', color: 'var(--accent-2)',
      fontVariantNumeric: 'tabular-nums',
    }}>
      {speedLabel}
    </span>
  ) : undefined

  const tabBtn = (t: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(t)}
      style={{
        flex: 1, padding: '5px 2px', borderRadius: 6, border: 'none',
        background: tab === t ? `rgba(243,156,18,0.12)` : 'transparent',
        color: tab === t ? ACCENT : 'var(--text-muted)',
        fontSize: '0.72rem', fontWeight: tab === t ? 600 : 400,
        cursor: 'pointer', fontFamily: 'inherit',
        transition: 'background 0.15s, color 0.15s',
      }}
    >{label}</button>
  )

  return (
    <TileWrapper
      id="sabnzbd"
      label="SABnzbd"
      color={ACCENT}
      status={queue ? statusToDot(queue.status) : 'idle'}
      actions={actions}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Controls row */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexShrink: 0 }}>
          {/* Pause / Resume with queue count badge */}
          <button
            onClick={() => isPaused ? resume() : pause()}
            disabled={!configured || !queue}
            style={{
              flex: 1, padding: '6px 10px', borderRadius: 6,
              border: '1px solid var(--border)',
              background: isPaused ? 'rgba(0,229,160,0.08)' : 'transparent',
              color: configured && queue ? (isPaused ? 'var(--accent-2)' : 'var(--text-secondary)') : 'var(--text-muted)',
              fontSize: '0.75rem', cursor: configured && queue ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit', transition: 'all 150ms ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {isPaused ? 'Resume' : 'Pause'}
            {queueCount > 0 && (
              <span style={{
                background: isDownloading ? ACCENT : 'rgba(255,255,255,0.15)',
                color: isDownloading ? '#000' : 'var(--text-muted)',
                borderRadius: 10, padding: '0 6px',
                fontSize: '0.62rem', fontWeight: 700, lineHeight: '16px',
              }}>{queueCount}</span>
            )}
          </button>

          <button
            onClick={deleteAll}
            disabled={!configured || !queue || queueCount === 0}
            style={{
              flex: 1, padding: '6px', borderRadius: 6,
              border: '1px solid var(--border)', background: 'transparent',
              color: configured && queue && queueCount > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
              fontSize: '0.75rem', cursor: configured && queue && queueCount > 0 ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
          >
            Clear Queue
          </button>
        </div>

        {!configured ? (
          <div className="not-connected">
            <span className="icon">⬇️</span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>SABnzbd not connected</span>
            <span>Configure API key in Settings</span>
          </div>
        ) : loading && !queue ? (
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
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2, marginBottom: 10, flexShrink: 0 }}>
              {tabBtn('history', 'History')}
              {tabBtn('queue', `Queue${queueCount > 0 ? ` (${queueCount})` : ''}`)}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>

              {/* ── History tab ── */}
              {tab === 'history' && (
                historyLoading && history.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', paddingTop: 8 }}>Loading history…</div>
                ) : history.length === 0 ? (
                  <div className="not-connected" style={{ paddingTop: 12 }}>
                    <span className="icon" style={{ fontSize: '1rem' }}>📭</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>No history yet</span>
                  </div>
                ) : (
                  history.map(item => <HistoryRow key={item.nzo_id} item={item} />)
                )
              )}

              {/* ── Queue tab ── */}
              {tab === 'queue' && (
                !queue || queueCount === 0 ? (
                  <div className="not-connected" style={{ paddingTop: 12 }}>
                    <span className="icon" style={{ fontSize: '1.1rem' }}>✓</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Queue empty</span>
                    {isPaused && <span style={{ fontSize: '0.75rem', color: 'var(--accent-2)' }}>Paused</span>}
                  </div>
                ) : (
                  <>
                    {/* Queue summary bar */}
                    <div style={{
                      display: 'flex', gap: 16, marginBottom: 12,
                      padding: '8px 10px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border)',
                      flexShrink: 0,
                    }}>
                      {[
                        { label: 'Items',     value: queue!.noofslots_total },
                        { label: 'Remaining', value: queue!.sizeleft },
                        { label: 'ETA',       value: queue!.timeleft || '—' },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ textAlign: 'center', flex: 1 }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
                        </div>
                      ))}
                    </div>
                    {queue!.slots.map(slot => <SlotRow key={slot.nzo_id} slot={slot} />)}
                  </>
                )
              )}

            </div>
          </>
        )}
      </div>
    </TileWrapper>
  )
}
