import type { ActiveSessionWithSpeed } from '../hooks/useActiveSessions'
import { formatTokens, formatCost, formatDuration, abbreviateModel, modelColor } from '../lib/format'
import { useExactNumbers } from '../hooks/useExactNumbers'
import { useLanguage } from '../hooks/useLanguage'

interface Props {
  session: ActiveSessionWithSpeed
}

function idleMinutes(lastActivityAt: string): number {
  return Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / 60000)
}

const COLORS = {
  input: '#D4A574',
  output: '#8BB8E0',
  cacheWrite: '#C9A0DC',
  cacheRead: '#8CC99E',
}

export function ActiveSessionCard({ session }: Props) {
  const exact = useExactNumbers()
  const { t, locale } = useLanguage()
  const isActive = session.status === 'active'
  const durationSeconds = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)
  const abbrev = abbreviateModel(session.model)
  const mColor = modelColor(session.model)
  const totalTokens = session.tokens.input + session.tokens.output + session.tokens.cacheCreation + session.tokens.cacheRead

  // Proportional bar (relative to total, not max context)
  const pct = (n: number) => totalTokens > 0 ? (n / totalTokens) * 100 : 0

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Row 1: status, project, model, tags, duration, cost */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isActive ? '#66BB6A' : '#FFB74D',
            flexShrink: 0,
            boxShadow: isActive ? '0 0 6px #66BB6A' : undefined,
            animation: isActive ? 'pulse 2s ease-in-out infinite' : undefined,
          }}
        />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{session.projectName}</span>
          {session.title && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{session.title}</span>
          )}
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8, background: `${mColor}22`, color: mColor }}>
          {abbrev}
        </span>
        {session.usedThinking && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8, background: '#AB47BC22', color: '#AB47BC' }}>
            think
          </span>
        )}
        {!isActive && (
          <span style={{ fontSize: 10, color: '#FFB74D' }}>{t.idle(idleMinutes(session.lastActivityAt))}</span>
        )}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
          {formatDuration(durationSeconds)}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', flexShrink: 0 }}>
          {formatCost(session.estimatedCostUSD)}
        </span>
      </div>

      {/* Row 2: proportional token bar + tok/s */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, minWidth: 50 }}>
          {formatTokens(totalTokens, exact, locale)}
        </span>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bar-bg)', overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${pct(session.tokens.input)}%`, height: '100%', background: COLORS.input }} />
          <div style={{ width: `${pct(session.tokens.output)}%`, height: '100%', background: COLORS.output }} />
          <div style={{ width: `${pct(session.tokens.cacheCreation)}%`, height: '100%', background: COLORS.cacheWrite }} />
          <div style={{ width: `${pct(session.tokens.cacheRead)}%`, height: '100%', background: COLORS.cacheRead }} />
        </div>
      </div>

      {/* Row 3: legend with descriptions + tok/s */}
      <div style={{ display: 'flex', gap: 14, fontSize: 10, color: 'var(--text-muted)', flexWrap: 'wrap', alignItems: 'center' }}>
        <span title={t.inputTitle}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: COLORS.input, marginRight: 4, verticalAlign: 'middle' }} />{t.inputLabel} {formatTokens(session.tokens.input, exact, locale)}</span>
        <span title={t.outputTitle}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: COLORS.output, marginRight: 4, verticalAlign: 'middle' }} />{t.outputLabel} {formatTokens(session.tokens.output, exact, locale)}</span>
        <span title={t.cacheWriteTitle}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: COLORS.cacheWrite, marginRight: 4, verticalAlign: 'middle' }} />{t.cacheWriteLabel} {formatTokens(session.tokens.cacheCreation, exact, locale)}</span>
        <span title={t.cacheReadTitle}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: COLORS.cacheRead, marginRight: 4, verticalAlign: 'middle' }} />{t.cacheReadLabel} {formatTokens(session.tokens.cacheRead, exact, locale)}</span>
        <span style={{ marginLeft: 'auto', fontWeight: 600, color: session.tokensPerSecond > 0 ? 'var(--green)' : 'var(--text-dim)' }}>
          {Math.round(session.tokensPerSecond).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')} tok/s
        </span>
      </div>
    </div>
  )
}
