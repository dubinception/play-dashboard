import { useState, useEffect, useCallback, useRef } from 'react'
import useConfigStore from '@/store/useConfigStore'
import { proxyFetch } from '@/lib/proxyFetch'

export interface PlexSession {
  key: string
  type: string           // 'episode' | 'movie' | 'track'
  title: string
  grandparentTitle?: string  // show name
  parentTitle?: string       // season
  duration: number
  viewOffset: number
  User?: { title: string }
  Player?: { state: string; product: string; platform: string }
  thumb?: string
}

export interface PlexSection {
  type: string   // 'movie' | 'show' | 'artist'
  title: string
  count: number
}

interface UsePlexReturn {
  sessions: PlexSession[]
  sections: PlexSection[]
  loading: boolean
  error: string | null
}

const SESSIONS_POLL = 10000
const SECTIONS_POLL = 60000

function getPlexConfig() {
  const { url, token } = useConfigStore.getState().services.plex as { url: string; token: string }
  return { url: url?.trim().replace(/\/$/, ''), token: token?.trim() }
}

function isPlexConfigured() {
  const { url, token } = getPlexConfig()
  return !!(url && token)
}

function plexUrl(path: string) {
  const { url, token } = getPlexConfig()
  return `${url}${path}?X-Plex-Token=${encodeURIComponent(token)}`
}

export function usePlex(): UsePlexReturn {
  const configured = useConfigStore((s) => {
    const { url, token } = s.services.plex as { url: string; token: string }
    return !!(url?.trim() && token?.trim())
  })

  const [sessions, setSessions] = useState<PlexSession[]>([])
  const [sections, setSections] = useState<PlexSection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sessionsTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const sectionsTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchSessions = useCallback(async () => {
    if (!isPlexConfigured()) return
    try {
      const res = await proxyFetch(plexUrl('/status/sessions'))
      const text = await res.text()
      let data: any
      try { data = JSON.parse(text) } catch {
        throw new Error(`Not valid JSON — got: ${text.slice(0, 80)}`)
      }
      setSessions(data?.MediaContainer?.Metadata ?? [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSections = useCallback(async () => {
    if (!isPlexConfigured()) return
    try {
      const res = await proxyFetch(plexUrl('/library/sections'))
      const text = await res.text()
      let data: any
      try { data = JSON.parse(text) } catch { return }
      setSections(
        (data?.MediaContainer?.Directory ?? []).map((d: any) => ({
          type: d.type,
          title: d.title,
          count: parseInt(d.count ?? d.totalSize ?? '0'),
        }))
      )
    } catch { /* non-critical */ }
  }, [])

  useEffect(() => {
    if (!configured) return
    setLoading(true)
    fetchSessions()
    fetchSections()
    sessionsTimer.current = setInterval(fetchSessions, SESSIONS_POLL)
    sectionsTimer.current = setInterval(fetchSections, SECTIONS_POLL)
    return () => {
      if (sessionsTimer.current) clearInterval(sessionsTimer.current)
      if (sectionsTimer.current) clearInterval(sectionsTimer.current)
    }
  }, [configured, fetchSessions, fetchSections])

  return { sessions, sections, loading, error }
}
