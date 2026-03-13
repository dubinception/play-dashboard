import { useState, useEffect, useCallback, useRef } from 'react'
import useConfigStore from '@/store/useConfigStore'
import { proxyFetch } from '@/lib/proxyFetch'

export interface SonarrQueueItem {
  id: number
  title: string
  size: number
  sizeleft: number
  timeleft: string
  status: string
  trackedDownloadStatus: string
  series?: { title: string }
  episode?: { seasonNumber: number; episodeNumber: number; title: string }
}

export interface SonarrCalendarItem {
  id: number
  title: string
  seasonNumber: number
  episodeNumber: number
  airDateUtc: string
  hasFile: boolean
  series: { title: string }
}

interface UseSonarrReturn {
  queue: SonarrQueueItem[]
  calendar: SonarrCalendarItem[]
  totalRecords: number
  loading: boolean
  error: string | null
}

const POLL_INTERVAL = 10000

export function useSonarr(): UseSonarrReturn {
  const { getService } = useConfigStore()
  const [queue, setQueue] = useState<SonarrQueueItem[]>([])
  const [calendar, setCalendar] = useState<SonarrCalendarItem[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const apiUrl = useCallback((path: string) => {
    const { url, apiKey } = getService('sonarr') as { url: string; apiKey: string }
    const base = url.trim().replace(/\/$/, '')
    return `${base}${path}?apikey=${encodeURIComponent(apiKey)}`
  }, [getService])

  const isConfigured = useCallback(() => {
    const { url, apiKey } = getService('sonarr') as { url: string; apiKey: string }
    return !!(url?.trim() && apiKey?.trim())
  }, [getService])

  const fetchData = useCallback(async () => {
    if (!isConfigured()) return
    try {
      const today = new Date().toISOString().split('T')[0]
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

      const [queueRes, calRes] = await Promise.all([
        proxyFetch(apiUrl('/api/v3/queue') + '&pageSize=50&includeEpisode=true&includeSeries=true'),
        proxyFetch(apiUrl('/api/v3/calendar') + `&start=${today}&end=${nextWeek}&unmonitored=false`),
      ])

      const queueText = await queueRes.text()
      const calText = await calRes.text()

      let queueData: any, calData: any
      try { queueData = JSON.parse(queueText) } catch {
        throw new Error(`Queue: not valid JSON — got: ${queueText.slice(0, 80)}`)
      }
      try { calData = JSON.parse(calText) } catch {
        throw new Error(`Calendar: not valid JSON — got: ${calText.slice(0, 80)}`)
      }

      setQueue(queueData.records ?? [])
      setTotalRecords(queueData.totalRecords ?? 0)
      setCalendar(calData ?? [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect')
    } finally {
      setLoading(false)
    }
  }, [apiUrl, isConfigured])

  useEffect(() => {
    if (!isConfigured()) return
    setLoading(true)
    fetchData()
    timerRef.current = setInterval(fetchData, POLL_INTERVAL)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [fetchData, isConfigured])

  return { queue, calendar, totalRecords, loading, error }
}
