import { useState, useMemo, useEffect } from 'react'
import type { SessionEntry, GlobalStats, SearchScope, SearchResult } from '../lib/types'
import { formatDate, formatDuration, formatTokens, formatCost, abbreviateModel, modelColor } from '../lib/format'
import { useExactNumbers } from '../hooks/useExactNumbers'
import { useLanguage } from '../hooks/useLanguage'
import { ConfirmDialog } from './ConfirmDialog'
import { useSessionSearch } from '../hooks/useSessionSearch'
import { SessionViewer } from './SessionViewer'

interface Props {
  sessions: SessionEntry[]
  stats: GlobalStats | null
  onHide: (id: string) => void
  onUnhide: (id: string) => void
  onDelete: (id: string, projectPath: string) => void
  showHidden: boolean
  onToggleHidden: () => void
  hiddenIds: string[]
  initialProjectFilter?: string
  initialSelectedSession?: SessionEntry | null
  onSessionOpened?: () => void
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

export function TabHistory({ sessions, stats, onHide, onUnhide, onDelete, showHidden, onToggleHidden, hiddenIds, initialProjectFilter, initialSelectedSession, onSessionOpened }: Props) {
  const exact = useExactNumbers()
  const { t, locale } = useLanguage()
  const [modelFilter, setModelFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState(initialProjectFilter ?? '')

  useEffect(() => {
    if (initialProjectFilter) setProjectFilter(initialProjectFilter)
  }, [initialProjectFilter])

  useEffect(() => {
    if (initialSelectedSession) {
      setSelectedSession(initialSelectedSession)
      onSessionOpened?.()
    }
  }, [initialSelectedSession])
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; projectPath: string; projectName: string } | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchScope, setSearchScope] = useState<SearchScope>({ user: true, assistant: true, files: false })
  const [selectedSession, setSelectedSession] = useState<SessionEntry | null>(null)

  const { results: searchResults, loading: searchLoading } = useSessionSearch(searchQuery, searchScope)

  const hiddenSet = useMemo(() => new Set(hiddenIds), [hiddenIds])

  // Map search results by sessionId for fast lookup
  const resultMap = useMemo(() => {
    const map = new Map<string, SearchResult>()
    for (const r of searchResults) map.set(r.sessionId, r)
    return map
  }, [searchResults])

  const models = useMemo(() => {
    const set = new Set<string>()
    sessions.forEach((s) => { if (s.primaryModel !== 'unknown') set.add(s.primaryModel) })
    return Array.from(set).sort()
  }, [sessions])

  const projects = useMemo(() => {
    const set = new Set<string>()
    sessions.forEach((s) => set.add(s.projectName))
    return Array.from(set).sort()
  }, [sessions])

  const hiddenCount = hiddenIds.length

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      const isHidden = hiddenSet.has(s.sessionId)
      if (isHidden && !showHidden) return false
      if (modelFilter && s.primaryModel !== modelFilter) return false
      if (projectFilter && s.projectName !== projectFilter) return false
      if (searchQuery.trim() && !resultMap.has(s.sessionId)) return false
      return true
    })
  }, [sessions, modelFilter, projectFilter, showHidden, hiddenSet, searchQuery, resultMap])

  const selectStyle: React.CSSProperties = {
    fontSize: 12,
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    color: 'var(--text)',
    outline: 'none',
    cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', gap: 0, height: '100%', overflow: 'hidden' }}>
      {/* Left column */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        width: selectedSession ? '38%' : '100%',
        minWidth: 0,
        flexShrink: 0,
        transition: 'width 0.2s',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}>

      {/* Fixed top: stats + search + filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '20px 20px 12px', flexShrink: 0 }}>
      {/* Stats summary */}
      {stats && (
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
          <span>{stats.totalSessions} sessions</span>
          <span>{formatTokens(stats.totalTokens, exact, locale)} tokens</span>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{formatCost(stats.totalCostUSD)}</span>
        </div>
      )}

      {/* Search bar */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            style={{
              width: '100%',
              fontSize: 12,
              padding: '6px 10px',
              paddingRight: searchQuery ? 26 : 10,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 4,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                color: 'var(--text-muted)',
                padding: '0 4px',
                lineHeight: 1,
              }}
              title={t.clear}
            >
              ✕
            </button>
          )}
        </div>
        {/* Scope toggles */}
        {(['user', 'assistant', 'files'] as const).map(scope => {
          const labels: Record<typeof scope, string> = { user: t.scopeMessages, assistant: t.scopeResponses, files: t.scopeFiles }
          return (
            <button
              key={scope}
              onClick={() => setSearchScope(prev => ({ ...prev, [scope]: !prev[scope] }))}
              style={{
                fontSize: 11,
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: searchScope[scope] ? 'var(--accent)' : 'var(--bg-card)',
                color: searchScope[scope] ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              {labels[scope]}
            </button>
          )
        })}
        {searchLoading && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>…</span>}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={modelFilter}
          onChange={(e) => setModelFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="">{t.allModels}</option>
          {models.map((m) => (
            <option key={m} value={m}>{abbreviateModel(m)}</option>
          ))}
        </select>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="">{t.allProjects}</option>
          {projects.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{filtered.length} {t.results}</span>
      </div>
      </div>{/* end fixed top */}

      {/* List area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px 20px', minHeight: 0 }}>

      {/* Session list card — fills height, scrolls inside */}
      <div style={{ ...cardStyle, padding: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1 }}>
          {filtered.map((s) => {
            const isHidden = hiddenSet.has(s.sessionId)
            const mColor = modelColor(s.primaryModel)
            return (
              <div
                key={s.sessionId}
                onClick={() => setSelectedSession(s)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  padding: '7px 12px',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 12,
                  opacity: isHidden ? 0.4 : 1,
                  transition: 'opacity 0.2s',
                  cursor: 'pointer',
                  background: selectedSession?.sessionId === s.sessionId ? 'var(--bg-card)' : 'transparent',
                }}
              >
                {/* Line 1: Project + Title */}
                <div style={{ overflow: 'hidden', minWidth: 0 }}>
                  <div style={{ fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.projectName}
                    {isHidden && (
                      <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 6, background: 'var(--orange-bg)', color: 'var(--orange)', fontWeight: 600 }}>
                        {t.hidden}
                      </span>
                    )}
                    {s.usedThinking && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--purple)' }}>💭</span>}
                  </div>
                  {s.title && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                      {s.title}
                    </div>
                  )}
                  {searchQuery.trim() && resultMap.has(s.sessionId) && (() => {
                    const r = resultMap.get(s.sessionId)!
                    return (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span>{r.snippet.before}</span>
                        <mark style={{ background: 'rgba(255, 200, 0, 0.35)', borderRadius: 2 }}>{r.snippet.match}</mark>
                        <span>{r.snippet.after}</span>
                      </div>
                    )
                  })()}
                </div>

                {/* Line 2: date · model · duration · tokens · cost · actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: 10, flexShrink: 0 }}>
                    {formatDate(s.startedAt)}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 6, background: `${mColor}22`, color: mColor, flexShrink: 0 }}>
                    {abbreviateModel(s.primaryModel)}
                  </span>
                  <span style={{ color: 'var(--text-dim)', fontSize: 10, flexShrink: 0 }}>
                    {formatDuration(s.durationSeconds)}
                  </span>
                  <span style={{ flex: 1 }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                    {formatTokens(s.tokens.total, exact, locale)}
                  </span>
                  <span style={{ color: 'var(--accent)', fontSize: 10, fontWeight: 600 }}>
                    {formatCost(s.estimatedCostUSD)}
                  </span>
                  <button
                    title={isHidden ? t.show : t.hide}
                    onClick={(e) => { e.stopPropagation(); isHidden ? onUnhide(s.sessionId) : onHide(s.sessionId) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: '1px 2px', opacity: 0.5, color: 'var(--text-muted)', flexShrink: 0 }}
                  >
                    {isHidden ? '👁️' : '🙈'}
                  </button>
                  <button
                    title={t.delete}
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: s.sessionId, projectPath: s.projectPath, projectName: s.projectName }) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: '1px 2px', opacity: 0.5, color: 'var(--red)', flexShrink: 0 }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 16px' }}>
              {t.noSessionFound}
            </p>
          )}
        </div>
      </div>

      {/* Toggle hidden */}
      {hiddenCount > 0 && (
        <button
          onClick={onToggleHidden}
          style={{
            alignSelf: 'center',
            fontSize: 12,
            padding: '6px 16px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: showHidden ? 'var(--accent)' : 'var(--bg-card)',
            color: showHidden ? '#fff' : 'var(--text-muted)',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {showHidden ? t.hideHiddenSessions : t.showHiddenSessions(hiddenCount)}
        </button>
      )}

      </div>{/* end scrollable list */}

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={t.deleteSessionTitle}
        message={t.deleteSessionMessage(deleteTarget?.projectName ?? '')}
        confirmLabel={t.deleteLabel}
        onConfirm={() => {
          if (deleteTarget) {
            if (selectedSession?.sessionId === deleteTarget.id) {
              setSelectedSession(null)
            }
            onDelete(deleteTarget.id, deleteTarget.projectPath)
            setDeleteTarget(null)
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
      </div>

      {/* Right column: session viewer */}
      {selectedSession && (
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <SessionViewer
            session={selectedSession}
            onClose={() => setSelectedSession(null)}
          />
        </div>
      )}
    </div>
  )
}
