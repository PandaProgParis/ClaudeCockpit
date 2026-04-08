export interface EmissionFactors {
  [modelPattern: string]: number // gCO2 per token
}

export interface EquivalenceFactors {
  carGramPerKm: number
  flightGramPerMin: number
  waterMlPerToken: number
  phoneGramPerCharge: number
}

export interface CarbonFactors {
  emission: EmissionFactors
  equivalences: EquivalenceFactors
}

export interface Equivalences {
  carKm: number
  flightMin: number
  waterMl: number
  phoneCharges: number
}

export interface EcoScore {
  letter: 'A' | 'B' | 'C' | 'D' | 'E'
  color: string
  level: number
}

export interface EarthStep {
  index: number // 1-21
  label: string
  emoji: string
  percentage: number
}

export const DEFAULT_EMISSION_FACTORS: EmissionFactors = {
  'opus': 0.0036,
  'sonnet': 0.0014,
  'haiku': 0.00045,
}

export const DEFAULT_EQUIVALENCE_FACTORS: EquivalenceFactors = {
  carGramPerKm: 120,
  flightGramPerMin: 2850,
  waterMlPerToken: 0.0001,
  phoneGramPerCharge: 8.2,
}

export const DEFAULT_CARBON_FACTORS: CarbonFactors = {
  emission: DEFAULT_EMISSION_FACTORS,
  equivalences: DEFAULT_EQUIVALENCE_FACTORS,
}

const FALLBACK_EMISSION = 0.0014

function findEmissionFactor(model: string, factors: EmissionFactors): number {
  const key = Object.keys(factors).find((k) => model.toLowerCase().includes(k))
  return key ? factors[key] : FALLBACK_EMISSION
}

export function computeCO2(
  model: string,
  inputTokens: number,
  outputTokens: number,
  factors: EmissionFactors,
): number {
  const factor = findEmissionFactor(model, factors)
  return (inputTokens + outputTokens) * factor
}

export function computeEquivalences(
  co2Grams: number,
  totalTokens: number,
  factors: EquivalenceFactors,
): Equivalences {
  return {
    carKm: co2Grams / factors.carGramPerKm,
    flightMin: co2Grams / factors.flightGramPerMin,
    waterMl: totalTokens * factors.waterMlPerToken,
    phoneCharges: co2Grams / factors.phoneGramPerCharge,
  }
}

export function getEcoScore(co2Grams: number): EcoScore {
  if (co2Grams < 1) return { letter: 'A', color: '#66BB6A', level: 1 }
  if (co2Grams < 5) return { letter: 'B', color: '#8BC34A', level: 2 }
  if (co2Grams < 20) return { letter: 'C', color: '#D4956A', level: 3 }
  if (co2Grams < 100) return { letter: 'D', color: '#FF7043', level: 4 }
  return { letter: 'E', color: '#ef5350', level: 5 }
}

const EARTH_STEPS: { label: string; emoji: string }[] = [
  { label: 'Eden', emoji: '🌱' },
  { label: 'Paradis', emoji: '🌿' },
  { label: 'Verdoyant', emoji: '🍃' },
  { label: 'Paisible', emoji: '☁️' },
  { label: 'Serein', emoji: '🌤️' },
  { label: 'Doux', emoji: '🌤️' },
  { label: 'Tiède', emoji: '🌡️' },
  { label: 'Réchauffement', emoji: '🌡️' },
  { label: 'Avertissement', emoji: '⚠️' },
  { label: 'Inquiétant', emoji: '⚠️' },
  { label: 'Sécheresse', emoji: '🏜️' },
  { label: 'Aride', emoji: '🥀' },
  { label: 'Critique', emoji: '🔥' },
  { label: 'Alarmant', emoji: '🔥' },
  { label: 'Danger', emoji: '🚨' },
  { label: 'Urgence', emoji: '🚨' },
  { label: 'Fournaise', emoji: '🌋' },
  { label: 'Enfer', emoji: '🌋' },
  { label: 'Apocalypse', emoji: '💀' },
  { label: 'Extinction', emoji: '💀' },
]

const EARTH_BURNED = { label: 'Brûlé !', emoji: '💀🔥' }

export function getEarthStep(percentage: number): EarthStep {
  if (percentage >= 100) {
    return { index: 21, ...EARTH_BURNED, percentage }
  }
  const stepIndex = Math.min(Math.floor(percentage / 5), 19)
  const step = EARTH_STEPS[stepIndex]
  return { index: stepIndex + 1, ...step, percentage }
}

function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function computeTodayCO2(
  sessions: { primaryModel: string; tokens: { input: number; output: number }; startedAt: string }[],
  factors: EmissionFactors,
): number {
  const today = toLocalDateString(new Date())
  return sessions
    .filter((s) => toLocalDateString(new Date(s.startedAt)) === today)
    .reduce((sum, s) => sum + computeCO2(s.primaryModel, s.tokens.input, s.tokens.output, factors), 0)
}
