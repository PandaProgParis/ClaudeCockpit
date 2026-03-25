export interface PriceEntry {
  input: number
  output: number
  cacheWrite: number
  cacheRead: number
}

export type PriceTable = Record<string, PriceEntry>

export const DEFAULT_PRICES: PriceTable = {
  'claude-opus-4': { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
  'claude-sonnet-4': { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  'claude-haiku-4': { input: 0.8, output: 4, cacheWrite: 1, cacheRead: 0.08 },
}

const DEFAULT_FALLBACK: PriceEntry = { input: 10, output: 30, cacheWrite: 12.5, cacheRead: 1 }

// Mutable runtime price table — updated from server config
let runtimePrices: PriceTable = { ...DEFAULT_PRICES }

export function setPriceTable(prices: PriceTable): void {
  runtimePrices = prices
}

export function getPriceTable(): PriceTable {
  return runtimePrices
}

export function estimateCost(
  model: string,
  tokens: { input: number; output: number; cacheCreation: number; cacheRead: number }
): number {
  const key = Object.keys(runtimePrices).find((k) => model.includes(k))
  const price = key ? runtimePrices[key] : DEFAULT_FALLBACK
  return (
    (tokens.input * price.input +
      tokens.output * price.output +
      tokens.cacheCreation * price.cacheWrite +
      tokens.cacheRead * price.cacheRead) /
    1_000_000
  )
}

export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  'claude-opus-4': 1_000_000,
  'claude-sonnet-4': 200_000,
  'claude-haiku-4': 200_000,
}

export function getContextLimit(model: string): number {
  const key = Object.keys(MODEL_CONTEXT_LIMITS).find((k) => model.includes(k))
  return key ? MODEL_CONTEXT_LIMITS[key] : 200_000
}
