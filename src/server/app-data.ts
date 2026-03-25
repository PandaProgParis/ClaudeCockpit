import { readFile, writeFile, rename, mkdir } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'

const APP_DATA_DIR = join(homedir(), '.claude-cockpit')

export async function ensureAppDataDir(): Promise<void> {
  await mkdir(APP_DATA_DIR, { recursive: true })
}

export async function readAppData<T>(filename: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(join(APP_DATA_DIR, filename), 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function writeAppData(filename: string, data: unknown): Promise<void> {
  await ensureAppDataDir()
  const target = join(APP_DATA_DIR, filename)
  const tmp = target + '.tmp'
  await writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8')
  await rename(tmp, target)
}
