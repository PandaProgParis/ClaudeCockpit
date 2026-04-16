import React, { useState, useMemo, useEffect } from 'react'
import type { SessionEntry, TimePeriod, TimeBucket } from '../lib/types'
import { useTemporalStats } from '../hooks/useTemporalStats'
import type { TemporalFilters } from '../hooks/useTemporalStats'
import { useLanguage } from '../hooks/useLanguage'
import { useExactNumbers } from '../hooks/useExactNumbers'
import { formatTokens, formatCost, formatDuration, abbreviateModel, modelColor } from '../lib/format'

// --- Quota estimation ---

function estimateQuotaPercent(totalTokens: number, tokensPerPercent: number | null): number | null {
  if (!tokensPerPercent || tokensPerPercent <= 0) return null
  return Math.min(100, totalTokens / tokensPerPercent)
}

function quotaColor(pct: number): string {
  if (pct >= 80) return '#ef5350'  // red
  if (pct >= 50) return '#FFB74D'  // orange
  return '#81C784'                  // green
}

function QuotaBadge({ pct }: { pct: number }) {
  const color = quotaColor(pct)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: 36, height: 6, borderRadius: 3, background: 'var(--bg)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${Math.min(100, pct)}%`, height: '100%', borderRadius: 3,
          background: color, transition: 'width 0.2s',
        }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, color }}>{Math.round(pct)}%</span>
    </div>
  )
}

interface Props {
  sessions: SessionEntry[]
}

const PERIODS: TimePeriod[] = ['5h-window', 'hourly', 'daily', 'weekly']

function getDefaultDateRange(): [Date, Date] {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  from.setHours(0, 0, 0, 0)
  return [from, to]
}

function toInputDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function TabTemporal({ sessions }: Props) {
  const { t, locale } = useLanguage()
  const exact = useExactNumbers()
  const [period, setPeriod] = useState<TimePeriod>('daily')
  const [dateRange, setDateRange] = useState<[Date, Date]>(getDefaultDateRange)
  const [project, setProject] = useState<string>('')
  const [chartMode, setChartMode] = useState<'tokens' | 'cost'>('tokens')
  const [sortCol, setSortCol] = useState<string>('start')
  const [sortAsc, setSortAsc] = useState(false)
  const [tokensPerPercent, setTokensPerPercent] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/calibration').then(r => r.json())
      .then(d => setTokensPerPercent(d.tokensPerPercent ?? null))
      .catch(() => {})
  }, [])

  const filters = useMemo<TemporalFilters>(() => ({
    dateRange,
    project: project || undefined,
  }), [dateRange, project])

  const stats = useTemporalStats(sessions, period, filters)

  const projectNames = useMemo(() => {
    const set = new Set(sessions.map(s => s.projectName))
    return Array.from(set).sort()
  }, [sessions])

  const periodLabels: Record<TimePeriod, string> = {
    '5h-window': t.temporalPeriod5h,
    hourly: t.temporalPeriodHourly,
    daily: t.temporalPeriodDaily,
    weekly: t.temporalPeriodWeekly,
  }

  const { totals } = stats
  const cards = [
    { label: t.temporalAvgCost, value: formatCost(totals.avgCostPerBucket) },
    { label: t.temporalAvgTokens, value: formatTokens(Math.round(totals.avgTokensPerBucket), exact, locale) },
    { label: t.temporalPeak, value: totals.peakBucket ? `${totals.peakBucket.label} — ${formatCost(totals.peakBucket.costUSD)}` : '—' },
    { label: t.temporalAvgSessions, value: totals.avgSessionsPerBucket.toFixed(1) },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Controls bar */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
      }}>
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg)', borderRadius: 6, padding: 2 }}>
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '4px 10px', fontSize: 11, borderRadius: 4, border: 'none', cursor: 'pointer',
                background: period === p ? 'var(--accent)' : 'transparent',
                color: period === p ? '#fff' : 'var(--text-muted)',
                fontWeight: period === p ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>

        <input
          type="date"
          value={toInputDate(dateRange[0])}
          onChange={e => {
            const d = new Date(e.target.value)
            if (!isNaN(d.getTime())) setDateRange([d, dateRange[1]])
          }}
          style={{
            padding: '3px 6px', fontSize: 11, borderRadius: 4,
            border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
          }}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
        <input
          type="date"
          value={toInputDate(dateRange[1])}
          onChange={e => {
            const d = new Date(e.target.value)
            if (!isNaN(d.getTime())) setDateRange([dateRange[0], d])
          }}
          style={{
            padding: '3px 6px', fontSize: 11, borderRadius: 4,
            border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
          }}
        />

        <select
          value={project}
          onChange={e => setProject(e.target.value)}
          style={{
            padding: '3px 6px', fontSize: 11, borderRadius: 4,
            border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
          }}
        >
          <option value="">{t.temporalAllProjects}</option>
          {projectNames.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 8 }}>
        {cards.map(c => (
          <div
            key={c.label}
            style={{
              flex: 1, padding: '10px 14px', background: 'var(--bg-card)',
              border: '1px solid var(--border)', borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {stats.buckets.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
          {t.temporalNoBuckets}
        </div>
      )}

      {stats.buckets.length > 0 && (
        <>
          <BarChart buckets={stats.buckets} mode={chartMode} onToggleMode={() => setChartMode(m => m === 'tokens' ? 'cost' : 'tokens')} is5hWindow={period === '5h-window'} tokensPerPercent={tokensPerPercent} />
          <DetailTable buckets={stats.buckets} sortCol={sortCol} sortAsc={sortAsc} onSort={(col) => {
            if (col === sortCol) setSortAsc(!sortAsc)
            else { setSortCol(col); setSortAsc(false) }
          }} is5hWindow={period === '5h-window'} tokensPerPercent={tokensPerPercent} />
          <Heatmap sessions={sessions} dateRange={dateRange} project={project || undefined} />
        </>
      )}
    </div>
  )
}

// ─── Bar Chart ──────────────────────────────────────────────────

const TOKEN_COLORS = {
  input: '#D4A574',
  output: '#8BB8E0',
  cacheCreation: '#C9A0DC',
  cacheRead: '#8CC99E',
}

function BarChart({ buckets, mode, onToggleMode, is5hWindow, tokensPerPercent }: {
  buckets: TimeBucket[]
  mode: 'tokens' | 'cost'
  onToggleMode: () => void
  is5hWindow: boolean
  tokensPerPercent: number | null
}) {
  const { t, locale } = useLanguage()
  const exact = useExactNumbers()
  const maxValue = Math.max(...buckets.map(b => mode === 'tokens' ? b.tokens.total : b.costUSD), 1)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {mode === 'tokens' ? t.temporalToggleTokens : t.temporalToggleCost}
        </div>
        <button
          onClick={onToggleMode}
          style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 4,
            border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'pointer',
          }}
        >
          {mode === 'tokens' ? t.temporalToggleCost : t.temporalToggleTokens}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 200, overflowX: 'auto', position: 'relative' }}>
        {buckets.map((b, i) => {
          const totalH = mode === 'tokens'
            ? (b.tokens.total / maxValue) * 190
            : (b.costUSD / maxValue) * 190

          const segments = mode === 'tokens' ? [
            { key: 'input', value: b.tokens.input, color: TOKEN_COLORS.input },
            { key: 'output', value: b.tokens.output, color: TOKEN_COLORS.output },
            { key: 'cacheCreation', value: b.tokens.cacheCreation, color: TOKEN_COLORS.cacheCreation },
            { key: 'cacheRead', value: b.tokens.cacheRead, color: TOKEN_COLORS.cacheRead },
          ] : [{ key: 'cost', value: b.costUSD, color: 'var(--accent)' }]

          const total = segments.reduce((s, seg) => s + seg.value, 0) || 1

          return (
            <div
              key={i}
              style={{
                flex: `0 0 ${Math.max(24, Math.floor(800 / buckets.length))}px`,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {hoveredIdx === i && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6,
                  padding: '6px 10px', fontSize: 10, color: 'var(--text)', zIndex: 10,
                  whiteSpace: 'nowrap', pointerEvents: 'none',
                }}>
                  <div style={{ fontWeight: 600 }}>{b.label}</div>
                  <div>{t.temporalSessions}: {b.sessionCount}</div>
                  <div>Tokens: {formatTokens(b.tokens.total, exact, locale)}</div>
                  <div>{t.temporalToggleCost}: {formatCost(b.costUSD)}</div>
                  <div>{t.temporalWorkDuration}: {formatDuration(b.durationSeconds)}</div>
                  {is5hWindow && (() => {
                    const pct = estimateQuotaPercent(b.tokens.total, tokensPerPercent)
                    return pct !== null ? (
                      <div style={{ marginTop: 2 }}>Quota: <span style={{ fontWeight: 600, color: quotaColor(pct) }}>{Math.round(pct)}%</span></div>
                    ) : null
                  })()}
                </div>
              )}
              <div style={{ width: '70%', height: totalH, display: 'flex', flexDirection: 'column-reverse', borderRadius: '3px 3px 0 0', overflow: 'hidden' }}>
                {segments.map(seg => (
                  <div
                    key={seg.key}
                    style={{
                      height: `${(seg.value / total) * 100}%`,
                      background: seg.color,
                      minHeight: seg.value > 0 ? 1 : 0,
                    }}
                  />
                ))}
              </div>
              <div style={{
                fontSize: 8, color: 'var(--text-muted)', marginTop: 4,
                writingMode: buckets.length > 15 ? 'vertical-rl' : undefined,
                transform: buckets.length > 15 ? 'rotate(180deg)' : undefined,
                maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {b.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Detail Table ───────────────────────────────────────────────

function DetailTable({ buckets, sortCol, sortAsc, onSort, is5hWindow, tokensPerPercent }: {
  buckets: TimeBucket[]
  sortCol: string
  sortAsc: boolean
  onSort: (col: string) => void
  is5hWindow: boolean
  tokensPerPercent: number | null
}) {
  const { t, locale } = useLanguage()
  const exact = useExactNumbers()

  const sorted = useMemo(() => {
    const arr = [...buckets]
    const dir = sortAsc ? 1 : -1
    arr.sort((a, b) => {
      switch (sortCol) {
        case 'start': return dir * (new Date(a.start).getTime() - new Date(b.start).getTime())
        case 'sessions': return dir * (a.sessionCount - b.sessionCount)
        case 'input': return dir * (a.tokens.input - b.tokens.input)
        case 'output': return dir * (a.tokens.output - b.tokens.output)
        case 'cache': return dir * ((a.tokens.cacheCreation + a.tokens.cacheRead) - (b.tokens.cacheCreation + b.tokens.cacheRead))
        case 'total': return dir * (a.tokens.total - b.tokens.total)
        case 'cost': return dir * (a.costUSD - b.costUSD)
        case 'duration': return dir * (a.durationSeconds - b.durationSeconds)
        case 'quota': {
          const qa = estimateQuotaPercent(a.tokens.total, tokensPerPercent) ?? 0
          const qb = estimateQuotaPercent(b.tokens.total, tokensPerPercent) ?? 0
          return dir * (qa - qb)
        }
        default: return 0
      }
    })
    return arr
  }, [buckets, sortCol, sortAsc])

  function topModel(models: Record<string, number>): { name: string; abbrev: string } {
    let best = '—'
    let max = 0
    for (const [m, c] of Object.entries(models)) {
      if (c > max) { max = c; best = m }
    }
    return { name: best, abbrev: abbreviateModel(best) }
  }

  const cols = [
    { id: 'start', label: t.temporalPeriodLabel },
    { id: 'sessions', label: t.temporalSessions },
    { id: 'input', label: 'Input' },
    { id: 'output', label: 'Output' },
    { id: 'cache', label: 'Cache' },
    { id: 'total', label: 'Total' },
    { id: 'cost', label: t.temporalToggleCost },
    { id: 'duration', label: t.temporalWorkDuration },
    ...(is5hWindow ? [{ id: 'quota', label: 'Quota' }] : []),
    { id: 'model', label: t.temporalMainModel },
  ]

  const thStyle: React.CSSProperties = {
    padding: '6px 8px', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
    textAlign: 'left', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
    borderBottom: '1px solid var(--border)',
  }
  const tdStyle: React.CSSProperties = {
    padding: '5px 8px', fontSize: 11, color: 'var(--text)',
    borderBottom: '1px solid var(--border)',
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c.id} style={thStyle} onClick={() => c.id !== 'model' && onSort(c.id)}>
                {c.label} {sortCol === c.id ? (sortAsc ? '▴' : '▾') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((b, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg)' }}>
              <td style={tdStyle}>{b.label}</td>
              <td style={tdStyle}>{b.sessionCount}</td>
              <td style={tdStyle}>{formatTokens(b.tokens.input, exact, locale)}</td>
              <td style={tdStyle}>{formatTokens(b.tokens.output, exact, locale)}</td>
              <td style={tdStyle}>{formatTokens(b.tokens.cacheCreation + b.tokens.cacheRead, exact, locale)}</td>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{formatTokens(b.tokens.total, exact, locale)}</td>
              <td style={{ ...tdStyle, color: 'var(--accent)', fontWeight: 600 }}>{formatCost(b.costUSD)}</td>
              <td style={tdStyle}>{formatDuration(b.durationSeconds)}</td>
              {is5hWindow && (
                <td style={tdStyle}>
                  {(() => {
                    const pct = estimateQuotaPercent(b.tokens.total, tokensPerPercent)
                    return pct !== null ? <QuotaBadge pct={pct} /> : <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>—</span>
                  })()}
                </td>
              )}
              <td style={tdStyle}>{(() => {
                const m = topModel(b.models)
                const mc = modelColor(m.name)
                return (
                  <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 6, background: `${mc}22`, color: mc, whiteSpace: 'nowrap' }}>
                    {m.abbrev}
                  </span>
                )
              })()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Heatmap ────────────────────────────────────────────────────

function Heatmap({ sessions, dateRange, project }: {
  sessions: SessionEntry[]
  dateRange: [Date, Date]
  project?: string
}) {
  const { t } = useLanguage()

  const grid = useMemo(() => {
    const cells: { tokens: number; cost: number; count: number }[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => ({ tokens: 0, cost: 0, count: 0 }))
    )

    let filtered = sessions.filter(s => {
      const ts = new Date(s.startedAt).getTime()
      return ts >= dateRange[0].getTime() && ts <= dateRange[1].getTime()
    })
    if (project) filtered = filtered.filter(s => s.projectName === project)

    for (const s of filtered) {
      const d = new Date(s.startedAt)
      const dayIdx = (d.getDay() + 6) % 7
      const hour = d.getHours()
      cells[dayIdx][hour].tokens += s.tokens.total
      cells[dayIdx][hour].cost += s.estimatedCostUSD
      cells[dayIdx][hour].count++
    }
    return cells
  }, [sessions, dateRange, project])

  const maxTokens = Math.max(...grid.flat().map(c => c.tokens), 1)

  const dayLabels = [t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday, t.sunday]

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>{t.temporalHeatmapTitle}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(24, 1fr)', gap: 2 }}>
        <div />
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} style={{ fontSize: 8, color: 'var(--text-muted)', textAlign: 'center' }}>
            {h}h
          </div>
        ))}
        {grid.map((row, dayIdx) => (
          <React.Fragment key={dayIdx}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              {dayLabels[dayIdx].slice(0, 3)}
            </div>
            {row.map((cell, hour) => {
              const intensity = cell.tokens / maxTokens
              return (
                <div
                  key={`${dayIdx}-${hour}`}
                  title={`${dayLabels[dayIdx]} ${hour}h: ${cell.count} sessions, ${formatTokens(cell.tokens)}, ${formatCost(cell.cost)}`}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 2,
                    background: intensity > 0
                      ? `color-mix(in srgb, var(--accent) ${Math.round(intensity * 100)}%, transparent)`
                      : 'var(--bg)',
                    minHeight: 12,
                  }}
                />
              )
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
