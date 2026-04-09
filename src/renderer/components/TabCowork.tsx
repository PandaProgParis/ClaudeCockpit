import { useState, useMemo, useEffect, useRef } from 'react'
import type { CoworkData, CoworkSession, CoworkSpace } from '../lib/types'
import type { Translations } from '../lib/i18n'
import { formatCost, formatTokens, formatDate, abbreviateModel, modelColor } from '../lib/format'
import { useExactNumbers } from '../hooks/useExactNumbers'
import { useLanguage } from '../hooks/useLanguage'

function formatSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function cleanMessage(msg: string): string {
  // Extract file names from uploaded_files blocks
  const files: string[] = []
  const filePathRe = /<file_path>[^<]*[/\\]([^</\\]+)<\/file_path>/g
  let m
  while ((m = filePathRe.exec(msg)) !== null) files.push(m[1])

  // Strip markup
  const cleaned = msg
    .replace(/<uploaded_files>[\s\S]*?<\/uploaded_files>/g, '')
    .replace(/<file[\s\S]*?<\/file>/g, '')
    .replace(/<file_path>[^<]*<\/file_path>/g, '')
    .replace(/<file_uuid>[^<]*<\/file_uuid>/g, '')
    .trim()

  if (files.length > 0) {
    const prefix = files.length === 1 ? `📎 ${files[0]}` : `📎 ${files.length} fichiers`
    return cleaned ? `${prefix} — ${cleaned}` : prefix
  }
  return cleaned
}

interface Props {
  data: CoworkData
  loading: boolean
  refreshing: boolean
  onRefresh: () => void
  t: Translations
  exactNumbers: boolean
}

type SortKey = 'recent' | 'oldest' | 'cost' | 'tokens'

export function TabCowork({ data, loading, refreshing, onRefresh, t, exactNumbers }: Props) {
  const exact = useExactNumbers()
  const { locale } = useLanguage()
  const [selectedSpace, setSelectedSpace] = useState<CoworkSpace | null>(data.spaces.length > 0 ? data.spaces[0] : null)
  const [sortBy, setSortBy] = useState<SortKey>('recent')
  const [modelFilter, setModelFilter] = useState('')
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)

  // Calculate stats
  const stats = useMemo(() => {
    const allSessions = data.sessions
    return {
      totalSessions: allSessions.length,
      totalCost: allSessions.reduce((sum, s) => sum + s.estimatedCostUSD, 0),
      totalTokens: allSessions.reduce((sum, s) => sum + s.tokens.total, 0),
      uniqueModels: Array.from(new Set(allSessions.map(s => s.model))).length,
      spaceCount: data.spaces.length,
      pluginCount: data.plugins.length,
    }
  }, [data.sessions, data.spaces, data.plugins])

  // Filter and sort sessions for selected space
  const filteredSessions = useMemo(() => {
    if (!selectedSpace) return []
    let sessions = data.sessions.filter(s => {
      if (modelFilter && s.model !== modelFilter) return false
      return true
    })
    switch (sortBy) {
      case 'recent':
        return sessions.sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime())
      case 'oldest':
        return sessions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      case 'cost':
        return sessions.sort((a, b) => b.estimatedCostUSD - a.estimatedCostUSD)
      case 'tokens':
        return sessions.sort((a, b) => b.tokens.total - a.tokens.total)
    }
  }, [data.sessions, selectedSpace, sortBy, modelFilter])

  // Get unique models
  const models = useMemo(() => {
    const set = new Set<string>()
    data.sessions.forEach(s => set.add(s.model))
    return Array.from(set).sort()
  }, [data.sessions])

  // Get the last path segment from folders
  const getSpaceDisplayName = (folders: string[]): string => {
    if (folders.length === 0) return 'Unknown'
    const lastFolder = folders[folders.length - 1]
    return lastFolder.split(/[\/\\]/).pop() || lastFolder
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        {t.loading}
      </div>
    )
  }

  if (!data.spaces || data.spaces.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        {t.coworkNoData}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Stats bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        padding: '12px 20px',
        fontSize: 12,
        color: 'var(--text-muted)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span><span style={{ color: 'var(--text-muted)' }}>{t.coworkSessions}</span> <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{stats.totalSessions}</span></span>
          <div style={{ width: '1px', height: 16, background: 'var(--border)' }} />
          <span><span style={{ color: 'var(--text-muted)' }}>{t.coworkCost}</span> <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatCost(stats.totalCost)}</span></span>
          <div style={{ width: '1px', height: 16, background: 'var(--border)' }} />
          <span><span style={{ color: 'var(--text-muted)' }}>{t.coworkTokens}</span> <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatTokens(stats.totalTokens, exact, locale)}</span></span>
          <div style={{ width: '1px', height: 16, background: 'var(--border)' }} />
          <span><span style={{ color: 'var(--text-muted)' }}>{t.coworkModels}</span> <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{stats.uniqueModels}</span></span>
          <div style={{ width: '1px', height: 16, background: 'var(--border)' }} />
          <span><span style={{ color: 'var(--text-muted)' }}>{t.coworkSpaces}</span> <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{stats.spaceCount}</span></span>
          <div style={{ width: '1px', height: 16, background: 'var(--border)' }} />
          <span><span style={{ color: 'var(--text-muted)' }}>{t.coworkPlugins}</span> <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{stats.pluginCount}</span></span>
        </div>
        <span style={{ flex: 1 }} />
        <RefreshGauge onRefresh={onRefresh} refreshing={refreshing} />
      </div>

      {/* Main content area */}
      <div style={{ display: 'flex', flex: 1, gap: 0, minHeight: 0 }}>
        {/* Left panel (20%) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: '20%',
          minWidth: 220,
          maxWidth: 300,
          background: 'var(--bg)',
          borderRight: '1px solid var(--border)',
          padding: '16px 0',
          flexShrink: 0,
        }}>
          {/* Spaces section */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              padding: '0 16px 10px',
            }}>
              {t.coworkSpaces}
            </div>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              minHeight: 0,
              paddingBottom: 16,
            }}>
              {data.spaces.map(space => {
                const isSelected = selectedSpace?.id === space.id
                return (
                  <div
                    key={space.id}
                    onClick={() => setSelectedSpace(space)}
                    style={{
                      margin: '0 8px 8px 8px',
                      padding: '12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: isSelected ? 'var(--bg-card-hover)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--accent)' : '1px solid var(--border)',
                      paddingLeft: isSelected ? 10 : 12,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      fontSize: 13, fontWeight: 600,
                      color: isSelected ? 'var(--accent)' : 'var(--text)',
                      marginBottom: 4,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      📁 {getSpaceDisplayName(space.folders)}
                    </div>
                    {space.instructions && (
                      <div style={{
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        fontStyle: 'italic',
                        marginBottom: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {space.instructions}
                      </div>
                    )}
                    <div style={{
                      fontSize: 10,
                      color: 'var(--text-dim)',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}>
                      <span>{space.sessionCount} sess</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatCost(space.totalCostUSD)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Plugins section */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              padding: '0 16px 10px',
            }}>
              {t.coworkPlugins}
            </div>
            <div style={{ padding: '0 16px' }}>
              {data.plugins.length === 0 ? (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>None</span>
              ) : (
                data.plugins.map(plugin => (
                  <div key={plugin.id} style={{ fontSize: 11, color: 'var(--text)', marginBottom: 6 }}>
                    🔌 {plugin.name}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right panel (80%) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          padding: '16px 20px',
        }}>
          {/* Space header */}
          {selectedSpace && (
            <div style={{ marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4,
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                  📁 {getSpaceDisplayName(selectedSpace.folders)}
                </span>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                  {selectedSpace.folders[0] || ''}
                </span>
                {selectedSpace.folderSizeBytes != null && selectedSpace.folderSizeBytes > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                    {formatSize(selectedSpace.folderSizeBytes)}
                  </span>
                )}
              </div>
              {selectedSpace.instructions && (
                <div style={{
                  fontSize: 11,
                  fontStyle: 'italic',
                  color: 'var(--text-muted)',
                }}>
                  {selectedSpace.instructions}
                </div>
              )}
            </div>
          )}

          {/* Filter bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
            flexShrink: 0,
          }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              style={{
                fontSize: 11,
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="recent">{t.coworkSortRecent}</option>
              <option value="oldest">{t.coworkSortOldest}</option>
              <option value="cost">{t.coworkSortCost}</option>
              <option value="tokens">{t.coworkSortTokens}</option>
            </select>

            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              style={{
                fontSize: 11,
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">{t.coworkFilterAll}</option>
              {models.map(m => (
                <option key={m} value={m}>{abbreviateModel(m)}</option>
              ))}
            </select>

            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              {filteredSessions.length} {t.coworkSessions}
            </span>
          </div>

          {/* Sessions list */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            padding: '4px 0',
          }}>
            {filteredSessions.length === 0 ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-muted)',
                fontSize: 12,
              }}>
                {t.coworkNoData}
              </div>
            ) : (
              filteredSessions.map(session => {
                const isExpanded = expandedSessionId === session.sessionId
                const mColor = modelColor(session.model)
                return (
                  <div
                    key={session.sessionId}
                    onClick={() => {
                      if (window.getSelection()?.toString()) return
                      setExpandedSessionId(isExpanded ? null : session.sessionId)
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '10px 16px',
                      margin: '0',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: 'var(--bg-card)',
                      gap: 6,
                      cursor: 'pointer',
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.borderColor = 'var(--text-dim)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                  >
                    {/* Line 1: title + right badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600, color: 'var(--text)',
                        flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {session.title || cleanMessage(session.initialMessage) || session.sessionId}
                      </span>
                      {session.isArchived && (
                        <span style={{
                          fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                          background: 'rgba(255,183,77,0.12)', color: 'var(--orange)',
                        }}>
                          {t.coworkArchived}
                        </span>
                      )}
                      {session.enabledMcpTools.length > 0 && (
                        <span style={{
                          fontSize: 9, padding: '1px 6px', borderRadius: 4,
                          background: 'rgba(66,165,245,0.1)', color: 'var(--blue)',
                        }}>
                          {session.enabledMcpTools.length} MCP tools
                        </span>
                      )}
                    </div>

                    {/* Line 2: date · model · loop · cost · tokens · SDK */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                        {formatDate(session.createdAt)}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 500, padding: '1px 7px', borderRadius: 6,
                        background: `${mColor}22`, color: mColor,
                      }}>
                        {abbreviateModel(session.model)}
                      </span>
                      {session.hostLoopMode && (
                        <span style={{
                          fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                          background: 'rgba(102,187,106,0.15)', color: 'var(--green)',
                        }}>
                          {t.coworkLoop}
                        </span>
                      )}
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
                        {formatCost(session.estimatedCostUSD)}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {formatTokens(session.tokens.total, exact, locale)} tokens
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                        SDK {session.sdkVersion}
                      </span>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: 8,
                        marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--border)',
                      }}>
                        <DetailRow label={t.coworkInitialMessage}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            "{cleanMessage(session.initialMessage)}"
                          </span>
                        </DetailRow>
                        <DetailRow label={t.coworkProcess}>
                          <span style={{ fontSize: 11, color: 'var(--text)', fontFamily: 'monospace' }}>{session.processName}</span>
                        </DetailRow>
                        <DetailRow label={t.coworkHostLoop}>
                          <span style={{ fontSize: 11, color: 'var(--text)' }}>{session.hostLoopMode ? 'Oui' : 'Non'}</span>
                        </DetailRow>
                        {session.enabledMcpTools.length > 0 && (() => {
                          // Group by MCP server name (e.g. "local:l2lt-bdd-prod" from "local:l2lt-bdd-prod:pg_query")
                          const servers = new Map<string, number>()
                          for (const tool of session.enabledMcpTools) {
                            const parts = tool.split(':')
                            const server = parts.length >= 2 ? parts[1] : tool
                            servers.set(server, (servers.get(server) ?? 0) + 1)
                          }
                          return (
                            <DetailRow label={t.coworkMcpToolsActive}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {[...servers.entries()].map(([server, count]) => (
                                  <span key={server} style={{
                                    fontSize: 9, padding: '2px 6px', borderRadius: 4,
                                    background: 'rgba(102,187,106,0.12)', color: 'var(--green)',
                                    border: '1px solid rgba(102,187,106,0.25)',
                                  }}>
                                    {server} ({count})
                                  </span>
                                ))}
                              </div>
                            </DetailRow>
                          )
                        })()}
                        {session.slashCommands.length > 0 && (
                          <DetailRow label={t.coworkSlashCommands}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {session.slashCommands.slice(0, 15).map(cmd => (
                                <span key={cmd} style={{
                                  fontSize: 9, padding: '2px 6px', borderRadius: 4,
                                  background: 'rgba(212,149,106,0.1)', color: 'var(--text-muted)',
                                  border: '1px solid var(--border)',
                                }}>
                                  {cmd}
                                </span>
                              ))}
                              {session.slashCommands.length > 15 && (
                                <span style={{ fontSize: 9, color: 'var(--text-dim)', padding: '2px 6px' }}>
                                  {t.coworkMore(session.slashCommands.length - 15)}
                                </span>
                              )}
                            </div>
                          </DetailRow>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function RefreshGauge({ onRefresh, refreshing }: { onRefresh: () => void; refreshing: boolean }) {
  const [progress, setProgress] = useState(100)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)
  const DURATION = 5000

  useEffect(() => {
    if (refreshing) {
      setProgress(100)
      return
    }

    startRef.current = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startRef.current
      const pct = Math.max(0, 100 - (elapsed / DURATION) * 100)
      setProgress(pct)

      if (pct > 0) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        onRefresh()
        startRef.current = performance.now()
        setProgress(100)
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [refreshing, onRefresh])

  const size = 20
  const stroke = 2.5
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress / 100)

  return (
    <button
      onClick={onRefresh}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
      title="Refresh"
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Refresh</span>
    </button>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{
        fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
        textTransform: 'uppercase' as const, letterSpacing: 0.3,
        minWidth: 110, flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}
