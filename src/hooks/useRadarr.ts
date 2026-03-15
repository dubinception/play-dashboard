import { useState, useEffect, useCallback, useRef } from 'react'
import useConfigStore from '@/store/useConfigStore'
import { proxyFetch, proxyPost, proxyPut, proxyDelete } from '@/lib/proxyFetch'

// ── Types ────────────────────────────────────────────────────────────────────

export interface RadarrImage {
  coverType: 'poster' | 'fanart' | 'banner' | 'screenshot' | 'headshot'
  url: string
  remoteUrl?: string
}

export interface RadarrMovieFile {
  id: number
  relativePath: string
  size: number
  dateAdded: string
  quality: { quality: { name: string; resolution?: number } }
  mediaInfo?: {
    videoCodec: string
    videoBitDepth: number
    videoFps: number
    resolution: string
    runTime: string
    audioCodec: string
    audioChannels: number
    audioLanguages: string
  }
}

export interface RadarrMovie {
  id: number
  title: string
  originalTitle?: string
  year: number
  overview: string
  imdbId?: string
  tmdbId: number
  ratings?: {
    imdb?: { value: number; votes: number }
    tmdb?: { value: number }
  }
  runtime: number
  certification?: string
  genres: string[]
  studio?: string
  monitored: boolean
  qualityProfileId: number
  hasFile: boolean
  movieFile?: RadarrMovieFile
  sizeOnDisk: number
  added: string
  digitalRelease?: string
  physicalRelease?: string
  inCinemas?: string
  path?: string
  images: RadarrImage[]
  status: string
}

export interface RadarrQualityProfile {
  id: number
  name: string
}

export interface RadarrQueueItem {
  id: number
  title: string
  size: number
  sizeleft: number
  timeleft: string
  status: string
  trackedDownloadStatus: string
  movie?: { title: string; year: number; images?: RadarrImage[] }
}

export interface RadarrCalendarItem {
  id: number
  title: string
  year: number
  digitalRelease?: string
  physicalRelease?: string
  inCinemas?: string
  hasFile: boolean
  images?: RadarrImage[]
}

export interface RadarrHistoryItem {
  id: number
  movieId: number
  sourceTitle: string
  quality: { quality: { name: string } }
  date: string
  eventType: string
  data?: { indexer?: string; releaseGroup?: string }
  movie?: { title: string; year: number }
}

export interface RadarrCredit {
  personName: string
  character?: string
  job?: string
  department?: string
  type: 'cast' | 'crew'
  order?: number
  images: RadarrImage[]
}

// ── Config helpers ────────────────────────────────────────────────────────────

function getConfig() {
  const svc = useConfigStore.getState().services.radarr as { url: string; apiKey: string }
  return { url: svc.url?.trim().replace(/\/$/, ''), apiKey: svc.apiKey?.trim() }
}

function isConfigured() {
  const { url, apiKey } = getConfig()
  return !!(url && apiKey)
}

export function radarrApiUrl(path: string, extra?: string): string {
  const { url, apiKey } = getConfig()
  const sep = path.includes('?') ? '&' : '?'
  return `${url}${path}${sep}apikey=${encodeURIComponent(apiKey)}${extra ? '&' + extra : ''}`
}

export function radarrImageUrl(movie: RadarrMovie, type: 'poster' | 'fanart'): string | undefined {
  return movie.images.find(i => i.coverType === type)?.remoteUrl
}

// ── Hook ─────────────────────────────────────────────────────────────────────

interface UseRadarrReturn {
  queue: RadarrQueueItem[]
  calendar: RadarrCalendarItem[]
  totalRecords: number
  library: RadarrMovie[]
  qualityProfiles: RadarrQualityProfile[]
  history: RadarrHistoryItem[]
  loading: boolean
  libraryLoading: boolean
  historyLoading: boolean
  error: string | null
  fetchLibrary: () => Promise<void>
  fetchHistory: () => Promise<void>
  fetchCredits: (movieId: number) => Promise<RadarrCredit[]>
  toggleMonitored: (movie: RadarrMovie) => Promise<void>
  setQualityProfile: (movie: RadarrMovie, profileId: number) => Promise<void>
  searchMovie: (id: number) => Promise<void>
  refreshMovie: (id: number) => Promise<void>
  deleteMovie: (id: number, deleteFiles?: boolean) => Promise<void>
  getServiceUrl: () => string
}

const QUEUE_POLL = 10000
const CALENDAR_POLL = 60000

export function useRadarr(): UseRadarrReturn {
  const configured = useConfigStore((s) => {
    const { url, apiKey } = s.services.radarr as { url: string; apiKey: string }
    return !!(url?.trim() && apiKey?.trim())
  })

  const [queue, setQueue]               = useState<RadarrQueueItem[]>([])
  const [calendar, setCalendar]         = useState<RadarrCalendarItem[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [library, setLibrary]           = useState<RadarrMovie[]>([])
  const [qualityProfiles, setQualityProfiles] = useState<RadarrQualityProfile[]>([])
  const [history, setHistory]           = useState<RadarrHistoryItem[]>([])
  const [loading, setLoading]           = useState(false)
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const queueTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const calTimer   = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchQueue = useCallback(async () => {
    if (!isConfigured()) return
    try {
      const res = await proxyFetch(radarrApiUrl('/api/v3/queue', 'pageSize=50&includeMovie=true'))
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
      const in90  = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]
      const res = await proxyFetch(radarrApiUrl('/api/v3/calendar', `start=${today}&end=${in90}&unmonitored=false`))
      setCalendar(await res.json() ?? [])
    } catch { /* non-critical */ }
  }, [])

  const fetchLibrary = useCallback(async () => {
    if (!isConfigured()) return
    setLibraryLoading(true)
    try {
      const [moviesRes, profilesRes] = await Promise.all([
        proxyFetch(radarrApiUrl('/api/v3/movie')),
        proxyFetch(radarrApiUrl('/api/v3/qualityprofile')),
      ])
      const movies   = await moviesRes.json()
      const profiles = await profilesRes.json()
      setLibrary(Array.isArray(movies) ? [...movies].sort((a, b) => a.title.localeCompare(b.title)) : [])
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
      const res = await proxyFetch(radarrApiUrl('/api/v3/history', 'pageSize=50&sortKey=date&sortDirection=descending'))
      const data = await res.json()
      setHistory(data.records ?? [])
    } catch { /* non-critical */ } finally {
      setHistoryLoading(false)
    }
  }, [])

  const fetchCredits = useCallback(async (movieId: number): Promise<RadarrCredit[]> => {
    if (!isConfigured()) return []
    try {
      const res = await proxyFetch(radarrApiUrl('/api/v3/credit', `movieId=${movieId}`))
      const data = await res.json()
      return Array.isArray(data) ? data : []
    } catch { return [] }
  }, [])

  const updateMovie = useCallback(async (id: number, updates: Partial<RadarrMovie>) => {
    const res = await proxyFetch(radarrApiUrl(`/api/v3/movie/${id}`))
    const current = await res.json()
    await proxyPut(radarrApiUrl(`/api/v3/movie/${id}`), { ...current, ...updates })
    setLibrary(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
  }, [])

  const toggleMonitored = useCallback(async (movie: RadarrMovie) => {
    await updateMovie(movie.id, { monitored: !movie.monitored })
  }, [updateMovie])

  const setQualityProfile = useCallback(async (movie: RadarrMovie, profileId: number) => {
    await updateMovie(movie.id, { qualityProfileId: profileId })
  }, [updateMovie])

  const searchMovie = useCallback(async (id: number) => {
    if (!isConfigured()) return
    await proxyPost(radarrApiUrl('/api/v3/command'), { name: 'MoviesSearch', movieIds: [id] })
  }, [])

  const refreshMovie = useCallback(async (id: number) => {
    if (!isConfigured()) return
    await proxyPost(radarrApiUrl('/api/v3/command'), { name: 'RefreshMovie', movieId: id })
  }, [])

  const deleteMovie = useCallback(async (id: number, deleteFiles = false) => {
    if (!isConfigured()) return
    await proxyDelete(radarrApiUrl(`/api/v3/movie/${id}`, `deleteFiles=${deleteFiles}&addImportExclusion=false`))
    setLibrary(prev => prev.filter(m => m.id !== id))
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
    searchMovie, refreshMovie, deleteMovie,
    getServiceUrl,
  }
}
