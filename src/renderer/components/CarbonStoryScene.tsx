// src/renderer/components/CarbonStoryScene.tsx
import { useRef, useState, useEffect } from 'react'
import { Island } from './carbon-story/Island'
import { Trees } from './carbon-story/Trees'
import { Gardener } from './carbon-story/Gardener'
import { ParticleCanvas } from './carbon-story/ParticleCanvas'
import { lerpColor } from './carbon-story/utils'

interface Props {
  percentage: number
}

export function CarbonStoryScene({ percentage }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 800, height: 200 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const t = Math.min(percentage / 100, 1.2)
  const bgGlow = lerpColor('#4CAF50', '#ef5350', Math.min(t, 1))
  const bgGlowOpacity = percentage > 100 ? 0.15 : t * 0.08

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: 'inherit',
        overflow: 'hidden',
        background: `radial-gradient(ellipse at 50% 60%, ${bgGlow}${Math.round(bgGlowOpacity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 100 800 200"
        preserveAspectRatio="xMidYMax slice"
      >
        <Island percentage={percentage} />
        <Trees percentage={percentage} />
        <Gardener percentage={percentage} />
      </svg>

      <ParticleCanvas
        percentage={percentage}
        width={size.width}
        height={size.height}
      />
    </div>
  )
}
