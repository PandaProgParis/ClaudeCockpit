import { useState, useEffect } from 'react'
import type { SessionMessage } from '../lib/types'

interface UseSessionMessagesReturn {
  messages: SessionMessage[]
  loading: boolean
  error: string | null
}

export function useSessionMessages(
  sessionId: string | null,
  projectPath: string
): UseSessionMessagesReturn {
  const [messages, setMessages] = useState<SessionMessage[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

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

    const params = new URLSearchParams({ projectPath })
    fetch(`/api/sessions/${sessionId}/messages?${params}`, { signal: controller.signal })
      .then(r => r.ok ? r.json() as Promise<SessionMessage[]> : Promise.reject(r.statusText))
      .then(data => { setMessages(data); setLoading(false) })
      .catch(e => { if ((e as any)?.name !== 'AbortError') { setError(String(e)); setLoading(false) } })

    return () => controller.abort()
  }, [sessionId, projectPath])

  return { messages, loading, error }
}
