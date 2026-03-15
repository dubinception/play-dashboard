import { useState, useEffect, useCallback, useRef } from 'react'
import useConfigStore from '@/store/useConfigStore'
import { proxyFetch, proxyPost, proxyPut, proxyDelete } from '@/lib/proxyFetch'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SonarrImage {
  coverType: 'poster' | 'fanart' | 'banner' | 'screenshot' | 'headshot'
  url: string
  remoteUrl?: string
}

export interface SonarrSeason {
  seasonNumber: number
  monitored: boolean
  statistics?: {
    episodeCount: number
    episodeFileCount: number
    totalEpisodeCount: number
    sizeOnDisk: number
    percentOfEpisodes: number
  }
}

export interface SonarrSeries {
  id: number
  title: string
  year: number
  overview: string
  status: 'continuing' | 'ended' | 'upcoming' | 'deleted'
  network?: string
  airTime?: string
  runtime: number
  genres: string[]
  certification?: string
  imdbId?: string
  tvdbId: number
  ratings?: { value: number; votes: number }
  monitored: boolean
  qualityProfileId: number
  images: SonarrImage[]
  seasons: SonarrSeason[]
  statistics: {
    episodeCount: number
    episodeFileCount: number
    totalEpisodeCount: number
    sizeOnDisk: number
    percentOfEpisodes: number
  }
  added: string
  path?: string
}

export interface SonarrQualityProfile {
  id: number
  name: string
}

export interface SonarrQueueItem {
  id: number
  title: string
  size: number
  sizeleft: number
  timeleft: string
  status: string
  trackedDownloadStatus: string
  series?: { id: number; title: string; year: number; images?: SonarrImage[] }
  episode?: { seasonNumber: number; episodeNumber: number; title: string }
}

export interface SonarrCalendarItem {
  id: number
  title: string
  seasonNumber: number
  episodeNumber: number
  airDateUtc: string
  hasFile: boolean
  overview?: string
  series: { id: number; title: string; year: number; images?: SonarrImage[] }
}

export interface SonarrHistoryItem {
  id: number
  seriesId: number
  episodeId: number
  sourceTitle: string
  quality: { quality: { name: string } }
  date: string
  eventType: string
  data?: { indexer?: string; releaseGroup?: string }
  series?: { title: string }
  episode?: { seasonNumber: number; episodeNumber: number; title: string }
}

export interface SonarrCredit {
  personName: string
  character?: string
  job?: string
  department?: string
  type: 'cast' | 'crew'
  order?: number
  images: SonarrImage[]
}

// ── Config helpers ────────────────────────────────────────────────────────────

function getConfig() {
  const svc = useConfigStore.getState().services.sonarr as { url: string; apiKey: string }
  return { url: svc.url?.trim().replace(/\/$/, ''), apiKey: svc.apiKey?.trim() }
}

function isConfigured() {
  const { url, apiKey } = getConfig()
  return !!(url && apiKey)
}

export function sonarrApiUrl(path: string, extra?: string): string {
  const { url, apiKey } = getConfig()
  const sep = path.includes('?') ? '&' : '?'
  return `${url}${path}${sep}apikey=${encodeURIComponent(apiKey)}${extra ? '&' + extra : ''}`
}

export function sonarrImageUrl(series: SonarrSeries, type: 'poster' | 'fanart'): string | undefined {
  return series.images.find(i => i.coverType === type)?.remoteUrl
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseSonarrReturn {
  queue: SonarrQueueItem[]
  calendar: SonarrCalendarItem[]
  totalRecords: number
  library: SonarrSeries[]
  qualityProfiles: SonarrQualityProfile[]
  history: SonarrHistoryItem[]
  loading: boolean
  libraryLoading: boolean
  historyLoading: boolean
  error: string | null
  fetchLibrary: () => Promise<void>
  fetchHistory: () => Promise<void>
  fetchCredits: (seriesId: number) => Promise<SonarrCredit[]>
  toggleMonitored: (series: SonarrSeries) => Promise<void>
  setQualityProfile: (series: SonarrSeries, profileId: number) => Promise<void>
  searchSeries: (id: number) => Promise<void>
  refreshSeries: (id: number) => Promise<void>
  deleteSeries: (id: number, deleteFiles?: boolean) => Promise<void>
  getServiceUrl: () => string
}

const QUEUE_POLL    = 10000
const CALENDAR_POLL = 60000

export function useSonarr(): UseSonarrReturn {
  const configured = useConfigStore((s) => {
    const { url, apiKey } = s.services.sonarr as { url: string; apiKey: string }
    return !!(url?.trim() && apiKey?.trim())
  })

  const [queue, setQueue]               = useState<SonarrQueueItem[]>([])
  const [calendar, setCalendar]         = useState<SonarrCalendarItem[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [library, setLibrary]           = useState<SonarrSeries[]>([])
  const [qualityProfiles, setQualityProfiles] = useState<SonarrQualityProfile[]>([])
  const [history, setHistory]           = useState<SonarrHistoryItem[]>([])
  const [loading, setLoading]           = useState(false)
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const queueTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const calTimer   = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchQueue = useCallback(async () => {
    if (!isConfigured()) return
    try {
      const res = await proxyFetch(sonarrApiUrl('/api/v3/queue', 'pageSize=50&includeEpisode=true&includeSeries=true'))
      const data = await res.json()
      setQueue(data.records ?? [])
      setTotalRecords(data.totalRecords ?? 0)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCalendar = useCallback(async () => {
    if (!isConfigured()) return
    try {
      const today = new Date().toISOString().split('T')[0]
      const in30  = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
      const res = await proxyFetch(sonarrApiUrl('/api/v3/calendar', `start=${today}&end=${in30}&unmonitored=false&includeSeries=true`))
      setCalendar(await res.json() ?? [])
    } catch { /* non-critical */ }
  }, [])

  const fetchLibrary = useCallback(async () => {
    if (!isConfigured()) return
    setLibraryLoading(true)
    try {
      const [seriesRes, profilesRes] = await Promise.all([
        proxyFetch(sonarrApiUrl('/api/v3/series')),
        proxyFetch(sonarrApiUrl('/api/v3/qualityprofile')),
      ])
      const series   = await seriesRes.json()
      const profiles = await profilesRes.json()
      setLibrary(Array.isArray(series) ? [...series].sort((a, b) => a.title.localeCompare(b.title)) : [])
      setQualityProfiles(Array.isArray(profiles) ? profiles : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load library')
    } finally {
      setLibraryLoading(false)
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    if (!isConfigured()) return
    setHistoryLoading(true)
    try {
      const res = await proxyFetch(sonarrApiUrl('/api/v3/history', 'pageSize=50&sortKey=date&sortDirection=descending&includeSeries=true&includeEpisode=true'))
      const data = await res.json()
      setHistory(data.records ?? [])
    } catch { /* non-critical */ } finally {
      setHistoryLoading(false)
    }
  }, [])

  const fetchCredits = useCallback(async (seriesId: number): Promise<SonarrCredit[]> => {
    if (!isConfigured()) return []
    try {
      const res = await proxyFetch(sonarrApiUrl('/api/v3/credit', `seriesId=${seriesId}`))
      const data = await res.json()
      return Array.isArray(data) ? data : []
    } catch { return [] }
  }, [])

  const updateSeries = useCallback(async (id: number, updates: Partial<SonarrSeries>) => {
    const res = await proxyFetch(sonarrApiUrl(`/api/v3/series/${id}`))
    const current = await res.json()
    await proxyPut(sonarrApiUrl(`/api/v3/series/${id}`), { ...current, ...updates })
    setLibrary(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }, [])

  const toggleMonitored = useCallback(async (series: SonarrSeries) => {
    await updateSeries(series.id, { monitored: !series.monitored })
  }, [updateSeries])

  const setQualityProfile = useCallback(async (series: SonarrSeries, profileId: number) => {
    await updateSeries(series.id, { qualityProfileId: profileId })
  }, [updateSeries])

  const searchSeries = useCallback(async (id: number) => {
    if (!isConfigured()) return
    await proxyPost(sonarrApiUrl('/api/v3/command'), { name: 'SeriesSearch', seriesId: id })
  }, [])

  const refreshSeries = useCallback(async (id: number) => {
    if (!isConfigured()) return
    await proxyPost(sonarrApiUrl('/api/v3/command'), { name: 'RefreshSeries', seriesId: id })
  }, [])

  const deleteSeries = useCallback(async (id: number, deleteFiles = false) => {
    if (!isConfigured()) return
    await proxyDelete(sonarrApiUrl(`/api/v3/series/${id}`, `deleteFiles=${deleteFiles}&addImportExclusion=false`))
    setLibrary(prev => prev.filter(s => s.id !== id))
  }, [])

  const getServiceUrl = useCallback(() => getConfig().url, [])

  useEffect(() => {
    if (!configured) return
    setLoading(true)
    fetchQueue()
    fetchCalendar()
    queueTimer.current = setInterval(fetchQueue, QUEUE_POLL)
    calTimer.current   = setInterval(fetchCalendar, CALENDAR_POLL)
    return () => {
      if (queueTimer.current) clearInterval(queueTimer.current)
      if (calTimer.current)   clearInterval(calTimer.current)
    }
  }, [configured, fetchQueue, fetchCalendar])

  return {
    queue, calendar, totalRecords,
    library, qualityProfiles, history,
    loading, libraryLoading, historyLoading, error,
    fetchLibrary, fetchHistory, fetchCredits,
    toggleMonitored, setQualityProfile,
    searchSeries, refreshSeries, deleteSeries,
    getServiceUrl,
  }
}
