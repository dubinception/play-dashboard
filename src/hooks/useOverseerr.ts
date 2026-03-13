import { useState, useEffect, useCallback, useRef } from 'react'
import useConfigStore from '@/store/useConfigStore'
import { proxyFetch, proxyPost } from '@/lib/proxyFetch'

export interface OverseerrResult {
  id: number
  mediaType: 'movie' | 'tv'
  title?: string
  name?: string
  releaseDate?: string
  firstAirDate?: string
  posterPath?: string
  mediaInfo?: {
    status: number // 2=pending 3=processing 4=partial 5=available
  }
}

export interface OverseerrRequest {
  id: number
  status: number // 1=pending 2=approved 3=declined 4=partially approved
  type: string
  media: { mediaType: string; tmdbId?: number; title?: string; mediaStatus?: number }
  requestedBy: { displayName: string }
  createdAt: string
}

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

// Read config directly from store state to avoid stale closure issues
function getOverseerrConfig() {
  const { url, apiKey } = useConfigStore.getState().services.overseerr as { url: string; apiKey: string }
  return { url: url?.trim().replace(/\/$/, ''), apiKey: apiKey?.trim() }
}

function isOverseerrConfigured() {
  const { url, apiKey } = getOverseerrConfig()
  return !!(url && apiKey)
}

function overseerrUrl(path: string) {
  const { url } = getOverseerrConfig()
  return `${url}${path}`
}

function overseerrHeaders(): Record<string, string> {
  const { apiKey } = getOverseerrConfig()
  return apiKey ? { 'X-Api-Key': apiKey } : {}
}

interface UseOverseerrReturn {
  results: OverseerrResult[]
  requests: OverseerrRequest[]
  searching: boolean
  requestingId: number | null
  error: string | null
  search: (query: string) => void
  clearResults: () => void
  requestMedia: (mediaId: number, mediaType: 'movie' | 'tv') => Promise<void>
}

const POLL_INTERVAL = 30000

export function useOverseerr(): UseOverseerrReturn {
  const configured = useConfigStore((s) => {
    const { url, apiKey } = s.services.overseerr as { url: string; apiKey: string }
    return !!(url?.trim() && apiKey?.trim())
  })

  const [results, setResults] = useState<OverseerrResult[]>([])
  const [requests, setRequests] = useState<OverseerrRequest[]>([])
  const [searching, setSearching] = useState(false)
  const [requestingId, setRequestingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchRequests = useCallback(async () => {
    if (!isOverseerrConfigured()) return
    try {
      const res = await proxyFetch(overseerrUrl('/api/v1/request?take=10&skip=0&sort=added&filter=all'), overseerrHeaders())
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
            },
          }
        } catch {
          return req
        }
      }))
      setRequests(enriched)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect')
    }
  }, [])

  useEffect(() => {
    if (!configured) return
    fetchRequests()
    const t = setInterval(fetchRequests, POLL_INTERVAL)
    return () => clearInterval(t)
  }, [configured, fetchRequests])

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      if (!isOverseerrConfigured()) return
      setSearching(true)
      try {
        const res = await proxyFetch(overseerrUrl(`/api/v1/search?query=${encodeURIComponent(query)}&page=1&language=en`), overseerrHeaders())
        const text = await res.text()
        let data: any
        try { data = JSON.parse(text) } catch {
          throw new Error(`Not valid JSON — got: ${text.slice(0, 80)}`)
        }
        setResults((data.results ?? []).slice(0, 8))
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Search failed')
      } finally {
        setSearching(false)
      }
    }, 400)
  }, [])

  const clearResults = useCallback(() => setResults([]), [])

  const requestMedia = useCallback(async (mediaId: number, mediaType: 'movie' | 'tv') => {
    if (!isOverseerrConfigured()) return
    setRequestingId(mediaId)
    try {
      await proxyPost(overseerrUrl('/api/v1/request'), { mediaId, mediaType }, overseerrHeaders())
      await fetchRequests()
      setResults((prev) => prev.map((r) =>
        r.id === mediaId ? { ...r, mediaInfo: { status: 2 } } : r
      ))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setRequestingId(null)
    }
  }, [fetchRequests])

  return { results, requests, searching, requestingId, error, search, clearResults, requestMedia }
}
