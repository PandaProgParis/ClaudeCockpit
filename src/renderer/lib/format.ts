export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return s > 0 ? `${m}m ${s}s` : `${m}m`
  }
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  return h > 0 ? `${d}d ${h}h` : `${d}d`
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month} ${hours}:${mins}`
}

export function formatTokens(n: number, exact = false, locale = 'en'): string {
  if (exact) return n.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return `${n}`
}

export function formatCost(usd: number): string {
  if (usd === 0) return '$0'
  if (usd < 0.01) return '<$0.01'
  return `$${usd.toFixed(2)}`
}

export function modelColor(model: string): string {
  if (model.includes('opus')) return '#FFB74D'
  if (model.includes('sonnet')) return '#64B5F6'
  if (model.includes('haiku')) return '#81C784'
  return 'var(--text-muted)'
}

export function abbreviateModel(model: string): string {
  if (model === 'unknown') return '—'
  const family = model.includes('opus') ? 'opus'
    : model.includes('sonnet') ? 'sonnet'
    : model.includes('haiku') ? 'haiku'
    : null
  if (!family) return model.split('-').slice(0, 2).join('-')
  const match = model.match(new RegExp(`${family}-(\\d+)(?:-(\\d+))?`))
  if (!match) return family
  const [, major, minor] = match
  // Ignore date-like suffixes (e.g. 20260301) — minor version is always 1-2 digits
  const version = minor && minor.length <= 2 ? `${major}.${minor}` : major
  return `${family} ${version}`
}
