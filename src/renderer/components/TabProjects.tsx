import { useMemo, useState } from 'react'
import type { SessionEntry } from '../lib/types'
import { formatTokens, formatCost, abbreviateModel, modelColor } from '../lib/format'
import { useExactNumbers } from '../hooks/useExactNumbers'
import { useLanguage } from '../hooks/useLanguage'
import { ConfirmDialog } from './ConfirmDialog'

interface Props {
  sessions: SessionEntry[]
  onSelectProject: (projectName: string) => void
  hiddenIds: string[]
  showHidden: boolean
  onToggleHidden: () => void
  onHideSession: (id: string) => void
  onUnhideSession: (id: string) => void
  onDeleteSession: (id: string, projectPath: string) => void
}

interface ProjectSummary {
  projectName: string
  sessionCount: number
  totalTokens: number
  totalCost: number
  models: string[]
  sessionIds: { id: string; projectPath: string }[]
  hiddenCount: number
}

type SortKey = 'cost' | 'tokens' | 'sessions' | 'name'

export function TabProjects({ sessions, onSelectProject, hiddenIds, showHidden, onToggleHidden, onHideSession, onUnhideSession, onDeleteSession }: Props) {
  const exact = useExactNumbers()
  const { t, locale } = useLanguage()
  const [sortBy, setSortBy] = useState<SortKey>('cost')
  const hiddenSet = useMemo(() => new Set(hiddenIds), [hiddenIds])

  const [deleteTarget, setDeleteTarget] = useState<{ projectName: string; sessionIds: { id: string; projectPath: string }[] } | null>(null)

  const projects = useMemo(() => {
    const map = new Map<string, ProjectSummary>()
    // Always aggregate all sessions, but track hidden count
    for (const s of sessions) {
      let entry = map.get(s.projectName)
      if (!entry) {
        entry = { projectName: s.projectName, sessionCount: 0, totalTokens: 0, totalCost: 0, models: [], sessionIds: [], hiddenCount: 0 }
        map.set(s.projectName, entry)
      }
      const isHidden = hiddenSet.has(s.sessionId)
      if (isHidden) entry.hiddenCount++
      if (!showHidden && isHidden) continue
      entry.sessionCount++
      entry.totalTokens += s.tokens.total
      entry.totalCost += s.estimatedCostUSD
      entry.sessionIds.push({ id: s.sessionId, projectPath: s.projectPath })
      for (const m of s.models) {
        if (!entry.models.includes(m)) entry.models.push(m)
      }
    }
    // Filter out fully hidden projects when not showing hidden
    if (!showHidden) {
      for (const [key, entry] of map) {
        if (entry.sessionCount === 0) map.delete(key)
      }
    }
    const arr = Array.from(map.values())
    switch (sortBy) {
      case 'cost': return arr.sort((a, b) => b.totalCost - a.totalCost)
      case 'tokens': return arr.sort((a, b) => b.totalTokens - a.totalTokens)
      case 'sessions': return arr.sort((a, b) => b.sessionCount - a.sessionCount)
      case 'name': return arr.sort((a, b) => a.projectName.localeCompare(b.projectName))
    }
  }, [sessions, sortBy, showHidden, hiddenSet])

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'cost', label: t.sortCost },
    { key: 'tokens', label: t.sortTokens },
    { key: 'sessions', label: t.sortSessions },
    { key: 'name', label: t.sortName },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Sort bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
        <span>{t.sortBy}</span>
        {sortOptions.map(o => (
          <button
            key={o.key}
            onClick={() => setSortBy(o.key)}
            style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 8, cursor: 'pointer',
              background: sortBy === o.key ? 'var(--accent)' : 'var(--bg-card)',
              color: sortBy === o.key ? '#fff' : 'var(--text-muted)',
              border: sortBy === o.key ? 'none' : '1px solid var(--border)',
            }}
          >
            {o.label}
          </button>
        ))}
        <button
          onClick={onToggleHidden}
          style={{
            marginLeft: 'auto', fontSize: 11, padding: '3px 10px', borderRadius: 8, cursor: 'pointer',
            background: showHidden ? 'var(--accent)' : 'var(--bg-card)',
            color: showHidden ? '#fff' : 'var(--text-muted)',
            border: showHidden ? 'none' : '1px solid var(--border)',
          }}
        >
          {showHidden ? t.hiddenIncluded : t.includeHidden}
        </button>
        <span>{projects.length} {t.projects}</span>
      </div>

      {/* Project list */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <span style={{ flex: 1 }}>{t.project}</span>
          <span style={{ width: 70, flexShrink: 0, textAlign: 'right' }}>{t.sessions}</span>
          <span style={{ width: 80, flexShrink: 0, textAlign: 'right' }}>Tokens</span>
          <span style={{ width: 65, flexShrink: 0, textAlign: 'right' }}>{t.sortCost}</span>
          <span style={{ width: 160, flexShrink: 0 }}>{t.models}</span>
          <span style={{ width: 60, flexShrink: 0, textAlign: 'center' }}>{t.actions}</span>
        </div>
        {projects.map((p, i) => {
          const allHidden = p.hiddenCount > 0 && p.hiddenCount === p.sessionCount + p.hiddenCount
          return (
          <div
            key={p.projectName}
            onClick={() => onSelectProject(p.projectName)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px', cursor: 'pointer',
              borderBottom: i < projects.length - 1 ? '1px solid var(--border)' : 'none',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.projectName}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 70, flexShrink: 0, textAlign: 'right' }}>
              {p.sessionCount} sessions
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 80, flexShrink: 0, textAlign: 'right' }}>
              {formatTokens(p.totalTokens, exact, locale)}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', width: 65, flexShrink: 0, textAlign: 'right' }}>
              {formatCost(p.totalCost)}
            </span>
            <div style={{ display: 'flex', gap: 4, width: 160, flexShrink: 0, overflow: 'hidden' }}>
              {p.models.slice(0, 3).map(m => {
                const c = modelColor(m)
                return (
                  <span key={m} style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 6, background: `${c}22`, color: c, whiteSpace: 'nowrap' }}>
                    {abbreviateModel(m)}
                  </span>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 4, width: 60, flexShrink: 0, justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
              <button
                title={allHidden ? t.unhideProject : t.hideProject}
                onClick={() => {
                  if (allHidden) {
                    p.sessionIds.forEach(s => onUnhideSession(s.id))
                  } else {
                    p.sessionIds.forEach(s => onHideSession(s.id))
                  }
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, opacity: 0.6, color: 'var(--text-muted)', padding: '2px 4px' }}
              >
                {allHidden ? '👁️' : '🙈'}
              </button>
              <button
                title={t.deleteProjectHistory}
                onClick={() => setDeleteTarget({ projectName: p.projectName, sessionIds: p.sessionIds })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, opacity: 0.6, color: 'var(--red)', padding: '2px 4px' }}
              >
                🗑️
              </button>
            </div>
          </div>
          )
        })}
        {projects.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 16px' }}>{t.noProjects}</p>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t.deleteProjectTitle}
        message={t.deleteProjectMessage(deleteTarget?.projectName ?? '', deleteTarget?.sessionIds.length ?? 0)}
        confirmLabel={t.deleteAll}
        onConfirm={() => {
          if (deleteTarget) {
            deleteTarget.sessionIds.forEach(s => onDeleteSession(s.id, s.projectPath))
            setDeleteTarget(null)
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
