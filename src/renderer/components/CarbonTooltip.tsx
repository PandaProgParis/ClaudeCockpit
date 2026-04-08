import { useLanguage } from '../hooks/useLanguage'
import { computeCO2, computeEquivalences, getEcoScore } from '../lib/carbon'
import type { CarbonFactors } from '../lib/carbon'
import { formatTokens, formatDuration, abbreviateModel } from '../lib/format'

interface Props {
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  durationSeconds: number
  factors: CarbonFactors
  style?: React.CSSProperties
}

function formatValue(n: number): string {
  if (n >= 1000) return n.toFixed(0)
  if (n >= 100) return n.toFixed(0)
  if (n >= 10) return n.toFixed(1)
  if (n >= 1) return n.toFixed(1)
  if (n >= 0.01) return n.toFixed(2)
  return n.toFixed(3)
}

function formatTime(minutes: number): string {
  if (minutes >= 1) return `${formatValue(minutes)} min`
  const seconds = minutes * 60
  return `${formatValue(seconds)} sec`
}

function formatWater(ml: number): string {
  if (ml >= 1000) return `${formatValue(ml / 1000)} L`
  return `${formatValue(ml)} mL`
}

export function CarbonTooltip({ model, inputTokens, outputTokens, totalTokens, durationSeconds, factors, style }: Props) {
  const { t } = useLanguage()
  const co2 = computeCO2(model, inputTokens, outputTokens, factors.emission)
  const eq = computeEquivalences(co2, totalTokens, factors.equivalences)
  const score = getEcoScore(co2)

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '14px 16px',
        width: 260,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        zIndex: 100,
        ...style,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ color: 'var(--text)', fontSize: 14, fontWeight: 700 }}>
          {formatValue(co2)}g CO₂
        </span>
        <span
          style={{
            background: score.level <= 2 ? 'rgba(102,187,106,0.15)' : score.level <= 3 ? 'rgba(212,149,106,0.15)' : 'rgba(239,83,80,0.15)',
            color: score.color,
            fontSize: 10,
            padding: '2px 8px',
            borderRadius: 10,
            fontWeight: 600,
          }}
        >
          Score {score.letter}
        </span>
      </div>

      {/* Equivalences */}
      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 10, fontStyle: 'italic' }}>
        {t.carbonAsIfYouHad}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <EquivRow emoji="🚗" main={t.carbonCarKm(formatValue(eq.carKm))} sub={t.carbonCarLabel} />
        <EquivRow emoji="✈️" main={t.carbonFlightMin(formatTime(eq.flightMin))} sub={t.carbonFlightLabel} />
        <EquivRow emoji="💧" main={t.carbonWaterMl(formatWater(eq.waterMl))} sub={t.carbonWaterLabel} />
        <EquivRow emoji="📱" main={t.carbonPhoneCharges(formatValue(eq.phoneCharges))} sub={t.carbonPhoneLabel} />
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 8, color: 'var(--text-dim)', fontSize: 10, textAlign: 'center' }}>
        {formatTokens(totalTokens)} tokens · {abbreviateModel(model)} · {formatDuration(durationSeconds)}
      </div>
    </div>
  )
}

function EquivRow({ emoji, main, sub }: { emoji: string; main: string; sub: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>{main}</div>
        <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>{sub}</div>
      </div>
    </div>
  )
}
