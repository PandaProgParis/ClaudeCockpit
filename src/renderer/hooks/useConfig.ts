import { useState, useEffect, useCallback } from 'react'
import type { ClaudeConfig } from '../lib/types'

export function useConfig() {
  const [config, setConfig] = useState<ClaudeConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data: ClaudeConfig) => {
        setConfig(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { config, loading, refresh }
}
