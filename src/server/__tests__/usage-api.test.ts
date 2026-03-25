import { describe, it, expect } from 'vitest'
import { parseCredentials, normalizeUsageResponse } from '../usage-api'

describe('parseCredentials', () => {
  it('extracts token and org from credentials JSON', () => {
    const raw = JSON.stringify({
      claudeAiOauth: {
        accessToken: 'sk-ant-oat01-test',
        expiresAt: Date.now() + 3600000,
        subscriptionType: 'max',
        rateLimitTier: 'default_claude_max_5x'
      },
      organizationUuid: 'org-123'
    })
    const creds = parseCredentials(raw)
    expect(creds).not.toBeNull()
    expect(creds!.accessToken).toBe('sk-ant-oat01-test')
    expect(creds!.organizationUuid).toBe('org-123')
    expect(creds!.isExpired).toBe(false)
  })

  it('marks expired token', () => {
    const raw = JSON.stringify({
      claudeAiOauth: { accessToken: 'sk-ant-oat01-test', expiresAt: Date.now() - 1000 },
      organizationUuid: 'org-123'
    })
    const creds = parseCredentials(raw)
    expect(creds!.isExpired).toBe(true)
  })

  it('returns null for invalid JSON', () => {
    expect(parseCredentials('not json')).toBeNull()
  })
})

describe('normalizeUsageResponse', () => {
  it('normalizes snake_case API response to UsageData', () => {
    const raw = {
      five_hour: { utilization: 0.25, resets_at: '2026-03-20T15:00:00Z' },
      seven_day: { utilization: 0.40, resets_at: '2026-03-27T00:00:00Z' },
      seven_day_sonnet: null,
      seven_day_opus: null,
      extra_usage: { is_enabled: true, monthly_limit: 100, used_credits: 42 },
    }
    const result = normalizeUsageResponse(raw, 'extension')
    expect(result.fiveHour).toEqual({ utilization: 0.25, resetsAt: '2026-03-20T15:00:00Z' })
    expect(result.sevenDay).toEqual({ utilization: 0.40, resetsAt: '2026-03-27T00:00:00Z' })
    expect(result.sevenDaySonnet).toBeNull()
    expect(result.sevenDayOpus).toBeNull()
    expect(result.extraUsage).toEqual({ isEnabled: true, monthlyLimit: 100, usedCredits: 42 })
    expect(result.source).toBe('extension')
    expect(result.fetchedAt).toBeDefined()
  })

  it('handles missing fields gracefully', () => {
    const result = normalizeUsageResponse({}, 'api')
    expect(result.fiveHour).toBeNull()
    expect(result.sevenDay).toBeNull()
    expect(result.source).toBe('api')
  })
})

describe('normalizeUsageResponse edge cases', () => {
  it('handles all-null gauges', () => {
    const raw = { five_hour: null, seven_day: null }
    const result = normalizeUsageResponse(raw, 'extension')
    expect(result.fiveHour).toBeNull()
    expect(result.sevenDay).toBeNull()
    expect(result.source).toBe('extension')
  })

  it('handles extra_usage with missing fields', () => {
    const raw = { extra_usage: { is_enabled: false } }
    const result = normalizeUsageResponse(raw, 'api')
    expect(result.extraUsage).toEqual({ isEnabled: false, monthlyLimit: undefined, usedCredits: undefined })
  })
})
