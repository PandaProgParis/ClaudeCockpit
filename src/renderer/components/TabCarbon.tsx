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

export function TabCarbon({ sessions, factors, quotaDaily }: Props) {
  const { t } = useLanguage()
  const exact = useExactNumbers()
  const [period, setPeriod] = useState<Period>('week')

  const filteredSessions = useMemo(() => filterByPeriod(sessions, period), [sessions, period])

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
      {/* Period selector */}
      <div style={{ display: 'flex', gap: 6 }}>
        {periods.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            style={{
              padding: '5px 14px',
              borderRadius: 20,
              border: period === p.id ? 'none' : '1px solid var(--border)',
              background: period === p.id ? 'var(--accent)' : 'var(--bg-card)',
              color: period === p.id ? '#fff' : 'var(--text-muted)',
              fontSize: 12,
              fontWeight: period === p.id ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Row 1: KPIs */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={kpiStyle}>
          <div style={labelStyle}>{t.carbonTotalCO2}</div>
          <div style={bigValueStyle}>{formatCO2(totals.totalCO2)}</div>
          <div style={{ color: totals.score.color, fontSize: 12 }}>{totals.score.letter} — {totals.score.level <= 2 ? t.carbonLowImpact : ''}</div>
        </div>
        <div style={kpiStyle}>
          <div style={labelStyle}>{t.carbonEquivalent}</div>
          <div style={bigValueStyle}>{formatEquivValue(totals.eq.carKm)} km</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>🚗 {t.carbonCarLabel}</div>
        </div>
        <div style={kpiStyle}>
          <div style={labelStyle}>{t.carbonMostEcoModel}</div>
          <div style={{ ...bigValueStyle, fontSize: 20 }}>{totals.mostEco}</div>
          <div style={{ color: '#66BB6A', fontSize: 12 }}>
            {totals.mostEco !== '-' ? `${t.carbonLowImpact} 🌱` : ''}
          </div>
        </div>
        <div style={kpiStyle}>
          <div style={labelStyle}>{t.carbonWaterEstimate}</div>
          <div style={bigValueStyle}>{formatWater(totals.eq.waterMl)}</div>
          <div style={{ color: '#64B5F6', fontSize: 12 }}>💧 {t.carbonWaterLabel}</div>
        </div>
      </div>

      {/* Row 2: Equivalences */}
      <div style={cardStyle}>
        <div style={{ ...labelStyle, marginBottom: 12 }}>{t.carbonEquivalences}</div>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'space-around' }}>
          <EquivCard emoji="🚗" value={`${formatEquivValue(totals.eq.carKm)} km`} label={t.carbonCarLabel} />
          <EquivCard emoji="✈️" value={formatFlightTime(totals.eq.flightMin)} label={t.carbonFlightLabel} />
          <EquivCard emoji="💧" value={formatWater(totals.eq.waterMl)} label={t.carbonWaterLabel} />
          <EquivCard emoji="📱" value={formatEquivValue(totals.eq.phoneCharges)} label={t.carbonPhoneLabel} />
        </div>
      </div>

      {/* Row 3: Storytelling */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <CarbonStoryScene percentage={quotaDaily > 0 ? (computeTodayCO2(sessions, factors.emission) / quotaDaily) * 100 : 0} />
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

function EquivCard({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 32 }}>{emoji}</div>
      <div style={{ color: 'var(--text)', fontSize: 16, fontWeight: 600 }}>{value}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{label}</div>
    </div>
  )
}
