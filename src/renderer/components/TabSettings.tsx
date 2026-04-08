import { useState, useEffect } from 'react'
import type { PriceTable } from '../lib/cost'
import { DEFAULT_PRICES, setPriceTable } from '../lib/cost'
import { useLanguage } from '../hooks/useLanguage'
import type { CarbonFactors } from '../lib/carbon'
import { DEFAULT_CARBON_FACTORS } from '../lib/carbon'

export interface AppSettings {
  refreshIntervalMs: number
  exactNumbers: boolean
  carbonQuotaDaily: number
}

const DEFAULT_SETTINGS: AppSettings = { refreshIntervalMs: 5000, exactNumbers: false, carbonQuotaDaily: 50 }

interface Props {
  onPricesChanged?: () => void
  onSettingsChanged?: (settings: AppSettings) => void
  onClose: () => void
  exactNumbers: boolean
}

// Quota unit definitions: each unit maps to gCO₂ per 1 unit
const QUOTA_UNITS = [
  { id: 'phone', emoji: '📱', gPerUnit: 8.2 },     // 1 phone charge = 8.2g
  { id: 'car', emoji: '🚗', gPerUnit: 120 },        // 1 km car = 120g
  { id: 'flight', emoji: '✈️', gPerUnit: 47.5 },    // 1 second of flight = 2850/60 = 47.5g
  { id: 'water', emoji: '💧', gPerUnit: 50 },        // 1 liter ≈ 50g (rough data center estimate)
  { id: 'email', emoji: '📧', gPerUnit: 4 },         // 1 email = 4g (ADEME)
  { id: 'streaming', emoji: '🎬', gPerUnit: 36 },    // 1 hour streaming = 36g
] as const

type QuotaUnitId = typeof QUOTA_UNITS[number]['id']

function getQuotaUnitLabel(id: string, t: any): string {
  const map: Record<string, string> = {
    phone: t.carbonQuotaPhoneCharges,
    car: t.carbonQuotaCarKm,
    flight: t.carbonQuotaFlightSeconds,
    water: t.carbonQuotaWaterLiters,
    email: t.carbonQuotaEmails,
    streaming: t.carbonQuotaStreaming,
  }
  return map[id] || id
}

function computeQuotaFromUnit(amount: number, unitId: string): number {
  const unit = QUOTA_UNITS.find(u => u.id === unitId)
  return unit ? Math.round(amount * unit.gPerUnit) : 50
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '12px 16px',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: 10,
  fontWeight: 600,
}

export function TabSettings({ onPricesChanged, onSettingsChanged, onClose, exactNumbers }: Props) {
  const { t } = useLanguage()
  const [prices, setPrices] = useState<PriceTable>(DEFAULT_PRICES)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(5)
  const [exact, setExact] = useState(exactNumbers)
  const [carbonFactors, setCarbonFactors] = useState<CarbonFactors>(DEFAULT_CARBON_FACTORS)
  const [carbonQuota, setCarbonQuota] = useState(DEFAULT_SETTINGS.carbonQuotaDaily)
  const [quotaAmount, setQuotaAmount] = useState(6)
  const [quotaUnit, setQuotaUnit] = useState('phone')

  useEffect(() => {
    fetch('/api/prices').then(r => r.json()).then(setPrices).catch(() => {})
    fetch('/api/settings').then(r => r.json()).then((s: AppSettings) => {
      setRefreshInterval(s.refreshIntervalMs / 1000)
      if (s.exactNumbers !== undefined) setExact(s.exactNumbers)
      if (s.carbonQuotaDaily !== undefined) setCarbonQuota(s.carbonQuotaDaily)
    }).catch(() => {})
    fetch('/api/carbon-factors').then(r => r.json()).then(setCarbonFactors).catch(() => {})
  }, [])

  const update = (model: string, field: keyof PriceTable[string], value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return
    setPrices(prev => ({ ...prev, [model]: { ...prev[model], [field]: num } }))
    setSaved(false)
  }

  const updateEmission = (pattern: string, value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return
    setCarbonFactors(prev => ({
      ...prev,
      emission: { ...prev.emission, [pattern]: num },
    }))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    const settings: AppSettings = { refreshIntervalMs: refreshInterval * 1000, exactNumbers: exact, carbonQuotaDaily: carbonQuota }
    await Promise.all([
      fetch('/api/prices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prices) }),
      fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) }),
      fetch('/api/carbon-factors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(carbonFactors) }),
    ])
    setPriceTable(prices)
    onPricesChanged?.()
    onSettingsChanged?.(settings)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const reset = () => {
    setPrices(DEFAULT_PRICES)
    setRefreshInterval(5)
    setCarbonFactors(DEFAULT_CARBON_FACTORS)
    setCarbonQuota(DEFAULT_SETTINGS.carbonQuotaDaily)
    setSaved(false)
  }

  const inputStyle: React.CSSProperties = {
    width: 70, fontSize: 11, padding: '4px 6px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', textAlign: 'right',
  }

  const models = Object.keys(prices)
  const fields: { key: keyof PriceTable[string]; label: string }[] = [
    { key: 'input', label: 'Input' },
    { key: 'output', label: 'Output' },
    { key: 'cacheWrite', label: 'Cache W' },
    { key: 'cacheRead', label: 'Cache R' },
  ]

  const emissionPatterns = Object.keys(carbonFactors.emission)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800, margin: '0 auto', width: '100%' }}>
      {/* General */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>{t.generalSection}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
            <span style={{ color: 'var(--text)' }}>{t.refreshInterval}</span>
            <input
              type="number"
              min={1}
              max={60}
              value={refreshInterval}
              onChange={e => { setRefreshInterval(Number(e.target.value)); setSaved(false) }}
              style={{ ...inputStyle, width: 50 }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{t.seconds}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
            <span style={{ color: 'var(--text)' }}>{t.exactNumbers}</span>
            <button
              onClick={() => { setExact(!exact); setSaved(false) }}
              style={{
                width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: exact ? 'var(--accent)' : 'var(--border)',
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: 2, left: exact ? 18 : 2,
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s',
              }} />
            </button>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              {exact ? '1 234 567' : '1.2M'}
            </span>
          </div>
        </div>
      </div>

      {/* Prix */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>{t.pricePerMillion}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 10, paddingBottom: 6 }}>{t.model}</th>
              {fields.map(f => (
                <th key={f.key} style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 10, paddingBottom: 6 }}>{f.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {models.map(model => (
              <tr key={model}>
                <td style={{ color: 'var(--text)', fontWeight: 500, paddingBottom: 6 }}>
                  {model.replace('claude-', '').replace('-4', '')}
                </td>
                {fields.map(f => (
                  <td key={f.key} style={{ textAlign: 'right', paddingBottom: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 2 }}>$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={prices[model]?.[f.key] ?? 0}
                      onChange={e => update(model, f.key, e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8 }}>
          {t.priceNote}
        </div>
      </div>

      {/* Carbon factors */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>{t.carbonCarbonFactors}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Daily quota picker */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 10 }}>{t.carbonChooseQuota}</div>

            {/* Amount selector: 1-10 */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <button
                  key={n}
                  onClick={() => {
                    setQuotaAmount(n)
                    setCarbonQuota(computeQuotaFromUnit(n, quotaUnit))
                    setSaved(false)
                  }}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: quotaAmount === n ? 700 : 400,
                    background: quotaAmount === n ? 'var(--accent)' : 'var(--bg)',
                    color: quotaAmount === n ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Unit selector */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {QUOTA_UNITS.map(unit => (
                <button
                  key={unit.id}
                  onClick={() => {
                    setQuotaUnit(unit.id)
                    setCarbonQuota(computeQuotaFromUnit(quotaAmount, unit.id))
                    setSaved(false)
                  }}
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 12,
                    background: quotaUnit === unit.id ? 'var(--accent)' : 'var(--bg)',
                    color: quotaUnit === unit.id ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{unit.emoji}</span>
                  {getQuotaUnitLabel(unit.id, t)}
                </button>
              ))}
            </div>

            {/* Result */}
            <div style={{
              background: 'var(--bg)', borderRadius: 8, padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>
                {QUOTA_UNITS.find(u => u.id === quotaUnit)?.emoji}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>
                <strong>{quotaAmount}</strong> {getQuotaUnitLabel(quotaUnit, t)}
              </span>
              <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>→</span>
              <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>
                {carbonQuota >= 1000 ? `${(carbonQuota / 1000).toFixed(1)} kg` : `${carbonQuota}g`} CO₂/{t.carbonQuota.toLowerCase().includes('jour') ? 'jour' : 'day'}
              </span>
            </div>
          </div>

          {/* Emission factors table */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{t.carbonEmissionFactors}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 10, paddingBottom: 6 }}>{t.model}</th>
                  <th style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 10, paddingBottom: 6 }}>{t.carbonGPerToken}</th>
                </tr>
              </thead>
              <tbody>
                {emissionPatterns.map(pattern => (
                  <tr key={pattern}>
                    <td style={{ color: 'var(--text)', fontWeight: 500, paddingBottom: 6, textTransform: 'capitalize' }}>
                      {pattern}
                    </td>
                    <td style={{ textAlign: 'right', paddingBottom: 6 }}>
                      <input
                        type="number"
                        step="0.00001"
                        value={carbonFactors.emission[pattern] ?? 0}
                        onChange={e => updateEmission(pattern, e.target.value)}
                        style={{ ...inputStyle, width: 90 }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button onClick={reset} style={{ fontSize: 11, padding: '6px 14px', borderRadius: 8, background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer' }}>
          {t.reset}
        </button>
        <button onClick={save} disabled={saving} style={{ fontSize: 11, padding: '6px 14px', borderRadius: 8, background: saved ? 'var(--green)' : 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          {saving ? '...' : saved ? t.saved : t.save}
        </button>
      </div>
    </div>
  )
}
