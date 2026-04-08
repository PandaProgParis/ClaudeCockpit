import { lerp, lerpColor } from './carbon-story/utils'

interface Props {
  percentage: number // 0-100+
  size?: number // px, default 70
}

export function EarthGlobe({ percentage, size = 70 }: Props) {
  const t = Math.min(percentage / 100, 1.2)
  const burned = percentage > 100

  const oceanColor = lerpColor('#1565C0', '#0D47A1', t)
  const continentColor = lerpColor('#4CAF50', '#3E2723', t)
  const iceScale = Math.max(0, lerp(1, 0, t * 1.3))
  const cloudOpacity = Math.max(0, lerp(0.35, 0, t * 1.5))
  const fireOpacity = Math.max(0, lerp(0, 0.8, (t - 0.6) * 2.5))
  const smokeOpacity = Math.max(0, lerp(0, 0.35, (t - 0.7) * 3))
  const redOverlay = Math.max(0, lerp(0, 0.4, (t - 0.5) * 2))
  const atmosphereColor = lerpColor('#64B5F6', '#ef5350', t)
  const atmosphereOpacity = lerp(0.4, 0.6, t)
  const glowColor = lerpColor('#4CAF50', '#ef5350', t)
  const glowIntensity = burned ? 20 : lerp(10, 18, t)

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{
        filter: `drop-shadow(0 0 ${glowIntensity}px ${glowColor}${burned ? 'cc' : '66'})`,
        ...(burned ? { animation: 'earthPulse 1.5s ease-in-out infinite' } : {}),
      }}
    >
      <circle cx="50" cy="50" r="45" fill={oceanColor} />
      {redOverlay > 0 && (
        <circle cx="50" cy="50" r="45" fill="#B71C1C" opacity={redOverlay} />
      )}
      <circle cx="50" cy="50" r="45" fill="none" stroke={atmosphereColor} strokeWidth={burned ? 2.5 : 2} opacity={atmosphereOpacity} />

      <ellipse cx="38" cy="32" rx="12" ry="8" fill={continentColor} transform="rotate(-15 38 32)" />
      <ellipse cx="55" cy="30" rx="15" ry="10" fill={lerpColor('#43A047', '#4E342E', t)} transform="rotate(10 55 30)" />
      <ellipse cx="60" cy="52" rx="8" ry="14" fill={lerpColor('#388E3C', '#3E2723', t)} transform="rotate(5 60 52)" />
      <ellipse cx="35" cy="55" rx="10" ry="6" fill={lerpColor('#4CAF50', '#4E342E', t)} transform="rotate(-10 35 55)" />
      <ellipse cx="42" cy="70" rx="6" ry="4" fill={lerpColor('#2E7D32', '#3E2723', t)} />

      {iceScale > 0.05 && (
        <>
          <ellipse cx="50" cy="12" rx={14 * iceScale} ry={5 * iceScale} fill="#E3F2FD" opacity={0.7 * iceScale} />
          <ellipse cx="50" cy="90" rx={10 * iceScale} ry={4 * iceScale} fill="#E3F2FD" opacity={0.6 * iceScale} />
        </>
      )}

      {cloudOpacity > 0.02 && (
        <>
          <ellipse cx="28" cy="40" rx="8" ry="3" fill="white" opacity={cloudOpacity} />
          <ellipse cx="65" cy="25" rx="6" ry="2.5" fill="white" opacity={cloudOpacity * 0.85} />
          <ellipse cx="50" cy="60" rx="7" ry="2" fill="white" opacity={cloudOpacity * 0.7} />
        </>
      )}

      <ellipse cx="35" cy="30" rx="12" ry="18" fill="white" opacity={lerp(0.08, 0.02, t)} transform="rotate(-30 35 30)" />

      {fireOpacity > 0.02 && (
        <>
          <circle cx="40" cy="35" r="3" fill="#FF6F00" opacity={fireOpacity} />
          <circle cx="58" cy="48" r="2.5" fill="#FF8F00" opacity={fireOpacity * 0.85} />
          <circle cx="35" cy="58" r="2" fill="#FF6F00" opacity={fireOpacity * 0.7} />
          {burned && (
            <>
              <circle cx="50" cy="30" r="3.5" fill="#FFAB00" opacity={fireOpacity * 0.9} />
              <circle cx="44" cy="68" r="2.5" fill="#FF6F00" opacity={fireOpacity * 0.8} />
            </>
          )}
        </>
      )}

      {smokeOpacity > 0.02 && (
        <>
          <ellipse cx="42" cy="28" rx="5" ry="3" fill="#757575" opacity={smokeOpacity} />
          <ellipse cx="60" cy="42" rx="4" ry="2" fill="#616161" opacity={smokeOpacity * 0.8} />
          {burned && (
            <ellipse cx="55" cy="24" rx="6" ry="3" fill="#616161" opacity={smokeOpacity * 0.9} />
          )}
        </>
      )}

      <style>{`
        @keyframes earthPulse {
          0%, 100% { filter: drop-shadow(0 0 ${glowIntensity}px ${glowColor}cc); }
          50% { filter: drop-shadow(0 0 ${glowIntensity + 10}px ${glowColor}ff); }
        }
      `}</style>
    </svg>
  )
}
