import type { SSEEvent } from './types'

type SSEHandler = (event: SSEEvent) => void

export function connectSSE(onEvent: SSEHandler): EventSource {
  const es = new EventSource('/api/events')
  const eventTypes = ['session:active', 'session:idle', 'session:ended', 'usage:updated'] as const
  for (const type of eventTypes) {
    es.addEventListener(type, (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data)
        onEvent({ type, data } as SSEEvent)
      } catch { /* ignore parse errors */ }
    })
  }
  return es
}
