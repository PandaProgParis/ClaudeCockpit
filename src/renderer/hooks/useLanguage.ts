import { createContext, useContext, useState, useCallback } from 'react'
import { type Locale, type Translations, getTranslations, detectLocale } from '../lib/i18n'

interface LanguageContextValue {
  locale: Locale
  t: Translations
  setLocale: (locale: Locale) => void
}

const initial = detectLocale()

export const LanguageContext = createContext<LanguageContextValue>({
  locale: initial,
  t: getTranslations(initial),
  setLocale: () => {},
})

export function useLanguage() {
  return useContext(LanguageContext)
}

export function useLanguageState() {
  const [locale, setLocaleState] = useState<Locale>(detectLocale)

  const setLocale = useCallback((l: Locale) => {
    localStorage.setItem('claude-cockpit-locale', l)
    setLocaleState(l)
  }, [])

  return {
    locale,
    t: getTranslations(locale),
    setLocale,
  }
}
