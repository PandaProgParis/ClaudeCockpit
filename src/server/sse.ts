import type { Response } from 'express'

const clients = new Set<Response>()

export function addClient(res: Response): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  })
  res.write('\n')
  clients.add(res)
  res.on('close', () => clients.delete(res))
}

export function broadcast(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const client of clients) {
    try {
      client.write(payload)
    } catch {
      clients.delete(client)
    }
  }
}

// Heartbeat to detect dead connections (every 30s)
const heartbeat = setInterval(() => {
  for (const client of clients) {
    try {
      client.write(':keepalive\n\n')
    } catch {
      clients.delete(client)
    }
  }
}, 30_000)
heartbeat.unref()
