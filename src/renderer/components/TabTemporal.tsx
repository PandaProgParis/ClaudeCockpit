import React, { useState, useMemo, useEffect, useRef } from 'react'
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

type DatePreset = { key: string; label: string; compute: () => [Date, Date] }
const DATE_PRESETS: DatePreset[] = [
  { key: 'today', label: "Aujourd'hui", compute: () => {
    const from = new Date(); from.setHours(0, 0, 0, 0)
    return [from, new Date()]
  } },
  { key: 'yesterday', label: 'Hier', compute: () => {
    const from = new Date(); from.setDate(from.getDate() - 1); from.setHours(0, 0, 0, 0)
    const to = new Date(from); to.setHours(23, 59, 59, 999)
    return [from, to]
  } },
  { key: 'week', label: 'Cette semaine', compute: () => {
    const from = new Date()
    const day = (from.getDay() + 6) % 7
    from.setDate(from.getDate() - day)
    from.setHours(0, 0, 0, 0)
    return [from, new Date()]
  } },
  { key: 'month', label: 'Ce mois', compute: () => {
    const now = new Date()
    return [new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0), new Date()]
  } },
  { key: 'year', label: 'Cette année', compute: () => {
    const now = new Date()
    return [new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0), new Date()]
  } },
  { key: 'all', label: 'Tous', compute: () => {
    return [new Date(2000, 0, 1), new Date()]
  } },
]

export function TabTemporal({ sessions }: Props) {
  const { t } = useLanguage()
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', minHeight: 0, padding: '20px 20px 20px', boxSizing: 'border-box' }}>
      {/* Controls bar */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
      }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 2 }}>Période :</span>
          {DATE_PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => setDateRange(p.compute())}
              style={{
                padding: '3px 10px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
                border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
                whiteSpace: 'nowrap',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg)', borderRadius: 6, padding: 2 }}>
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '6px 18px', fontSize: 11, borderRadius: 4, border: 'none', cursor: 'pointer',
                background: period === p ? 'var(--accent)' : 'transparent',
                color: period === p ? '#fff' : 'var(--text-muted)',
                fontWeight: period === p ? 600 : 400,
                transition: 'all 0.15s',
                minWidth: 90,
                whiteSpace: 'nowrap',
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
            flex: 1, minWidth: 0, textOverflow: 'ellipsis',
          }}
        >
          <option value="">{t.temporalAllProjects}</option>
          {projectNames.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        </div>
      </div>

      {stats.buckets.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
          {t.temporalNoBuckets}
        </div>
      )}

      {stats.buckets.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>
              <LineChart buckets={stats.buckets} mode={chartMode} onToggleMode={() => setChartMode(m => m === 'tokens' ? 'cost' : 'tokens')} is5hWindow={period === '5h-window'} tokensPerPercent={tokensPerPercent} />
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>
              <Heatmap sessions={sessions} dateRange={dateRange} project={project || undefined} />
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            <DetailTable buckets={stats.buckets} sortCol={sortCol} sortAsc={sortAsc} onSort={(col) => {
              if (col === sortCol) setSortAsc(!sortAsc)
              else { setSortCol(col); setSortAsc(false) }
            }} is5hWindow={period === '5h-window'} tokensPerPercent={tokensPerPercent} />
          </div>
        </>
      )}
    </div>
  )
}

// ─── Line Chart ─────────────────────────────────────────────────

const TOKEN_COLORS = {
  input: '#D4A574',
  output: '#8BB8E0',
  cacheCreation: '#C9A0DC',
  cacheRead: '#8CC99E',
}

function LineChart({ buckets, mode, onToggleMode, is5hWindow, tokensPerPercent }: {
  buckets: TimeBucket[]
  mode: 'tokens' | 'cost'
  onToggleMode: () => void
  is5hWindow: boolean
  tokensPerPercent: number | null
}) {
  const { t, locale } = useLanguage()
  const exact = useExactNumbers()
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setContainerWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const series = mode === 'tokens' ? [
    { key: 'input', label: 'Input', values: buckets.map(b => b.tokens.input), color: TOKEN_COLORS.input },
    { key: 'output', label: 'Output', values: buckets.map(b => b.tokens.output), color: TOKEN_COLORS.output },
    { key: 'cacheCreation', label: 'Cache création', values: buckets.map(b => b.tokens.cacheCreation), color: TOKEN_COLORS.cacheCreation },
    { key: 'cacheRead', label: 'Cache lecture', values: buckets.map(b => b.tokens.cacheRead), color: TOKEN_COLORS.cacheRead },
  ] : [
    { key: 'cost', label: t.temporalToggleCost, values: buckets.map(b => b.costUSD), color: 'var(--accent)' },
  ]

  const maxValue = Math.max(...series.flatMap(s => s.values), 1)

  const width = Math.max(320, containerWidth)
  const height = 130
  const padding = { top: 8, right: 16, bottom: 22, left: 56 }
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom

  const scaleX = (i: number) =>
    buckets.length <= 1
      ? padding.left + innerWidth / 2
      : padding.left + (i / (buckets.length - 1)) * innerWidth
  const scaleY = (v: number) => padding.top + innerHeight - (v / maxValue) * innerHeight

  const yTicks = [0, 0.25, 0.5, 0.75, 1]
  const formatAxis = (v: number) =>
    mode === 'tokens' ? formatTokens(Math.round(v), false, locale) : formatCost(v)

  const labelStride = Math.max(1, Math.ceil(buckets.length / 15))

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, color: 'var(--text-muted)', minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
          <span>{mode === 'tokens' ? t.temporalToggleTokens : t.temporalToggleCost}</span>
          {mode === 'tokens' && series.map(s => (
            <span key={s.key} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
              <span style={{ width: 10, height: 2, background: s.color, borderRadius: 1 }} />
              {s.label}
            </span>
          ))}
        </div>
        <button
          onClick={onToggleMode}
          style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 4,
            border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0,
          }}
        >
          {mode === 'tokens' ? t.temporalToggleCost : t.temporalToggleTokens}
        </button>
      </div>

      <div ref={containerRef} style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg
          width={width}
          height={height}
          style={{ display: 'block' }}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {yTicks.map(frac => (
            <g key={frac}>
              <line
                x1={padding.left} y1={scaleY(maxValue * frac)}
                x2={width - padding.right} y2={scaleY(maxValue * frac)}
                stroke="var(--border)" strokeWidth={0.5} strokeDasharray="2,3"
              />
              <text
                x={padding.left - 6} y={scaleY(maxValue * frac)}
                textAnchor="end" dominantBaseline="middle"
                fontSize={9} fill="var(--text-muted)"
              >
                {formatAxis(maxValue * frac)}
              </text>
            </g>
          ))}

          {series.map(s => {
            const points = s.values.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(' ')
            return (
              <polyline
                key={s.key}
                points={points}
                fill="none" stroke={s.color} strokeWidth={1.8}
                strokeLinejoin="round" strokeLinecap="round"
              />
            )
          })}

          {series.map(s => s.values.map((v, i) => (
            <circle
              key={`${s.key}-${i}`}
              cx={scaleX(i)} cy={scaleY(v)} r={hoveredIdx === i ? 3.5 : 2}
              fill={s.color}
            />
          )))}

          {hoveredIdx !== null && (
            <line
              x1={scaleX(hoveredIdx)} y1={padding.top}
              x2={scaleX(hoveredIdx)} y2={padding.top + innerHeight}
              stroke="var(--text-muted)" strokeWidth={0.5} strokeDasharray="2,2"
            />
          )}

          {buckets.map((b, i) => {
            const colW = buckets.length > 1 ? innerWidth / (buckets.length - 1) : innerWidth
            return (
              <rect
                key={`hit-${i}`}
                x={scaleX(i) - colW / 2}
                y={padding.top}
                width={colW}
                height={innerHeight}
                fill="transparent"
                onMouseEnter={() => setHoveredIdx(i)}
                style={{ cursor: 'crosshair' }}
              />
            )
          })}

          {buckets.map((b, i) => {
            if (i % labelStride !== 0 && i !== buckets.length - 1) return null
            return (
              <text
                key={`lbl-${i}`}
                x={scaleX(i)}
                y={height - padding.bottom + 14}
                textAnchor="middle"
                fontSize={9} fill="var(--text-muted)"
              >
                {b.label.length > 10 ? b.label.slice(0, 10) : b.label}
              </text>
            )
          })}
        </svg>

        {hoveredIdx !== null && (() => {
          const b = buckets[hoveredIdx]
          const tooltipX = scaleX(hoveredIdx) + 12
          const isRightHalf = tooltipX > width - 220
          return (
            <div style={{
              position: 'absolute',
              top: padding.top,
              left: isRightHalf ? undefined : tooltipX,
              right: isRightHalf ? (width - scaleX(hoveredIdx) + 12) : undefined,
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
          )
        })()}
      </div>
    </div>
  )
}

// ─── Detail Table ───────────────────────────────────────────────

const PAGE_SIZE = 25

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
  const [page, setPage] = useState(1)

  const filtered = useMemo(
    () => buckets.filter(b => b.sessionCount > 0 || b.tokens.total > 0),
    [buckets],
  )

  const sorted = useMemo(() => {
    const arr = [...filtered]
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
  }, [filtered, sortCol, sortAsc, tokensPerPercent])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sorted, currentPage],
  )

  useEffect(() => {
    setPage(1)
  }, [filtered.length, sortCol, sortAsc])

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
    position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1,
  }
  const tdStyle: React.CSSProperties = {
    padding: '5px 8px', fontSize: 11, color: 'var(--text)',
    borderBottom: '1px solid var(--border)',
  }

  const btnStyle: React.CSSProperties = {
    padding: '3px 10px', fontSize: 11, borderRadius: 4,
    border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
    cursor: 'pointer',
  }
  const btnDisabled: React.CSSProperties = { ...btnStyle, opacity: 0.4, cursor: 'not-allowed' }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
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
          {pageItems.map((b, i) => (
            <tr key={(currentPage - 1) * PAGE_SIZE + i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg)' }}>
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
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)',
      }}>
        <span>
          {sorted.length === 0
            ? '—'
            : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, sorted.length)} / ${sorted.length}`}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={() => setPage(1)}
            disabled={currentPage <= 1}
            style={currentPage <= 1 ? btnDisabled : btnStyle}
          >«</button>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            style={currentPage <= 1 ? btnDisabled : btnStyle}
          >‹</button>
          <span style={{ minWidth: 70, textAlign: 'center' }}>
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            style={currentPage >= totalPages ? btnDisabled : btnStyle}
          >›</button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={currentPage >= totalPages}
            style={currentPage >= totalPages ? btnDisabled : btnStyle}
          >»</button>
        </div>
      </div>
    </div>
  )
}

// ─── Heatmap ────────────────────────────────────────────────────

type HeatCell = {
  tokens: number
  cost: number
  count: number
  projects: Record<string, { tokens: number; cost: number; count: number }>
}

function Heatmap({ sessions, dateRange, project }: {
  sessions: SessionEntry[]
  dateRange: [Date, Date]
  project?: string
}) {
  const { t } = useLanguage()
  const [hovered, setHovered] = useState<{ dayIdx: number; hour: number; x: number; y: number; cellH: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const grid = useMemo<HeatCell[][]>(() => {
    const cells: HeatCell[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => ({ tokens: 0, cost: 0, count: 0, projects: {} }))
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
      const c = cells[dayIdx][hour]
      c.tokens += s.tokens.total
      c.cost += s.estimatedCostUSD
      c.count++
      const pname = s.projectName || '—'
      const p = c.projects[pname] ?? { tokens: 0, cost: 0, count: 0 }
      p.tokens += s.tokens.total
      p.cost += s.estimatedCostUSD
      p.count++
      c.projects[pname] = p
    }
    return cells
  }, [sessions, dateRange, project])

  const maxTokens = Math.max(...grid.flat().map(c => c.tokens), 1)

  const dayLabels = [t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday, t.sunday]
  type HourZone = 'sleep' | 'home' | 'work'
  const hourZone = (h: number): HourZone => {
    if (h <= 6) return 'sleep'
    if ((h >= 9 && h <= 11) || (h >= 14 && h <= 18)) return 'work'
    return 'home'
  }
  const ZONE_COLORS: Record<HourZone, string> = {
    sleep: 'var(--text)',
    home: 'var(--blue)',
    work: 'var(--orange)',
  }
  const ZONE_HEADER_COLORS: Record<HourZone, string> = {
    sleep: 'var(--text-muted)',
    home: 'var(--blue)',
    work: 'var(--orange)',
  }

  const hoveredCell = hovered ? grid[hovered.dayIdx][hovered.hour] : null
  const topProjects = useMemo(() => {
    if (!hoveredCell) return []
    return Object.entries(hoveredCell.projects)
      .sort(([, a], [, b]) => b.tokens - a.tokens)
      .slice(0, 3)
  }, [hoveredCell])

  return (
    <div ref={cardRef} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', width: '100%', position: 'relative' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>{t.temporalHeatmapTitle}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(24, 1fr)', gap: 2 }}>
        <div />
        {Array.from({ length: 24 }, (_, h) => {
          const zone = hourZone(h)
          return (
            <div key={h} style={{
              fontSize: 8,
              color: ZONE_HEADER_COLORS[zone],
              fontWeight: zone === 'sleep' ? 400 : 600,
              textAlign: 'center',
            }}>
              {h}h
            </div>
          )
        })}
        {grid.map((row, dayIdx) => (
          <React.Fragment key={dayIdx}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              {dayLabels[dayIdx].slice(0, 3)}
            </div>
            {row.map((cell, hour) => {
              const zone = hourZone(hour)
              const cellColor = ZONE_COLORS[zone]
              const raw = cell.tokens / maxTokens
              const mixPct = cell.tokens > 0
                ? Math.max(25, Math.min(100, Math.round(Math.sqrt(raw) * 100)))
                : 0
              const isHovered = hovered?.dayIdx === dayIdx && hovered?.hour === hour
              return (
                <div
                  key={`${dayIdx}-${hour}`}
                  onMouseEnter={e => {
                    const rect = cardRef.current?.getBoundingClientRect()
                    const tx = e.currentTarget.getBoundingClientRect()
                    setHovered({
                      dayIdx, hour,
                      x: tx.left + tx.width / 2 - (rect?.left ?? 0),
                      y: tx.top - (rect?.top ?? 0),
                      cellH: tx.height,
                    })
                  }}
                  onMouseLeave={() => setHovered(h => (h?.dayIdx === dayIdx && h?.hour === hour ? null : h))}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 2,
                    background: cell.tokens > 0
                      ? `color-mix(in srgb, var(--bg-card) ${100 - mixPct}%, ${cellColor})`
                      : 'var(--bg-card)',
                    minHeight: 12,
                    outline: isHovered ? '1px solid var(--text)' : 'none',
                    cursor: 'default',
                  }}
                />
              )
            })}
          </React.Fragment>
        ))}
      </div>

      {hovered && hoveredCell && hoveredCell.count > 0 && (() => {
        const cardW = cardRef.current?.clientWidth ?? 600
        const tipW = 220
        const tipH = 120
        // Day label column is 60px (+ 2px gap); clamp to avoid overlapping it
        const leftMin = 66
        const leftRaw = hovered.x - tipW / 2
        const left = Math.max(leftMin, Math.min(cardW - tipW - 6, leftRaw))
        // Hour header row is ~12px + 2px gap; tooltip must stay below it
        const headerBottom = 36
        const showAbove = hovered.y - headerBottom >= tipH + 6
        const top = showAbove
          ? hovered.y - 8
          : hovered.y + hovered.cellH + 8
        return (
        <div style={{
          position: 'absolute',
          left, top,
          transform: showAbove ? 'translateY(-100%)' : 'none',
          background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6,
          padding: '8px 10px', fontSize: 10, color: 'var(--text)', zIndex: 10,
          pointerEvents: 'none', width: tipW,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {dayLabels[hovered.dayIdx]} — {hovered.hour}h
          </div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>
            {hoveredCell.count} {hoveredCell.count > 1 ? 'sessions' : 'session'} · {formatTokens(hoveredCell.tokens)} · {formatCost(hoveredCell.cost)}
          </div>
          {topProjects.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {topProjects.map(([name, stats], i) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140,
                    color: i === 0 ? 'var(--accent)' : 'var(--text)', fontWeight: i === 0 ? 600 : 400,
                  }}>
                    {name}
                  </span>
                  <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {formatTokens(stats.tokens)} · {formatCost(stats.cost)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)' }}>—</div>
          )}
        </div>
        )
      })()}
    </div>
  )
}
