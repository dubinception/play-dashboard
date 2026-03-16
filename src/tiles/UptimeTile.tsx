import { useState } from 'react'
import TileWrapper from '@/components/TileWrapper'
import { useUptimeMonitor } from '@/hooks/useUptimeMonitor'
import { useStatusStore, calcUptime, buildTimeline } from '@/store/useStatusStore'
import useConfigStore from '@/store/useConfigStore'
import type { UptimeStatus } from '@/store/useStatusStore'

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCENT = '#00e5a0'

const STATUS_COLOR: Record<string, string> = {
  up:      '#00e5a0',
  slow:    '#f39c12',
  down:    '#e74c3c',
  unknown: 'rgba(255,255,255,0.15)',
}

const STATUS_LABEL: Record<string, string> = {
  up:      'UP',
  slow:    'SLOW',
  down:    'DOWN',
  unknown: '—',
}

const TIMEFRAMES = [
  { label: '24h', ms: 24 * 60 * 60 * 1000,        buckets: 48 },
  { label: '7d',  ms: 7  * 24 * 60 * 60 * 1000,   buckets: 84 },
  { label: '30d', ms: 30 * 24 * 60 * 60 * 1000,   buckets: 90 },
]

const SERVICES = [
  { id: 'plex',      label: 'Plex' },
  { id: 'sonarr',    label: 'Sonarr' },
  { id: 'radarr',    label: 'Radarr' },
  { id: 'overseerr', label: 'Overseerr' },
  { id: 'sabnzbd',   label: 'SABnzbd' },
  { id: 'tautulli',  label: 'Tautulli' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function relTime(ms: number): string {
  const diff = Date.now() - ms
  if (diff < 60_000)        return 'just now'
  if (diff < 3_600_000)     return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000)    return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 604_800_000)   return `${Math.floor(diff / 86_400_000)}d ago`
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── Timeline bar (SVG) ────────────────────────────────────────────────────────

function TimelineBar({
  buckets, windowMs,
}: {
  buckets: Array<UptimeStatus | 'unknown'>
  windowMs: number
}) {
  const now       = Date.now()
  const bucketMs  = windowMs / buckets.length
  const W         = buckets.length  // viewBox width = 1px per bucket

  return (
    <svg
      width="100%"
      height="22"
      viewBox={`0 0 ${W} 22`}
      preserveAspectRatio="none"
      style={{ display: 'block', borderRadius: 3 }}
    >
      {buckets.map((s, i) => {
        const bucketTime = new Date(now - windowMs + i * bucketMs)
        const label = `${bucketTime.toLocaleDateString()} ${bucketTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: ${s}`
        return (
          <rect
            key={i}
            x={i} y={0}
            width={0.85} height={22}
            fill={STATUS_COLOR[s] ?? STATUS_COLOR.unknown}
            rx={0.2}
          >
            <title>{label}</title>
          </rect>
        )
      })}
    </svg>
  )
}

// ── Expanded graph panel ──────────────────────────────────────────────────────

function GraphPanel({
  serviceId, tfIndex, onTfChange,
}: {
  serviceId: string
  tfIndex: number
  onTfChange: (i: number) => void
}) {
  const record = useStatusStore(s => s.services[serviceId])
  const events = record?.events ?? []
  const tf     = TIMEFRAMES[tfIndex]

  const timeline = buildTimeline(events, tf.ms, tf.buckets)

  // Count distinct down-events within the window
  const cutoff    = Date.now() - tf.ms
  const incidents = events.filter(e => e.s === 'down' && e.t >= cutoff).length
  const lastDown  = [...events].reverse().find(e => e.s === 'down')

  const incidentNote = events.length === 0
    ? 'Monitoring started — no history yet'
    : incidents > 0
      ? `${incidents} incident${incidents !== 1 ? 's' : ''} in this period`
      : lastDown
        ? `No incidents · last down ${relTime(lastDown.t)}`
        : 'No incidents recorded'

  return (
    <div style={{ padding: '6px 0 10px 24px' }}>
      {/* Timeframe selector */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 7 }}>
        {TIMEFRAMES.map((t, i) => (
          <button
            key={t.label}
            onClick={e => { e.stopPropagation(); onTfChange(i) }}
            style={{
              padding: '2px 8px', borderRadius: 4, border: 'none',
              fontSize: '0.65rem',
              background: tfIndex === i ? 'rgba(0,229,160,0.15)' : 'transparent',
              color: tfIndex === i ? ACCENT : 'var(--text-muted)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Timeline */}
      <TimelineBar buckets={timeline} windowMs={tf.ms} />

      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, marginTop: 5 }}>
        {(['up', 'slow', 'down'] as UptimeStatus[]).map(s => (
          <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.6rem', color: 'var(--text-muted)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_COLOR[s], display: 'inline-block' }} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      {/* Incident note */}
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 5 }}>
        {incidentNote}
      </div>
    </div>
  )
}

// ── Main tile ─────────────────────────────────────────────────────────────────

export default function UptimeTile() {
  useUptimeMonitor()

  const services     = useStatusStore(s => s.services)
  const { isConfigured } = useConfigStore()

  const [expanded, setExpanded] = useState<string | null>(null)
  const [tfIndex, setTfIndex]   = useState(0)

  const active = SERVICES.filter(s => isConfigured(s.id as any))
  const tf     = TIMEFRAMES[tfIndex]

  return (
    <TileWrapper id="uptime" label="Uptime" color={ACCENT}>
      {active.length === 0 ? (
        <div className="not-connected">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No services configured yet</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {active.map(svc => {
            const record  = services[svc.id]
            const status  = record?.current ?? 'unknown'
            const events  = record?.events ?? []
            const uptime  = calcUptime(events, tf.ms)
            const isOpen  = expanded === svc.id
            const color   = STATUS_COLOR[status]

            return (
              <div key={svc.id}>
                {/* Service row — click to expand */}
                <div
                  onClick={() => setExpanded(isOpen ? null : svc.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 6px', borderRadius: 6, cursor: 'pointer',
                    background: isOpen ? 'rgba(255,255,255,0.04)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <span className={`status-dot ${status}`} />

                  <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {svc.label}
                  </span>

                  {/* Mini 24h sparkline */}
                  <div style={{ width: 48, height: 12, flexShrink: 0 }}>
                    {events.length > 0 && (
                      <svg width="100%" height="100%" viewBox={`0 0 48 12`} preserveAspectRatio="none">
                        {buildTimeline(events, 24 * 60 * 60 * 1000, 48).map((s, i) => (
                          <rect key={i} x={i} y={0} width={0.85} height={12}
                            fill={STATUS_COLOR[s] ?? STATUS_COLOR.unknown} />
                        ))}
                      </svg>
                    )}
                  </div>

                  {/* Uptime % */}
                  <span style={{
                    fontSize: '0.7rem', color: 'var(--text-muted)',
                    fontVariantNumeric: 'tabular-nums', minWidth: 42, textAlign: 'right',
                  }}>
                    {uptime !== null ? `${uptime.toFixed(1)}%` : '—'}
                  </span>

                  {/* Status label */}
                  <span style={{
                    fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.06em',
                    color, minWidth: 36, textAlign: 'right',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {STATUS_LABEL[status]}
                  </span>
                </div>

                {/* Expanded graph */}
                {isOpen && (
                  <GraphPanel
                    serviceId={svc.id}
                    tfIndex={tfIndex}
                    onTfChange={setTfIndex}
                  />
                )}
              </div>
            )
          })}

          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
            Uptime % over last {tf.label} · click any service to expand
          </div>
        </div>
      )}
    </TileWrapper>
  )
}
