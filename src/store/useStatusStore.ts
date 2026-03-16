import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UptimeStatus = 'up' | 'slow' | 'down'

export interface StatusEvent {
  t: number          // timestamp ms
  s: UptimeStatus
}

export interface ServiceRecord {
  current: UptimeStatus | 'unknown'
  events: StatusEvent[]  // ascending by time
}

interface StatusStoreState {
  services: Record<string, ServiceRecord>
  record: (id: string, status: UptimeStatus) => void
}

const MAX_EVENTS   = 2000
const MAX_AGE_MS   = 30 * 24 * 60 * 60 * 1000   // 30 days

export const useStatusStore = create<StatusStoreState>()(
  persist(
    (set) => ({
      services: {},

      record: (id, status) => {
        set((state) => {
          const svc = state.services[id] ?? { current: 'unknown', events: [] }
          const last = svc.events[svc.events.length - 1]

          // De-duplicate: only append when status actually changes
          if (last?.s === status) {
            return svc.current === status
              ? state  // nothing to update
              : { services: { ...state.services, [id]: { ...svc, current: status } } }
          }

          const now    = Date.now()
          const cutoff = now - MAX_AGE_MS
          const events = [...svc.events.filter(e => e.t >= cutoff), { t: now, s: status }]
            .slice(-MAX_EVENTS)

          return { services: { ...state.services, [id]: { current: status, events } } }
        })
      },
    }),
    { name: 'play-dashboard-uptime-v1' }
  )
)

// ── Utility functions ─────────────────────────────────────────────────────────

/** Percentage of time the service was 'up' within the given window (ms). */
export function calcUptime(events: StatusEvent[], windowMs: number): number | null {
  if (events.length === 0) return null   // no data yet

  const now    = Date.now()
  const cutoff = now - windowMs

  // Seed with the last known status before the window
  const seedEvent = [...events].reverse().find(e => e.t < cutoff)
  const seedStatus: UptimeStatus = seedEvent?.s ?? 'up'

  const windowEvents = events.filter(e => e.t >= cutoff)

  let upMs   = 0
  let prevT  = cutoff
  let prevS: UptimeStatus = seedStatus

  for (const ev of windowEvents) {
    if (prevS === 'up') upMs += ev.t - prevT
    prevT = ev.t
    prevS = ev.s
  }
  if (prevS === 'up') upMs += now - prevT

  return Math.min(100, (upMs / windowMs) * 100)
}

/** Build an array of status values for `numBuckets` equal time-slices of the window. */
export function buildTimeline(
  events: StatusEvent[],
  windowMs: number,
  numBuckets: number,
): Array<UptimeStatus | 'unknown'> {
  const now        = Date.now()
  const cutoff     = now - windowMs
  const bucketSize = windowMs / numBuckets

  const buckets: Array<UptimeStatus | 'unknown'> = Array(numBuckets).fill('unknown')

  // Starting status before window
  const seed = [...events].reverse().find(e => e.t < cutoff)
  const seedStatus: UptimeStatus | 'unknown' = seed?.s ?? 'unknown'

  // Build a timeline of (start, status) segments
  const segments: Array<{ t: number; s: UptimeStatus | 'unknown' }> = [
    { t: cutoff, s: seedStatus },
    ...events.filter(e => e.t > cutoff && e.t <= now),
  ]

  for (let i = 0; i < segments.length; i++) {
    const segStart = segments[i].t
    const segEnd   = i + 1 < segments.length ? segments[i + 1].t : now
    const s        = segments[i].s
    if (s === 'unknown') continue

    const bStart = Math.max(0, Math.floor((segStart - cutoff) / bucketSize))
    const bEnd   = Math.min(numBuckets - 1, Math.floor((segEnd - cutoff) / bucketSize))

    for (let b = bStart; b <= bEnd; b++) {
      const curr = buckets[b]
      if (curr === 'unknown') {
        buckets[b] = s
      } else if (curr === 'up' && (s === 'slow' || s === 'down')) {
        buckets[b] = s
      } else if (curr === 'slow' && s === 'down') {
        buckets[b] = 'down'
      }
    }
  }

  return buckets
}
