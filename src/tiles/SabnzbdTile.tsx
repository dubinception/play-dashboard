import TileWrapper from '@/components/TileWrapper'
import { useSabnzbd } from '@/hooks/useSabnzbd'
import useConfigStore from '@/store/useConfigStore'
import type { SabSlot } from '@/hooks/useSabnzbd'

function statusToDot(status: string): 'up' | 'down' | 'warn' | 'idle' {
  switch (status?.toLowerCase()) {
    case 'downloading': return 'up'
    case 'paused':      return 'warn'
    default:            return 'idle'
  }
}

function SlotRow({ slot }: { slot: SabSlot }) {
  const pct = Math.min(100, Math.max(0, parseFloat(slot.percentage) || 0))
  const isPaused = slot.status === 'Paused'
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
        <span style={{
          fontSize: '0.78rem', color: 'var(--text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: '65%',
        }}>
          {slot.filename}
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
          {slot.sizeleft} left
        </span>
      </div>
      <div style={{
        height: '4px', borderRadius: '2px',
        background: 'rgba(255,255,255,0.07)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          borderRadius: '2px',
          background: isPaused
            ? 'linear-gradient(90deg, var(--accent-2), #00aaff)'
            : 'linear-gradient(90deg, #00aaff, var(--accent-2))',
          transition: 'width 1s ease',
          opacity: isPaused ? 0.5 : 1,
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{pct.toFixed(0)}%</span>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{slot.timeleft}</span>
      </div>
    </div>
  )
}

export default function SabnzbdTile() {
  const { isConfigured } = useConfigStore()
  const { queue, loading, error, pause, resume, deleteAll } = useSabnzbd()
  const configured = isConfigured('sabnzbd')

  const isPaused = queue?.status === 'Paused'
  const isDownloading = queue?.status === 'Downloading'

  const speedLabel = isDownloading && queue?.speed ? queue.speed : null

  const actions = speedLabel ? (
    <span style={{
      marginLeft: 'auto', marginRight: '8px',
      fontSize: '0.72rem', color: 'var(--accent-2)',
      fontVariantNumeric: 'tabular-nums',
    }}>
      {speedLabel}
    </span>
  ) : undefined

  return (
    <TileWrapper
      id="sabnzbd"
      label="SABnzbd"
      color="#f39c12"
      status={queue ? statusToDot(queue.status) : 'idle'}
      actions={actions}
    >
      {/* Controls */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        <button
          onClick={() => isPaused ? resume() : pause()}
          disabled={!configured || !queue}
          style={{
            flex: 1, padding: '6px', borderRadius: '6px',
            border: '1px solid var(--border)',
            background: isPaused ? 'rgba(0,229,160,0.08)' : 'transparent',
            color: configured && queue ? (isPaused ? 'var(--accent-2)' : 'var(--text-secondary)') : 'var(--text-muted)',
            fontSize: '0.75rem', cursor: configured && queue ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', transition: 'all 150ms ease',
          }}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button
          onClick={deleteAll}
          disabled={!configured || !queue || queue.slots.length === 0}
          style={{
            flex: 1, padding: '6px', borderRadius: '6px',
            border: '1px solid var(--border)', background: 'transparent',
            color: configured && queue && queue.slots.length > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
            fontSize: '0.75rem', cursor: configured && queue && queue.slots.length > 0 ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
          }}
        >
          Clear
        </button>
      </div>

      {/* Body */}
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
      ) : queue && queue.slots.length === 0 ? (
        <div className="not-connected">
          <span className="icon" style={{ fontSize: '1.1rem' }}>✓</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Queue empty</span>
          {isPaused && <span style={{ fontSize: '0.75rem', color: 'var(--accent-2)' }}>Paused</span>}
        </div>
      ) : queue ? (
        <>
          {/* Queue summary */}
          <div style={{
            display: 'flex', gap: '16px', marginBottom: '12px',
            padding: '8px 10px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
          }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Items</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {queue.noofslots_total}
              </div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Remaining</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {queue.sizeleft}
              </div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>ETA</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {queue.timeleft || '—'}
              </div>
            </div>
          </div>

          {/* Slots */}
          <div style={{ overflowY: 'auto', maxHeight: '180px' }}>
            {queue.slots.map((slot) => (
              <SlotRow key={slot.nzo_id} slot={slot} />
            ))}
          </div>
        </>
      ) : null}
    </TileWrapper>
  )
}
