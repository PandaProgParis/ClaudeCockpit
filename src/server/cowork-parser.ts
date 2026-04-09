import * as fs from 'fs'
import * as path from 'path'
import type { CoworkData, CoworkPlugin, CoworkSession, CoworkSpace } from '../renderer/lib/types'

// ───────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────

/** Get total size of a directory (recursive, max depth 3 for speed) */
function getDirSize(dirPath: string, depth = 0): number {
  if (depth > 3) return 0
  let total = 0
  try {
    const entries = fs.readdirSync(dirPath)
    for (const entry of entries) {
      try {
        const fullPath = path.join(dirPath, entry)
        const st = fs.statSync(fullPath)
        if (st.isFile()) total += st.size
        else if (st.isDirectory()) total += getDirSize(fullPath, depth + 1)
      } catch { /* skip inaccessible */ }
    }
  } catch { /* dir not readable */ }
  return total
}

// ───────────────────────────────────────────────────────────────────────
// Pure Parsing Functions (exported for testing)
// ───────────────────────────────────────────────────────────────────────

/**
 * Filters Record<string, boolean> to keep only keys with true values.
 * Returns empty array for null/undefined input.
 */
export function filterEnabledMcpTools(tools: Record<string, boolean> | null | undefined): string[] {
  if (!tools) return []
  return Object.entries(tools)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key)
    .sort()
}

/**
 * Parses a single local_*.json session metadata file.
 * Computes durationSeconds from createdAt and lastActivityAt.
 */
export function parseCoworkSessionMeta(raw: Record<string, unknown>, sdkVersion: string): CoworkSession {
  const createdAtMs = Number(raw.createdAt) || 0
  const lastActivityAtMs = Number(raw.lastActivityAt) || 0
  const durationSeconds = Math.max(0, Math.floor((lastActivityAtMs - createdAtMs) / 1000))

  return {
    sessionId: String(raw.sessionId || ''),
    title: String(raw.title || ''),
    model: String(raw.model || 'unknown'),
    initialMessage: String(raw.initialMessage || ''),
    createdAt: new Date(createdAtMs).toISOString(),
    lastActivityAt: new Date(lastActivityAtMs).toISOString(),
    durationSeconds,
    isArchived: Boolean(raw.isArchived),
    processName: String(raw.vmProcessName || ''),
    sdkVersion,
    enabledMcpTools: filterEnabledMcpTools(raw.enabledMcpTools as Record<string, boolean> | null),
    slashCommands: Array.isArray(raw.slashCommands) ? (raw.slashCommands as string[]) : [],
    hostLoopMode: Boolean(raw.hostLoopMode),
    estimatedCostUSD: 0,
    tokens: {
      input: 0,
      output: 0,
      cacheCreation: 0,
      cacheRead: 0,
      total: 0,
    },
  }
}

/**
 * Parses audit.jsonl lines, summing cost and token counts from "result" entries.
 * Returns aggregated cost and token data.
 */
export function parseAuditResults(
  lines: string[]
): {
  estimatedCostUSD: number
  tokens: {
    input: number
    output: number
    cacheCreation: number
    cacheRead: number
    total: number
  }
} {
  let estimatedCostUSD = 0
  let inputTokens = 0
  let outputTokens = 0
  let cacheCreationTokens = 0
  let cacheReadTokens = 0

  for (const line of lines) {
    try {
      const entry = JSON.parse(line)
      if (entry.type === 'result' && entry.total_cost_usd) {
        estimatedCostUSD += entry.total_cost_usd

        if (entry.usage) {
          inputTokens += entry.usage.input_tokens || 0
          outputTokens += entry.usage.output_tokens || 0
          cacheCreationTokens += entry.usage.cache_creation_input_tokens || 0
          cacheReadTokens += entry.usage.cache_read_input_tokens || 0
        }
      }
    } catch {
      // Skip malformed lines
    }
  }

  const total = inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens

  return {
    estimatedCostUSD,
    tokens: {
      input: inputTokens,
      output: outputTokens,
      cacheCreation: cacheCreationTokens,
      cacheRead: cacheReadTokens,
      total,
    },
  }
}

/**
 * Parses spaces.json content.
 * Extracts folder paths from the nested [{path: ...}] format.
 */
export function parseSpaces(
  raw: Record<string, unknown> | null
): Omit<CoworkSpace, 'sessionCount' | 'totalCostUSD' | 'folderSizeBytes'>[] {
  if (!raw || !Array.isArray(raw.spaces)) return []

  return (raw.spaces as Array<Record<string, unknown>>).map((space) => {
    const folders = Array.isArray(space.folders)
      ? (space.folders as Array<{ path?: string }>).map((f) => f.path || '').filter(Boolean)
      : []

    return {
      id: String(space.id || ''),
      name: String(space.name || ''),
      folders,
      instructions: String(space.instructions || ''),
      createdAt: new Date(Number(space.createdAt) || 0).toISOString(),
      updatedAt: new Date(Number(space.updatedAt) || 0).toISOString(),
    }
  })
}

/**
 * Parses rpm/manifest.json plugin list.
 */
export function parsePluginManifest(raw: Record<string, unknown> | null): CoworkPlugin[] {
  if (!raw || !Array.isArray(raw.plugins)) return []

  return (raw.plugins as Array<Record<string, unknown>>).map((plugin) => ({
    id: String(plugin.id || ''),
    name: String(plugin.name || ''),
    marketplaceName: String(plugin.marketplaceName || ''),
    installedBy: String(plugin.installedBy || ''),
  }))
}

// ───────────────────────────────────────────────────────────────────────
// I/O Layer
// ───────────────────────────────────────────────────────────────────────

/**
 * Returns the base path for Cowork sessions on Windows.
 */
export function getCoworkBasePath(): string {
  const appData = process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming')
  return path.join(appData, 'Claude', 'local-agent-mode-sessions')
}

/**
 * Detects SDK version by scanning %APPDATA%/Claude/claude-code-vm/ directory.
 * Returns empty string if not found.
 */
export function detectSdkVersion(): string {
  const appData = process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming')
  const vmPath = path.join(appData, 'Claude', 'claude-code-vm')

  if (!fs.existsSync(vmPath)) return ''

  try {
    const entries = fs.readdirSync(vmPath)
    const versionDirs = entries.filter((name) => /^\d+\.\d+\.\d+/.test(name))
    if (versionDirs.length > 0) {
      versionDirs.sort()
      const lastVersion = versionDirs[versionDirs.length - 1]
      const match = lastVersion.match(/^\d+\.\d+\.\d+/)
      if (match) return match[0]
    }
  } catch {
    // Ignore read errors
  }

  return ''
}

interface CoworkCacheEntry {
  data: CoworkData
  timestamp: number
}

let coworkDataCache: CoworkCacheEntry | null = null
const CACHE_TTL = 60000 // 1 minute in milliseconds

/**
 * Main entry point: scans workspace/user subdirectories under the Cowork base path,
 * reads spaces.json, local_*.json files, audit.jsonl for each session, and rpm/manifest.json.
 * Returns aggregated CoworkData. Promise-cached with 1-minute TTL.
 * Skips the 'skills-plugin' subdirectory.
 */
export async function parseCoworkData(): Promise<CoworkData> {
  const now = Date.now()
  if (coworkDataCache && now - coworkDataCache.timestamp < CACHE_TTL) {
    return coworkDataCache.data
  }

  const basePath = getCoworkBasePath()
  const sdkVersion = detectSdkVersion()
  const spaces: CoworkSpace[] = []
  const sessions: CoworkSession[] = []
  const plugins: CoworkPlugin[] = []

  if (!fs.existsSync(basePath)) {
    return { spaces, sessions, plugins }
  }

  try {
    const workspaceIds = fs.readdirSync(basePath)

    for (const workspaceId of workspaceIds) {
      // Skip skills-plugin subdirectory
      if (workspaceId === 'skills-plugin') continue

      const workspacePath = path.join(basePath, workspaceId)
      const stat = fs.statSync(workspacePath, { throwIfNoEntry: false })
      if (!stat?.isDirectory()) continue

      // List user directories under workspace
      const userDirs = fs.readdirSync(workspacePath)

      for (const userId of userDirs) {
        const userPath = path.join(workspacePath, userId)
        const userStat = fs.statSync(userPath, { throwIfNoEntry: false })
        if (!userStat?.isDirectory()) continue

        // Parse spaces.json
        const spacesPath = path.join(userPath, 'spaces.json')
        if (fs.existsSync(spacesPath)) {
          try {
            const spacesContent = fs.readFileSync(spacesPath, 'utf-8')
            const spacesRaw = JSON.parse(spacesContent)
            const parsedSpaces = parseSpaces(spacesRaw)
            spaces.push(
              ...parsedSpaces.map(
                (s): CoworkSpace => ({
                  ...s,
                  sessionCount: 0, // Will be computed below
                  totalCostUSD: 0, // Will be computed below
                  folderSizeBytes: s.folders.length > 0 ? getDirSize(s.folders[0]) : null,
                })
              )
            )
          } catch {
            // Ignore parse errors
          }
        }

        // Parse local_*.json files and their audit.jsonl
        const files = fs.readdirSync(userPath)
        for (const file of files) {
          const match = file.match(/^local_(.+)\.json$/)
          if (!match) continue

          const sessionId = match[0].replace(/\.json$/, '')
          const sessionPath = path.join(userPath, file)

          try {
            const sessionContent = fs.readFileSync(sessionPath, 'utf-8')
            const sessionRaw = JSON.parse(sessionContent)
            const coworkSession = parseCoworkSessionMeta(sessionRaw, sdkVersion)

            // Try to read audit.jsonl for this session
            const auditDir = path.join(userPath, sessionId)
            const auditPath = path.join(auditDir, 'audit.jsonl')

            if (fs.existsSync(auditPath)) {
              try {
                const auditContent = fs.readFileSync(auditPath, 'utf-8')
                const auditLines = auditContent.split('\n').filter(Boolean)
                const auditResult = parseAuditResults(auditLines)

                coworkSession.estimatedCostUSD = auditResult.estimatedCostUSD
                coworkSession.tokens = auditResult.tokens
              } catch {
                // Ignore audit parse errors
              }
            }

            sessions.push(coworkSession)
          } catch {
            // Ignore parse errors
          }
        }

        // Parse rpm/manifest.json
        const rpmPath = path.join(userPath, 'rpm', 'manifest.json')
        if (fs.existsSync(rpmPath)) {
          try {
            const rpmContent = fs.readFileSync(rpmPath, 'utf-8')
            const rpmRaw = JSON.parse(rpmContent)
            const parsedPlugins = parsePluginManifest(rpmRaw)
            plugins.push(...parsedPlugins)
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    // Compute sessionCount and totalCostUSD for spaces
    for (const space of spaces) {
      const spaceSessions = sessions.filter((s) => {
        const spaceId = space.id
        // Match sessions to spaces: we assume sessions within the same user/workspace are associated
        // For now, just count all sessions and divide proportionally, or use all
        return true
      })
      space.sessionCount = spaceSessions.length
      space.totalCostUSD = spaceSessions.reduce((sum, s) => sum + s.estimatedCostUSD, 0)
    }
  } catch (error) {
    console.error('Error parsing Cowork data:', error)
  }

  const result = { spaces, sessions, plugins }
  coworkDataCache = { data: result, timestamp: now }
  return result
}

/**
 * Clears the in-memory Cowork data cache to force a refresh on next parseCoworkData() call.
 */
export function invalidateCoworkCache(): void {
  coworkDataCache = null
}
