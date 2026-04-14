import { useState, useEffect, useCallback, useRef } from 'react'
import { Header } from './Header'
import { TabDashboard } from './TabDashboard'
import { MCPSection, SkillsSection, GeneralSection } from './TabConfig'
import { TabSettings } from './TabSettings'
import { TabHistory } from './TabHistory'
import { TabProjects } from './TabProjects'
import { useHistory } from '../hooks/useHistory'
import { useUsage } from '../hooks/useUsage'
import { useActiveSessions } from '../hooks/useActiveSessions'
import { useConfig } from '../hooks/useConfig'
import { useTheme } from '../hooks/useTheme'
import { useLanguageState, LanguageContext } from '../hooks/useLanguage'
import { connectSSE } from '../lib/sse'
import { setPriceTable } from '../lib/cost'
import { ExactNumbersContext } from '../hooks/useExactNumbers'
import type { SSEEvent, SessionEntry } from '../lib/types'
import type { Translations } from '../lib/i18n'
import { TabCarbon } from './TabCarbon'
import { CarbonDashboardWidget } from './CarbonDashboardWidget'
import type { CarbonFactors } from '../lib/carbon'
import { DEFAULT_CARBON_FACTORS } from '../lib/carbon'
import { TabCowork } from './TabCowork'
import { useCowork } from '../hooks/useCowork'
import { TabTemporal } from './TabTemporal'

type Tab = 'dashboard' | 'history' | 'projects' | 'mcp' | 'skills' | 'permissions' | 'carbon' | 'cowork' | 'temporal'

function getTabs(t: Translations): { id: Tab; label: string }[] {
  return [
    { id: 'dashboard', label: t.tabDashboard },
    { id: 'projects', label: t.tabProjects },
    { id: 'history', label: t.tabHistory },
    { id: 'cowork', label: t.tabCowork },
    { id: 'carbon', label: t.tabCarbon },
    { id: 'temporal', label: t.tabTemporal },
    { id: 'mcp', label: 'MCP' },
    { id: 'skills', label: 'Skills & Plugins' },
    { id: 'permissions', label: 'Permissions' },
  ]
}

export function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const { theme, toggle: toggleTheme } = useTheme()
  const lang = useLanguageState()
  const { t } = lang
  const history = useHistory()
  const usage = useUsage()
  const activeSessions = useActiveSessions()
  const config = useConfig()
  const cowork = useCowork()

  // Load custom prices on mount
  useEffect(() => {
    fetch('/api/prices').then(r => r.json()).then(setPriceTable).catch(() => {})
  }, [])

  // Connect SSE on mount
  useEffect(() => {
    const es = connectSSE((event: SSEEvent) => {
      if (event.type === 'usage:updated') {
        usage.onUsageUpdated(event.data)
      } else {
        activeSessions.onSSEEvent(event)
      }
    })
    return () => es.close()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const planBadge = config.config?.plan
    ? `Forfait ${config.config.plan.rateLimitTier.replace('default_claude_', '').replace(/_/g, ' ')}`
    : ''

  // History tab handlers
  const handleHide = useCallback((id: string) => {
    history.hideSession(id)
  }, [history])

  const handleUnhide = useCallback((id: string) => {
    history.unhideSession(id)
  }, [history])

  const handleDelete = useCallback((id: string, projectPath: string) => {
    history.deleteSession(id, projectPath)
  }, [history])

  const handleToggleHidden = useCallback(() => {
    history.setShowHidden(!history.showHidden)
  }, [history])

  // Projects tab: switch to history with project pre-filtered
  const handleSelectProject = useCallback((projectName: string) => {
    setTab('history')
    // The TabHistory component manages its own filter state,
    // so we pass selectedProject as a signal
    setSelectedProject(projectName)
  }, [])

  const [selectedProject, setSelectedProject] = useState<string>('')
  const [initialSelectedSession, setInitialSelectedSession] = useState<SessionEntry | null>(null)

  const handleGoToSession = useCallback((session: SessionEntry) => {
    setTab('history')
    setInitialSelectedSession(session)
  }, [])
  const [showSettings, setShowSettings] = useState(false)
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(5000)
  const [autoRefreshing, setAutoRefreshing] = useState(false)
  const [exactNumbers, setExactNumbers] = useState(false)
  const [carbonFactors, setCarbonFactors] = useState<CarbonFactors>(DEFAULT_CARBON_FACTORS)
  const [carbonQuota, setCarbonQuota] = useState(50)
  const [showCarbonOnDashboard, setShowCarbonOnDashboard] = useState(true)

  // Load app settings on mount
  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      if (s.refreshIntervalMs) setRefreshIntervalMs(s.refreshIntervalMs)
      if (s.exactNumbers !== undefined) setExactNumbers(s.exactNumbers)
      if (s.carbonQuotaDaily !== undefined) setCarbonQuota(s.carbonQuotaDaily)
      if (s.showCarbonOnDashboard !== undefined) setShowCarbonOnDashboard(s.showCarbonOnDashboard)
    }).catch(() => {})
    fetch('/api/carbon-factors').then(r => r.json()).then(setCarbonFactors).catch(() => {})
  }, [])

  // Auto-refresh active sessions at configurable interval
  const refreshCountRef = useRef({ count: 0 })
  useEffect(() => {
    const interval = setInterval(() => {
      setAutoRefreshing(true)
      activeSessions.refresh()
      setTimeout(() => setAutoRefreshing(false), 500)

      // Refresh history every 30 cycles to update stats
      refreshCountRef.current.count++
      const historyCycles = Math.max(1, Math.round(30000 / refreshIntervalMs))
      if (refreshCountRef.current.count % historyCycles === 0) {
        history.refresh()
      }
    }, refreshIntervalMs)
    return () => clearInterval(interval)
  }, [refreshIntervalMs]) // eslint-disable-line react-hooks/exhaustive-deps

  if (history.loading) {
    const pct = history.progress ? Math.round((history.progress.done / history.progress.total) * 100) : 0
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4" style={{ background: 'var(--bg)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {history.progress
            ? `${t.loading} ${history.progress.done} / ${history.progress.total} sessions (${pct}%)`
            : t.loading}
        </p>
        {history.progress && (
          <div style={{ width: 300, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: 'var(--accent)', transition: 'width 0.2s' }} />
          </div>
        )}
      </div>
    )
  }

  const TABS = getTabs(t)

  return (
    <LanguageContext.Provider value={lang}>
    <ExactNumbersContext.Provider value={exactNumbers}>
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <Header
        planBadge={planBadge}
        language={config.config?.settings.language || ''}
        effort={config.config?.settings.effort || ''}
        activeCount={activeSessions.sessions.length}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setShowSettings(!showSettings)}
      />

      {/* Tab bar */}
      <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            className={`px-5 py-2.5 text-sm transition-colors ${tab === tabItem.id ? 'font-medium' : ''}`}
            style={{
              color: tab === tabItem.id ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === tabItem.id ? '2px solid var(--accent)' : '2px solid transparent',
            }}
            onClick={() => setTab(tabItem.id)}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowSettings(false)} />
          <div style={{ position: 'relative', maxHeight: '80vh', overflowY: 'auto', borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--border)', padding: 20, width: '100%', maxWidth: 800 }}>
            <button
              onClick={() => setShowSettings(false)}
              style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', lineHeight: 1 }}
            >
              ✕
            </button>
            <TabSettings
              onPricesChanged={history.refresh}
              onSettingsChanged={(s) => { setRefreshIntervalMs(s.refreshIntervalMs); setExactNumbers(s.exactNumbers); if (s.carbonQuotaDaily !== undefined) setCarbonQuota(s.carbonQuotaDaily) }}
              onClose={() => setShowSettings(false)}
              exactNumbers={exactNumbers}
            />
          </div>
        </div>
      )}

      {/* Tab content */}
      <div
        className="min-h-0 flex-1"
        style={{
          overflowY: tab === 'history' ? 'hidden' : 'auto',
          padding: tab !== 'history' ? '20px 20px 40px' : 0,
          maxWidth: 1280,
          margin: '0 auto',
          width: '100%',
          ...(tab !== 'history' ? {
            maskImage: 'linear-gradient(to bottom, black calc(100% - 48px), transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black calc(100% - 48px), transparent 100%)',
          } : {}),
        }}
      >
        {tab === 'dashboard' && (
          <TabDashboard
            usage={usage.usage}
            sessions={history.sessions}
            stats={history.stats}
            activeSessions={activeSessions.sessions}
            onSubmitManualUsage={usage.submitManualUsage}
            onGoToHistory={() => setTab('history')}
            onGoToSession={handleGoToSession}
            carbonFactors={carbonFactors}
            carbonQuota={carbonQuota}
            onNavigateToCarbon={() => setTab('carbon')}
            showCarbonWidget={showCarbonOnDashboard}
            coworkSessionCount={cowork.data.sessions.length}
            coworkCostUSD={cowork.data.sessions.reduce((s, sess) => s + sess.estimatedCostUSD, 0)}
          />
        )}
        {tab === 'mcp' && config.config && (
          <MCPSection config={config.config} />
        )}
        {tab === 'skills' && config.config && (
          <SkillsSection config={config.config} />
        )}
        {tab === 'permissions' && config.config && (
          <GeneralSection config={config.config} onConfigChange={config.refresh} />
        )}
        {tab === 'history' && (
          <TabHistory
            sessions={history.sessions}
            stats={history.stats}
            onHide={handleHide}
            onUnhide={handleUnhide}
            onDelete={handleDelete}
            showHidden={history.showHidden}
            onToggleHidden={handleToggleHidden}
            hiddenIds={history.hiddenIds}
            initialProjectFilter={selectedProject}
            initialSelectedSession={initialSelectedSession}
            onSessionOpened={() => setInitialSelectedSession(null)}
            carbonFactors={carbonFactors}
          />
        )}
        {tab === 'carbon' && (
          <TabCarbon
            sessions={history.sessions}
            factors={carbonFactors}
            quotaDaily={carbonQuota}
            showOnDashboard={showCarbonOnDashboard}
            onToggleShowOnDashboard={(v) => {
              setShowCarbonOnDashboard(v)
              fetch('/api/settings').then(r => r.json()).then(s => {
                fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...s, showCarbonOnDashboard: v }) })
              })
            }}
          />
        )}
        {tab === 'projects' && (
          <TabProjects
            sessions={history.sessions}
            onSelectProject={handleSelectProject}
            hiddenIds={history.hiddenIds}
            showHidden={history.showHidden}
            onToggleHidden={handleToggleHidden}
            onHideSession={handleHide}
            onUnhideSession={handleUnhide}
            onDeleteSession={handleDelete}
          />
        )}
        {tab === 'cowork' && (
          <TabCowork
            data={cowork.data}
            loading={cowork.loading}
            refreshing={cowork.refreshing}
            onRefresh={cowork.refresh}
            t={t}
            exactNumbers={exactNumbers}
          />
        )}
        {tab === 'temporal' && (
          <TabTemporal sessions={history.sessions} />
        )}
      </div>

    </div>
    </ExactNumbersContext.Provider>
    </LanguageContext.Provider>
  )
}
