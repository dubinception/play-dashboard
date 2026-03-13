import { useState, useEffect, useCallback, useRef } from 'react'
import useConfigStore from '@/store/useConfigStore'
import { proxyPost } from '@/lib/proxyFetch'

export interface UnraidDisk {
  name: string
  fsSize: number
  fsUsed: number
  status: string
  rotational?: boolean
}

export interface UnraidInfo {
  arrayState: string
  disks: UnraidDisk[]
  cpuUsage: number
  memTotal: number
  memFree: number
}

interface UseUnraidReturn {
  info: UnraidInfo | null
  loading: boolean
  error: string | null
}

const POLL_INTERVAL = 15000

const QUERY = `{
  array {
    state
    disks { name fsSize fsUsed status rotational }
    parities { name fsSize fsUsed status }
    caches { name fsSize fsUsed status }
  }
}`

function getUnraidConfig() {
  const { url, apiKey } = useConfigStore.getState().services.unraid as { url: string; apiKey: string }
  return { url: url?.trim().replace(/\/$/, ''), apiKey: apiKey?.trim() }
}

function isUnraidConfigured() {
  const { url, apiKey } = getUnraidConfig()
  return !!(url && apiKey)
}

export function useUnraid(): UseUnraidReturn {
  const configured = useConfigStore((s) => {
    const { url, apiKey } = s.services.unraid as { url: string; apiKey: string }
    return !!(url?.trim() && apiKey?.trim())
  })

  const [info, setInfo] = useState<UnraidInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async () => {
    if (!isUnraidConfigured()) return
    const { url, apiKey } = getUnraidConfig()
    try {
      const res = await proxyPost(
        `${url}/graphql`,
        { query: QUERY },
        { 'X-Authorization': `Bearer ${apiKey}`, 'X-Requested-With': 'XMLHttpRequest' }
      )
      const text = await res.text()
      let data: any
      try { data = JSON.parse(text) } catch {
        throw new Error(`Not valid JSON — got: ${text.slice(0, 80)}`)
      }
      if (data.errors) throw new Error(data.errors[0]?.message ?? 'GraphQL error')

      const d = data.data
      const allDisks = [
        ...(d.array?.disks     ?? []),
        ...(d.array?.parities  ?? []),
        ...(d.array?.caches    ?? []),
      ]
      setInfo({
        arrayState: d.array?.state ?? 'unknown',
        disks: allDisks,
        cpuUsage: 0,
        memTotal: 0,
        memFree:  0,
      })
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

  return { info, loading, error }
}
