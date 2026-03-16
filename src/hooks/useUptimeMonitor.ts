import { useEffect, useCallback } from 'react'
import useConfigStore from '@/store/useConfigStore'
import { useStatusStore } from '@/store/useStatusStore'
import { proxyFetch } from '@/lib/proxyFetch'
import type { UptimeStatus } from '@/store/useStatusStore'

const CHECK_INTERVAL  = 60_000   // 1 minute
const SLOW_THRESHOLD  = 3_000    // 3s response = slow

// Health-check endpoint for each service
function getCheckUrl(id: string, url: string, key: string): string | null {
  const base = url.trim().replace(/\/$/, '')
  if (!base) return null
  switch (id) {
    case 'plex':      return `${base}/identity`
    case 'sonarr':
    case 'radarr':    return `${base}/api/v3/system/status`
    case 'overseerr': return `${base}/api/v1/auth/me`
    case 'sabnzbd':   return key ? `${base}/api?mode=auth&output=json&apikey=${encodeURIComponent(key)}` : null
    case 'tautulli':  return key ? `${base}/api/v2?cmd=get_server_info&apikey=${encodeURIComponent(key)}` : null
    default:          return null
  }
}

function getCheckHeaders(id: string, key: string, token: string): Record<string, string> {
  switch (id) {
    case 'plex':      return token ? { 'X-Plex-Token': token } : {}
    case 'sonarr':
    case 'radarr':
    case 'overseerr': return key ? { 'X-Api-Key': key } : {}
    default:          return {}
  }
}

const MONITORED: Array<{ id: string; keyField: string }> = [
  { id: 'plex',      keyField: 'token' },
  { id: 'sonarr',    keyField: 'apiKey' },
  { id: 'radarr',    keyField: 'apiKey' },
  { id: 'overseerr', keyField: 'apiKey' },
  { id: 'sabnzbd',   keyField: 'apiKey' },
  { id: 'tautulli',  keyField: 'apiKey' },
]

export function useUptimeMonitor() {
  const record     = useStatusStore(s => s.record)
  const getService = useConfigStore(s => s.getService)

  const runChecks = useCallback(async () => {
    await Promise.allSettled(
      MONITORED.map(async ({ id, keyField }) => {
        const svc   = getService(id as any) as Record<string, string>
        const url   = svc.url ?? ''
        const key   = svc[keyField] ?? ''
        const token = svc.token ?? ''

        const checkUrl = getCheckUrl(id, url, key)
        if (!checkUrl) return

        const headers = getCheckHeaders(id, key, token)
        const t0 = Date.now()
        try {
          const res = await proxyFetch(checkUrl, headers)
          const ms  = Date.now() - t0
          const status: UptimeStatus = !res.ok ? 'down' : ms > SLOW_THRESHOLD ? 'slow' : 'up'
          record(id, status)
        } catch {
          record(id, 'down')
        }
      })
    )
  }, [record, getService])

  useEffect(() => {
    runChecks()
    const t = setInterval(runChecks, CHECK_INTERVAL)
    return () => clearInterval(t)
  }, [runChecks])
}
