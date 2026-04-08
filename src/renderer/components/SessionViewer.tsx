import { useEffect, useState } from 'react'
import type { SessionEntry, ToolUseBlock, ThinkingBlock, TextBlock } from '../lib/types'
import { useSessionMessages } from '../hooks/useSessionMessages'
import { useLanguage } from '../hooks/useLanguage'
import { formatDate, formatDuration } from '../lib/format'
import { computeCO2, computeEquivalences, getEcoScore } from '../lib/carbon'
import type { CarbonFactors } from '../lib/carbon'

const DETAILS_KEY = 'cockpit:viewer:details'

interface Props {
  session: SessionEntry
  onClose: () => void
  carbonFactors: CarbonFactors
}

function SkeletonBubble({ right }: { right?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: right ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      <div style={{
        width: right ? 220 : 280,
        height: 36,
        borderRadius: right ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
        background: 'var(--border)',
        opacity: 0.5,
      }} />
    </div>
  )
}

function ToolCallLine({ block, expanded }: { block: ToolUseBlock; expanded: boolean }) {
  const pathVal = (block.input.path ?? block.input.file_path) as string | undefined
  const compact = `${block.name}${pathVal ? ` ${pathVal}` : ''}`

  if (!expanded) {
    return (
      <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '3px 0', fontFamily: 'monospace' }}>
        ▶ {compact}
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '6px 8px',
      fontSize: 11,
      fontFamily: 'monospace',
      color: 'var(--text-muted)',
      marginBottom: 4,
    }}>
      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>▼ {block.name}</div>
      {Object.entries(block.input).slice(0, 3).map(([k, v]) => (
        <div key={k}><span style={{ opacity: 0.6 }}>{k}: </span>{String(v).slice(0, 120)}</div>
      ))}
    </div>
  )
}

export function SessionViewer({ session, onClose, carbonFactors }: Props) {
  const { t } = useLanguage()

  const co2 = computeCO2(session.primaryModel, session.tokens.input, session.tokens.output, carbonFactors.emission)
  const eq = computeEquivalences(co2, session.tokens.total, carbonFactors.equivalences)
  const score = getEcoScore(co2)

  const [showDetails, setShowDetails] = useState(() => {
    try { return localStorage.getItem(DETAILS_KEY) !== 'false' } catch { return true }
  })

  const { messages, loading, error } = useSessionMessages(session.sessionId, session.projectPath)

  useEffect(() => {
    try { localStorage.setItem(DETAILS_KEY, String(showDetails)) } catch { /* ignore */ }
  }, [showDetails])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderLeft: '1px solid var(--border)',
      background: 'var(--bg)',
      minWidth: 0,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderBottom: '1px solid var(--border)',
        fontSize: 12,
        flexShrink: 0,
      }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {session.title || session.projectName}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {formatDate(session.startedAt)} · {formatDuration(session.durationSeconds)} · {session.primaryModel}
          </div>
          {/* Carbon footprint */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            <span style={{ color: score.color, fontWeight: 600 }}>
              {co2 < 1 ? co2.toFixed(2) : co2.toFixed(1)}g CO₂ ({score.letter})
            </span>
            <span>🚗 {(eq.carKm).toFixed(3)} km</span>
            <span>💧 {eq.waterMl >= 1000 ? `${(eq.waterMl/1000).toFixed(1)} L` : `${eq.waterMl.toFixed(0)} mL`}</span>
            <span>📱 {eq.phoneCharges.toFixed(1)}</span>
          </div>
        </div>

        <button
          onClick={() => setShowDetails(v => !v)}
          style={{
            fontSize: 10,
            padding: '3px 8px',
            borderRadius: 4,
            border: '1px solid var(--border)',
            background: showDetails ? 'var(--accent)' : 'var(--bg-card)',
            color: showDetails ? '#fff' : 'var(--text-muted)',
            cursor: 'pointer',
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          {showDetails ? t.detailsOn : t.detailsOff}
        </button>

        <button
          onClick={onClose}
          style={{
            fontSize: 14,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: '2px 4px',
          }}
          title={t.closeViewer}
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, userSelect: 'text' }}>
        {loading && (
          <>
            <SkeletonBubble right />
            <SkeletonBubble />
            <SkeletonBubble right />
          </>
        )}

        {error && (
          <p style={{ fontSize: 12, color: 'var(--red)', fontStyle: 'italic' }}>{t.errorPrefix} {error}</p>
        )}

        {!loading && messages.map((msg, i) => {
          if (msg.type === 'user') {
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  borderRadius: '8px 8px 2px 8px',
                  padding: '6px 10px',
                  maxWidth: '75%',
                  fontSize: 12,
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
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start', maxWidth: '90%' }}>
              {showDetails && thinkingBlocks.map((b, j) => (
                <div key={`think-${j}`} style={{
                  fontSize: 11,
                  fontStyle: 'italic',
                  color: 'var(--text-dim)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  width: '100%',
                }}>
                  💭 {(b as ThinkingBlock).thinking?.slice(0, 300)}…
                </div>
              ))}

              {toolUseBlocks.length > 0 && (
                <div style={{ width: '100%' }}>
                  {toolUseBlocks.map((b, j) => (
                    <ToolCallLine key={`tool-${j}`} block={b} expanded={showDetails} />
                  ))}
                </div>
              )}

              {textBlocks.length > 0 && (
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px 8px 8px 2px',
                  padding: '6px 10px',
                  fontSize: 12,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {(textBlocks as TextBlock[]).map((b, j) => <span key={j}>{b.text}</span>)}
                </div>
              )}

              {showDetails && msg.tokens && (
                <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                  in: {msg.tokens.inputTokens.toLocaleString()} · out: {msg.tokens.outputTokens.toLocaleString()}
                  {msg.tokens.cacheReadInputTokens > 0 && ` · cache: ${msg.tokens.cacheReadInputTokens.toLocaleString()}`}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
