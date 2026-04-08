import { useRef, useEffect, useCallback } from 'react'
import { getPhase } from './utils'
import type { Phase } from './utils'

interface Props {
  percentage: number
  width: number
  height: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  type: string
}

const PARTICLE_CONFIGS: Record<string, { phases: Phase[]; maxCount: number; spawnRate: number }> = {
  butterfly: { phases: ['planting'],                          maxCount: 3,  spawnRate: 0.02 },
  leaf:      { phases: ['planting', 'watering'],              maxCount: 4,  spawnRate: 0.03 },
  deadLeaf:  { phases: ['sweating'],                          maxCount: 6,  spawnRate: 0.04 },
  heat:      { phases: ['sweating'],                          maxCount: 5,  spawnRate: 0.05 },
  spark:     { phases: ['panicking'],                         maxCount: 8,  spawnRate: 0.06 },
  smoke:     { phases: ['panicking', 'burning'],              maxCount: 6,  spawnRate: 0.04 },
  flame:     { phases: ['burning'],                           maxCount: 10, spawnRate: 0.08 },
  ember:     { phases: ['dead'],                              maxCount: 8,  spawnRate: 0.04 },
  ash:       { phases: ['dead'],                              maxCount: 5,  spawnRate: 0.03 },
}

const MAX_PARTICLES = 30

const PASTEL_COLORS = ['#FFB3D9', '#B3D9FF', '#B3FFD9', '#FFD9B3', '#D9B3FF', '#FFFBB3']
const GREEN_SHADES  = ['#4CAF50', '#66BB6A', '#81C784', '#388E3C', '#2E7D32']
const DEAD_SHADES   = ['#8D6E63', '#A1887F', '#BCAAA4', '#D4A017', '#C8A96A']

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function spawnParticle(type: string, w: number, h: number): Particle {
  // Sky-level area: y 30-65% of height; ground area: y 60-90%
  const skyY   = () => rand(h * 0.30, h * 0.65)
  const groundY = () => rand(h * 0.60, h * 0.90)
  const sceneX  = () => rand(w * 0.20, w * 0.80)

  switch (type) {
    case 'butterfly': return {
      x: sceneX(), y: skyY(),
      vx: rand(-0.4, 0.4), vy: rand(-0.2, 0.2),
      life: 0, maxLife: rand(180, 280),
      size: rand(6, 10),
      color: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)],
      type,
    }
    case 'leaf': return {
      x: sceneX(), y: skyY(),
      vx: rand(-0.3, 0.3), vy: rand(0.3, 0.7),
      life: 0, maxLife: rand(120, 200),
      size: rand(5, 9),
      color: GREEN_SHADES[Math.floor(Math.random() * GREEN_SHADES.length)],
      type,
    }
    case 'deadLeaf': return {
      x: sceneX(), y: skyY(),
      vx: rand(-0.5, 0.5), vy: rand(0.8, 1.6),
      life: 0, maxLife: rand(80, 140),
      size: rand(5, 9),
      color: DEAD_SHADES[Math.floor(Math.random() * DEAD_SHADES.length)],
      type,
    }
    case 'heat': return {
      x: sceneX(), y: skyY(),
      vx: 0, vy: rand(-0.3, -0.6),
      life: 0, maxLife: rand(60, 100),
      size: rand(20, 40),
      color: '#FF8C00',
      type,
    }
    case 'spark': return {
      x: sceneX(), y: groundY(),
      vx: rand(-2, 2), vy: rand(-3, -1),
      life: 0, maxLife: rand(40, 80),
      size: rand(2, 5),
      color: '#FF6600',
      type,
    }
    case 'smoke': return {
      x: sceneX(), y: groundY(),
      vx: rand(-0.2, 0.2), vy: rand(-0.5, -1.0),
      life: 0, maxLife: rand(100, 160),
      size: rand(6, 12),
      color: '#888888',
      type,
    }
    case 'flame': return {
      x: sceneX(), y: groundY(),
      vx: rand(-0.3, 0.3), vy: rand(-1.2, -0.6),
      life: 0, maxLife: rand(60, 100),
      size: rand(6, 14),
      color: '#FF8C00',
      type,
    }
    case 'ember': return {
      x: sceneX(), y: rand(h * 0.40, h * 0.80),
      vx: rand(-0.3, 0.3), vy: rand(-0.4, 0.1),
      life: 0, maxLife: rand(120, 200),
      size: rand(2, 4),
      color: '#FF4500',
      type,
    }
    case 'ash': default: return {
      x: sceneX(), y: rand(h * 0.20, h * 0.60),
      vx: rand(-0.2, 0.2), vy: rand(0.2, 0.5),
      life: 0, maxLife: rand(140, 220),
      size: rand(2, 4),
      color: '#AAAAAA',
      type,
    }
  }
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const progress = p.life / p.maxLife
  ctx.save()

  switch (p.type) {
    case 'butterfly': {
      // Two wing ellipses that flap
      const wingAngle = Math.sin(p.life * 0.1) * 0.6
      ctx.translate(p.x, p.y)
      ctx.fillStyle = p.color
      ctx.globalAlpha = Math.max(0, 1 - progress * 0.5)

      // Left wing
      ctx.save()
      ctx.rotate(-wingAngle)
      ctx.beginPath()
      ctx.ellipse(-p.size * 0.6, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Right wing
      ctx.save()
      ctx.rotate(wingAngle)
      ctx.beginPath()
      ctx.ellipse(p.size * 0.6, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      break
    }

    case 'leaf':
    case 'deadLeaf': {
      const rotation = Math.sin(p.life * 0.05) * 0.8
      ctx.translate(p.x, p.y)
      ctx.rotate(rotation)
      ctx.globalAlpha = Math.max(0, 1 - progress * 0.4)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.ellipse(0, 0, p.size, p.size * 0.4, 0, 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'heat': {
      ctx.globalAlpha = 0.25 * (1 - progress)
      ctx.strokeStyle = p.color
      ctx.lineWidth = 1.5
      ctx.beginPath()
      const segments = 8
      const segW = p.size / segments
      ctx.moveTo(p.x, p.y)
      for (let i = 1; i <= segments; i++) {
        const sx = p.x - p.size / 2 + i * segW
        const sy = p.y + Math.sin((p.life * 0.2) + i * 1.2) * 3
        ctx.lineTo(sx, sy)
      }
      ctx.stroke()
      break
    }

    case 'spark': {
      const lifeRatio = 1 - progress
      const radius = p.size * lifeRatio
      ctx.globalAlpha = lifeRatio
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, Math.max(0.5, radius), 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'smoke': {
      const expandedSize = p.size + p.size * progress * 2
      ctx.globalAlpha = 0.18 * (1 - progress)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, Math.max(0.5, expandedSize), 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'flame': {
      // Yellow → orange → dark red over life
      let flameColor: string
      if (progress < 0.33) {
        flameColor = '#FFD700'
      } else if (progress < 0.66) {
        flameColor = '#FF6600'
      } else {
        flameColor = '#8B0000'
      }
      ctx.globalAlpha = Math.max(0, 0.8 - progress * 0.6)
      ctx.fillStyle = flameColor
      ctx.beginPath()
      ctx.arc(p.x, p.y, Math.max(0.5, p.size * (1 - progress * 0.5)), 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'ember': {
      // Flicker by alternating colors
      const flickerColor = Math.floor(p.life / 5) % 2 === 0 ? '#FF4500' : '#FF8C00'
      ctx.globalAlpha = 0.6 * (1 - progress * 0.5)
      ctx.fillStyle = flickerColor
      ctx.beginPath()
      ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'ash': {
      ctx.globalAlpha = 0.35 * (1 - progress * 0.6)
      ctx.fillStyle = '#BBBBBB'
      ctx.beginPath()
      ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2)
      ctx.fill()
      break
    }
  }

  ctx.restore()
}

export function ParticleCanvas({ percentage, width, height }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animRef     = useRef<number>(0)
  const pctRef      = useRef(percentage)
  pctRef.current = percentage

  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    const phase = getPhase(pctRef.current)
    const particles = particlesRef.current

    // Collect which types are active for this phase
    const activeTypes = Object.entries(PARTICLE_CONFIGS)
      .filter(([, cfg]) => cfg.phases.includes(phase))
      .map(([type, cfg]) => ({ type, cfg }))

    // Spawn new particles up to per-type limits and global max
    for (const { type, cfg } of activeTypes) {
      const currentCount = particles.filter(p => p.type === type).length
      if (
        currentCount < cfg.maxCount &&
        particles.length < MAX_PARTICLES &&
        Math.random() < cfg.spawnRate
      ) {
        particles.push(spawnParticle(type, width, height))
      }
    }

    // Update and draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]

      // Update position
      p.x += p.vx
      p.y += p.vy
      p.life++

      // Type-specific movement overrides
      if (p.type === 'butterfly') {
        // Sinusoidal path
        p.x += Math.sin(p.life * 0.05) * 0.6
        p.y += Math.cos(p.life * 0.04) * 0.3
      } else if (p.type === 'leaf' || p.type === 'deadLeaf') {
        // Wobble
        p.x += Math.sin(p.life * 0.08) * 0.4
      } else if (p.type === 'heat') {
        // Wavy upward
        p.x += Math.sin(p.life * 0.15) * 0.5
      } else if (p.type === 'spark') {
        // Parabolic: gravity
        p.vy += 0.08
      }

      // Remove dead particles or those that left canvas with margin
      if (
        p.life >= p.maxLife ||
        p.x < -50 || p.x > width + 50 ||
        p.y < -50 || p.y > height + 50
      ) {
        particles.splice(i, 1)
        continue
      }

      // Remove particles whose type is no longer valid for current phase
      const cfg = PARTICLE_CONFIGS[p.type]
      if (cfg && !cfg.phases.includes(phase)) {
        particles.splice(i, 1)
        continue
      }

      drawParticle(ctx, p)
    }

    animRef.current = requestAnimationFrame(animate)
  }, [width, height])

  useEffect(() => {
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [animate])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    />
  )
}
