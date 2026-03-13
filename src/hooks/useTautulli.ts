import { useState, useEffect, useCallback, useRef } from 'react'
import useConfigStore from '@/store/useConfigStore'
import { proxyFetch } from '@/lib/proxyFetch'

export interface TautulliSession {
  user: string
  friendly_name: string
  title: string
  grandparent_title: string
  media_type: string   // 'episode' | 'movie' | 'track'
  progress_percent: string
  state: string        // 'playing' | 'paused' | 'buffering'
  player: string
  quality_profile: string
  stream_duration: number
}

export interface TautulliStat {
  stat_id: string
  stat_type: string
  rows: { title: string; grandparent_title?: string; user?: string; total_plays: number; total_duration: number }[]
}

interface UseTautulliReturn {
  sessions: TautulliSession[]
  streamCount: number
  stats: TautulliStat[]
  loading: boolean
  error: string | null
}

const POLL_INTERVAL = 10000

function getTautulliConfig() {
  const { url, apiKey } = useConfigStore.getState().services.tautulli as { url: string; apiKey: string }
  return { url: url?.trim().replace(/\/$/, ''), apiKey: apiKey?.trim() }
}

function isTautulliConfigured() {
  const { url, apiKey } = getTautulliConfig()
  return !!(url && apiKey)
}

function tautulliUrl(cmd: string, extra = '') {
  const { url, apiKey } = getTautulliConfig()
  return `${url}/api/v2?apikey=${encodeURIComponent(apiKey)}&cmd=${cmd}${extra}`
}

export function useTautulli(): UseTautulliReturn {
  const configured = useConfigStore((s) => {
    const { url, apiKey } = s.services.tautulli as { url: string; apiKey: string }
    return !!(url?.trim() && apiKey?.trim())
  })

  const [sessions, setSessions] = useState<TautulliSession[]>([])
  const [streamCount, setStreamCount] = useState(0)
  const [stats, setStats] = useState<TautulliStat[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async () => {
    if (!isTautulliConfigured()) return
    try {
      const [activityRes, statsRes] = await Promise.all([
        proxyFetch(tautulliUrl('get_activity')),
        proxyFetch(tautulliUrl('get_home_stats', '&time_range=7&stats_count=5&stats_type=plays')),
      ])
      const actText = await activityRes.text()
      const statsText = await statsRes.text()

      let actData: any, statsData: any
      try { actData  = JSON.parse(actText) }  catch { throw new Error(`Activity: ${actText.slice(0, 80)}`) }
      try { statsData = JSON.parse(statsText) } catch { /* non-critical */ }

      const activity = actData?.response?.data ?? {}
      setSessions(activity.sessions ?? [])
      setStreamCount(parseInt(activity.stream_count ?? '0'))
      setStats(statsData?.response?.data ?? [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!configured) return
    setLoading(true)
    fetchData()
    timerRef.current = setInterval(fetchData, POLL_INTERVAL)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [configured, fetchData])

  return { sessions, streamCount, stats, loading, error }
}
