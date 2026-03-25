import type { SessionEntry, GlobalStats } from '../lib/types'
import { formatTokens, formatCost, abbreviateModel, modelColor } from '../lib/format'
import { useExactNumbers } from '../hooks/useExactNumbers'
import { useLanguage } from '../hooks/useLanguage'

interface Props {
  sessions: SessionEntry[]
  stats: GlobalStats | null
}

function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function isLastSevenDays(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000)
  return d >= sevenDaysAgo
}

export function StatsRow({ sessions, stats }: Props) {
  const exact = useExactNumbers()
  const { t, locale } = useLanguage()

  const todaySessions = sessions.filter((s) => isToday(s.startedAt))
  const todayTokens = todaySessions.reduce((sum, s) => sum + s.tokens.total, 0)
  const todayCost = todaySessions.reduce((sum, s) => sum + s.estimatedCostUSD, 0)

  const weekSessions = sessions.filter((s) => isLastSevenDays(s.startedAt))
  const weekTokens = weekSessions.reduce((sum, s) => sum + s.tokens.total, 0)
  const weekCost = weekSessions.reduce((sum, s) => sum + s.estimatedCostUSD, 0)

  const models = stats?.byModel ?? []

  const periods = [
    { label: t.today, sessions: todaySessions.length, tokens: todayTokens, cost: todayCost, accent: 'var(--accent)' },
    { label: t.week, sessions: weekSessions.length, tokens: weekTokens, cost: weekCost, accent: '#64B5F6' },
    { label: t.think, sessions: stats?.thinkingSessions ?? 0, tokens: null, cost: null, accent: '#C9A0DC' },
  ]

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '12px 14px', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Period stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {periods.map((p) => (
          <div key={p.label} style={{
            padding: '6px 10px', borderRadius: 8,
            background: 'var(--bg)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.3px', minWidth: 55 }}>{p.label}</span>
            <span style={{ fontSize: 10, color: 'var(--text-dim)', minWidth: 20, textAlign: 'right' }}>{p.sessions}</span>
            {p.tokens !== null ? (
              <>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', flex: 1, textAlign: 'right' }}>
                  {formatTokens(p.tokens, exact, locale)}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: p.accent, minWidth: 55, textAlign: 'right' }}>
                  {formatCost(p.cost!)}
                </span>
              </>
            ) : (
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', flex: 1, textAlign: 'right' }}>
                {p.sessions} <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>{t.sessions}</span>
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Top models */}
      {models.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 6 }}>{t.topModels}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {models.slice(0, 3).map((m) => {
              const mColor = modelColor(m.model)
              const totalTokens = m.inputTokens + m.outputTokens
              const maxTokens = models[0].inputTokens + models[0].outputTokens
              const pct = maxTokens > 0 ? (totalTokens / maxTokens) * 100 : 0
              return (
                <div key={m.model} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                    background: `${mColor}22`, color: mColor, minWidth: 55, textAlign: 'center',
                  }}>
                    {abbreviateModel(m.model)}
                  </span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: mColor, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 50, textAlign: 'right' }}>
                    {formatTokens(totalTokens, exact, locale)}
                  </span>
                  <span style={{ fontSize: 10, color: mColor, fontWeight: 600, minWidth: 45, textAlign: 'right' }}>
                    {formatCost(m.costUSD)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
