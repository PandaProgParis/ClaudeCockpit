import { useState, useEffect } from 'react'
import type { PriceTable } from '../lib/cost'
import { DEFAULT_PRICES, setPriceTable } from '../lib/cost'
import { useLanguage } from '../hooks/useLanguage'

export interface AppSettings {
  refreshIntervalMs: number
  exactNumbers: boolean
}

const DEFAULT_SETTINGS: AppSettings = { refreshIntervalMs: 5000, exactNumbers: false }

interface Props {
  onPricesChanged?: () => void
  onSettingsChanged?: (settings: AppSettings) => void
  onClose: () => void
  exactNumbers: boolean
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

  useEffect(() => {
    fetch('/api/prices').then(r => r.json()).then(setPrices).catch(() => {})
    fetch('/api/settings').then(r => r.json()).then((s: AppSettings) => {
      setRefreshInterval(s.refreshIntervalMs / 1000)
      if (s.exactNumbers !== undefined) setExact(s.exactNumbers)
    }).catch(() => {})
  }, [])

  const update = (model: string, field: keyof PriceTable[string], value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return
    setPrices(prev => ({ ...prev, [model]: { ...prev[model], [field]: num } }))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    const settings: AppSettings = { refreshIntervalMs: refreshInterval * 1000, exactNumbers: exact }
    await Promise.all([
      fetch('/api/prices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prices) }),
      fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) }),
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
