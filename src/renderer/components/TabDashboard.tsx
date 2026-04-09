import { useState } from 'react'
import type { UsageData, SessionEntry, GlobalStats } from '../lib/types'
import type { ActiveSessionWithSpeed } from '../hooks/useActiveSessions'
import { formatTokens, formatCost, formatDuration, formatDate, abbreviateModel, modelColor } from '../lib/format'
import { useExactNumbers } from '../hooks/useExactNumbers'
import { useLanguage } from '../hooks/useLanguage'
import { UsageBar } from './UsageBar'
import { StatsRow } from './StatsRow'
import { ActiveSessionCard } from './ActiveSessionCard'
import { CarbonDashboardWidget } from './CarbonDashboardWidget'
import { EarthGlobe } from './EarthGlobe'
import type { CarbonFactors } from '../lib/carbon'
import { computeTodayCO2 } from '../lib/carbon'

interface Props {
  usage: UsageData | null
  sessions: SessionEntry[]
  stats: GlobalStats | null
  activeSessions: ActiveSessionWithSpeed[]
  onSubmitManualUsage: (json: string) => Promise<boolean>
  onGoToHistory: () => void
  onGoToSession: (session: SessionEntry) => void
  carbonFactors: CarbonFactors
  carbonQuota: number
  onNavigateToCarbon: () => void
  showCarbonWidget: boolean
  coworkSessionCount?: number
  coworkCostUSD?: number
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text)',
  marginBottom: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

export function TabDashboard({ usage, sessions, stats, activeSessions, onSubmitManualUsage, onGoToHistory, onGoToSession, carbonFactors, carbonQuota, onNavigateToCarbon, showCarbonWidget, coworkSessionCount, coworkCostUSD }: Props) {
  const exact = useExactNumbers()
  const { t, locale } = useLanguage()
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)
  const [showLegend, setShowLegend] = useState(false)
  const [quotaDismissed, setQuotaDismissed] = useState(() => {
    const stored = localStorage.getItem('carbon-quota-dismissed')
    if (!stored) return false
    return stored === new Date().toISOString().slice(0, 10)
  })
  const recentSessions = sessions.slice(0, 5)

  const todayCO2 = computeTodayCO2(sessions, carbonFactors.emission)
  const quotaExceeded = carbonQuota > 0 && todayCO2 > carbonQuota && !quotaDismissed

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: '100%' }}>
      {quotaExceeded && (
        <div style={{
          background: 'linear-gradient(135deg, #4E342E, rgba(183,28,28,0.2))',
          border: '1px solid rgba(239,83,80,0.4)',
          borderRadius: 10,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <EarthGlobe percentage={120} size={40} />
          <div style={{ flex: 1 }}>
            <div style={{ color: '#ef5350', fontSize: 13, fontWeight: 700 }}>{t.carbonQuotaExceeded}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{todayCO2.toFixed(1)}g / {carbonQuota}g</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>{t.carbonQuotaRecovery}</div>
          </div>
          <button
            onClick={() => {
              localStorage.setItem('carbon-quota-dismissed', new Date().toISOString().slice(0, 10))
              setQuotaDismissed(true)
            }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}
          >
            ✕
          </button>
        </div>
      )}
      {/* Top row: Usage bar + Stats */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
        <div
          style={{
            flex: 1,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '12px 16px',
            minWidth: 0,
          }}
        >
          <UsageBar usage={usage} onSubmitManual={onSubmitManualUsage} />
        </div>
        <StatsRow sessions={sessions} stats={stats} />
      </div>

      {/* Carbon quota widget */}
      {showCarbonWidget && (
        <CarbonDashboardWidget
          sessions={sessions}
          factors={carbonFactors}
          quotaDaily={carbonQuota}
          onNavigateToCarbon={onNavigateToCarbon}
        />
      )}

      {/* Active sessions */}
      <div>
        <div style={sectionTitleStyle}>{t.activeSessions}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activeSessions.map((s) => (
            <ActiveSessionCard
              key={s.sessionId}
              session={s}
              expanded={expandedSessionId === s.sessionId}
              onToggleExpand={() => setExpandedSessionId(prev => prev === s.sessionId ? null : s.sessionId)}
            />
          ))}
          {activeSessions.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{t.noActiveSessions}</p>
          )}
        </div>
      </div>

      {/* Cowork summary */}
      {coworkSessionCount !== undefined && coworkSessionCount > 0 && (
        <div
          className="flex items-center gap-2"
          style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 0' }}
        >
          <span style={{ fontWeight: 600 }}>Cowork:</span>
          <span>{coworkSessionCount} sessions</span>
          <span>·</span>
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{formatCost(coworkCostUSD ?? 0)}</span>
        </div>
      )}

      {/* Recent history */}
      <div>
        <div style={sectionTitleStyle}>{t.recentHistory}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {recentSessions.map((s) => {
            const mColor = modelColor(s.primaryModel)
            return (
              <div
                key={s.sessionId}
                onClick={() => onGoToSession(s)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                  <div style={{ fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.projectName}
                  </div>
                  {s.title && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                      {s.title}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 8,
                    background: `${mColor}22`,
                    color: mColor,
                  }}
                >
                  {abbreviateModel(s.primaryModel)}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, minWidth: 70, textAlign: 'right' }}>
                  {formatDate(s.startedAt)}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, minWidth: 50, textAlign: 'right' }}>
                  {formatDuration(s.durationSeconds)}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, minWidth: 40, textAlign: 'right' }}>
                  {formatTokens(s.tokens.total, exact, locale)}
                </span>
                <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 600, minWidth: 50, textAlign: 'right' }}>
                  {formatCost(s.estimatedCostUSD)}
                </span>
              </div>
            )
          })}
          {recentSessions.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{t.noSessions}</p>
          )}
        </div>
        <button
          onClick={onGoToHistory}
          style={{
            marginTop: 10,
            fontSize: 12,
            color: 'var(--accent)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {t.viewAllHistory}
        </button>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Legend toggle */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => setShowLegend(v => !v)}
          style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: 6,
            padding: '4px 14px', fontSize: 10, color: 'var(--text-muted)',
            cursor: 'pointer', transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          {t.legend} {showLegend ? '▴' : '▾'}
        </button>
      </div>
      {showLegend && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, color: 'var(--text-muted)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#D4A574', marginRight: 6, verticalAlign: 'middle' }} /><b>Input</b> — {t.legendInput}</div>
              <div><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#8BB8E0', marginRight: 6, verticalAlign: 'middle' }} /><b>Output</b> — {t.legendOutput}</div>
              <div><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#C9A0DC', marginRight: 6, verticalAlign: 'middle' }} /><b>Cache write</b> — {t.legendCacheWrite}</div>
              <div><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#8CC99E', marginRight: 6, verticalAlign: 'middle' }} /><b>Cache read</b> — {t.legendCacheRead}</div>
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', textAlign: 'right', maxWidth: 220, lineHeight: 1.4 }}>
              {t.legendNote}
            </div>
          </div>
        </div>
      )}

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
