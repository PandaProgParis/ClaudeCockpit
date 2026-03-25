import { readFile, writeFile, readdir } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import type { ClaudeConfig, PermissionRule, PluginSkill } from '../renderer/lib/types'
import { readCredentials } from './usage-api'

const CLAUDE_DIR = join(homedir(), '.claude')

/**
 * In Docker, ~/.claude is mounted from the host.
 * installed_plugins.json contains host-absolute installPaths (e.g. C:\Users\...\\.claude\plugins\cache\...).
 * We need to remap these to the container-local CLAUDE_DIR.
 */
function remapPluginPath(hostPath: string): string {
  // Match everything after .claude (case-insensitive, forward or back slashes)
  const match = hostPath.match(/[/\\]\.claude[/\\](.*)/i)
  if (match) {
    return join(CLAUDE_DIR, ...match[1].split(/[/\\]/))
  }
  return hostPath
}

// ---------------------------------------------------------------------------
// Settings merge
// ---------------------------------------------------------------------------

export function mergeSettings(base: any, local: any): any {
  const b = base ?? {}
  const l = local ?? {}

  const merged = { ...b, ...l }

  // Merge permissions arrays (concat, not replace)
  const bPerms = b.permissions ?? {}
  const lPerms = l.permissions ?? {}
  merged.permissions = {
    ...bPerms,
    ...lPerms,
    allow: [...(bPerms.allow ?? []), ...(lPerms.allow ?? [])],
    deny: [...(bPerms.deny ?? []), ...(lPerms.deny ?? [])],
  }

  // Preserve base scalar fields that local didn't override
  if (b.defaultMode && !l.defaultMode) merged.defaultMode = b.defaultMode
  if (b.preferredLanguage && !l.preferredLanguage) merged.preferredLanguage = b.preferredLanguage
  if (b.effort && !l.effort) merged.effort = b.effort
  if (b.additionalDirectories && !l.additionalDirectories) merged.additionalDirectories = b.additionalDirectories

  return merged
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readJson(path: string): Promise<any> {
  try {
    return JSON.parse(await readFile(path, 'utf-8'))
  } catch {
    return null
  }
}

async function subdirs(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries.filter(e => e.isDirectory()).map(e => e.name)
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Frontmatter parsing
// ---------------------------------------------------------------------------

function parseFrontmatter(content: string, fallbackName: string): { name: string; description: string } {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (fmMatch) {
    const nameMatch = fmMatch[1].match(/^name:\s*(.+)$/m)
    const descMatch = fmMatch[1].match(/^description:\s*(.+)$/m)
    return {
      name: nameMatch ? nameMatch[1].trim() : fallbackName,
      description: descMatch ? descMatch[1].trim() : '',
    }
  }
  return {
    name: fallbackName,
    description: content.split('\n')[0]?.replace(/^#\s*/, '').trim() ?? '',
  }
}

async function scanPluginSkills(pluginDir: string): Promise<PluginSkill[]> {
  const results: PluginSkill[] = []

  // skills/*/SKILL.md
  const skillsDir = join(pluginDir, 'skills')
  for (const d of await subdirs(skillsDir)) {
    const p = join(skillsDir, d, 'SKILL.md')
    try {
      const content = await readFile(p, 'utf-8')
      const { name, description } = parseFrontmatter(content, d)
      results.push({ name, description, path: p })
    } catch { /* skip */ }
  }

  // commands/*.md and agents/*.md
  for (const subdir of ['commands', 'agents']) {
    const dir = join(pluginDir, subdir)
    try {
      const entries = await readdir(dir)
      for (const entry of entries.filter(e => e.endsWith('.md'))) {
        const p = join(dir, entry)
        const content = await readFile(p, 'utf-8')
        const baseName = entry.replace(/\.md$/, '')
        const { name, description } = parseFrontmatter(content, baseName)
        results.push({ name, description, path: p })
      }
    } catch { /* skip */ }
  }

  return results
}

// ---------------------------------------------------------------------------
// Scanners
// ---------------------------------------------------------------------------

async function scanPlugins(): Promise<ClaudeConfig['plugins']> {
  // Blocklist: { fetchedAt, plugins: [{ plugin: "name@marketplace", reason, ... }] }
  const blocklist: Record<string, string> = {}
  const blData = await readJson(join(CLAUDE_DIR, 'plugins', 'blocklist.json'))
  if (blData?.plugins && Array.isArray(blData.plugins)) {
    for (const entry of blData.plugins) {
      if (entry?.plugin) blocklist[entry.plugin] = entry.reason ?? 'blocked'
    }
  }

  // Primary source: installed_plugins.json
  const installedData = await readJson(join(CLAUDE_DIR, 'plugins', 'installed_plugins.json'))
  const installedPlugins: Record<string, Array<{ installPath: string; version: string }>> =
    installedData?.plugins ?? {}

  const result: ClaudeConfig['plugins'] = []

  for (const [pluginId, entries] of Object.entries(installedPlugins)) {
    if (!entries?.length) continue
    // Prefer user-scoped entry, fallback to first
    const entry = (entries as any[]).find(e => e.scope === 'user') ?? entries[0]
    const installPath = remapPluginPath(entry.installPath) // remap host paths for Docker bind mounts

    // Read metadata: prefer .claude-plugin/plugin.json, fallback to package.json
    const claudePlugin = await readJson(join(installPath, '.claude-plugin', 'plugin.json'))
    const pkg = claudePlugin ?? await readJson(join(installPath, 'package.json'))

    const name = pkg?.name ?? pluginId
    const description = pkg?.description ?? ''
    const version = entry.version ?? 'unknown'
    const isBlocked = pluginId in blocklist

    const skills = await scanPluginSkills(installPath)
    result.push({
      name: pluginId,        // use full "name@marketplace" id as display name
      version,
      description,
      status: isBlocked ? 'blocked' : 'active',
      ...(isBlocked ? { blockReason: blocklist[pluginId] } : {}),
      ...(skills.length > 0 ? { skills } : {}),
    })
  }

  return result
}

async function scanSkills(): Promise<ClaudeConfig['skills']> {
  const skillsDir = join(CLAUDE_DIR, 'skills')
  const dirs = await subdirs(skillsDir)
  const skills: ClaudeConfig['skills'] = []

  for (const d of dirs) {
    const skillPath = join(skillsDir, d, 'SKILL.md')
    try {
      const content = await readFile(skillPath, 'utf-8')
      const { name, description } = parseFrontmatter(content, d)
      skills.push({ name, description, path: skillPath })
    } catch {
      // No SKILL.md — skip
    }
  }

  return skills
}

function detectCliMcpServers(allow: string[], authCache: any): ClaudeConfig['mcpServers'] {
  // Group tools by server name
  const serverTools = new Map<string, string[]>()
  const mcpPattern = /^mcp__([^_]+)__(.+)/

  for (const entry of allow) {
    const match = mcpPattern.exec(entry)
    if (match) {
      const tools = serverTools.get(match[1]) ?? []
      tools.push(match[2])
      serverTools.set(match[1], tools)
    }
  }

  const authRequired = new Set<string>()
  if (authCache && typeof authCache === 'object') {
    for (const key of Object.keys(authCache)) {
      authRequired.add(key)
    }
  }

  return Array.from(serverTools.entries()).map(([name, tools]) => ({
    name,
    description: '',
    status: authRequired.has(name) ? 'auth-required' as const : 'connected' as const,
    source: 'cli' as const,
    tools,
  }))
}

async function detectDesktopMcpServers(): Promise<ClaudeConfig['mcpServers']> {
  const configPath = join(process.env.APPDATA ?? '', 'Claude', 'claude_desktop_config.json')
  const config = await readJson(configPath)
  if (!config?.mcpServers) return []

  return Object.entries(config.mcpServers).map(([name, serverConfig]: [string, any]) => ({
    name,
    description: '',
    status: 'connected' as const,
    source: 'desktop' as const,
    command: serverConfig?.command ?? undefined,
  }))
}

async function countIdeIntegrations(): Promise<number> {
  const ideDir = join(CLAUDE_DIR, 'ide')
  try {
    const entries = await readdir(ideDir)
    return entries.filter(e => e.endsWith('.lock')).length
  } catch {
    return 0
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function readConfig(): Promise<ClaudeConfig> {
  // 1. Read and merge settings
  const [baseSettings, localSettings] = await Promise.all([
    readJson(join(CLAUDE_DIR, 'settings.json')),
    readJson(join(CLAUDE_DIR, 'settings.local.json')),
  ])

  const merged = mergeSettings(baseSettings, localSettings)

  // Track source of each permission rule
  const baseAllow: string[] = baseSettings?.permissions?.allow ?? []
  const localAllow: string[] = localSettings?.permissions?.allow ?? []
  const baseDeny: string[] = baseSettings?.permissions?.deny ?? []
  const localDeny: string[] = localSettings?.permissions?.deny ?? []

  const tagSource = (rules: string[], source: PermissionRule['source']): PermissionRule[] =>
    rules.map(rule => ({ rule, source }))

  const allow: PermissionRule[] = [...tagSource(baseAllow, 'settings.json'), ...tagSource(localAllow, 'settings.local.json')]
  const deny: PermissionRule[] = [...tagSource(baseDeny, 'settings.json'), ...tagSource(localDeny, 'settings.local.json')]

  // 2. Read credentials
  const creds = await readCredentials()

  // 3-6. Parallel scans
  const [plugins, skills, authCache, ideCount, desktopMcp] = await Promise.all([
    scanPlugins(),
    scanSkills(),
    readJson(join(CLAUDE_DIR, 'mcp-needs-auth-cache.json')),
    countIdeIntegrations(),
    detectDesktopMcpServers(),
  ])

  // 5. MCP servers (CLI + Desktop)
  const cliMcp = detectCliMcpServers(allow.map(r => r.rule), authCache)
  const mcpServers = [...cliMcp, ...desktopMcp]

  return {
    plan: {
      subscriptionType: creds?.subscriptionType ?? 'unknown',
      rateLimitTier: creds?.rateLimitTier ?? 'unknown',
    },
    plugins,
    skills,
    mcpServers,
    permissions: {
      mode: merged.defaultMode ?? 'ask',
      allow,
      deny,
      settingsPath: join(CLAUDE_DIR, 'settings.json'),
      localSettingsPath: join(CLAUDE_DIR, 'settings.local.json'),
    },
    settings: {
      language: merged.preferredLanguage ?? 'en',
      effort: merged.effort ?? 'default',
      ideIntegrations: ideCount,
      additionalDirs: merged.additionalDirectories ?? [],
    },
  }
}

// ---------------------------------------------------------------------------
// Remove a permission rule from the appropriate settings file
// ---------------------------------------------------------------------------

const ALLOWED_SETTINGS_FILES = new Set(['settings.json', 'settings.local.json'])

export async function removePermission(rule: string, type: 'allow' | 'deny', source: PermissionRule['source']): Promise<void> {
  if (!ALLOWED_SETTINGS_FILES.has(source)) throw new Error('Invalid source file')
  const filePath = join(CLAUDE_DIR, source)
  const data = await readJson(filePath)
  if (!data?.permissions?.[type]) return

  const arr: string[] = data.permissions[type]
  const idx = arr.indexOf(rule)
  if (idx === -1) return

  arr.splice(idx, 1)
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}
