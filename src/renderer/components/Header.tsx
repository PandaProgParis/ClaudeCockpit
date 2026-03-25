import { Sun, Moon, Settings } from 'lucide-react'
import { useLanguage } from '../hooks/useLanguage'
import type { Locale } from '../lib/i18n'

const LANG_LABELS: Record<string, string> = {
  en: 'English', fr: 'Français', es: 'Español', de: 'Deutsch', it: 'Italiano',
  pt: 'Português', nl: 'Nederlands', ru: 'Русский', zh: '中文', ja: '日本語',
  ko: '한국어', ar: 'العربية', pl: 'Polski', sv: 'Svenska', tr: 'Türkçe',
}

const UI_LOCALES: { value: Locale; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'fr', label: 'FR' },
]

interface HeaderProps {
  planBadge: string
  language: string
  effort: string
  activeCount: number
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  onOpenSettings: () => void
}

export function Header({ planBadge, language, effort, activeCount, theme, onToggleTheme, onOpenSettings }: HeaderProps) {
  const { t, locale, setLocale } = useLanguage()

  return (
    <header className="flex h-12 shrink-0 items-center justify-between px-5"
      style={{ borderBottom: '1px solid var(--border)', position: 'relative' }}>
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: 'var(--text-dim)', fontFamily: 'monospace', pointerEvents: 'none' }}>
        ~/.claude/
      </div>
      <div>
        <span className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Claude Cockpit</span>
        <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>{planBadge}</span>
        {language && <span className="ml-2 text-xs" style={{ color: 'var(--text-dim)' }}>{LANG_LABELS[language] ?? language}</span>}
        {effort && effort !== 'default' && <span className="ml-1 text-xs" style={{ color: 'var(--text-dim)' }}>· {effort}</span>}
      </div>
      <div className="flex items-center gap-2">
        {activeCount > 0 && (
          <span className="rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              background: 'var(--green-bg)',
              color: 'var(--green)',
              boxShadow: '0 0 8px var(--green), 0 0 16px var(--green-bg)',
              animation: 'pulse-glow 2s ease-in-out infinite',
            }}>
            ● {activeCount} {t.active}
          </span>
        )}
        {/* Language switcher */}
        <div className="flex items-center" style={{ borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
          {UI_LOCALES.map((l) => (
            <button
              key={l.value}
              onClick={() => setLocale(l.value)}
              style={{
                fontSize: 10,
                padding: '4px 8px',
                background: locale === l.value ? 'var(--accent)' : 'var(--bg-card)',
                color: locale === l.value ? '#fff' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: locale === l.value ? 600 : 400,
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" style={{ color: 'var(--text-muted)' }} /> : <Moon className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />}
        </button>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          onClick={onOpenSettings}
          title={t.settings}
        >
          <Settings className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>
    </header>
  )
}
