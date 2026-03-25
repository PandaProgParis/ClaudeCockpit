import { useState, useEffect, useCallback, useRef } from 'react'
import type { ActiveSession, SSEEvent } from '../lib/types'

export interface ActiveSessionWithSpeed extends ActiveSession {
  tokensPerSecond: number
}

export function useActiveSessions() {
  const [sessions, setSessions] = useState<ActiveSessionWithSpeed[]>([])
  const [loading, setLoading] = useState(true)
  const prevTokens = useRef<Map<string, { total: number; timestamp: number; smoothedSpeed: number }>>(new Map())

  const enrichWithSpeed = useCallback((raw: ActiveSession[]): ActiveSessionWithSpeed[] => {
    const now = Date.now()
    const prev = prevTokens.current

    const enriched = raw.map((s) => {
      const total = s.tokens.input + s.tokens.output + s.tokens.cacheCreation + s.tokens.cacheRead
      const last = prev.get(s.sessionId)
      let tokensPerSecond = 0

      if (last) {
        const dtSec = (now - last.timestamp) / 1000
        if (dtSec > 0) {
          const instantSpeed = Math.max(0, (total - last.total) / dtSec)
          // Exponential moving average: smooth over ~5s
          const alpha = instantSpeed > 0 ? 0.4 : 0.15
          tokensPerSecond = last.smoothedSpeed * (1 - alpha) + instantSpeed * alpha
          // Floor small values to 0
          if (tokensPerSecond < 1) tokensPerSecond = 0
        }
      }

      prev.set(s.sessionId, { total, timestamp: now, smoothedSpeed: tokensPerSecond })
      return { ...s, tokensPerSecond }
    })

    // Cleanup old entries
    const activeIds = new Set(raw.map((s) => s.sessionId))
    for (const id of prev.keys()) {
      if (!activeIds.has(id)) prev.delete(id)
    }

    return enriched
  }, [])

  useEffect(() => {
    fetch('/api/active')
      .then((r) => r.json())
      .then((data: ActiveSession[]) => {
        setSessions(enrichWithSpeed(data))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [enrichWithSpeed])

  const onSSEEvent = useCallback((event: SSEEvent) => {
    switch (event.type) {
      case 'session:active':
        setSessions((prev) => {
          const idx = prev.findIndex((s) => s.sessionId === event.data.sessionId)
          const enriched = { ...event.data, tokensPerSecond: 0 } as ActiveSessionWithSpeed
          if (idx >= 0) {
            const updated = [...prev]
            updated[idx] = enriched
            return updated
          }
          return [...prev, enriched]
        })
        break
      case 'session:idle':
        setSessions((prev) =>
          prev.map((s) =>
            s.sessionId === event.data.sessionId
              ? { ...s, status: 'idle' as const, lastActivityAt: event.data.lastActivityAt, tokensPerSecond: 0 }
              : s
          )
        )
        break
      case 'session:ended':
        setSessions((prev) => prev.filter((s) => s.sessionId !== event.data.sessionId))
        break
    }
  }, [])

  const refresh = useCallback(() => {
    fetch('/api/active')
      .then((r) => r.json())
      .then((data: ActiveSession[]) => setSessions(enrichWithSpeed(data)))
      .catch(() => {})
  }, [enrichWithSpeed])

  return { sessions, loading, onSSEEvent, refresh }
}
