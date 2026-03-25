import { join } from 'path'
import { homedir } from 'os'
import { findSessionDirBySessionId, resolveProjectDirName, parallel, streamLines } from './history-parser'
import type { SearchScope, SearchResult, SessionEntry } from '../renderer/lib/types'

// PROJECTS_DIR is not exported from history-parser.ts, so we keep it local here.
const PROJECTS_DIR = join(homedir(), '.claude', 'projects')

// ─── Internal index ───────────────────────────────────────────

interface IndexedSession {
  sessionId:     string
  projectPath:   string
  userMessages:  string[]
  assistantText: string[]
  filePaths:     string[]
}

let index: IndexedSession[] = []

// Used for tests — allows injecting raw data without file I/O
export function buildIndexFromRaw(data: IndexedSession[]): void {
  index = data
}

// ─── JSONL parsing ────────────────────────────────────────────

async function extractIndexData(filePath: string): Promise<Omit<IndexedSession, 'sessionId' | 'projectPath'>> {
  const userMessages:  string[] = []
  const assistantText: string[] = []
  const filePaths:     string[] = []

  let lines: string[]
  try {
    lines = await streamLines(filePath)
  } catch {
    return { userMessages, assistantText, filePaths }
  }

  const seenMsgIds = new Set<string>()

  for (const line of lines) {
    let entry: any
    try { entry = JSON.parse(line) } catch { continue }

    // User messages
    if (entry.type === 'user' && entry.message) {
      const msg = entry.message
      if (typeof msg.content === 'string' && msg.content) {
        userMessages.push(msg.content)
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'text' && block.text) userMessages.push(block.text)
        }
      }
    }

    // Assistant messages (deduplicated by message.id)
    if (entry.type === 'assistant' && entry.message?.id) {
      if (seenMsgIds.has(entry.message.id)) continue
      seenMsgIds.add(entry.message.id)

      if (Array.isArray(entry.message.content)) {
        for (const block of entry.message.content) {
          if (block.type === 'text' && block.text) assistantText.push(block.text)
          if (block.type === 'tool_use' && block.input) {
            const input = block.input as Record<string, unknown>
            const path = input.path ?? input.file_path
            if (typeof path === 'string' && path) filePaths.push(path)
          }
        }
      }
    }
  }

  return { userMessages, assistantText, filePaths }
}

// ─── Public API ───────────────────────────────────────────────

export async function buildIndex(sessions: SessionEntry[]): Promise<void> {
  const entries = await parallel(sessions, 20, async (s) => {
    let dir = s.projectPath
      ? join(PROJECTS_DIR, resolveProjectDirName(s.projectPath))
      : null
    // Fallback: scan for the file
    if (!dir) dir = await findSessionDirBySessionId(s.sessionId)
    if (!dir) return null

    const filePath = join(dir, `${s.sessionId}.jsonl`)
    const data = await extractIndexData(filePath)
    return { sessionId: s.sessionId, projectPath: s.projectPath, ...data }
  })
  index = entries.filter((e): e is IndexedSession => e !== null)
}

export async function updateIndexForSession(sessionId: string, projectPath: string): Promise<void> {
  const dir = projectPath
    ? join(PROJECTS_DIR, resolveProjectDirName(projectPath))
    : await findSessionDirBySessionId(sessionId)
  if (!dir) return

  const filePath = join(dir, `${sessionId}.jsonl`)
  const data = await extractIndexData(filePath)
  const existing = index.findIndex(e => e.sessionId === sessionId)
  const entry = { sessionId, projectPath, ...data }
  if (existing >= 0) index[existing] = entry
  else index.push(entry)
}

// ─── Snippet building ─────────────────────────────────────────

function buildSnippet(text: string, query: string): SearchResult['snippet'] {
  const lower = text.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())
  if (idx < 0) return { before: '', match: text.slice(0, 40), after: '' }
  const before = text.slice(Math.max(0, idx - 80), idx)
  const match  = text.slice(idx, idx + query.length)
  const after  = text.slice(idx + query.length, idx + query.length + 80)
  return { before, match, after }
}

// ─── Search ───────────────────────────────────────────────────

export function searchIndex(query: string, scope: SearchScope): SearchResult[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  const results: SearchResult[] = []

  for (const session of index) {
    let matched = false

    if (scope.user && !matched) {
      for (const msg of session.userMessages) {
        if (msg.toLowerCase().includes(q)) {
          results.push({ sessionId: session.sessionId, projectPath: session.projectPath, matchedIn: 'user', snippet: buildSnippet(msg, query) })
          matched = true
          break
        }
      }
    }

    if (scope.files && !matched) {
      for (const fp of session.filePaths) {
        if (fp.toLowerCase().includes(q)) {
          results.push({ sessionId: session.sessionId, projectPath: session.projectPath, matchedIn: 'file', snippet: buildSnippet(fp, query) })
          matched = true
          break
        }
      }
    }

    if (scope.assistant && !matched) {
      for (const text of session.assistantText) {
        if (text.toLowerCase().includes(q)) {
          results.push({ sessionId: session.sessionId, projectPath: session.projectPath, matchedIn: 'assistant', snippet: buildSnippet(text, query) })
          matched = true
          break
        }
      }
    }
  }

  return results
}
