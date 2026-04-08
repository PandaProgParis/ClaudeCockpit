export type Locale = 'en' | 'fr'

export interface Translations {
  // App
  loading: string
  footerLocal: string

  // Tabs
  tabDashboard: string
  tabHistory: string
  tabProjects: string

  // Header
  settings: string
  active: string

  // Dashboard
  activeSessions: string
  noActiveSessions: string
  recentHistory: string
  noSessions: string
  viewAllHistory: string
  legend: string
  legendInput: string
  legendOutput: string
  legendCacheWrite: string
  legendCacheRead: string
  legendNote: string

  // History
  clear: string
  searchPlaceholder: string
  scopeMessages: string
  scopeResponses: string
  scopeFiles: string
  allModels: string
  allProjects: string
  results: string
  sessions: string
  hidden: string
  show: string
  hide: string
  delete: string
  noSessionFound: string
  hideHiddenSessions: string
  showHiddenSessions: (count: number) => string
  deleteSessionTitle: string
  deleteSessionMessage: (projectName: string) => string
  deleteLabel: string

  // Projects
  sortCost: string
  sortTokens: string
  sortSessions: string
  sortName: string
  sortBy: string
  hiddenIncluded: string
  includeHidden: string
  projects: string
  project: string
  models: string
  actions: string
  unhideProject: string
  hideProject: string
  deleteProjectHistory: string
  noProjects: string
  deleteProjectTitle: string
  deleteProjectMessage: (projectName: string, count: number) => string
  deleteAll: string

  // Config
  mcpDescription: string
  connected: string
  authRequired: string
  tools: (count: number) => string
  allToolsAllowed: string
  noMCPServer: string
  skillsDescription: string
  plugins: string
  activeLabel: string
  blocked: string
  blockedReason: (reason: string) => string
  customSkills: string
  noCustomSkill: string
  skillViewerRendered: string
  skillViewerSource: string
  skillViewerLoading: string
  skillViewerError: string
  skillViewerTooLarge: string
  skillViewerCopy: string
  skillCount: (count: number) => string
  permissions: string
  rules: string
  defaultMode: string
  claudeCodeSettings: string
  plan: string
  rateLimit: string
  language: string
  effort: string
  ideIntegrations: string
  additionalDirs: string
  configLoading: string
  general: string
  deleteRuleTitle: string
  deleteRuleMessage: (rule: string) => string
  deleteRuleConfirm: string
  deleteAllWarnings: string
  deleteAllWarningsTitle: string
  deleteAllWarningsMessage: (count: number) => string

  // Settings
  generalSection: string
  refreshInterval: string
  seconds: string
  exactNumbers: string
  pricePerMillion: string
  model: string
  priceNote: string
  reset: string
  saved: string
  save: string

  // Usage bar
  now: string
  resetIn: string
  resetAt: string
  syncInstructions: string
  cancel: string
  send: string
  invalidJSON: string
  session5h: string
  weeklyAllModels: string
  weeklySonnet: string
  estimatedRemaining: string
  estimationNoData: string
  precision: string
  sync: string
  syncs: string

  // Stats
  today: string
  week: string
  think: string
  topModels: string

  // Active session card
  idle: (minutes: number) => string
  inputLabel: string
  outputLabel: string
  cacheWriteLabel: string
  cacheReadLabel: string
  inputTitle: string
  outputTitle: string
  cacheWriteTitle: string
  cacheReadTitle: string
  contextUsed: string
  contextFull: string

  // Active session accordion
  expandSession: string
  collapseSession: string
  noMessagesYet: string

  // Session viewer
  detailsOn: string
  detailsOff: string
  closeViewer: string
  errorPrefix: string

  // Confirm dialog
  cancelButton: string

  // Days
  sunday: string
  monday: string
  tuesday: string
  wednesday: string
  thursday: string
  friday: string
  saturday: string

  // Carbon
  tabCarbon: string
  carbonTitle: string
  carbonTotalCO2: string
  carbonEquivalent: string
  carbonMostEcoModel: string
  carbonWaterEstimate: string
  carbonEquivalences: string
  carbonByModel: string
  carbonOverTime: string
  carbonDisclaimer: string
  carbonQuota: string
  carbonQuotaExceeded: string
  carbonQuotaRecovery: string
  carbonAsIfYouHad: string
  carbonCarKm: (km: string) => string
  carbonFlightMin: (time: string) => string
  carbonWaterMl: (ml: string) => string
  carbonPhoneCharges: (charges: string) => string
  carbonCarLabel: string
  carbonFlightLabel: string
  carbonWaterLabel: string
  carbonPhoneLabel: string
  carbonLowImpact: string
  carbonLast7Days: string
  carbonDailyQuota: string
  carbonChooseQuota: string
  carbonQuotaUnit: string
  carbonQuotaPhoneCharges: string
  carbonQuotaCarKm: string
  carbonQuotaFlightSeconds: string
  carbonQuotaWaterLiters: string
  carbonQuotaEmails: string
  carbonQuotaStreaming: string
  carbonQuotaResult: string
  carbonUsed: string
  carbonCarbonFactors: string
  carbonEmissionFactors: string
  carbonEquivalenceFactors: string
  carbonGPerToken: string
  carbonPeriodToday: string
  carbonPeriodWeek: string
  carbonPeriodYear: string
  carbonPeriodAll: string
}

export const en: Translations = {
  loading: 'Loading...',
  footerLocal: 'Local data ~/.claude/',
  tabDashboard: 'Dashboard',
  tabHistory: 'History',
  tabProjects: 'Projects',
  settings: 'Settings',
  active: 'active',

  activeSessions: 'Active sessions',
  noActiveSessions: 'No active sessions',
  recentHistory: 'Recent history',
  noSessions: 'No sessions',
  viewAllHistory: 'View all history \u2192',
  legend: 'Legend',
  legendInput: 'tokens sent to Claude (prompt, files, context)',
  legendOutput: 'tokens generated by Claude (responses, code)',
  legendCacheWrite: 'tokens written to context cache (high cost, one time)',
  legendCacheRead: 'tokens read from cache (10x cheaper than input)',
  legendNote: 'Tokens are counted locally from session files (~/.claude/projects/). Stats (Today, Week) update every ~30s. The tok/s is calculated in real time by delta between two refreshes.',

  clear: 'Clear',
  searchPlaceholder: 'Search sessions...',
  scopeMessages: 'Messages',
  scopeResponses: 'Responses',
  scopeFiles: 'Files',
  allModels: 'All models',
  allProjects: 'All projects',
  results: 'results',
  sessions: 'Sessions',
  hidden: 'hidden',
  show: 'Show',
  hide: 'Hide',
  delete: 'Delete',
  noSessionFound: 'No session found',
  hideHiddenSessions: 'Hide hidden sessions',
  showHiddenSessions: (count) => `Show ${count} hidden sessions`,
  deleteSessionTitle: 'Delete session',
  deleteSessionMessage: (projectName) => `Are you sure you want to delete the session from project "${projectName}"? This action is irreversible.`,
  deleteLabel: 'Delete',

  sortCost: 'Cost',
  sortTokens: 'Tokens',
  sortSessions: 'Sessions',
  sortName: 'Name',
  sortBy: 'Sort by:',
  hiddenIncluded: 'Hidden included',
  includeHidden: 'Include hidden',
  projects: 'projects',
  project: 'Project',
  models: 'Models',
  actions: 'Actions',
  unhideProject: 'Unhide project',
  hideProject: 'Hide project',
  deleteProjectHistory: 'Delete all project history',
  noProjects: 'No projects',
  deleteProjectTitle: 'Delete project history',
  deleteProjectMessage: (projectName, count) => `Warning: this action is irreversible. All sessions from project "${projectName}" (${count} sessions) will be permanently deleted.`,
  deleteAll: 'Delete all',

  mcpDescription: 'MCP servers configured in Claude Code CLI. These connections are shared across all sessions.',
  connected: 'connected',
  authRequired: 'auth required',
  tools: (count) => `${count} tools`,
  allToolsAllowed: 'all tools allowed',
  noMCPServer: 'No MCP server configured',
  skillsDescription: 'Skills and plugins installed in Claude Code CLI.',
  plugins: 'Plugins',
  activeLabel: 'active',
  blocked: 'blocked',
  blockedReason: (reason) => `blocked: ${reason}`,
  customSkills: 'Custom skills',
  noCustomSkill: 'No custom skill',
  skillViewerRendered: 'Rendered',
  skillViewerSource: 'Source',
  skillViewerLoading: 'Loading skill content...',
  skillViewerError: 'Failed to load skill content',
  skillViewerTooLarge: 'File too large to display',
  skillViewerCopy: 'Copy',
  skillCount: (count) => `${count} skills`,
  permissions: 'Permissions',
  rules: 'rules',
  defaultMode: 'default mode',
  claudeCodeSettings: 'Claude Code Settings',
  plan: 'Plan',
  rateLimit: 'Rate limit',
  language: 'Language',
  effort: 'Effort',
  ideIntegrations: 'IDE integrations',
  additionalDirs: 'Additional directories',
  configLoading: 'Loading configuration...',
  general: 'General',
  deleteRuleTitle: 'Delete permission rule',
  deleteRuleMessage: (rule) => `Remove "${rule}" from permissions?`,
  deleteRuleConfirm: 'Delete',
  deleteAllWarnings: 'Delete all warnings',
  deleteAllWarningsTitle: 'Delete all dangerous rules',
  deleteAllWarningsMessage: (count) => `Remove ${count} dangerous rule(s) from permissions?`,

  generalSection: 'General',
  refreshInterval: 'Refresh interval',
  seconds: 'seconds',
  exactNumbers: 'Exact numbers',
  pricePerMillion: 'Price per million tokens ($USD)',
  model: 'Model',
  priceNote: 'These prices are used to estimate the equivalent API cost. With a Max subscription, you don\'t pay per usage.',
  reset: 'Reset',
  saved: 'Saved',
  save: 'Save',

  now: 'now',
  resetIn: 'Reset in',
  resetAt: 'Reset',
  syncInstructions: 'Open Usage \u2197, then F12 \u2192 Network \u2192 search for "usage" \u2192 copy the JSON response',
  cancel: 'Cancel',
  send: 'Send',
  invalidJSON: 'Invalid JSON or server error',
  session5h: 'Session (5h)',
  weeklyAllModels: 'Weekly \u2014 all models',
  weeklySonnet: 'Weekly \u2014 Sonnet',
  estimatedRemaining: 'Estimated remaining:',
  estimationNoData: 'Estimation: not enough data',
  precision: 'Precision:',
  sync: 'sync',
  syncs: 'syncs',

  today: 'Today',
  week: 'Week',
  think: 'Think',
  topModels: 'Top models',

  idle: (minutes) => `idle ${minutes}min`,
  inputLabel: 'input',
  outputLabel: 'output',
  cacheWriteLabel: 'cache write',
  cacheReadLabel: 'cache read',
  inputTitle: 'Tokens sent to Claude',
  outputTitle: 'Tokens generated by Claude',
  cacheWriteTitle: 'Tokens written to context cache',
  cacheReadTitle: 'Tokens read from cache (cheaper)',
  contextUsed: 'Context window',
  contextFull: 'Context window full',

  cancelButton: 'Cancel',

  expandSession: 'Live view',
  collapseSession: 'Close',
  noMessagesYet: 'No messages yet',

  detailsOn: 'Details ON',
  detailsOff: 'Details OFF',
  closeViewer: 'Close (Esc)',
  errorPrefix: 'Error:',

  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',

  // Carbon
  tabCarbon: 'Carbon',
  carbonTitle: 'Your AI carbon footprint',
  carbonTotalCO2: 'Total CO₂',
  carbonEquivalent: 'Equivalent',
  carbonMostEcoModel: 'Most eco model',
  carbonWaterEstimate: 'Estimated water',
  carbonEquivalences: 'Equivalences',
  carbonByModel: 'CO₂ by model',
  carbonOverTime: 'Over time',
  carbonDisclaimer: 'Estimates based on academic literature (MLCommons, Luccioni et al. 2023). Not actual measurements from Anthropic.',
  carbonQuota: 'Daily quota',
  carbonQuotaExceeded: 'Carbon quota exceeded!',
  carbonQuotaRecovery: 'The grass will grow back tomorrow...',
  carbonAsIfYouHad: "That's like...",
  carbonCarKm: (km) => `Drove ${km} km`,
  carbonFlightMin: (time) => `Flew for ${time}`,
  carbonWaterMl: (ml) => `Used ${ml}`,
  carbonPhoneCharges: (charges) => `Charged ${charges} smartphones`,
  carbonCarLabel: 'by car',
  carbonFlightLabel: 'on a Paris-NY flight',
  carbonWaterLabel: 'of cooling water',
  carbonPhoneLabel: 'full battery',
  carbonLowImpact: 'Low impact',
  carbonLast7Days: 'Last 7 days',
  carbonDailyQuota: 'Daily CO₂ quota (g)',
  carbonChooseQuota: 'Choose your daily quota',
  carbonQuotaUnit: 'of',
  carbonQuotaPhoneCharges: 'phone charges',
  carbonQuotaCarKm: 'km by car',
  carbonQuotaFlightSeconds: 'seconds of flight',
  carbonQuotaWaterLiters: 'liters of water',
  carbonQuotaEmails: 'emails',
  carbonQuotaStreaming: 'hours of streaming',
  carbonQuotaResult: 'That gives you a daily budget of',
  carbonUsed: 'used',
  carbonCarbonFactors: 'Carbon factors',
  carbonEmissionFactors: 'Emission factors (gCO₂/token)',
  carbonEquivalenceFactors: 'Equivalence factors',
  carbonGPerToken: 'gCO₂/token',
  carbonPeriodToday: 'Today',
  carbonPeriodWeek: 'This week',
  carbonPeriodYear: 'This year',
  carbonPeriodAll: 'All time',
}

export const fr: Translations = {
  loading: 'Chargement...',
  footerLocal: 'Données locales ~/.claude/',
  tabDashboard: 'Dashboard',
  tabHistory: 'Historique',
  tabProjects: 'Projets',
  settings: 'Réglages',
  active: 'active',

  activeSessions: 'Sessions actives',
  noActiveSessions: 'Aucune session active',
  recentHistory: 'Historique récent',
  noSessions: 'Aucune session',
  viewAllHistory: "Voir tout l'historique \u2192",
  legend: 'Légende',
  legendInput: 'tokens envoyés à Claude (prompt, fichiers, contexte)',
  legendOutput: 'tokens générés par Claude (réponses, code)',
  legendCacheWrite: 'tokens écrits dans le cache de contexte (coût élevé, une seule fois)',
  legendCacheRead: 'tokens relus depuis le cache (10x moins cher que l\'input)',
  legendNote: 'Les tokens sont comptés localement depuis les fichiers de session (~/.claude/projects/). Les stats (Aujourd\'hui, Semaine) se mettent à jour toutes les ~30s. Le tok/s est calculé en temps réel par delta entre deux rafraîchissements.',

  clear: 'Effacer',
  searchPlaceholder: 'Rechercher dans les sessions...',
  scopeMessages: 'Messages',
  scopeResponses: 'Réponses',
  scopeFiles: 'Fichiers',
  allModels: 'Tous les modèles',
  allProjects: 'Tous les projets',
  results: 'résultats',
  sessions: 'Sessions',
  hidden: 'masquée',
  show: 'Afficher',
  hide: 'Masquer',
  delete: 'Supprimer',
  noSessionFound: 'Aucune session trouvée',
  hideHiddenSessions: 'Masquer les sessions cachées',
  showHiddenSessions: (count) => `Afficher ${count} sessions masquées`,
  deleteSessionTitle: 'Supprimer la session',
  deleteSessionMessage: (projectName) => `Voulez-vous vraiment supprimer la session du projet "${projectName}" ? Cette action est irréversible.`,
  deleteLabel: 'Supprimer',

  sortCost: 'Coût',
  sortTokens: 'Tokens',
  sortSessions: 'Sessions',
  sortName: 'Nom',
  sortBy: 'Trier par :',
  hiddenIncluded: 'Masquées incluses',
  includeHidden: 'Inclure masquées',
  projects: 'projets',
  project: 'Projet',
  models: 'Modèles',
  actions: 'Actions',
  unhideProject: 'Démasquer le projet',
  hideProject: 'Masquer le projet',
  deleteProjectHistory: "Supprimer tout l'historique du projet",
  noProjects: 'Aucun projet',
  deleteProjectTitle: "Supprimer l'historique du projet",
  deleteProjectMessage: (projectName, count) => `Attention : cette action est irréversible. Toutes les sessions du projet "${projectName}" (${count} sessions) seront définitivement supprimées.`,
  deleteAll: 'Supprimer tout',

  mcpDescription: 'Serveurs MCP configurés dans Claude Code CLI. Ces connexions sont partagées entre toutes les sessions.',
  connected: 'connecté',
  authRequired: 'auth requise',
  tools: (count) => `${count} outils`,
  allToolsAllowed: 'tous outils autorisés',
  noMCPServer: 'Aucun serveur MCP configuré',
  skillsDescription: 'Skills et plugins installés dans Claude Code CLI.',
  plugins: 'Plugins',
  activeLabel: 'actif',
  blocked: 'bloqué',
  blockedReason: (reason) => `bloqué: ${reason}`,
  customSkills: 'Skills custom',
  noCustomSkill: 'Aucune skill custom',
  skillViewerRendered: 'Rendu',
  skillViewerSource: 'Source',
  skillViewerLoading: 'Chargement du contenu...',
  skillViewerError: 'Impossible de charger le contenu',
  skillViewerTooLarge: 'Fichier trop volumineux',
  skillViewerCopy: 'Copier',
  skillCount: (count) => `${count} skills`,
  permissions: 'Permissions',
  rules: 'règles',
  defaultMode: 'mode par défaut',
  claudeCodeSettings: 'Paramètres Claude Code',
  plan: 'Plan',
  rateLimit: 'Rate limit',
  language: 'Langue',
  effort: 'Effort',
  ideIntegrations: 'IDE intégrations',
  additionalDirs: 'Directories additionnels',
  configLoading: 'Chargement de la configuration...',
  general: 'Général',
  deleteRuleTitle: 'Supprimer la règle',
  deleteRuleMessage: (rule) => `Supprimer "${rule}" des permissions ?`,
  deleteRuleConfirm: 'Supprimer',
  deleteAllWarnings: 'Supprimer tous les warnings',
  deleteAllWarningsTitle: 'Supprimer les règles dangereuses',
  deleteAllWarningsMessage: (count) => `Supprimer ${count} règle(s) dangereuse(s) des permissions ?`,

  generalSection: 'Général',
  refreshInterval: 'Intervalle de rafraîchissement',
  seconds: 'secondes',
  exactNumbers: 'Nombres exacts',
  pricePerMillion: 'Prix par million de tokens ($USD)',
  model: 'Modèle',
  priceNote: "Ces prix servent à estimer le coût équivalent API. Avec un abonnement Max, vous ne payez pas à l'usage.",
  reset: 'Réinitialiser',
  saved: 'Sauvegardé',
  save: 'Sauvegarder',

  now: 'maintenant',
  resetIn: 'Reset dans',
  resetAt: 'Reset',
  syncInstructions: 'Ouvrez Usage \u2197, puis F12 \u2192 Network \u2192 cherchez "usage" \u2192 copiez la réponse JSON',
  cancel: 'Annuler',
  send: 'Envoyer',
  invalidJSON: 'JSON invalide ou erreur serveur',
  session5h: 'Session (5h)',
  weeklyAllModels: 'Hebdo \u2014 tous modèles',
  weeklySonnet: 'Hebdo \u2014 Sonnet',
  estimatedRemaining: 'Estimé restant :',
  estimationNoData: 'Estimation : pas assez de données',
  precision: 'Précision :',
  sync: 'sync',
  syncs: 'syncs',

  today: "Aujourd'hui",
  week: 'Semaine',
  think: 'Think',
  topModels: 'Top modèles',

  idle: (minutes) => `idle ${minutes}min`,
  inputLabel: 'input',
  outputLabel: 'output',
  cacheWriteLabel: 'cache write',
  cacheReadLabel: 'cache read',
  inputTitle: 'Tokens envoyés à Claude',
  outputTitle: 'Tokens générés par Claude',
  cacheWriteTitle: 'Tokens écrits dans le cache de contexte',
  cacheReadTitle: 'Tokens relus depuis le cache (moins cher)',
  contextUsed: 'Fenêtre de contexte',
  contextFull: 'Fenêtre de contexte saturée',

  cancelButton: 'Annuler',

  expandSession: 'Vue live',
  collapseSession: 'Fermer',
  noMessagesYet: 'Aucun message pour le moment',

  detailsOn: 'Détails ON',
  detailsOff: 'Détails OFF',
  closeViewer: 'Fermer (Echap)',
  errorPrefix: 'Erreur :',

  sunday: 'dimanche',
  monday: 'lundi',
  tuesday: 'mardi',
  wednesday: 'mercredi',
  thursday: 'jeudi',
  friday: 'vendredi',
  saturday: 'samedi',

  // Carbon
  tabCarbon: 'Carbone',
  carbonTitle: 'Votre empreinte carbone IA',
  carbonTotalCO2: 'Total CO₂',
  carbonEquivalent: 'Équivalent',
  carbonMostEcoModel: 'Modèle le + éco',
  carbonWaterEstimate: 'Eau estimée',
  carbonEquivalences: 'Équivalences',
  carbonByModel: 'CO₂ par modèle',
  carbonOverTime: 'Évolution',
  carbonDisclaimer: 'Estimations basées sur la littérature académique (MLCommons, Luccioni et al. 2023). Ce ne sont pas des mesures réelles fournies par Anthropic.',
  carbonQuota: 'Quota journalier',
  carbonQuotaExceeded: 'Quota carbone dépassé !',
  carbonQuotaRecovery: "L'herbe repoussera demain...",
  carbonAsIfYouHad: 'C\'est comme si vous aviez...',
  carbonCarKm: (km) => `Roulé ${km} km`,
  carbonFlightMin: (time) => `Volé pendant ${time}`,
  carbonWaterMl: (ml) => `Consommé ${ml}`,
  carbonPhoneCharges: (charges) => `Chargé ${charges} smartphones`,
  carbonCarLabel: 'en voiture',
  carbonFlightLabel: 'sur un Paris-NY',
  carbonWaterLabel: "d'eau de refroidissement",
  carbonPhoneLabel: 'batterie complète',
  carbonLowImpact: 'Faible impact',
  carbonLast7Days: '7 derniers jours',
  carbonDailyQuota: 'Quota CO₂ journalier (g)',
  carbonChooseQuota: 'Choisissez votre quota journalier',
  carbonQuotaUnit: 'de',
  carbonQuotaPhoneCharges: 'recharges de smartphone',
  carbonQuotaCarKm: 'km en voiture',
  carbonQuotaFlightSeconds: 'secondes de vol',
  carbonQuotaWaterLiters: "litres d'eau",
  carbonQuotaEmails: 'emails',
  carbonQuotaStreaming: 'heures de streaming',
  carbonQuotaResult: 'Cela vous donne un budget journalier de',
  carbonUsed: 'utilisé',
  carbonCarbonFactors: 'Facteurs carbone',
  carbonEmissionFactors: "Facteurs d'émission (gCO₂/token)",
  carbonEquivalenceFactors: "Facteurs d'équivalence",
  carbonGPerToken: 'gCO₂/token',
  carbonPeriodToday: "Aujourd'hui",
  carbonPeriodWeek: 'Cette semaine',
  carbonPeriodYear: 'Cette année',
  carbonPeriodAll: 'Tout',
}

const translations: Record<Locale, Translations> = { en, fr }

export function getTranslations(locale: Locale): Translations {
  return translations[locale]
}

export function detectLocale(): Locale {
  const stored = localStorage.getItem('claude-cockpit-locale')
  if (stored === 'fr' || stored === 'en') return stored
  const browserLang = navigator.language.split('-')[0]
  if (browserLang === 'fr') return 'fr'
  return 'en'
}
