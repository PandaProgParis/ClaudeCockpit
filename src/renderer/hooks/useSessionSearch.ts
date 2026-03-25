import { useState, useEffect, useRef } from 'react'
import type { SearchScope, SearchResult } from '../lib/types'

interface UseSessionSearchReturn {
  results: SearchResult[]
  loading: boolean
  error: string | null
}

export function useSessionSearch(
  query: string,
  scope: SearchScope
): UseSessionSearchReturn {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (!query.trim()) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    let controller: AbortController | null = null

    timerRef.current = setTimeout(() => {
      controller = new AbortController()
      const activeParts = (Object.entries(scope) as [string, boolean][])
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(',')

      const params = new URLSearchParams({ q: query, scope: activeParts })
      fetch(`/api/search?${params}`, { signal: controller.signal })
        .then(r => r.ok ? r.json() as Promise<SearchResult[]> : Promise.reject(r.statusText))
        .then(data => { setResults(data); setLoading(false) })
        .catch(e => { if ((e as any)?.name !== 'AbortError') { setError(String(e)); setLoading(false) } })
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      controller?.abort()
    }
  }, [query, scope.user, scope.assistant, scope.files])

  return { results, loading, error }
}
