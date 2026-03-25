import { readFile, writeFile, rename, unlink } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import { readAppData, writeAppData } from './app-data'
import { findProjectDir } from './history-parser'

const HIDDEN_FILE = 'hidden-sessions.json'
const HISTORY_FILE = join(homedir(), '.claude', 'history.jsonl')

interface HiddenStore { hidden: string[] }

export async function getHiddenSessions(): Promise<string[]> {
  const store = await readAppData<HiddenStore>(HIDDEN_FILE, { hidden: [] })
  return store.hidden
}

export async function hideSession(sessionId: string): Promise<void> {
  const hidden = await getHiddenSessions()
  if (!hidden.includes(sessionId)) {
    hidden.push(sessionId)
    await writeAppData(HIDDEN_FILE, { hidden })
  }
}

export async function unhideSession(sessionId: string): Promise<void> {
  const hidden = await getHiddenSessions()
  await writeAppData(HIDDEN_FILE, { hidden: hidden.filter((id) => id !== sessionId) })
}

export async function deleteSession(sessionId: string, projectPath: string): Promise<void> {
  // Delete session file
  const projectDir = await findProjectDir(projectPath)
  if (projectDir) {
    try { await unlink(join(projectDir, `${sessionId}.jsonl`)) } catch { /* ok */ }
  }

  // Rewrite history.jsonl atomically
  try {
    const raw = await readFile(HISTORY_FILE, 'utf-8')
    const lines = raw.split('\n').filter((line) => {
      if (!line.trim()) return false
      try {
        const entry = JSON.parse(line)
        return entry.sessionId !== sessionId
      } catch { return true }
    })
    const tmpFile = HISTORY_FILE + '.tmp'
    await writeFile(tmpFile, lines.join('\n') + '\n', 'utf-8')
    await rename(tmpFile, HISTORY_FILE)
  } catch { /* ok if file doesn't exist */ }

  // Remove from hidden list
  await unhideSession(sessionId)
}
