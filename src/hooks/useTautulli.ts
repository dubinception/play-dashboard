import { useState, useEffect, useCallback, useRef } from 'react'
import useConfigStore from '@/store/useConfigStore'
import { proxyFetch } from '@/lib/proxyFetch'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TautulliSession {
  user: string
  friendly_name: string
  title: string
  grandparent_title: string
  media_type: string
  progress_percent: string
  state: string
  player: string
  quality_profile: string
  stream_duration: number
  thumb?: string
  grandparent_thumb?: string
}

export interface TautulliUser {
  user_id: number
  friendly_name: string
  username: string
  user_thumb: string
  last_seen: number
  last_played: string
  plays: number
  duration: number
}

export interface TautulliHistoryItem {
  row_id: number
  user: string
  friendly_name: string
  user_thumb?: string
  title: string
  grandparent_title?: string
  year: number
  media_type: string
  thumb?: string
  date: number
  watched_status: number
  duration: number
}

export interface TautulliStatRow {
  title: string
  grandparent_title?: string
  user?: string
  friendly_name?: string
  user_thumb?: string
  thumb?: string
  total_plays: number
  total_duration: number
  users_watched?: number
  year?: number
}

export interface TautulliStat {
  stat_id: string
  stat_type: string
  rows: TautulliStatRow[]
}

export interface TautulliGraphData {
  categories: string[]
  series: { name: string; data: number[] }[]
}

// ── Config helpers ────────────────────────────────────────────────────────────

function getConfig() {
  const { url, apiKey } = useConfigStore.getState().services.tautulli as { url: string; apiKey: string }
  return { url: url?.trim().replace(/\/$/, ''), apiKey: apiKey?.trim() }
}

function isConfigured() {
  const { url, apiKey } = getConfig()
  return !!(url && apiKey)
}

export function tautulliApiUrl(cmd: string, extra = '') {
  const { url, apiKey } = getConfig()
  return `${url}/api/v2?apikey=${encodeURIComponent(apiKey)}&cmd=${cmd}${extra}`
}

export function tautulliThumbUrl(thumb: string, w = 150, h = 225): string {
  const target = tautulliApiUrl('pms_image_proxy', `&img=${encodeURIComponent(thumb)}&width=${w}&height=${h}`)
  return `/api/proxy?url=${encodeURIComponent(target)}`
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseTautulliReturn {
  sessions: TautulliSession[]
  streamCount: number
  loading: boolean
  error: string | null
  users: TautulliUser[]
  usersLoading: boolean
  history: TautulliHistoryItem[]
  historyLoading: boolean
  stats: TautulliStat[]
  statsLoading: boolean
  graphsByDay: TautulliGraphData | null
  graphsByMonth: TautulliGraphData | null
  graphsByDow: TautulliGraphData | null
  graphsLoading: boolean
  fetchUsers: () => Promise<void>
  fetchHistory: () => Promise<void>
  fetchStats: (timeRange: number) => Promise<void>
  fetchGraphs: () => Promise<void>
}

const POLL_INTERVAL = 10000

export function useTautulli(): UseTautulliReturn {
  const configured = useConfigStore((s) => {
    const { url, apiKey } = s.services.tautulli as { url: string; apiKey: string }
    return !!(url?.trim() && apiKey?.trim())
  })

  const [sessions, setSessions]       = useState<TautulliSession[]>([])
  const [streamCount, setStreamCount] = useState(0)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const [users, setUsers]             = useState<TautulliUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)

  const [history, setHistory]         = useState<TautulliHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const [stats, setStats]             = useState<TautulliStat[]>([])
  const [statsLoading, setStatsLoading] = useState(false)

  const [graphsByDay, setGraphsByDay]   = useState<TautulliGraphData | null>(null)
  const [graphsByMonth, setGraphsByMonth] = useState<TautulliGraphData | null>(null)
  const [graphsByDow, setGraphsByDow]   = useState<TautulliGraphData | null>(null)
  const [graphsLoading, setGraphsLoading] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Activity poll ──────────────────────────────────────────────────────────

  const fetchActivity = useCallback(async () => {
    if (!isConfigured()) return
    try {
      const res = await proxyFetch(tautulliApiUrl('get_activity'))
      const data = await res.json()
      const activity = data?.response?.data ?? {}
      setSessions(activity.sessions ?? [])
      setStreamCount(parseInt(activity.stream_count ?? '0'))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Lazy fetches ───────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    if (!isConfigured()) return
    setUsersLoading(true)
    try {
      const res = await proxyFetch(tautulliApiUrl('get_users_table', '&length=50&order_column=last_seen&order_dir=desc'))
      const data = await res.json()
      setUsers(data?.response?.data?.data ?? [])
    } catch { /* non-critical */ } finally {
      setUsersLoading(false)
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    if (!isConfigured()) return
    setHistoryLoading(true)
    try {
      const res = await proxyFetch(tautulliApiUrl('get_history', '&length=50&order_column=date&order_dir=desc'))
      const data = await res.json()
      setHistory(data?.response?.data?.data ?? [])
    } catch { /* non-critical */ } finally {
      setHistoryLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async (timeRange: number) => {
    if (!isConfigured()) return
    setStatsLoading(true)
    try {
      const res = await proxyFetch(tautulliApiUrl('get_home_stats', `&time_range=${timeRange}&stats_count=5&stats_type=plays`))
      const data = await res.json()
      setStats(data?.response?.data ?? [])
    } catch { /* non-critical */ } finally {
      setStatsLoading(false)
    }
  }, [])

  const fetchGraphs = useCallback(async () => {
    if (!isConfigured()) return
    setGraphsLoading(true)
    try {
      const [dayRes, monthRes, dowRes] = await Promise.all([
        proxyFetch(tautulliApiUrl('get_plays_by_date',      '&time_range=30&y_axis=plays')),
        proxyFetch(tautulliApiUrl('get_plays_by_month',     '&time_range=6&y_axis=plays')),
        proxyFetch(tautulliApiUrl('get_plays_by_dayofweek', '&time_range=30&y_axis=plays')),
      ])
      const [d, m, w] = await Promise.all([dayRes.json(), monthRes.json(), dowRes.json()])
      setGraphsByDay(d?.response?.data ?? null)
      setGraphsByMonth(m?.response?.data ?? null)
      setGraphsByDow(w?.response?.data ?? null)
    } catch { /* non-critical */ } finally {
      setGraphsLoading(false)
    }
  }, [])

  // ── Polling setup ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!configured) return
    setLoading(true)
    fetchActivity()
    timerRef.current = setInterval(fetchActivity, POLL_INTERVAL)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [configured, fetchActivity])

  return {
    sessions, streamCount, loading, error,
    users, usersLoading,
    history, historyLoading,
    stats, statsLoading,
    graphsByDay, graphsByMonth, graphsByDow, graphsLoading,
    fetchUsers, fetchHistory, fetchStats, fetchGraphs,
  }
}
