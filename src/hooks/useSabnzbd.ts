import { useState, useEffect, useCallback, useRef } from 'react'
import useConfigStore from '@/store/useConfigStore'
import { proxyFetch } from '@/lib/proxyFetch'

export interface SabSlot {
  nzo_id: string
  filename: string
  status: string
  percentage: string
  sizeleft: string
  size: string
  timeleft: string
  cat: string
}

export interface SabQueue {
  status: string       // "Downloading" | "Paused" | "Idle"
  speed: string        // e.g. "1.5 MB/s"
  kbpersec: string     // raw KB/s
  sizeleft: string     // e.g. "1.2 GB"
  timeleft: string     // e.g. "0:15:00"
  slots: SabSlot[]
  noofslots_total: number
}

export interface SabHistorySlot {
  nzo_id: string
  name: string
  status: string       // "Completed" | "Failed" | "Extracting" | "Verifying" | etc.
  size: string
  category: string
  completed: number    // unix timestamp (seconds)
  fail_message?: string
  action_line?: string
}

interface UseSabnzbdReturn {
  queue: SabQueue | null
  history: SabHistorySlot[]
  historyLoading: boolean
  loading: boolean
  error: string | null
  pause: () => Promise<void>
  resume: () => Promise<void>
  deleteAll: () => Promise<void>
  refresh: () => void
}

const QUEUE_POLL   = 5000
const HISTORY_POLL = 60000

export function useSabnzbd(): UseSabnzbdReturn {
  const { getService } = useConfigStore()
  const [queue, setQueue]               = useState<SabQueue | null>(null)
  const [history, setHistory]           = useState<SabHistorySlot[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const queueTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const historyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const targetUrl = useCallback((mode: string, extra = '') => {
    const { url, apiKey } = getService('sabnzbd') as { url: string; apiKey: string }
    const base = url.trim().replace(/\/$/, '')
    return `${base}/api?apikey=${encodeURIComponent(apiKey)}&output=json&mode=${mode}${extra}`
  }, [getService])

  const isConfigured = useCallback(() => {
    const { url, apiKey } = getService('sabnzbd') as { url: string; apiKey: string }
    return !!(url?.trim() && apiKey?.trim())
  }, [getService])

  const fetchQueue = useCallback(async () => {
    if (!isConfigured()) return
    try {
      const res = await proxyFetch(targetUrl('queue'))
      const text = await res.text()
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      let data: any
      try { data = JSON.parse(text) } catch {
        throw new Error(`Not valid JSON — got: ${text.slice(0, 120)}`)
      }
      setQueue(data.queue)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect')
      setQueue(null)
    } finally {
      setLoading(false)
    }
  }, [targetUrl, isConfigured])

  const fetchHistory = useCallback(async () => {
    if (!isConfigured()) return
    setHistoryLoading(true)
    try {
      const res = await proxyFetch(targetUrl('history', '&limit=40'))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setHistory(data.history?.slots ?? [])
    } catch {
      // non-critical — keep previous history
    } finally {
      setHistoryLoading(false)
    }
  }, [targetUrl, isConfigured])

  const refresh = useCallback(() => {
    setLoading(true)
    fetchQueue()
  }, [fetchQueue])

  useEffect(() => {
    if (!isConfigured()) return
    setLoading(true)
    fetchQueue()
    fetchHistory()
    queueTimerRef.current   = setInterval(fetchQueue,   QUEUE_POLL)
    historyTimerRef.current = setInterval(fetchHistory, HISTORY_POLL)
    return () => {
      if (queueTimerRef.current)   clearInterval(queueTimerRef.current)
      if (historyTimerRef.current) clearInterval(historyTimerRef.current)
    }
  }, [fetchQueue, fetchHistory, isConfigured])

  const pause = useCallback(async () => {
    if (!isConfigured()) return
    await proxyFetch(targetUrl('pause'))
    await fetchQueue()
  }, [targetUrl, fetchQueue, isConfigured])

  const resume = useCallback(async () => {
    if (!isConfigured()) return
    await proxyFetch(targetUrl('resume'))
    await fetchQueue()
  }, [targetUrl, fetchQueue, isConfigured])

  const deleteAll = useCallback(async () => {
    if (!isConfigured()) return
    await proxyFetch(targetUrl('queue', '&name=delete&value=all&del_files=0'))
    await fetchQueue()
  }, [targetUrl, fetchQueue, isConfigured])

  return { queue, history, historyLoading, loading, error, pause, resume, deleteAll, refresh }
}
