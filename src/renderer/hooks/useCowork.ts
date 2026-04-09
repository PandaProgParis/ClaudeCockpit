import { useState, useEffect, useCallback } from 'react'
import type { CoworkData } from '../lib/types'

const EMPTY: CoworkData = { spaces: [], sessions: [], plugins: [] }

interface UseCoworkReturn {
  data: CoworkData
  loading: boolean
  refreshing: boolean
  refresh: () => Promise<void>
}

export function useCowork(): UseCoworkReturn {
  const [data, setData] = useState<CoworkData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const doFetch = () =>
      fetch('/api/cowork')
        .then(r => r.json() as Promise<CoworkData>)
        .then(d => {
          setData(d)
          setLoading(false)
        })
        .catch(() => {
          setLoading(false)
        })

    doFetch()
    const interval = setInterval(doFetch, 5_000)
    return () => clearInterval(interval)
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const d: CoworkData = await fetch('/api/cowork/refresh').then(r => r.json())
      setData(d)
    } catch { /* silent */ }
    setRefreshing(false)
  }, [])

  return { data, loading, refreshing, refresh }
}
