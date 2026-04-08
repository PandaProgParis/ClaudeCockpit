import { useState, useEffect, useRef } from 'react'
import type { ActiveSessionWithSpeed } from '../hooks/useActiveSessions'
import type { ToolUseBlock, ThinkingBlock, TextBlock } from '../lib/types'
import { useLiveSessionMessages } from '../hooks/useLiveSessionMessages'
import { formatTokens, formatCost, formatDuration, abbreviateModel, modelColor } from '../lib/format'
import { useExactNumbers } from '../hooks/useExactNumbers'
import { useLanguage } from '../hooks/useLanguage'
import { computeCO2, computeEquivalences, DEFAULT_EQUIVALENCE_FACTORS } from '../lib/carbon'

interface Props {
  session: ActiveSessionWithSpeed
  expanded?: boolean
  onToggleExpand?: () => void
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

function ToolCallLine({ block }: { block: ToolUseBlock }) {
  const pathVal = (block.input.path ?? block.input.file_path) as string | undefined
  const compact = `${block.name}${pathVal ? ` ${pathVal}` : ''}`
  return (
    <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 0', fontFamily: 'monospace' }}>
      ▶ {compact}
    </div>
  )
}

export function ActiveSessionCard({ session, expanded, onToggleExpand }: Props) {
  const exact = useExactNumbers()
  const { t, locale } = useLanguage()
  const isActive = session.status === 'active'
  const durationSeconds = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)
  const abbrev = abbreviateModel(session.model)
  const mColor = modelColor(session.model)
  const totalTokens = session.tokens.input + session.tokens.output + session.tokens.cacheCreation + session.tokens.cacheRead

  // Context window gauge — use contextSize (last message input+cache) not cumulative total
  const maxCtx = session.maxContextSize > 0 ? session.maxContextSize : 200_000
  const contextFill = Math.min(session.contextSize / maxCtx, 1)
  const contextPct = contextFill * 100

  // Segment widths relative to maxCtx (not total), proportional to their share of contextSize
  const pctOfCtx = (n: number) => session.contextSize > 0 ? (n / session.contextSize) * contextPct : 0

  // Bar color: green → orange → red
  const barAlertColor = contextPct >= 60
    ? '#ef5350'
    : contextPct >= 30
      ? '#FFB74D'
      : '#66BB6A'

  // Phone charges for this session
  const sessionCO2 = computeCO2(session.model, session.tokens.input, session.tokens.output, {})
  const phoneCharges = sessionCO2 / DEFAULT_EQUIVALENCE_FACTORS.phoneGramPerCharge

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

      {/* Row 2: context window gauge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{ fontSize: 10, color: contextPct >= 60 ? '#ef5350' : contextPct >= 30 ? '#FFB74D' : '#66BB6A', flexShrink: 0, minWidth: 50, fontWeight: contextPct >= 30 ? 700 : undefined }}
          title={contextPct >= 60 ? t.contextFull : t.contextUsed}
        >
          context {Math.round(contextPct)}%
        </span>
        <div
          style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bar-bg)', overflow: 'hidden' }}
          title={`${formatTokens(session.contextSize, exact, locale)} / ${formatTokens(maxCtx, exact, locale)} — ${t.contextUsed}`}
        >
          <div style={{ width: `${contextPct}%`, height: '100%', background: 'linear-gradient(90deg, #66BB6A 0%, #FFB74D 30%, #ef5350 60%)', backgroundSize: `${100 / (contextPct / 100)}% 100%`, borderRadius: 3, transition: 'width 0.5s' }} />
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}>
          {formatTokens(maxCtx, exact, locale)}
        </span>
      </div>

      {/* Row 3: legend + phone charges + tok/s + expand button */}
      <div style={{ display: 'flex', gap: 14, fontSize: 10, color: 'var(--text-muted)', flexWrap: 'wrap', alignItems: 'center' }}>
        <span title={t.inputTitle}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: COLORS.input, marginRight: 4, verticalAlign: 'middle' }} />{t.inputLabel} {formatTokens(session.tokens.input, exact, locale)}</span>
        <span title={t.outputTitle}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: COLORS.output, marginRight: 4, verticalAlign: 'middle' }} />{t.outputLabel} {formatTokens(session.tokens.output, exact, locale)}</span>
        <span title={t.cacheWriteTitle}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: COLORS.cacheWrite, marginRight: 4, verticalAlign: 'middle' }} />{t.cacheWriteLabel} {formatTokens(session.tokens.cacheCreation, exact, locale)}</span>
        <span title={t.cacheReadTitle}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: COLORS.cacheRead, marginRight: 4, verticalAlign: 'middle' }} />{t.cacheReadLabel} {formatTokens(session.tokens.cacheRead, exact, locale)}</span>
        {sessionCO2 > 0 && (
          <span style={{
            fontSize: 10,
            padding: '2px 8px',
            borderRadius: 4,
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text-dim)',
            whiteSpace: 'nowrap',
          }}>
            🔋 {phoneCharges < 0.1 ? phoneCharges.toFixed(3) : phoneCharges < 1 ? phoneCharges.toFixed(2) : phoneCharges.toFixed(1)} recharges
            {' · '}
            🚗 {(() => { const km = sessionCO2 / DEFAULT_EQUIVALENCE_FACTORS.carGramPerKm; return km < 0.01 ? km.toFixed(4) : km < 1 ? km.toFixed(2) : km.toFixed(1) })()}km
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontWeight: 600, color: session.tokensPerSecond > 0 ? 'var(--green)' : 'var(--text-dim)' }}>
          {Math.round(session.tokensPerSecond).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')} tok/s
        </span>
        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            style={{
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid var(--border)',
              background: expanded ? 'var(--accent)' : 'var(--bg-card)',
              color: expanded ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {expanded ? t.collapseSession : t.expandSession}
          </button>
        )}
      </div>

      {/* Accordion: live messages */}
      {expanded && (
        <LiveMessagesPanel sessionId={session.sessionId} projectPath={session.projectPath} />
      )}
    </div>
  )
}

function LiveMessagesPanel({ sessionId, projectPath }: { sessionId: string; projectPath: string }) {
  const { t } = useLanguage()
  const { messages, loading, error } = useLiveSessionMessages(sessionId, projectPath)
  const scrollRef = useRef<HTMLDivElement>(null)
  const wasAtBottomRef = useRef(true)

  // Auto-scroll to bottom when new messages arrive, only if already at bottom
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (wasAtBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    wasAtBottomRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 20
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      style={{
        maxHeight: 350,
        overflowY: 'auto',
        marginTop: 8,
        marginLeft: 14,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        userSelect: 'text',
        background: 'var(--bg)',
        borderRadius: 8,
        border: '1px solid var(--border)',
        boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {loading && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
          {t.loading}
        </div>
      )}

      {error && (
        <div style={{ fontSize: 11, color: 'var(--red)', fontStyle: 'italic' }}>
          {t.errorPrefix} {error}
        </div>
      )}

      {!loading && messages.map((msg, i) => {
        if (msg.type === 'user') {
          return (
            <div key={i} style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{
                background: 'var(--accent)',
                color: '#fff',
                borderRadius: '8px 8px 2px 8px',
                padding: '5px 9px',
                maxWidth: '80%',
                fontSize: 11,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {msg.content}
              </div>
            </div>
          )
        }

        // assistant
        const textBlocks = msg.content.filter(b => b.type === 'text')
        const toolUseBlocks = msg.content.filter((b): b is ToolUseBlock => b.type === 'tool_use')
        const thinkingBlocks = msg.content.filter(b => b.type === 'thinking')

        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start', maxWidth: '90%' }}>
            {thinkingBlocks.map((b, j) => (
              <div key={`think-${j}`} style={{
                fontSize: 10,
                fontStyle: 'italic',
                color: 'var(--text-dim)',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 5,
                padding: '3px 7px',
                width: '100%',
              }}>
                💭 {(b as ThinkingBlock).thinking?.slice(0, 200)}…
              </div>
            ))}

            {toolUseBlocks.length > 0 && (
              <div style={{ width: '100%' }}>
                {toolUseBlocks.map((b, j) => (
                  <ToolCallLine key={`tool-${j}`} block={b} />
                ))}
              </div>
            )}

            {textBlocks.length > 0 && (
              <div style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px 8px 8px 2px',
                padding: '5px 9px',
                fontSize: 11,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {(textBlocks as TextBlock[]).map((b, j) => <span key={j}>{b.text}</span>)}
              </div>
            )}
          </div>
        )
      })}

      {!loading && messages.length === 0 && !error && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
          {t.noMessagesYet}
        </div>
      )}
    </div>
  )
}
