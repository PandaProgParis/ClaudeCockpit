import { useState, useEffect } from 'react'
import type { UsageData } from '../lib/types'
import { formatTokens } from '../lib/format'
import { useExactNumbers } from '../hooks/useExactNumbers'
import { useLanguage } from '../hooks/useLanguage'

function formatTimeUntil(isoDate: string, dayNames: string[]): string {
  const target = new Date(isoDate)
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return dayNames[7] // 'now' stored at index 7
  const day = dayNames[target.getDay()]
  const h = target.getHours().toString().padStart(2, '0')
  const m = target.getMinutes().toString().padStart(2, '0')
  return `${day} ${h}:${m}`
}

function formatTimeRemaining(isoDate: string, nowLabel: string): string {
  const diff = new Date(isoDate).getTime() - Date.now()
  if (diff <= 0) return nowLabel
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h${m.toString().padStart(2, '0')}`
}

interface CalibrationData {
  points: { deltaApiPercent: number; deltaLocalTokens: number; timestamp: string }[]
  tokensPerPercent: number | null
}

interface Props {
  usage: UsageData | null
  onSubmitManual: (json: string) => Promise<boolean>
}

function GaugeRow({ label, utilization, resetsAt, color, shortReset, dayNames, nowLabel, resetInLabel, resetAtLabel }: {
  label: string
  utilization: number
  resetsAt: string | undefined
  color: string
  shortReset?: boolean
  dayNames: string[]
  nowLabel: string
  resetInLabel: string
  resetAtLabel: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
          {resetsAt
            ? shortReset
              ? `${resetInLabel} ${formatTimeRemaining(resetsAt, nowLabel)}`
              : `${resetAtLabel} ${formatTimeUntil(resetsAt, [...dayNames, nowLabel])}`
            : '—'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--bar-bg)', overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min(utilization, 100)}%`,
            height: '100%',
            borderRadius: 4,
            background: color,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', minWidth: 32, textAlign: 'right' }}>
          {Math.round(utilization)}%
        </span>
      </div>
    </div>
  )
}

export function UsageBar({ usage, onSubmitManual }: Props) {
  const [showSync, setShowSync] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [syncError, setSyncError] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [calibration, setCalibration] = useState<CalibrationData | null>(null)
  const [serverPort, setServerPort] = useState<string>('')
  const exact = useExactNumbers()
  const { t, locale } = useLanguage()

  const dayNames = [t.sunday, t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday]

  useEffect(() => {
    fetch('/api/info').then(r => r.json()).then(d => setServerPort(String(d.port))).catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/calibration').then(r => r.json()).then(setCalibration).catch(() => {})
  }, [usage])

  const handleSync = async () => {
    setSyncing(true)
    setSyncError(false)
    const ok = await onSubmitManual(jsonInput)
    setSyncing(false)
    if (ok) {
      setShowSync(false)
      setJsonInput('')
      // Refresh calibration after sync
      fetch('/api/calibration').then(r => r.json()).then(setCalibration).catch(() => {})
    } else {
      setSyncError(true)
    }
  }

  const sevenDay = usage?.sevenDay
  const fiveHour = usage?.fiveHour
  const sonnet = usage?.sevenDaySonnet
  const syncCount = calibration?.points.length ?? 0
  const tokensPerPercent = calibration?.tokensPerPercent
  const remainingPercent = sevenDay ? Math.max(0, 100 - sevenDay.utilization) : null
  const estimatedRemaining = tokensPerPercent && remainingPercent !== null
    ? Math.round(remainingPercent * tokensPerPercent)
    : null

  const timeLocale = locale === 'fr' ? 'fr-FR' : 'en-US'

  const gaugeProps = {
    dayNames,
    nowLabel: t.now,
    resetInLabel: t.resetIn,
    resetAtLabel: t.resetAt,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Header: title + actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Usage
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {usage?.source && (
            <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>
              Sync {usage.source === 'manual' ? 'manual' : 'automatic'} (Port {serverPort || '...'}) - Last {new Date(usage.fetchedAt).toLocaleTimeString(timeLocale, { hour: 'numeric', minute: '2-digit', hour12: false })}
            </span>
          )}
          <button
            onClick={() => window.open('https://claude.ai/settings/usage', '_blank')}
            style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 8,
              background: 'var(--bg-card-hover)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)', cursor: 'pointer',
            }}
            title="Ouvrir claude.ai/settings/usage"
          >
            ↗ Usage
          </button>
          <button
            onClick={() => setShowSync(!showSync)}
            style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 8,
              background: usage ? 'var(--bg-card-hover)' : 'var(--accent)',
              color: usage ? 'var(--text-muted)' : '#fff',
              border: '1px solid var(--border)', cursor: 'pointer',
            }}
          >
            {usage ? '⟳ Sync' : '+ Sync'}
          </button>
        </div>
      </div>

      {/* Sync panel */}
      {showSync && (
        <div style={{
          background: 'var(--bg-card-hover)', border: '1px solid var(--border)',
          borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {t.syncInstructions}
          </div>
          <textarea
            value={jsonInput}
            onChange={(e) => { setJsonInput(e.target.value); setSyncError(false) }}
            placeholder='{"five_hour": {"utilization": 17, ...}, "seven_day": {...}}'
            style={{
              width: '100%', minHeight: 50, fontSize: 10, fontFamily: 'monospace',
              background: 'var(--bg)', color: 'var(--text)',
              border: `1px solid ${syncError ? 'var(--red)' : 'var(--border)'}`,
              borderRadius: 6, padding: 6, resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowSync(false); setJsonInput(''); setSyncError(false) }}
              style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              {t.cancel}
            </button>
            <button onClick={handleSync} disabled={!jsonInput.trim() || syncing}
              style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, background: 'var(--accent)', color: '#fff', border: 'none', cursor: jsonInput.trim() && !syncing ? 'pointer' : 'not-allowed', opacity: jsonInput.trim() && !syncing ? 1 : 0.5 }}>
              {syncing ? '...' : t.send}
            </button>
          </div>
          {syncError && <span style={{ fontSize: 10, color: 'var(--red)' }}>{t.invalidJSON}</span>}
        </div>
      )}

      {/* 3 gauges */}
      {fiveHour && (
        <GaugeRow
          label={t.session5h}
          utilization={fiveHour.utilization}
          resetsAt={fiveHour.resetsAt}
          color="#D4956A"
          shortReset
          {...gaugeProps}
        />
      )}
      <GaugeRow
        label={t.weeklyAllModels}
        utilization={sevenDay?.utilization ?? 0}
        resetsAt={sevenDay?.resetsAt}
        color="#64B5F6"
        {...gaugeProps}
      />
      {sonnet && (
        <GaugeRow
          label={t.weeklySonnet}
          utilization={sonnet.utilization}
          resetsAt={sonnet.resetsAt}
          color="#8BB8E0"
          {...gaugeProps}
        />
      )}

      {/* Calibration estimation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 6 }}>
        <div>
          {estimatedRemaining !== null ? (
            <span>{t.estimatedRemaining} <b style={{ color: 'var(--text)' }}>{formatTokens(estimatedRemaining, exact, locale)}</b> tokens</span>
          ) : (
            <span>{t.estimationNoData}</span>
          )}
        </div>
        <span style={{ color: 'var(--text-dim)' }}>
          {t.precision} {syncCount} {syncCount > 1 ? t.syncs : t.sync}
          {syncCount >= 5 ? ' ✓' : syncCount >= 2 ? ' ~' : ' ?'}
        </span>
      </div>
    </div>
  )
}
