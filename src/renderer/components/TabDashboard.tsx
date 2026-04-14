import { useState, useMemo } from 'react'
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

interface ProjectGroup {
  projectName: string
  sessions: SessionEntry[]
  totalTokens: number
  totalCost: number
  latestDate: string
  models: string[]
}

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
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set())

  // Group recent sessions (top 20) by project, sorted by most recent session first
  const projectGroups = useMemo<ProjectGroup[]>(() => {
    const recent = sessions.slice(0, 20)
    const map = new Map<string, SessionEntry[]>()
    for (const s of recent) {
      const key = s.projectName || t.ungroupedProject
      const list = map.get(key)
      if (list) list.push(s)
      else map.set(key, [s])
    }
    return Array.from(map.entries()).map(([projectName, groupSessions]) => ({
      projectName,
      sessions: groupSessions,
      totalTokens: groupSessions.reduce((sum, s) => sum + s.tokens.total, 0),
      totalCost: groupSessions.reduce((sum, s) => sum + s.estimatedCostUSD, 0),
      latestDate: groupSessions[0].startedAt,
      models: [...new Set(groupSessions.map(s => s.primaryModel))],
    }))
  }, [sessions, t.ungroupedProject])

  // Group active sessions by project
  const activeByProject = useMemo(() => {
    const map = new Map<string, ActiveSessionWithSpeed[]>()
    for (const s of activeSessions) {
      const key = s.projectName || t.ungroupedProject
      const list = map.get(key)
      if (list) list.push(s)
      else map.set(key, [s])
    }
    return map
  }, [activeSessions, t.ungroupedProject])

  const toggleProject = (name: string) => {
    setCollapsedProjects(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const allProjectNames = projectGroups.map(g => g.projectName)
  const allCollapsed = allProjectNames.length > 0 && allProjectNames.every(n => collapsedProjects.has(n))
  const toggleAll = () => {
    if (allCollapsed) setCollapsedProjects(new Set())
    else setCollapsedProjects(new Set(allProjectNames))
  }

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

      {/* Active sessions — grouped by project */}
      <div>
        <div style={sectionTitleStyle}>{t.activeSessions}</div>
        {activeSessions.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{t.noActiveSessions}</p>
        ) : activeByProject.size <= 1 ? (
          // Single project or ungrouped: render flat like before
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeSessions.map((s) => (
              <ActiveSessionCard
                key={s.sessionId}
                session={s}
                expanded={expandedSessionId === s.sessionId}
                onToggleExpand={() => setExpandedSessionId(prev => prev === s.sessionId ? null : s.sessionId)}
              />
            ))}
          </div>
        ) : (
          // Multiple projects: group them
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from(activeByProject.entries()).map(([projectName, projectSessions]) => (
              <div key={projectName}>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                  marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{
                    width: 3, height: 14, borderRadius: 2,
                    background: 'var(--accent)', flexShrink: 0,
                  }} />
                  {projectName}
                  <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-dim)' }}>
                    ({projectSessions.length})
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {projectSessions.map((s) => (
                    <ActiveSessionCard
                      key={s.sessionId}
                      session={s}
                      expanded={expandedSessionId === s.sessionId}
                      onToggleExpand={() => setExpandedSessionId(prev => prev === s.sessionId ? null : s.sessionId)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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

      {/* Recent history — grouped by project */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={sectionTitleStyle}>{t.recentHistory}</div>
          {projectGroups.length > 1 && (
            <button
              onClick={toggleAll}
              style={{
                fontSize: 10, color: 'var(--text-muted)', background: 'none',
                border: '1px solid var(--border)', borderRadius: 4,
                padding: '2px 8px', cursor: 'pointer',
              }}
            >
              {allCollapsed ? t.expandAll : t.collapseAll}
            </button>
          )}
        </div>

        {projectGroups.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{t.noSessions}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {projectGroups.map((group) => {
              const isCollapsed = collapsedProjects.has(group.projectName)
              return (
                <div
                  key={group.projectName}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  {/* Project header — clickable to collapse/expand */}
                  <div
                    onClick={() => toggleProject(group.projectName)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <span style={{
                      fontSize: 10, color: 'var(--text-dim)',
                      transition: 'transform 0.15s',
                      transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      flexShrink: 0,
                    }}>
                      ▾
                    </span>
                    <span style={{
                      width: 3, height: 16, borderRadius: 2,
                      background: 'var(--accent)', flexShrink: 0,
                    }} />
                    <span style={{
                      flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                    }}>
                      {group.projectName}
                    </span>
                    {/* Model badges */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {group.models.map(m => {
                        const mc = modelColor(m)
                        return (
                          <span key={m} style={{
                            fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 6,
                            background: `${mc}22`, color: mc,
                          }}>
                            {abbreviateModel(m)}
                          </span>
                        )
                      })}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}>
                      {t.projectSessions(group.sessions.length)}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {formatTokens(group.totalTokens, exact, locale)}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', flexShrink: 0 }}>
                      {formatCost(group.totalCost)}
                    </span>
                  </div>

                  {/* Sessions list — collapsible */}
                  {!isCollapsed && (
                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: 0,
                      borderTop: '1px solid var(--border)',
                    }}>
                      {group.sessions.map((s) => {
                        const mColor = modelColor(s.primaryModel)
                        return (
                          <div
                            key={s.sessionId}
                            onClick={() => onGoToSession(s)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '7px 14px 7px 34px',
                              fontSize: 12,
                              cursor: 'pointer',
                              borderBottom: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover, var(--bg))' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                          >
                            <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                              {s.title ? (
                                <div style={{
                                  fontWeight: 500, color: 'var(--text)',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  {s.title}
                                </div>
                              ) : (
                                <div style={{ fontStyle: 'italic', color: 'var(--text-dim)', fontSize: 11 }}>
                                  {formatDate(s.startedAt)}
                                </div>
                              )}
                            </div>
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
                              background: `${mColor}22`, color: mColor,
                            }}>
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
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

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
