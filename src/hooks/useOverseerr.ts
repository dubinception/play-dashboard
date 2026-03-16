import { useState, useEffect, useCallback, useRef } from 'react'
import useConfigStore from '@/store/useConfigStore'
import { proxyFetch, proxyPost } from '@/lib/proxyFetch'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OverseerrResult {
  id: number
  mediaType: 'movie' | 'tv'
  title?: string
  name?: string
  releaseDate?: string
  firstAirDate?: string
  posterPath?: string
  overview?: string
  voteAverage?: number
  mediaInfo?: { status: number }
}

export interface OverseerrRequest {
  id: number
  status: number
  type: string
  media: {
    mediaType: string
    tmdbId?: number
    title?: string
    mediaStatus?: number
    posterPath?: string
  }
  requestedBy: { displayName: string }
  createdAt: string
}

export interface OverseerrGenre { id: number; name: string }
export interface OverseerrNetwork { id: number; name: string }

export type DiscoverMode =
  | 'trending'
  | 'movies'
  | 'tv'
  | 'movie_genre'
  | 'tv_genre'
  | 'tv_network'

export const REQUEST_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: 'Pending',  color: '#f39c12' },
  2: { label: 'Approved', color: '#00e5a0' },
  3: { label: 'Declined', color: '#e74c3c' },
  4: { label: 'Partial',  color: '#35c5f4' },
}

export const MEDIA_STATUS: Record<number, { label: string; color: string }> = {
  2: { label: 'Pending',    color: '#f39c12' },
  3: { label: 'Processing', color: '#35c5f4' },
  4: { label: 'Partial',    color: '#f39c12' },
  5: { label: 'Available',  color: '#00e5a0' },
}

// ── Config helpers ────────────────────────────────────────────────────────────

function getOverseerrConfig() {
  const { url, apiKey } = useConfigStore.getState().services.overseerr as { url: string; apiKey: string }
  return { url: url?.trim().replace(/\/$/, ''), apiKey: apiKey?.trim() }
}

function isOverseerrConfigured() {
  const { url, apiKey } = getOverseerrConfig()
  return !!(url && apiKey)
}

function overseerrUrl(path: string) {
  return `${getOverseerrConfig().url}${path}`
}

function overseerrHeaders(): Record<string, string> {
  const { apiKey } = getOverseerrConfig()
  return apiKey ? { 'X-Api-Key': apiKey } : {}
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseOverseerrReturn {
  results: OverseerrResult[]
  requests: OverseerrRequest[]
  discoverResults: OverseerrResult[]
  movieGenres: OverseerrGenre[]
  tvGenres: OverseerrGenre[]
  networks: OverseerrNetwork[]
  searching: boolean
  discoverLoading: boolean
  requestingId: number | null
  error: string | null
  search: (query: string) => void
  clearResults: () => void
  discover: (mode: DiscoverMode, id?: number) => void
  fetchMetadata: () => Promise<void>
  requestMedia: (mediaId: number, mediaType: 'movie' | 'tv') => Promise<void>
}

const POLL_INTERVAL = 30000

export function useOverseerr(): UseOverseerrReturn {
  const configured = useConfigStore((s) => {
    const { url, apiKey } = s.services.overseerr as { url: string; apiKey: string }
    return !!(url?.trim() && apiKey?.trim())
  })

  const [results, setResults]               = useState<OverseerrResult[]>([])
  const [requests, setRequests]             = useState<OverseerrRequest[]>([])
  const [discoverResults, setDiscoverResults] = useState<OverseerrResult[]>([])
  const [movieGenres, setMovieGenres]       = useState<OverseerrGenre[]>([])
  const [tvGenres, setTvGenres]             = useState<OverseerrGenre[]>([])
  const [networks, setNetworks]             = useState<OverseerrNetwork[]>([])
  const [searching, setSearching]           = useState(false)
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [requestingId, setRequestingId]     = useState<number | null>(null)
  const [error, setError]                   = useState<string | null>(null)

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const discoverCtrl = useRef<AbortController | null>(null)

  // ── Requests ───────────────────────────────────────────────────────────────

  const fetchRequests = useCallback(async () => {
    if (!isOverseerrConfigured()) return
    try {
      const res = await proxyFetch(overseerrUrl('/api/v1/request?take=20&skip=0&sort=added&filter=all'), overseerrHeaders())
      const text = await res.text()
      let data: any
      try { data = JSON.parse(text) } catch {
        throw new Error(`Not valid JSON — got: ${text.slice(0, 80)}`)
      }
      const raw: OverseerrRequest[] = data.results ?? []
      const enriched = await Promise.all(raw.map(async (req) => {
        if (!req.media.tmdbId) return req
        const endpoint = req.media.mediaType === 'movie'
          ? `/api/v1/movie/${req.media.tmdbId}`
          : `/api/v1/tv/${req.media.tmdbId}`
        try {
          const r = await proxyFetch(overseerrUrl(endpoint), overseerrHeaders())
          const d = await r.json()
          return {
            ...req,
            media: {
              ...req.media,
              title: d.title ?? d.name ?? d.originalTitle ?? d.originalName ?? req.media.title,
              mediaStatus: d.mediaInfo?.status,
              posterPath: d.posterPath,
            },
          }
        } catch { return req }
      }))
      setRequests(enriched)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect')
    }
  }, [])

  const fetchMetadataRef = useRef<() => Promise<void>>(() => Promise.resolve())

  useEffect(() => {
    if (!configured) return
    fetchRequests()
    fetchMetadataRef.current()
    const t = setInterval(fetchRequests, POLL_INTERVAL)
    return () => clearInterval(t)
  }, [configured, fetchRequests])

  // ── Search ─────────────────────────────────────────────────────────────────

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      if (!isOverseerrConfigured()) return
      setSearching(true)
      try {
        const res = await proxyFetch(overseerrUrl(`/api/v1/search?query=${encodeURIComponent(query)}&page=1`), overseerrHeaders())
        const data = await res.json()
        setResults((data.results ?? []).slice(0, 12))
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Search failed')
      } finally {
        setSearching(false)
      }
    }, 400)
  }, [])

  const clearResults = useCallback(() => setResults([]), [])

  // ── Discover ───────────────────────────────────────────────────────────────

  const discover = useCallback((mode: DiscoverMode, id?: number) => {
    if (!isOverseerrConfigured()) return
    if (discoverCtrl.current) discoverCtrl.current.abort()
    discoverCtrl.current = new AbortController()

    const endpoints: Record<DiscoverMode, string> = {
      trending:    '/api/v1/discover/trending',
      movies:      '/api/v1/discover/movies',
      tv:          '/api/v1/discover/tv',
      movie_genre: `/api/v1/discover/movies/genre/${id ?? 0}`,
      tv_genre:    `/api/v1/discover/tv/genre/${id ?? 0}`,
      tv_network:  `/api/v1/discover/tv/network/${id ?? 0}`,
    }
    const url = endpoints[mode]
    if (!url || (mode.includes('genre') && !id) || (mode === 'tv_network' && !id)) return

    setDiscoverLoading(true)
    proxyFetch(overseerrUrl(url + '?page=1&language=en'), overseerrHeaders())
      .then(r => r.json())
      .then(data => {
        setDiscoverResults((data.results ?? []).slice(0, 20))
      })
      .catch(() => { /* aborted or failed */ })
      .finally(() => setDiscoverLoading(false))
  }, [])

  // ── Metadata (genres + networks) ───────────────────────────────────────────

  // Popular TV networks (TMDb IDs) — shown if the API endpoint returns nothing
  const FALLBACK_NETWORKS: OverseerrNetwork[] = [
    { id: 213, name: 'Netflix' }, { id: 1024, name: 'Prime Video' },
    { id: 2739, name: 'Disney+' }, { id: 49, name: 'HBO' },
    { id: 359, name: 'Hulu' }, { id: 2087, name: 'Apple TV+' },
    { id: 174, name: 'AMC' }, { id: 453, name: 'FX' },
    { id: 19, name: 'Fox' }, { id: 6, name: 'NBC' },
    { id: 2, name: 'ABC' }, { id: 4, name: 'CBS' },
    { id: 77, name: 'Showtime' }, { id: 318, name: 'Starz' },
    { id: 56, name: 'TNT' }, { id: 34, name: 'Syfy' },
    { id: 71, name: 'CW' }, { id: 16, name: 'Comedy Central' },
    { id: 23, name: 'Cartoon Network' }, { id: 251, name: 'USA Network' },
  ]

  const fetchMetadata = useCallback(async () => {
    if (!isOverseerrConfigured()) return
    try {
      const [mgRes, tgRes] = await Promise.all([
        proxyFetch(overseerrUrl('/api/v1/genre/movie'), overseerrHeaders()),
        proxyFetch(overseerrUrl('/api/v1/genre/tv'), overseerrHeaders()),
      ])
      const [mg, tg] = await Promise.all([mgRes.json(), tgRes.json()])
      const toArr = (d: unknown) => Array.isArray(d) ? d : (d as any)?.results ?? []
      const mgArr = toArr(mg); const tgArr = toArr(tg)
      if (mgArr.length) setMovieGenres(mgArr)
      if (tgArr.length) setTvGenres(tgArr)
    } catch { /* non-critical */ }

    // Networks: try API, fall back to curated list
    try {
      const nwRes = await proxyFetch(overseerrUrl('/api/v1/network'), overseerrHeaders())
      const nw = await nwRes.json()
      const arr = Array.isArray(nw) ? nw : (nw?.results ?? [])
      setNetworks(arr.length ? arr.slice(0, 40) : FALLBACK_NETWORKS)
    } catch {
      setNetworks(FALLBACK_NETWORKS)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  fetchMetadataRef.current = fetchMetadata

  // ── Request media ──────────────────────────────────────────────────────────

  const requestMedia = useCallback(async (mediaId: number, mediaType: 'movie' | 'tv') => {
    if (!isOverseerrConfigured()) return
    setRequestingId(mediaId)
    try {
      await proxyPost(overseerrUrl('/api/v1/request'), { mediaId, mediaType }, overseerrHeaders())
      await fetchRequests()
      // Update status in all result lists
      const setAvailable = (prev: OverseerrResult[]) =>
        prev.map(r => r.id === mediaId ? { ...r, mediaInfo: { status: 2 } } : r)
      setResults(setAvailable)
      setDiscoverResults(setAvailable)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setRequestingId(null)
    }
  }, [fetchRequests])

  return {
    results, requests, discoverResults,
    movieGenres, tvGenres, networks,
    searching, discoverLoading, requestingId, error,
    search, clearResults, discover, fetchMetadata, requestMedia,
  }
}
