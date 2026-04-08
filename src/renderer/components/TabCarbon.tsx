import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine, CartesianGrid } from 'recharts'
import type { SessionEntry } from '../lib/types'
import type { CarbonFactors } from '../lib/carbon'
import { computeCO2, computeEquivalences, getEcoScore, computeTodayCO2 } from '../lib/carbon'
import { useLanguage } from '../hooks/useLanguage'
import { useExactNumbers } from '../hooks/useExactNumbers'
import { abbreviateModel } from '../lib/format'
import { CarbonStoryScene } from './CarbonStoryScene'

type Period = 'today' | 'week' | 'year' | 'all'

function getStartOf(period: Period): Date | null {
  const now = new Date()
  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }
  if (period === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 6)
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (period === 'year') {
    return new Date(now.getFullYear(), 0, 1)
  }
  return null
}

function filterByPeriod(sessions: SessionEntry[], period: Period): SessionEntry[] {
  const start = getStartOf(period)
  if (!start) return sessions
  return sessions.filter(s => new Date(s.startedAt) >= start)
}

interface Props {
  sessions: SessionEntry[]
  factors: CarbonFactors
  quotaDaily: number
  showOnDashboard: boolean
  onToggleShowOnDashboard: (value: boolean) => void
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '14px 16px',
}

const kpiStyle: React.CSSProperties = {
  ...cardStyle,
  textAlign: 'center',
  flex: 1,
  minWidth: 0,
}

const labelStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const bigValueStyle: React.CSSProperties = {
  color: 'var(--text)',
  fontSize: 28,
  fontWeight: 700,
  margin: '6px 0',
}

function formatCO2(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(1)}kg`
  if (g >= 10) return `${Math.round(g)}g`
  if (g >= 1) return `${g.toFixed(1)}g`
  return `${g.toFixed(2)}g`
}

function formatEquivValue(n: number): string {
  if (n >= 100) return Math.round(n).toString()
  if (n >= 10) return n.toFixed(1)
  if (n >= 1) return n.toFixed(1)
  if (n >= 0.01) return n.toFixed(2)
  return n.toFixed(3)
}

function formatWater(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)} L`
  return `${formatEquivValue(ml)} mL`
}

function formatFlightTime(min: number): string {
  if (min >= 1) return `${formatEquivValue(min)} min`
  return `${formatEquivValue(min * 60)} sec`
}

export function TabCarbon({ sessions, factors, quotaDaily, showOnDashboard, onToggleShowOnDashboard }: Props) {
  const { t } = useLanguage()
  const exact = useExactNumbers()
  const [period, setPeriod] = useState<Period>('week')

  const filteredSessions = useMemo(() => filterByPeriod(sessions, period), [sessions, period])

  // CO2 per period for gauges
  const periodCO2 = useMemo(() => {
    const calc = (p: Period) => {
      const filtered = filterByPeriod(sessions, p)
      let co2 = 0
      for (const s of filtered) co2 += computeCO2(s.primaryModel, s.tokens.input, s.tokens.output, factors.emission)
      return co2
    }
    return { today: calc('today'), week: calc('week'), year: calc('year'), all: calc('all') }
  }, [sessions, factors])

  const totals = useMemo(() => {
    let totalCO2 = 0
    let totalTokens = 0
    const byModel: Record<string, number> = {}

    for (const s of filteredSessions) {
      const co2 = computeCO2(s.primaryModel, s.tokens.input, s.tokens.output, factors.emission)
      totalCO2 += co2
      totalTokens += s.tokens.input + s.tokens.output
      const label = abbreviateModel(s.primaryModel)
      byModel[label] = (byModel[label] || 0) + co2
    }

    const eq = computeEquivalences(totalCO2, totalTokens, factors.equivalences)
    const score = getEcoScore(totalCO2)

    const modelFactors = Object.entries(byModel).sort((a, b) => a[1] - b[1])
    const mostEco = modelFactors.length > 0 ? modelFactors[0][0] : '-'

    return { totalCO2, totalTokens, eq, score, byModel, mostEco }
  }, [filteredSessions, factors])

  const barData = useMemo(() => {
    return Object.entries(totals.byModel)
      .map(([model, co2]) => ({ model, co2: Math.round(co2 * 100) / 100 }))
      .sort((a, b) => b.co2 - a.co2)
  }, [totals.byModel])

  const lineData = useMemo(() => {
    const now = new Date()
    const buckets: Record<string, number> = {}

    if (period === 'today') {
      // 24 hourly buckets
      for (let h = 0; h < 24; h++) {
        buckets[String(h).padStart(2, '0') + 'h'] = 0
      }
      for (const s of filteredSessions) {
        const h = new Date(s.startedAt).getHours()
        const key = String(h).padStart(2, '0') + 'h'
        buckets[key] += computeCO2(s.primaryModel, s.tokens.input, s.tokens.output, factors.emission)
      }
    } else if (period === 'week') {
      // 7 daily buckets
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        buckets[d.toISOString().slice(0, 10)] = 0
      }
      for (const s of filteredSessions) {
        const key = s.startedAt.slice(0, 10)
        if (key in buckets) buckets[key] += computeCO2(s.primaryModel, s.tokens.input, s.tokens.output, factors.emission)
      }
    } else if (period === 'year') {
      // 12 monthly buckets
      for (let m = 0; m < 12; m++) {
        const key = `${now.getFullYear()}-${String(m + 1).padStart(2, '0')}`
        buckets[key] = 0
      }
      for (const s of filteredSessions) {
        const key = s.startedAt.slice(0, 7)
        if (key in buckets) buckets[key] += computeCO2(s.primaryModel, s.tokens.input, s.tokens.output, factors.emission)
      }
    } else {
      // all: monthly buckets from first session to now
      for (const s of filteredSessions) {
        const key = s.startedAt.slice(0, 7)
        buckets[key] = (buckets[key] || 0) + computeCO2(s.primaryModel, s.tokens.input, s.tokens.output, factors.emission)
      }
    }

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, co2]) => ({
        date: period === 'today' ? date : period === 'week' ? date.slice(5) : date,
        co2: Math.round(co2 * 100) / 100,
      }))
  }, [filteredSessions, factors, period])

  const periods: { id: Period; label: string }[] = [
    { id: 'today', label: t.carbonPeriodToday },
    { id: 'week', label: t.carbonPeriodWeek },
    { id: 'year', label: t.carbonPeriodYear },
    { id: 'all', label: t.carbonPeriodAll },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header: total CO2 + dashboard toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{formatCO2(periodCO2.all)}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>CO₂ {t.carbonPeriodAll.toLowerCase()}</span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>
          <input
            type="checkbox"
            checked={showOnDashboard}
            onChange={(e) => onToggleShowOnDashboard(e.target.checked)}
            style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          {t.carbonShowOnDashboard}
        </label>
      </div>

      {/* CO2 Gauges */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <GaugeRow label={t.carbonPeriodToday} value={periodCO2.today} max={periodCO2.all} color="#66BB6A" onClick={() => setPeriod('today')} active={period === 'today'} />
          <GaugeRow label={t.carbonPeriodWeek} value={periodCO2.week} max={periodCO2.all} color="#42A5F5" onClick={() => setPeriod('week')} active={period === 'week'} />
          <GaugeRow label={t.carbonPeriodYear} value={periodCO2.year} max={periodCO2.all} color="#FFA726" onClick={() => setPeriod('year')} active={period === 'year'} />
          <GaugeRow label={t.carbonPeriodAll} value={periodCO2.all} max={periodCO2.all} color="var(--accent)" onClick={() => setPeriod('all')} active={period === 'all'} />
        </div>
      </div>

      {/* Row 2: Story (80%) + Equivalences (20%) */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', height: 200 }}>
        <div style={{ ...cardStyle, flex: 8, padding: 0, overflow: 'hidden', height: 200 }}>
          <CarbonStoryScene percentage={quotaDaily > 0 ? (computeTodayCO2(sessions, factors.emission) / quotaDaily) * 100 : 0} />
        </div>
        <div style={{ ...cardStyle, flex: 2, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center', minWidth: 100, height: 200, overflow: 'hidden', padding: '8px 12px' }}>
          <div style={{ ...labelStyle, textAlign: 'center', fontSize: 9, marginBottom: 2 }}>{t.carbonEquivalences}</div>
          <MiniEquiv emoji="🚗" value={`${formatEquivValue(totals.eq.carKm)} km`} />
          <MiniEquiv emoji="✈️" value={formatFlightTime(totals.eq.flightMin)} />
          <MiniEquiv emoji="💧" value={formatWater(totals.eq.waterMl)} />
          <MiniEquiv emoji="📱" value={`${formatEquivValue(totals.eq.phoneCharges)}x`} />
        </div>
      </div>

      {/* Row 4: Charts */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ ...cardStyle, flex: 1 }}>
          <div style={{ ...labelStyle, marginBottom: 10 }}>{t.carbonByModel}</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData}>
              <XAxis dataKey="model" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'var(--text)' }}
                formatter={(value: unknown) => [`${(value as number).toFixed(2)}g CO₂`, '']}
              />
              <Bar dataKey="co2" radius={[4, 4, 0, 0]} fill="var(--accent)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...cardStyle, flex: 1 }}>
          <div style={{ ...labelStyle, marginBottom: 10 }}>{t.carbonOverTime} — {periods.find(p => p.id === period)?.label}</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={lineData}>
              <defs>
                <linearGradient id="co2Gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(value: unknown) => [`${(value as number).toFixed(2)}g CO₂`, '']}
              />
              <ReferenceLine y={quotaDaily} stroke="#ef5350" strokeDasharray="5 5" label={{ value: 'Quota', fill: '#ef5350', fontSize: 10 }} />
              <Area type="monotone" dataKey="co2" stroke="var(--accent)" fill="url(#co2Gradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Disclaimer */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 14 }}>⚠️</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{t.carbonDisclaimer}</span>
      </div>
    </div>
  )
}

function GaugeRow({ label, value, max, color, onClick, active }: { label: string; value: number; max: number; color: string; onClick: () => void; active: boolean }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        opacity: active ? 1 : 0.7,
        transition: 'opacity 0.15s',
      }}
    >
      <div style={{ width: 80, fontSize: 11, fontWeight: active ? 600 : 400, color: active ? 'var(--text)' : 'var(--text-muted)', flexShrink: 0 }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: 4,
          transition: 'width 0.3s ease',
          minWidth: pct > 0 ? 4 : 0,
        }} />
      </div>
      <div style={{ width: 60, fontSize: 11, fontWeight: 600, color: 'var(--text)', textAlign: 'right', flexShrink: 0 }}>
        {formatCO2(value)}
      </div>
      <div style={{ width: 36, fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
        {Math.round(pct)}%
      </div>
    </div>
  )
}

function MiniEquiv({ emoji, value }: { emoji: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 14 }}>{emoji}</span>
      <span style={{ color: 'var(--text)', fontSize: 12, fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function EquivCard({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 32 }}>{emoji}</div>
      <div style={{ color: 'var(--text)', fontSize: 16, fontWeight: 600 }}>{value}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{label}</div>
    </div>
  )
}
