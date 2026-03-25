import { useState, useEffect, useCallback } from 'react'
import type { UsageData } from '../lib/types'

export function useUsage() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUsage = useCallback(async () => {
    try {
      const resp = await fetch('/api/usage')
      const data = await resp.json()
      setUsage(data)
    } catch { /* silent fail */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchUsage()
    // Poll every 5 minutes
    const interval = setInterval(fetchUsage, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchUsage])

  const submitManualUsage = useCallback(async (jsonStr: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonStr)
      const resp = await fetch('/api/usage/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })
      if (!resp.ok) return false
      const data = await resp.json()
      setUsage(data)
      return true
    } catch {
      return false
    }
  }, [])

  // Called from SSE handler in App
  const onUsageUpdated = useCallback((data: UsageData) => {
    setUsage(data)
  }, [])

  return { usage, loading, refresh: fetchUsage, onUsageUpdated, submitManualUsage }
}
