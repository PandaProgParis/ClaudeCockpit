import { useState, useEffect, useRef, useCallback } from 'react'
import type { SessionMessage } from '../lib/types'

interface UseLiveSessionMessagesReturn {
  messages: SessionMessage[]
  loading: boolean
  error: string | null
}

/**
 * Like useSessionMessages but auto-refreshes every `intervalMs` while active.
 * Designed for live-viewing active sessions on the dashboard.
 */
export function useLiveSessionMessages(
  sessionId: string | null,
  projectPath: string,
  intervalMs = 3000
): UseLiveSessionMessagesReturn {
  const [messages, setMessages] = useState<SessionMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchMessages = useCallback((signal?: AbortSignal) => {
    if (!sessionId) return Promise.resolve()
    const params = new URLSearchParams({ projectPath })
    return fetch(`/api/sessions/${sessionId}/messages?${params}`, { signal })
      .then(r => r.ok ? r.json() as Promise<SessionMessage[]> : Promise.reject(r.statusText))
      .then(data => { setMessages(data); setError(null) })
      .catch(e => { if ((e as any)?.name !== 'AbortError') setError(String(e)) })
  }, [sessionId, projectPath])

  useEffect(() => {
    if (!sessionId) {
      setMessages([])
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setMessages([])

    fetchMessages(controller.signal).finally(() => setLoading(false))

    // Auto-refresh
    intervalRef.current = setInterval(() => {
      fetchMessages(controller.signal)
    }, intervalMs)

    return () => {
      controller.abort()
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [sessionId, projectPath, intervalMs, fetchMessages])

  return { messages, loading, error }
}
