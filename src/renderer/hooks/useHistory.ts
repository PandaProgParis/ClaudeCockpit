import { useState, useEffect, useCallback } from 'react'
import type { SessionEntry, GlobalStats } from '../lib/types'

interface UseHistoryReturn {
  sessions: SessionEntry[]
  stats: GlobalStats | null
  loading: boolean
  refreshing: boolean
  progress: { done: number; total: number } | null
  refresh: () => Promise<void>
  hideSession: (id: string) => Promise<void>
  unhideSession: (id: string) => Promise<void>
  deleteSession: (id: string, projectPath: string) => Promise<void>
  showHidden: boolean
  setShowHidden: (v: boolean) => void
  hiddenIds: string[]
}

export function useHistory(): UseHistoryReturn {
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  const [showHidden, setShowHidden] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  useEffect(() => {
    // Listen for parse progress via SSE
    const es = new EventSource('/api/events')
    es.addEventListener('parse:progress', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data)
        setProgress({ done: data.done, total: data.total })
      } catch { /* ignore */ }
    })

    Promise.all([
      fetch('/api/history').then((r) => r.json() as Promise<SessionEntry[]>),
      fetch('/api/stats').then((r) => r.json() as Promise<GlobalStats>),
      fetch('/api/sessions/hidden').then((r) => r.json() as Promise<string[]>),
    ]).then(([data, s, hidden]) => {
      setSessions(data)
      setStats(s)
      setHiddenIds(hidden)
      setLoading(false)
      setProgress(null)
      es.close()
    })

    return () => es.close()
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    // Sequential: stats computed after history is refreshed
    const data: SessionEntry[] = await fetch('/api/history/refresh').then((r) => r.json())
    const s: GlobalStats = await fetch('/api/stats').then((r) => r.json())
    setSessions(data)
    setStats(s)
    setRefreshing(false)
  }, [])

  const hideSession = useCallback(async (id: string) => {
    try {
      await fetch(`/api/sessions/${id}/hide`, { method: 'POST' })
    } catch {
      // Server route may not exist yet — handle locally
    }
    setHiddenIds((prev) => [...prev, id])
  }, [])

  const unhideSession = useCallback(async (id: string) => {
    try {
      await fetch(`/api/sessions/${id}/unhide`, { method: 'POST' })
    } catch {
      // Server route may not exist yet — handle locally
    }
    setHiddenIds((prev) => prev.filter((hid) => hid !== id))
  }, [])

  const deleteSession = useCallback(async (id: string, projectPath: string) => {
    try {
      await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath }),
      })
    } catch {
      // Server route may not exist yet — handle locally
    }
    setSessions((prev) => prev.filter((s) => s.sessionId !== id))
    setHiddenIds((prev) => prev.filter((hid) => hid !== id))
  }, [])

  return { sessions, stats, loading, refreshing, progress, refresh, hideSession, unhideSession, deleteSession, showHidden, setShowHidden, hiddenIds }
}
