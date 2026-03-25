import { readFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import type { UsageData } from '../renderer/lib/types'

const CREDENTIALS_FILE = join(homedir(), '.claude', '.credentials.json')

interface Credentials {
  accessToken: string
  organizationUuid: string
  subscriptionType: string
  rateLimitTier: string
  isExpired: boolean
}

export function parseCredentials(raw: string): Credentials | null {
  try {
    const data = JSON.parse(raw)
    const oauth = data.claudeAiOauth
    if (!oauth?.accessToken || !data.organizationUuid) return null
    return {
      accessToken: oauth.accessToken,
      organizationUuid: data.organizationUuid,
      subscriptionType: oauth.subscriptionType ?? 'unknown',
      rateLimitTier: oauth.rateLimitTier ?? 'unknown',
      isExpired: oauth.expiresAt ? oauth.expiresAt < Date.now() : false
    }
  } catch {
    return null
  }
}

export async function readCredentials(): Promise<Credentials | null> {
  try {
    const raw = await readFile(CREDENTIALS_FILE, 'utf-8')
    return parseCredentials(raw)
  } catch {
    return null
  }
}

export function normalizeUsageResponse(
  raw: Record<string, any>,
  source: UsageData['source']
): UsageData {
  return {
    fiveHour: raw.five_hour ? { utilization: raw.five_hour.utilization, resetsAt: raw.five_hour.resets_at } : null,
    sevenDay: raw.seven_day ? { utilization: raw.seven_day.utilization, resetsAt: raw.seven_day.resets_at } : null,
    sevenDaySonnet: raw.seven_day_sonnet ? { utilization: raw.seven_day_sonnet.utilization, resetsAt: raw.seven_day_sonnet.resets_at } : null,
    sevenDayOpus: raw.seven_day_opus ? { utilization: raw.seven_day_opus.utilization, resetsAt: raw.seven_day_opus.resets_at } : null,
    extraUsage: raw.extra_usage ? {
      isEnabled: raw.extra_usage.is_enabled ?? false,
      monthlyLimit: raw.extra_usage.monthly_limit,
      usedCredits: raw.extra_usage.used_credits
    } : null,
    fetchedAt: new Date().toISOString(),
    source
  }
}

export async function fetchUsage(): Promise<UsageData | null> {
  const creds = await readCredentials()
  if (!creds) return null
  if (creds.isExpired) return null

  const url = `https://claude.ai/api/organizations/${creds.organizationUuid}/usage`
  try {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${creds.accessToken}` }
    })
    if (!resp.ok) return null
    const raw = await resp.json() as Record<string, any>

    return normalizeUsageResponse(raw, 'api')
  } catch {
    return null
  }
}
