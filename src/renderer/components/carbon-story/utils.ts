export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}

export function lerpColor(hex1: string, hex2: string, t: number): string {
  const r1 = parseInt(hex1.slice(1, 3), 16)
  const g1 = parseInt(hex1.slice(3, 5), 16)
  const b1 = parseInt(hex1.slice(5, 7), 16)
  const r2 = parseInt(hex2.slice(1, 3), 16)
  const g2 = parseInt(hex2.slice(3, 5), 16)
  const b2 = parseInt(hex2.slice(5, 7), 16)
  const r = Math.round(lerp(r1, r2, t))
  const g = Math.round(lerp(g1, g2, t))
  const b = Math.round(lerp(b1, b2, t))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export type Phase = 'planting' | 'watering' | 'sweating' | 'panicking' | 'burning' | 'dead'

export function getPhase(percentage: number): Phase {
  if (percentage <= 20) return 'planting'
  if (percentage <= 40) return 'watering'
  if (percentage <= 60) return 'sweating'
  if (percentage <= 80) return 'panicking'
  if (percentage <= 100) return 'burning'
  return 'dead'
}
