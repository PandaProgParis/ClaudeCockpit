import { useState } from 'react'
import type { ClaudeConfig, PermissionRule } from '../lib/types'
import { useLanguage } from '../hooks/useLanguage'
import { ConfirmDialog } from './ConfirmDialog'
import { SkillViewer } from './SkillViewer'

interface Props {
  config: ClaudeConfig | null
  onConfigChange?: () => void
}

type SubTab = 'mcp' | 'skills' | 'general'

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

function Badge({ label, variant }: { label: string; variant: 'green' | 'red' | 'orange' | 'purple' | 'blue' }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    green: { bg: 'var(--green-bg)', fg: 'var(--green)' },
    red: { bg: 'var(--red-bg)', fg: 'var(--red)' },
    orange: { bg: 'var(--orange-bg)', fg: 'var(--orange)' },
    purple: { bg: 'var(--purple-bg)', fg: 'var(--purple)' },
    blue: { bg: 'var(--blue-bg)', fg: 'var(--blue)' },
  }
  const c = colors[variant]
  return (
    <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 10, background: c.bg, color: c.fg, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function mcpEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('slack') || n.includes('discord')) return '💬'
  if (n.includes('telegram')) return '📱'
  if (n.includes('db') || n.includes('pgsql') || n.includes('postgres') || n.includes('sql') || n.includes('supabase')) return '🗄️'
  if (n.includes('clickhouse')) return '📊'
  if (n.includes('calendar') || n.includes('cal')) return '📅'
  if (n.includes('mail') || n.includes('email') || n.includes('gmail')) return '📧'
  if (n.includes('github') || n.includes('git')) return '🔀'
  return '🔌'
}

/** Group MCP permission rules by server name */
function groupMcpPermissions(rules: PermissionRule[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const { rule } of rules) {
    const match = rule.match(/^mcp__([^_]+)__(.+)$/)
    if (match) {
      const [, server, tool] = match
      const list = map.get(server) || []
      list.push(tool)
      map.set(server, list)
    }
  }
  return map
}

function isMcpRule(r: PermissionRule): boolean {
  return /^mcp__[^_]+__/.test(r.rule)
}

/** Dangerous commands that can cause data loss or security issues when auto-allowed */
const DANGEROUS_PATTERNS = [
  /\brm\b/i, /\brmdir\b/i, /\bdel\b/i,
  /\bgit\s+push\b.*--force/i, /\bgit\s+reset\b.*--hard/i, /\bgit\s+clean\b/i,
  /\bsudo\b/i, /\bchmod\b/i, /\bchown\b/i,
  /\bkill\b/i, /\bpkill\b/i, /\bkillall\b/i,
  /\bformat\b/i, /\bfdisk\b/i, /\bmkfs\b/i,
  /\bdrop\b/i, /\btruncate\b/i, /\bdelete\b/i,
  /\bcurl\b.*\|.*\bsh\b/i, /\bwget\b.*\|.*\bsh\b/i,
  /\bnpx\b/i, /\bnpm\s+exec\b/i,
  /\bbash\b/i,
]

function isDangerousRule(rule: string): boolean {
  return DANGEROUS_PATTERNS.some(p => p.test(rule))
}

export function MCPSection({ config }: { config: ClaudeConfig }) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const mcpPerms = groupMcpPermissions(config.permissions.allow)

  const toggle = (name: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const cliServers = config.mcpServers.filter(m => m.source === 'cli')
  const desktopServers = config.mcpServers.filter(m => m.source === 'desktop')

  const renderServer = (m: typeof config.mcpServers[0]) => {
    const permTools = mcpPerms.get(m.name) || []
    const serverTools = m.tools || []
    const allTools = [...new Set([...permTools, ...serverTools])]
    const isExpanded = expanded.has(m.name)
    return (
      <div key={`${m.name}-${m.source}`} style={cardStyle}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: allTools.length > 0 ? 'pointer' : 'default' }}
          onClick={() => allTools.length > 0 && toggle(m.name)}
        >
          <span style={{ fontSize: 18 }}>{mcpEmoji(m.name)}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{m.name}</span>
              {m.status === 'connected' ? (
                <Badge label={t.connected} variant="green" />
              ) : (
                <Badge label={t.authRequired} variant="orange" />
              )}
            </div>
            {m.command && (
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, fontFamily: 'monospace' }}>{m.command}</div>
            )}
            {m.description && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{m.description}</div>
            )}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            {allTools.length > 0
              ? <span style={{ cursor: 'pointer' }}>{t.tools(allTools.length)} {isExpanded ? '▾' : '▸'}</span>
              : m.source === 'cli' ? t.allToolsAllowed : ''}
          </span>
        </div>

        {isExpanded && allTools.length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {allTools.map(tool => (
              <span key={tool} style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 6,
                background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-muted)',
                fontFamily: 'monospace',
              }}>
                {tool}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {t.mcpDescription}
      </div>

      {cliServers.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ ...sectionTitleStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Badge label="CLI" variant="blue" />
            <span>Claude Code ({cliServers.length})</span>
          </div>
          {cliServers.map(renderServer)}
        </div>
      )}

      {desktopServers.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ ...sectionTitleStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Badge label="Desktop" variant="purple" />
            <span>Claude Desktop ({desktopServers.length})</span>
          </div>
          {desktopServers.map(renderServer)}
        </div>
      )}

      {config.mcpServers.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{t.noMCPServer}</p>
      )}
    </div>
  )
}

export function SkillsSection({ config }: { config: ClaudeConfig }) {
  const { t } = useLanguage()
  const [expandedPlugins, setExpandedPlugins] = useState<Set<string>>(new Set())
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null)

  const togglePlugin = (name: string) => {
    setExpandedPlugins(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const toggleSkill = (path: string) => {
    setExpandedSkill(prev => prev === path ? null : path)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {t.skillsDescription}
      </div>

      {/* Plugins */}
      {config.plugins.length > 0 && (
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>{t.plugins}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {config.plugins.map((p, i) => {
              const hasSkills = p.skills && p.skills.length > 0
              const isPluginExpanded = expandedPlugins.has(p.name)
              return (
                <div key={`${p.name}-${i}`}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: hasSkills ? 'pointer' : 'default' }}
                    onClick={() => hasSkills && togglePlugin(p.name)}
                  >
                    <span style={{ fontSize: 16 }}>🧩</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.name}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>v{p.version}</span>
                        {p.status === 'active' ? (
                          <Badge label={t.activeLabel} variant="green" />
                        ) : (
                          <Badge label={p.blockReason ? t.blockedReason(p.blockReason) : t.blocked} variant="red" />
                        )}
                        <Badge label="CLI" variant="blue" />
                      </div>
                      {p.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.description}</div>
                      )}
                    </div>
                    {hasSkills && (
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', cursor: 'pointer' }}>
                        {t.skillCount(p.skills!.length)} {isPluginExpanded ? '▾' : '▸'}
                      </span>
                    )}
                  </div>

                  {/* Plugin skills sub-list */}
                  {isPluginExpanded && p.skills && (
                    <div style={{ marginTop: 8, marginLeft: 26, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {p.skills.map((s) => (
                        <div key={s.path}>
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0' }}
                            onClick={() => toggleSkill(s.path)}
                          >
                            <span style={{ fontSize: 13 }}>⚡</span>
                            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{s.name}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                              {expandedSkill === s.path ? '▾' : '▸'}
                            </span>
                          </div>
                          {expandedSkill === s.path && <SkillViewer path={s.path} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Custom Skills */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>{t.customSkills}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {config.skills.map((s) => (
            <div key={s.name}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                onClick={() => toggleSkill(s.path)}
              >
                <span style={{ fontSize: 16 }}>⚡</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.name}</span>
                    <Badge label="custom" variant="purple" />
                    <Badge label="CLI" variant="blue" />
                  </div>
                  {s.description && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.description}</div>
                  )}
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  {expandedSkill === s.path ? '▾' : '▸'}
                </span>
              </div>
              {expandedSkill === s.path && <SkillViewer path={s.path} />}
            </div>
          ))}
          {config.skills.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{t.noCustomSkill}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function PermissionRuleList({ rules, type, color, onDelete }: {
  rules: PermissionRule[]
  type: 'allow' | 'deny'
  color: 'green' | 'red'
  onDelete: (rule: PermissionRule, type: 'allow' | 'deny') => void
}) {
  const { t } = useLanguage()
  const sorted = [...rules].sort((a, b) => a.rule.localeCompare(b.rule))

  if (sorted.length === 0) return null

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: `var(--${color})`, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {type === 'allow' ? 'Allow' : 'Deny'} ({sorted.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {sorted.map((r, i) => {
          const dangerous = type === 'allow' && isDangerousRule(r.rule)
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                flex: 1, fontSize: 11, padding: '4px 10px', borderRadius: 8,
                background: dangerous ? 'var(--red-bg)' : `var(--${color}-bg)`,
                border: `1px solid ${dangerous ? 'var(--red)' : 'var(--border)'}`,
                color: dangerous ? 'var(--red)' : 'var(--text)',
                fontFamily: 'monospace',
              }}>
                {r.rule}
              </span>
              {dangerous && (
                <Badge label="Warning" variant="red" />
              )}
              <span style={{ fontSize: 9, color: 'var(--text-dim)', whiteSpace: 'nowrap', minWidth: 90, textAlign: 'right' }}>
                {r.source}
              </span>
              <button
                onClick={() => onDelete(r, type)}
                title={t.deleteRuleConfirm}
                style={{
                  fontSize: 11, lineHeight: 1, padding: '3px 6px', borderRadius: 6,
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-dim)', cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function GeneralSection({ config, onConfigChange }: { config: ClaudeConfig; onConfigChange?: () => void }) {
  const { t } = useLanguage()
  const [deleteTarget, setDeleteTarget] = useState<{ rule: PermissionRule; type: 'allow' | 'deny' } | null>(null)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const nonMcpAllow = config.permissions.allow.filter(r => !isMcpRule(r))
  const nonMcpDeny = config.permissions.deny.filter(r => !isMcpRule(r))
  const dangerousRules = nonMcpAllow.filter(r => isDangerousRule(r.rule))
  const totalRules = config.permissions.allow.length + config.permissions.deny.length

  const handleDelete = async () => {
    if (!deleteTarget) return
    const { rule, type } = deleteTarget
    await fetch('/api/permissions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rule: rule.rule, type, source: rule.source }),
    })
    setDeleteTarget(null)
    onConfigChange?.()
  }

  const handleDeleteAllWarnings = async () => {
    for (const r of dangerousRules) {
      await fetch('/api/permissions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule: r.rule, type: 'allow', source: r.source }),
      })
    }
    setConfirmDeleteAll(false)
    onConfigChange?.()
  }

  const openFile = (path: string) => {
    fetch('/api/open-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
  }

  const linkStyle: React.CSSProperties = {
    fontSize: 11, color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline',
    background: 'none', border: 'none', padding: 0, fontFamily: 'monospace',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Permissions */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={sectionTitleStyle}>{t.permissions} ({totalRules} {t.rules})</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => openFile(config.permissions.settingsPath)} style={linkStyle}>
              settings.json
            </button>
            <button onClick={() => openFile(config.permissions.localSettingsPath)} style={linkStyle}>
              settings.local.json
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Badge
            label={config.permissions.mode}
            variant={config.permissions.mode === 'dontAsk' ? 'orange' : 'green'}
          />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.defaultMode}</span>
          {dangerousRules.length > 0 && (
            <button
              onClick={() => setConfirmDeleteAll(true)}
              style={{
                marginLeft: 'auto', fontSize: 11, padding: '4px 12px', borderRadius: 8,
                border: '1px solid var(--red)', background: 'var(--red-bg)',
                color: 'var(--red)', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {t.deleteAllWarnings} ({dangerousRules.length})
            </button>
          )}
        </div>

        <PermissionRuleList rules={nonMcpAllow} type="allow" color="green" onDelete={(rule, type) => setDeleteTarget({ rule, type })} />
        <PermissionRuleList rules={nonMcpDeny} type="deny" color="red" onDelete={(rule, type) => setDeleteTarget({ rule, type })} />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t.deleteRuleTitle}
        message={deleteTarget ? t.deleteRuleMessage(deleteTarget.rule.rule) : ''}
        confirmLabel={t.deleteRuleConfirm}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={confirmDeleteAll}
        title={t.deleteAllWarningsTitle}
        message={t.deleteAllWarningsMessage(dangerousRules.length)}
        confirmLabel={t.deleteAllWarnings}
        onConfirm={handleDeleteAllWarnings}
        onCancel={() => setConfirmDeleteAll(false)}
      />
    </div>
  )
}

export function TabConfig({ config, onConfigChange }: Props) {
  const { t } = useLanguage()
  const [subTab, setSubTab] = useState<SubTab>('mcp')

  if (!config) {
    return (
      <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
        {t.configLoading}
      </p>
    )
  }

  const subTabs: { id: SubTab; label: string; count?: number }[] = [
    { id: 'mcp', label: 'MCP Servers', count: config.mcpServers.length },
    { id: 'skills', label: 'Skills & Plugins', count: config.plugins.length + config.skills.length },
    { id: 'general', label: t.general },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: 6 }}>
        {subTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              fontSize: 12, padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
              background: subTab === t.id ? 'var(--accent)' : 'var(--bg-card)',
              color: subTab === t.id ? '#fff' : 'var(--text-muted)',
              border: subTab === t.id ? 'none' : '1px solid var(--border)',
              fontWeight: 500,
            }}
          >
            {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {subTab === 'mcp' && <MCPSection config={config} />}
      {subTab === 'skills' && <SkillsSection config={config} />}
      {subTab === 'general' && <GeneralSection config={config} onConfigChange={onConfigChange} />}
    </div>
  )
}
