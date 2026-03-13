import { useState, useEffect, useCallback, useRef } from 'react'
import useConfigStore from '@/store/useConfigStore'
import { proxyFetch } from '@/lib/proxyFetch'

export interface DiscordMessage {
  id: string
  content: string
  timestamp: string
  author: {
    username: string
    avatar: string | null
    id: string
  }
  embeds?: {
    title?: string
    description?: string
    color?: number
    fields?: { name: string; value: string; inline?: boolean }[]
    footer?: { text: string }
    author?: { name: string }
  }[]
}

interface UseDiscordReturn {
  messages: DiscordMessage[]
  loading: boolean
  error: string | null
}

const POLL_INTERVAL = 30000

function getBotToken() {
  const { botToken } = useConfigStore.getState().services.discord as { botToken: string }
  return botToken?.trim() ?? ''
}

export function useDiscordChannel(channelId: string): UseDiscordReturn {
  const configured = useConfigStore((s) => {
    const { botToken } = s.services.discord as { botToken: string }
    return !!(botToken?.trim() && channelId?.trim())
  })

  const [messages, setMessages] = useState<DiscordMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchMessages = useCallback(async () => {
    const botToken = getBotToken()
    if (!botToken || !channelId) return
    try {
      const res = await proxyFetch(
        `https://discord.com/api/v10/channels/${channelId}/messages?limit=50`,
        { 'X-Authorization': `Bot ${botToken}` }
      )
      const text = await res.text()
      let data: any
      try { data = JSON.parse(text) } catch {
        throw new Error(`Not valid JSON — got: ${text.slice(0, 80)}`)
      }
      if (data.message) throw new Error(data.message)
      setMessages(Array.isArray(data) ? data : [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect')
    } finally {
      setLoading(false)
    }
  }, [channelId])

  useEffect(() => {
    if (!configured) return
    setLoading(true)
    fetchMessages()
    timerRef.current = setInterval(fetchMessages, POLL_INTERVAL)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [configured, fetchMessages])

  return { messages, loading, error }
}
