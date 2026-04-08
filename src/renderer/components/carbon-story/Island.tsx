import { lerp, lerpColor } from './utils'

interface Props {
  percentage: number
}

/** Two-phase color interpolation: bright → red peak at 65% → gray ash at 100%+ */
function lerpColor2(bright: string, hot: string, ash: string, t: number): string {
  if (t <= 0.65) return lerpColor(bright, hot, t / 0.65)
  return lerpColor(hot, ash, (t - 0.65) / 0.55)
}

export function Island({ percentage }: Props) {
  const t = Math.min(percentage / 100, 1.2)

  // Sky colors — blue → orange/red peak at 65% → gray ash
  const skyTop = lerpColor2('#64B5F6', '#702010', '#161515', t)
  const skyMid = lerpColor2('#90CAF9', '#903020', '#1c1a1a', t)
  const skyBottom = lerpColor2('#E1F5FE', '#804030', '#1a1818', t)

  // Sun — yellow → red → gray dead
  const sunColor = lerpColor2('#FFF176', '#D04020', '#454040', t)
  const sunGlowInner = lerpColor2('#FFF9C4', '#D84315', '#383535', t)
  const sunGlowOuter = lerpColor2('#FFF9C4', '#C62828', '#2a2828', t)
  const sunRadius = lerp(18, 25, Math.min(t, 0.65) / 0.65)
  const sunGlowRadius = lerp(34, 46, Math.min(t, 0.65) / 0.65)
  const sunGlowOpacity = t > 0.85 ? lerp(0.6, 0.1, (t - 0.85) / 0.35) : 0.6

  // Clouds — white, fade out by ~40%
  const cloudOpacity = Math.max(0, lerp(0.72, 0, t * 2.5))

  // Distant hills — green → brown/red → dark gray
  const hillFar = lerpColor2('#81C784', '#351810', '#1a1212', t)
  const hillNear = lerpColor2('#66BB6A', '#281008', '#151210', t)

  // Ground gradient — green → brown → gray ash
  const groundTop = lerpColor2('#66BB6A', '#4a3018', '#1c1a18', t)
  const groundMid = lerpColor2('#4CAF50', '#302010', '#121010', t)
  const groundBottom = lerpColor2('#388E3C', '#201008', '#0e0d0c', t)

  // Contour lines
  const contourColor = lerpColor2('#43A047', '#3E2723', '#252222', t)
  const contourOpacity = lerp(0.35, 0.55, Math.min(t, 1))

  // Grass tufts — fade out by ~55%
  const grassColor = lerpColor('#2E7D32', '#3E2723', Math.min(t * 1.8, 1))
  const grassOpacity = Math.max(0, lerp(0.85, 0, t * 1.8))

  // Wildflowers — fade out by ~35%
  const flowerOpacity = Math.max(0, lerp(0.8, 0, t * 2.8))

  // Dirt path — brown → dark → gray
  const pathColor = lerpColor2('#A1887F', '#3E2723', '#201c1a', t)
  const pathOpacity = lerp(0.55, 0.85, Math.min(t, 1))

  // River
  const riverColor = lerpColor2('#42A5F5', '#8D6E63', '#2a2222', t)
  const riverHighlight = lerpColor2('#90CAF9', '#A1887F', '#353030', t)
  const riverOpacity = lerp(0.7, 0.3, t)

  // Cracks in ground (appear after 35%)
  const crackOpacity = Math.max(0, lerp(0, 0.8, (t - 0.35) * 2))
  const crackColor = lerpColor2('#3E2723', '#3E2723', '#282525', t)

  // Embers — appear 60-85%, then fade to dying
  const emberOpacity = t < 0.6 ? 0 : t < 0.85 ? lerp(0, 0.5, (t - 0.6) / 0.25) : lerp(0.5, 0.15, (t - 0.85) / 0.35)
  const emberColor = t < 0.85 ? '#FF6F00' : lerpColor('#FF6F00', '#8D6E63', (t - 0.85) / 0.35)

  // Hope sprout (>100% only)
  const burned = percentage > 100

  return (
    <g>
      <defs>
        <linearGradient id="storySky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyTop} />
          <stop offset="55%" stopColor={skyMid} />
          <stop offset="100%" stopColor={skyBottom} />
        </linearGradient>

        <linearGradient id="storyGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={groundTop} />
          <stop offset="50%" stopColor={groundMid} />
          <stop offset="100%" stopColor={groundBottom} />
        </linearGradient>

        <radialGradient id="storySunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={sunGlowInner} stopOpacity={sunGlowOpacity} />
          <stop offset="60%" stopColor={sunGlowOuter} stopOpacity={sunGlowOpacity * 0.33} />
          <stop offset="100%" stopColor={sunGlowOuter} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sky */}
      <rect x="0" y="0" width="800" height="195" fill="url(#storySky)" />

      {/* Sun */}
      <circle cx="680" cy="52" r={sunGlowRadius} fill="url(#storySunGlow)" />
      <circle cx="680" cy="52" r={sunRadius} fill={sunColor} />

      {/* Clouds */}
      {cloudOpacity > 0.01 && (
        <g opacity={cloudOpacity} fill="white">
          <ellipse cx="120" cy="60" rx="48" ry="18" />
          <ellipse cx="155" cy="50" rx="38" ry="20" />
          <ellipse cx="88" cy="65" rx="30" ry="14" />

          <ellipse cx="390" cy="40" rx="55" ry="19" />
          <ellipse cx="430" cy="30" rx="40" ry="21" />
          <ellipse cx="355" cy="46" rx="32" ry="15" />

          <ellipse cx="560" cy="75" rx="42" ry="15" opacity="0.65" />
          <ellipse cx="592" cy="66" rx="32" ry="16" opacity="0.65" />
          <ellipse cx="532" cy="80" rx="26" ry="12" opacity="0.65" />
        </g>
      )}

      {/* Distant hills — far layer */}
      <path
        d="M0,168 Q80,130 160,148 Q240,165 320,138 Q400,112 480,142 Q560,168 640,145 Q720,122 800,150 L800,195 L0,195 Z"
        fill={hillFar}
        opacity="0.7"
      />

      {/* Distant hills — near layer */}
      <path
        d="M0,182 Q60,158 130,170 Q210,183 290,162 Q370,142 460,168 Q540,190 620,172 Q700,155 800,175 L800,195 L0,195 Z"
        fill={hillNear}
        opacity="0.85"
      />

      {/* Horizon line */}
      <line x1="0" y1="195" x2="800" y2="195" stroke={contourColor} strokeWidth="1" opacity="0.4" />

      {/* Ground */}
      <rect x="0" y="195" width="800" height="105" fill="url(#storyGround)" />

      {/* Ground contour lines */}
      <path d="M0,222 Q200,215 400,220 Q600,225 800,218" fill="none" stroke={contourColor} strokeWidth="1.2" opacity={contourOpacity} />
      <path d="M0,248 Q150,242 350,246 Q550,250 800,243" fill="none" stroke={contourColor} strokeWidth="1" opacity={contourOpacity * 0.7} />
      <path d="M0,272 Q250,268 500,271 Q650,273 800,269" fill="none" stroke={contourColor} strokeWidth="0.8" opacity={contourOpacity * 0.5} />

      {/* River */}
      <path d="M0,235 Q80,230 160,238 Q260,248 360,240 Q460,232 560,238 Q660,245 740,240 Q780,238 800,240" fill="none" stroke={riverColor} strokeWidth="12" strokeLinecap="round" opacity={riverOpacity} />
      <path d="M0,235 Q80,230 160,238 Q260,248 360,240 Q460,232 560,238 Q660,245 740,240 Q780,238 800,240" fill="none" stroke={riverHighlight} strokeWidth="4" strokeLinecap="round" opacity={riverOpacity * 0.5} />
      {/* River sparkles */}
      {t < 0.5 && (
        <g opacity={lerp(0.5, 0, t * 2)}>
          <circle cx="200" cy="236" r="1.5" fill="white" opacity="0.4" />
          <circle cx="400" cy="238" r="1" fill="white" opacity="0.35" />
          <circle cx="580" cy="237" r="1.5" fill="white" opacity="0.3" />
        </g>
      )}

      {/* Dirt path */}
      <path d="M60,275 Q180,258 320,252 Q460,248 580,254 Q680,260 760,268" fill="none" stroke={pathColor} strokeWidth="9" strokeLinecap="round" opacity={pathOpacity * 0.55} />
      <path d="M60,275 Q180,258 320,252 Q460,248 580,254 Q680,260 760,268" fill="none" stroke={pathColor} strokeWidth="5" strokeLinecap="round" opacity={pathOpacity * 0.4} />

      {/* Grass tufts */}
      {grassOpacity > 0.01 && (
        <g opacity={grassOpacity} stroke={grassColor} strokeWidth="1.5" strokeLinecap="round" fill="none">
          <path d="M95,210 l-3,-8 M99,210 l0,-9 M103,210 l3,-7" />
          <path d="M195,218 l-3,-7 M199,218 l0,-8 M203,218 l3,-6" />
          <path d="M270,208 l-2,-7 M274,208 l0,-8 M278,208 l2,-6" />
          <path d="M380,212 l-3,-8 M384,212 l0,-9 M388,212 l3,-7" />
          <path d="M460,205 l-2,-7 M464,205 l0,-8 M468,205 l2,-6" />
          <path d="M540,216 l-3,-7 M544,216 l0,-8 M548,216 l3,-6" />
          <path d="M630,210 l-2,-8 M634,210 l0,-9 M638,210 l2,-7" />
          <path d="M710,215 l-3,-7 M714,215 l0,-8 M718,215 l3,-6" />
        </g>
      )}

      {/* Wildflowers — detailed with stems and petals */}
      {flowerOpacity > 0.01 && (
        <g opacity={flowerOpacity}>
          {/* Flower clusters — each has stem + petals + center */}
          {/* Pink tulip */}
          <line x1="110" y1="218" x2="110" y2="210" stroke="#388E3C" strokeWidth="1.5" strokeLinecap="round" />
          <ellipse cx="107" cy="208" rx="3" ry="4" fill="#E91E63" transform="rotate(-10 107 208)" />
          <ellipse cx="113" cy="208" rx="3" ry="4" fill="#EC407A" transform="rotate(10 113 208)" />
          <circle cx="110" cy="208" r="1.5" fill="#FCE4EC" />

          {/* Orange daisy */}
          <line x1="170" y1="215" x2="170" y2="207" stroke="#2E7D32" strokeWidth="1" strokeLinecap="round" />
          <circle cx="170" cy="205" r="4" fill="#FF9800" />
          <circle cx="170" cy="205" r="1.8" fill="#FFF8E1" />
          <ellipse cx="165" cy="209" rx="1.5" ry="1" fill="#388E3C" transform="rotate(-25 165 209)" />

          {/* Purple cluster */}
          <line x1="260" y1="213" x2="260" y2="205" stroke="#388E3C" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="257" cy="203" r="3" fill="#9C27B0" />
          <circle cx="263" cy="204" r="2.5" fill="#AB47BC" />
          <circle cx="260" cy="201" r="2.8" fill="#8E24AA" />
          <circle cx="260" cy="203" r="1" fill="#F3E5F5" />

          {/* Yellow buttercup */}
          <line x1="340" y1="212" x2="340" y2="205" stroke="#2E7D32" strokeWidth="1" strokeLinecap="round" />
          <circle cx="340" cy="203" r="3.5" fill="#FFEB3B" />
          <circle cx="340" cy="203" r="1.5" fill="#FFF9C4" />

          {/* Red poppy */}
          <line x1="480" y1="210" x2="480" y2="202" stroke="#388E3C" strokeWidth="1.5" strokeLinecap="round" />
          <ellipse cx="477" cy="200" rx="3.5" ry="3" fill="#F44336" transform="rotate(-8 477 200)" />
          <ellipse cx="483" cy="200" rx="3.5" ry="3" fill="#EF5350" transform="rotate(8 483 200)" />
          <circle cx="480" cy="200" r="2" fill="#1a1a1a" opacity="0.6" />
          <ellipse cx="476" cy="205" rx="2" ry="1" fill="#388E3C" transform="rotate(-20 476 205)" />
          <ellipse cx="484" cy="204" rx="1.8" ry="1" fill="#2E7D32" transform="rotate(15 484 204)" />

          {/* Blue forget-me-not cluster */}
          <line x1="560" y1="216" x2="560" y2="210" stroke="#2E7D32" strokeWidth="1" strokeLinecap="round" />
          <circle cx="557" cy="208" r="2.5" fill="#42A5F5" />
          <circle cx="563" cy="209" r="2" fill="#64B5F6" />
          <circle cx="560" cy="206" r="2.2" fill="#42A5F5" />
          <circle cx="560" cy="208" r="0.8" fill="white" />

          {/* Pink small */}
          <line x1="650" y1="214" x2="650" y2="208" stroke="#388E3C" strokeWidth="1" strokeLinecap="round" />
          <circle cx="650" cy="206" r="3" fill="#EC407A" />
          <circle cx="650" cy="206" r="1.2" fill="#FCE4EC" />

          {/* Tiny white daisies scattered */}
          <circle cx="130" cy="220" r="2" fill="white" opacity="0.6" />
          <circle cx="130" cy="220" r="0.8" fill="#FFEB3B" opacity="0.6" />
          <circle cx="430" cy="211" r="1.8" fill="white" opacity="0.5" />
          <circle cx="430" cy="211" r="0.7" fill="#FFEB3B" opacity="0.5" />
          <circle cx="710" cy="216" r="2" fill="white" opacity="0.5" />
          <circle cx="710" cy="216" r="0.8" fill="#FFEB3B" opacity="0.5" />
        </g>
      )}

      {/* Ground cracks */}
      {crackOpacity > 0.02 && (
        <g opacity={crackOpacity} stroke={crackColor} fill="none">
          <path d="M200,230 L212,242 L207,254" strokeWidth="1.5" />
          <path d="M340,225 L350,235 L346,244 L352,250" strokeWidth="1.2" />
          <path d="M480,228 L488,238 L485,246" strokeWidth="1.5" />
          <path d="M600,232 L607,240 L604,248" strokeWidth="1.2" />
          <path d="M130,248 L138,255 L135,262" strokeWidth="1" />
          <path d="M420,240 L426,248" strokeWidth="1" />
          <path d="M700,235 L708,244 L705,252 L711,258" strokeWidth="1.3" />
        </g>
      )}

      {/* Embers */}
      {emberOpacity > 0.02 && (
        <g>
          <circle cx="250" cy="235" r="2.5" fill={emberColor} opacity={emberOpacity} />
          <circle cx="450" cy="230" r="2" fill={emberColor} opacity={emberOpacity * 0.85} />
          <circle cx="550" cy="240" r="2.5" fill={emberColor} opacity={emberOpacity * 0.9} />
          <circle cx="650" cy="238" r="2" fill={emberColor} opacity={emberOpacity * 0.75} />
        </g>
      )}

      {/* Hope sprout */}
      {burned && (
        <g>
          <line x1="400" y1="255" x2="400" y2="243" stroke="#66BB6A" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          <ellipse cx="396" cy="241" rx="3.5" ry="2.5" fill="#66BB6A" opacity="0.8" />
          <ellipse cx="404" cy="240" rx="3.5" ry="2.5" fill="#81C784" opacity="0.8" />
        </g>
      )}
    </g>
  )
}
