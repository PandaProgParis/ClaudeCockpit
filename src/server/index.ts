import express from 'express'
import { join, resolve, normalize, sep } from 'path'
import { homedir } from 'os'
import { readFile, stat } from 'fs/promises'
import { parseAllSessions, findSessionDirBySessionId, streamLines, resolveProjectDirName } from './history-parser'
import { computeStats } from './stats'
import { addClient, broadcast } from './sse'
import { fetchUsage, normalizeUsageResponse } from './usage-api'
import { processUsageUpdate } from './usage-processor'
import { readConfig, removePermission } from './config-reader'
import { getActiveSessions, startWatcher } from './session-watcher'
import { getHiddenSessions, hideSession, unhideSession, deleteSession } from './session-manager'
import { readAppData, writeAppData } from './app-data'
import { getCalibrationData } from './calibration'
import { buildIndex, updateIndexForSession, searchIndex, rebuildIndex } from './session-index'
import { parseCoworkData, invalidateCoworkCache } from './cowork-parser'
import type { SearchScope, SessionMessage, AssistantContentBlock } from '../renderer/lib/types'
import type { SessionEntry } from '../renderer/lib/types'
import type { UsageData } from '../renderer/lib/types'

const app = express()
const PORT = 3001
const IS_PROD = process.env.NODE_ENV === 'production' || process.env.ELECTRON === '1'

// Middleware for POST/DELETE routes
app.use(express.json())

// In-memory cache — cleared on refresh
let cache: SessionEntry[] | null = null
let cachePromise: Promise<SessionEntry[]> | null = null

async function getSessions(): Promise<SessionEntry[]> {
  if (cache) return cache
  if (!cachePromise) {
    cachePromise = parseAllSessions((done, total) => {
      broadcast('parse:progress', { done, total })
    }).then(result => {
      cache = result
      cachePromise = null
      return result
    })
  }
  return cachePromise
}

app.get('/api/history', async (_req, res) => {
  try {
    const sessions = await getSessions()
    res.json(sessions)
  } catch {
    res.status(500).json({ error: 'Failed to parse history' })
  }
})

app.get('/api/history/refresh', async (_req, res) => {
  try {
    cache = await parseAllSessions((done, total) => {
      broadcast('parse:progress', { done, total })
    })
    res.json(cache)
  } catch {
    res.status(500).json({ error: 'Failed to refresh history' })
  }
})

app.get('/api/stats', async (_req, res) => {
  try {
    res.json(computeStats(await getSessions()))
  } catch {
    res.status(500).json({ error: 'Failed to compute stats' })
  }
})

// SSE
app.get('/api/events', (req, res) => {
  addClient(res)
})

// Usage (with cache fallback)
app.get('/api/usage', async (_req, res) => {
  try {
    let usage = await fetchUsage()
    if (usage) {
      await writeAppData('usage-cache.json', usage)
    } else {
      usage = await readAppData<UsageData | null>('usage-cache.json', null)
    }
    res.json(usage)
  } catch {
    res.status(500).json({ error: 'Failed to fetch usage' })
  }
})

app.post('/api/usage/manual', async (req, res) => {
  try {
    const raw = req.body
    let usage: UsageData
    if (raw.five_hour !== undefined || raw.seven_day !== undefined) {
      usage = normalizeUsageResponse(raw, 'manual')
    } else {
      usage = { ...raw, fetchedAt: new Date().toISOString(), source: 'manual' as const }
    }
    await processUsageUpdate(usage, await getSessions())
    res.json(usage)
  } catch {
    res.status(500).json({ error: 'Failed to save manual usage' })
  }
})

app.post('/api/usage/inject', async (req, res) => {
  try {
    const raw = req.body
    // Validate required structure
    if (typeof raw !== 'object' || raw === null) {
      return res.status(400).json({ error: 'Invalid body' })
    }
    if (!raw.five_hour && !raw.seven_day && !raw.seven_day_sonnet && !raw.seven_day_opus) {
      return res.status(400).json({ error: 'No usage data found in body' })
    }
    const usage = normalizeUsageResponse(raw, 'extension')
    await processUsageUpdate(usage, await getSessions())
    res.json(usage)
  } catch {
    res.status(500).json({ error: 'Failed to process injected usage' })
  }
})

// Active sessions
app.get('/api/active', async (_req, res) => {
  try {
    res.json(await getActiveSessions())
  } catch {
    res.status(500).json({ error: 'Failed to get active sessions' })
  }
})

// Server info (port for external tools / Chrome extension)
app.get('/api/info', (_req, res) => {
  res.json({ port: parseInt(process.env.PUBLIC_PORT || '') || PORT })
})

// Config
app.get('/api/config', async (_req, res) => {
  try {
    res.json(await readConfig())
  } catch {
    res.status(500).json({ error: 'Failed to read config' })
  }
})

// File content (for skill viewer)
app.get('/api/file-content', async (req, res) => {
  try {
    const filePath = req.query.path as string
    if (!filePath) return res.status(400).json({ error: 'Missing path parameter' })

    const home = homedir()
    const allowedDirs = [
      resolve(join(home, '.claude', 'skills')),
      resolve(join(home, '.claude', 'plugins', 'cache')),
    ]

    const resolved = resolve(filePath)
    const norm = (p: string) => normalize(p).toLowerCase()
    const isAllowed = allowedDirs.some(dir => norm(resolved).startsWith(norm(dir)))
    if (!isAllowed) return res.status(403).json({ error: 'Path not allowed' })

    const fileStat = await stat(resolved)
    if (fileStat.size > 1_000_000) return res.status(413).json({ error: 'File too large' })

    const content = await readFile(resolved, 'utf-8')
    res.json({ content })
  } catch (err: any) {
    if (err?.code === 'ENOENT') return res.status(404).json({ error: 'File not found' })
    res.status(500).json({ error: 'Failed to read file' })
  }
})

app.delete('/api/permissions', async (req, res) => {
  try {
    const { rule, type, source } = req.body
    if (!rule || !type || !source) return res.status(400).json({ error: 'Missing rule, type, or source' })
    await removePermission(rule, type, source)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to remove permission' })
  }
})

app.post('/api/open-file', async (req, res) => {
  try {
    const { path: filePath } = req.body
    if (!filePath || typeof filePath !== 'string') return res.status(400).json({ error: 'Missing path' })

    const resolved = resolve(filePath)
    const home = homedir()
    const allowedDirs = [
      resolve(join(home, '.claude')),
      resolve(join(home, '.claude-cockpit')),
    ]
    const norm = (p: string) => normalize(p).toLowerCase().replace(/[/\\]$/, '') + sep
    if (!allowedDirs.some(dir => norm(resolved).startsWith(norm(dir)))) {
      return res.status(403).json({ error: 'Path not allowed' })
    }

    const { default: open } = await import('open')
    await open(resolved)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to open file' })
  }
})

// Search
app.get('/api/search', (req, res) => {
  try {
    const q = req.query.q as string
    const scopeParam = (req.query.scope as string) ?? 'user,assistant'
    const parts = scopeParam.split(',').map(s => s.trim())
    const scope: SearchScope = {
      user:      parts.includes('user'),
      assistant: parts.includes('assistant'),
      files:     parts.includes('files'),
    }
    res.json(searchIndex(q ?? '', scope))
  } catch {
    res.status(500).json({ error: 'Search failed' })
  }
})

// Session management
app.get('/api/sessions/hidden', async (_req, res) => {
  try {
    res.json(await getHiddenSessions())
  } catch {
    res.status(500).json({ error: 'Failed to get hidden sessions' })
  }
})

// Session messages (for viewer)
app.get('/api/sessions/:id/messages', async (req, res) => {
  try {
    const { id } = req.params
    if (!/^[a-zA-Z0-9-]+$/.test(id)) return res.status(400).json({ error: 'Invalid session ID' })

    const projectPath = req.query.projectPath as string | undefined
    const projectsBase = resolve(join(homedir(), '.claude', 'projects'))

    let sessionFilePath: string | null = null

    if (projectPath) {
      const encoded = resolveProjectDirName(projectPath)
      const candidate = resolve(join(projectsBase, encoded, `${id}.jsonl`))
      if (candidate.startsWith(projectsBase)) {
        try { await stat(candidate); sessionFilePath = candidate } catch { /* file doesn't exist, try fallback */ }
      }
    }

    if (!sessionFilePath) {
      const dir = await findSessionDirBySessionId(id)
      if (dir) sessionFilePath = resolve(join(dir, `${id}.jsonl`))
    }

    if (!sessionFilePath || !sessionFilePath.startsWith(projectsBase)) {
      return res.status(404).json({ error: 'Session not found' })
    }

    let lines: string[]
    try {
      lines = await streamLines(sessionFilePath)
    } catch {
      return res.status(404).json({ error: 'Session file not found' })
    }

    const messages: SessionMessage[] = []
    const seenMsgIds = new Set<string>()

    for (const line of lines) {
      let entry: any
      try { entry = JSON.parse(line) } catch { continue }

      if (entry.type === 'user' && entry.message && entry.timestamp) {
        let content = ''
        if (typeof entry.message.content === 'string') content = entry.message.content
        else if (Array.isArray(entry.message.content)) {
          content = entry.message.content
            .filter((b: any) => b.type === 'text')
            .map((b: any) => b.text)
            .join('\n')
        }
        if (content) messages.push({ type: 'user', content, timestamp: entry.timestamp })
      }

      if (entry.type === 'assistant' && entry.message?.id && entry.timestamp) {
        if (seenMsgIds.has(entry.message.id)) continue
        seenMsgIds.add(entry.message.id)

        const content: AssistantContentBlock[] = Array.isArray(entry.message.content)
          ? entry.message.content.filter((b: any) =>
              ['text', 'thinking', 'tool_use', 'tool_result'].includes(b.type)
            )
          : []

        const usage = entry.message.usage
        const tokens = usage ? {
          inputTokens:              usage.input_tokens ?? 0,
          outputTokens:             usage.output_tokens ?? 0,
          cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
          cacheReadInputTokens:     usage.cache_read_input_tokens ?? 0,
        } : undefined

        messages.push({ type: 'assistant', content, timestamp: entry.timestamp, tokens })
      }
    }

    res.json(messages)
  } catch {
    res.status(500).json({ error: 'Failed to read session messages' })
  }
})

app.post('/api/sessions/:id/hide', async (req, res) => {
  try {
    await hideSession(req.params.id)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to hide session' })
  }
})

app.post('/api/sessions/:id/unhide', async (req, res) => {
  try {
    await unhideSession(req.params.id)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to unhide session' })
  }
})

app.delete('/api/sessions/:id', async (req, res) => {
  try {
    const { projectPath } = req.body
    await deleteSession(req.params.id, projectPath || '')
    cache = null // invalidate cache
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to delete session' })
  }
})

// App settings
app.get('/api/settings', async (_req, res) => {
  try {
    const settings = await readAppData('settings.json', { refreshIntervalMs: 5000 })
    res.json(settings)
  } catch {
    res.status(500).json({ error: 'Failed to read settings' })
  }
})

app.post('/api/settings', async (req, res) => {
  try {
    await writeAppData('settings.json', req.body)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to save settings' })
  }
})

// Prices
app.get('/api/prices', async (_req, res) => {
  try {
    const { DEFAULT_PRICES } = await import('../renderer/lib/cost')
    const prices = await readAppData('prices.json', DEFAULT_PRICES)
    res.json(prices)
  } catch {
    res.status(500).json({ error: 'Failed to read prices' })
  }
})

app.post('/api/prices', async (req, res) => {
  try {
    await writeAppData('prices.json', req.body)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to save prices' })
  }
})

// Carbon factors
app.get('/api/carbon-factors', async (_req, res) => {
  try {
    const { DEFAULT_CARBON_FACTORS } = await import('../renderer/lib/carbon')
    const factors = await readAppData('carbon-factors.json', DEFAULT_CARBON_FACTORS)
    res.json(factors)
  } catch {
    res.status(500).json({ error: 'Failed to read carbon factors' })
  }
})

app.post('/api/carbon-factors', async (req, res) => {
  try {
    await writeAppData('carbon-factors.json', req.body)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to save carbon factors' })
  }
})

// Calibration
app.get('/api/calibration', async (_req, res) => {
  try {
    res.json(await getCalibrationData())
  } catch {
    res.status(500).json({ error: 'Failed to read calibration' })
  }
})

// Cowork
app.get('/api/cowork', async (_req, res) => {
  try {
    const data = await parseCoworkData()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse Cowork data' })
  }
})

app.get('/api/cowork/refresh', async (_req, res) => {
  try {
    invalidateCoworkCache()
    const data = await parseCoworkData()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Failed to refresh Cowork data' })
  }
})

app.post('/api/session-index/rebuild', async (_req, res) => {
  try {
    const index = await rebuildIndex()
    const count = Object.keys(index.sessions).length
    res.json({ success: true, sessionCount: count, builtAt: index.builtAt })
  } catch (err) {
    res.status(500).json({ error: 'Failed to rebuild session index' })
  }
})

if (IS_PROD) {
  const clientPath = join(__dirname, '../../dist/client')
  console.log(`[server] serving client from: ${clientPath}`)
  app.use(express.static(clientPath))
  app.get('{*path}', (_req, res) => {
    res.sendFile(join(clientPath, 'index.html'))
  })
}

export function startServer(): Promise<void> {
  return new Promise((resolve) => {
    app.listen(PORT, async () => {
      const url = `http://localhost:${PORT}`
      console.log(`Claude History Viewer → ${url}`)

      // Build session index FIRST (must complete before parsing sessions)
      try {
        const idx = await rebuildIndex()
        console.log(`Session index built: ${Object.keys(idx.sessions).length} sessions`)
      } catch (err) {
        console.error('Failed to build session index:', err)
      }

      // Start session watcher with SSE broadcasting
      console.log('Starting session watcher...')
      startWatcher((event) => {
        console.log(`[SSE] ${event.type}`, 'data' in event ? ('sessionId' in event.data ? event.data.sessionId.substring(0, 8) : '') : '')
        broadcast(event.type, event.data)
        if (event.type === 'session:active') {
          updateIndexForSession(event.data.sessionId, event.data.projectPath).catch(() => {})
        }
      })

      // Build search index after initial session parse (index is ready now)
      getSessions().then(sessions => buildIndex(sessions)).catch(() => {})

      // Start usage polling (every 5 minutes)
      setInterval(async () => {
        try {
          const usage = await fetchUsage()
          if (usage) {
            await processUsageUpdate(usage, await getSessions())
          }
        } catch { /* silent fail */ }
      }, 5 * 60 * 1000)

      if (IS_PROD && !process.env.DOCKER && !process.env.ELECTRON) {
        const { default: open } = await import('open')
        open(url).catch(() => {})
      }

      resolve()
    })
  })
}

// Auto-start when run directly (not imported by Electron)
if (!process.env.ELECTRON) {
  startServer()
}
