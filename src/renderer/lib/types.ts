export interface SessionEntry {
  sessionId: string
  title: string               // first user message (from history.jsonl display field)
  projectPath: string
  projectName: string
  startedAt: string           // ISO string
  endedAt: string             // ISO string
  durationSeconds: number
  entrypoint: 'cli' | 'claude-vscode' | 'other'
  models: string[]            // unique models used (excluding "<synthetic>")
  primaryModel: string        // most-used model by message count; "unknown" if none
  usedThinking: boolean
  tokens: {
    input: number
    output: number
    cacheCreation: number
    cacheRead: number
    total: number             // input + output + cacheCreation + cacheRead
  }
  estimatedCostUSD: number
}

export interface ModelStats {
  model: string
  sessions: number
  inputTokens: number
  outputTokens: number
  costUSD: number
}

export interface GlobalStats {
  totalSessions: number
  totalTokens: number
  totalCostUSD: number
  byModel: ModelStats[]
  thinkingSessions: number
}

export interface UsageData {
  fiveHour: { utilization: number; resetsAt: string } | null
  sevenDay: { utilization: number; resetsAt: string } | null
  sevenDaySonnet: { utilization: number; resetsAt: string } | null
  sevenDayOpus: { utilization: number; resetsAt: string } | null
  extraUsage: { isEnabled: boolean; monthlyLimit: number | null; usedCredits: number | null } | null
  fetchedAt: string
  source: 'api' | 'manual' | 'extension'
}

export interface ActiveSession {
  sessionId: string
  title: string
  projectPath: string
  projectName: string
  startedAt: string
  model: string
  usedThinking: boolean
  tokens: { input: number; output: number; cacheCreation: number; cacheRead: number; total: number }
  estimatedCostUSD: number
  status: 'active' | 'idle'
  lastActivityAt: string
  contextSize: number
  maxContextSize: number
}

export interface PluginSkill {
  name: string
  description: string
  path: string
}

export interface PermissionRule {
  rule: string
  source: 'settings.json' | 'settings.local.json'
}

export interface ClaudeConfig {
  plan: { subscriptionType: string; rateLimitTier: string }
  plugins: { name: string; version: string; description: string; status: 'active' | 'blocked'; blockReason?: string; skills?: PluginSkill[] }[]
  skills: { name: string; description: string; path: string }[]  // path points to SKILL.md file
  mcpServers: { name: string; description: string; status: 'connected' | 'auth-required'; source: 'cli' | 'desktop'; command?: string; tools?: string[] }[]
  permissions: { mode: string; allow: PermissionRule[]; deny: PermissionRule[]; settingsPath: string; localSettingsPath: string }
  settings: { language: string; effort: string; ideIntegrations: number; additionalDirs: string[] }
}

export type SSEEvent =
  | { type: 'session:active'; data: ActiveSession }
  | { type: 'session:idle'; data: { sessionId: string; lastActivityAt: string } }
  | { type: 'session:ended'; data: { sessionId: string } }
  | { type: 'usage:updated'; data: UsageData }

// ─── Session viewer types ─────────────────────────────────────

export interface SearchScope {
  user:      boolean
  assistant: boolean
  files:     boolean
}

export interface TextBlock        { type: 'text';        text: string }
export interface ThinkingBlock    { type: 'thinking';    thinking: string }
export interface ToolUseBlock     { type: 'tool_use';    id: string; name: string; input: Record<string, unknown> }
export interface ToolResultBlock  { type: 'tool_result'; tool_use_id: string; content: string | Array<{ type: string; text: string }> }

export type AssistantContentBlock = TextBlock | ThinkingBlock | ToolUseBlock | ToolResultBlock

export interface MessageTokenUsage {
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
}

export type SessionMessage =
  | { type: 'user';      content: string;                 timestamp: string }
  | { type: 'assistant'; content: AssistantContentBlock[]; timestamp: string; tokens?: MessageTokenUsage }

export interface SearchResult {
  sessionId:   string
  projectPath: string
  matchedIn:   'user' | 'assistant' | 'file'
  snippet: {
    before: string
    match:  string
    after:  string
  }
}

// --- Cowork types ---

export interface CoworkSpace {
  id: string
  name: string
  folders: string[]
  instructions: string
  createdAt: string
  updatedAt: string
  sessionCount: number
  totalCostUSD: number
  folderSizeBytes: number | null
}

export interface CoworkPlugin {
  id: string
  name: string
  marketplaceName: string
  installedBy: string
}

export interface CoworkSession {
  sessionId: string
  title: string
  model: string
  initialMessage: string
  createdAt: string
  lastActivityAt: string
  durationSeconds: number
  isArchived: boolean
  processName: string
  sdkVersion: string
  enabledMcpTools: string[]
  slashCommands: string[]
  hostLoopMode: boolean
  estimatedCostUSD: number
  tokens: {
    input: number
    output: number
    cacheCreation: number
    cacheRead: number
    total: number
  }
}

export interface CoworkData {
  spaces: CoworkSpace[]
  sessions: CoworkSession[]
  plugins: CoworkPlugin[]
}

// --- Session index types ---

export interface SessionIndexEntry {
  projectPath: string | null
  projectName: string
  source: 'cli' | 'cowork'
  title: string
  timestamp: number
}

export interface SessionIndex {
  version: number
  builtAt: string
  sessions: Record<string, SessionIndexEntry>
}
