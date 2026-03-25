import type { SessionEntry, GlobalStats } from '../renderer/lib/types'

export function computeStats(sessions: SessionEntry[]): GlobalStats {
  const modelMap = new Map<
    string,
    { sessions: number; input: number; output: number; cost: number }
  >()

  for (const s of sessions) {
    const model = s.primaryModel || 'unknown'
    const entry = modelMap.get(model) ?? { sessions: 0, input: 0, output: 0, cost: 0 }
    entry.sessions++
    entry.input += s.tokens.input
    entry.output += s.tokens.output
    entry.cost += s.estimatedCostUSD
    modelMap.set(model, entry)
  }

  const byModel = Array.from(modelMap.entries())
    .map(([model, data]) => ({
      model,
      sessions: data.sessions,
      inputTokens: data.input,
      outputTokens: data.output,
      costUSD: data.cost
    }))
    .sort((a, b) => b.costUSD - a.costUSD)

  return {
    totalSessions: sessions.length,
    totalTokens: sessions.reduce((sum, s) => sum + s.tokens.total, 0),
    totalCostUSD: sessions.reduce((sum, s) => sum + s.estimatedCostUSD, 0),
    byModel,
    thinkingSessions: sessions.filter((s) => s.usedThinking).length
  }
}
