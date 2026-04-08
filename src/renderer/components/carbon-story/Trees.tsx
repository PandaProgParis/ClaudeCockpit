// src/renderer/components/carbon-story/Trees.tsx
import { lerpColor } from './utils'

interface Props {
  percentage: number
}

interface TreeConfig {
  x: number
  y: number        // base position (on the ground ~208)
  appearAt: number  // % when tree starts growing
  burnAt: number    // % when tree catches fire
  scale: number
}

const TREES: TreeConfig[] = [
  { x: 140, y: 207, appearAt: 0, burnAt: 58, scale: 0.85 },
  { x: 220, y: 205, appearAt: 2, burnAt: 63, scale: 1 },
  { x: 310, y: 203, appearAt: 4, burnAt: 68, scale: 1.15 },
  { x: 390, y: 204, appearAt: 7, burnAt: 72, scale: 0.95 },
  { x: 470, y: 206, appearAt: 10, burnAt: 77, scale: 1.1 },
  { x: 550, y: 205, appearAt: 12, burnAt: 82, scale: 0.9 },
  { x: 620, y: 207, appearAt: 14, burnAt: 87, scale: 1.05 },
  { x: 700, y: 208, appearAt: 16, burnAt: 92, scale: 0.8 },
]

type TreeState = 'hidden' | 'sprout' | 'young' | 'adult' | 'stressed' | 'burning' | 'charred'

function getTreeState(pct: number, tree: TreeConfig): TreeState {
  if (pct < tree.appearAt) return 'hidden'
  const growProgress = pct - tree.appearAt
  if (growProgress < 5) return 'sprout'
  if (growProgress < 12) return 'young'
  if (pct < tree.burnAt - 15) return 'adult'
  if (pct < tree.burnAt) return 'stressed'
  if (pct < tree.burnAt + 8) return 'burning'
  return 'charred'
}

function SingleTree({ x, y, state, scale, pct, i }: {
  x: number
  y: number
  state: TreeState
  scale: number
  pct: number
  i: number
}) {
  if (state === 'hidden') return null

  const gid = `t${i}` // unique gradient ID prefix per tree

  // ── SPROUT ──────────────────────────────────────────────────────────────────
  if (state === 'sprout') {
    return (
      <g transform={`translate(${x}, ${y}) scale(${scale})`}>
        {/* curved stem */}
        <path d="M 0 0 Q 1 -6 0 -13" stroke="#558B2F" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        {/* left leaf */}
        <ellipse cx={-4} cy={-10} rx={3.5} ry={1.8} fill="#66BB6A" opacity={0.95}
          transform="rotate(-40, -4, -10)" />
        {/* right leaf */}
        <ellipse cx={4} cy={-9} rx={3.5} ry={1.8} fill="#81C784" opacity={0.9}
          transform="rotate(40, 4, -9)" />
        {/* stem lines to leaves */}
        <line x1="0" y1="-9" x2="-3" y2="-10.5" stroke="#558B2F" strokeWidth="0.8" opacity={0.7} />
        <line x1="0" y1="-8" x2="3" y2="-9.5" stroke="#558B2F" strokeWidth="0.8" opacity={0.7} />
      </g>
    )
  }

  // ── YOUNG ────────────────────────────────────────────────────────────────────
  if (state === 'young') {
    return (
      <g transform={`translate(${x}, ${y}) scale(${scale})`}>
        <defs>
          <radialGradient id={`${gid}-cy`} cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#A5D6A7" />
            <stop offset="55%" stopColor="#4CAF50" />
            <stop offset="100%" stopColor="#2E7D32" />
          </radialGradient>
        </defs>
        {/* shadow at base */}
        <ellipse cx={0} cy={0} rx={5} ry={1.2} fill="#1a1a1a" opacity={0.12} />
        {/* curved trunk */}
        <path d="M 0 0 Q 2 -10 1 -18 Q 0 -22 0 -28" stroke="#6D4C41" strokeWidth="3.2"
          fill="none" strokeLinecap="round" />
        {/* one small branch */}
        <path d="M 1 -18 Q 6 -20 9 -17" stroke="#6D4C41" strokeWidth="1.5"
          fill="none" strokeLinecap="round" />
        {/* canopy — 2 overlapping circles */}
        <circle cx={-2} cy={-32} r={10} fill={`url(#${gid}-cy)`} opacity={0.95} />
        <circle cx={5} cy={-29} r={9} fill={`url(#${gid}-cy)`} opacity={0.85} />
      </g>
    )
  }

  // ── ADULT ─────────────────────────────────────────────────────────────────────
  if (state === 'adult') {
    return (
      <g transform={`translate(${x}, ${y}) scale(${scale})`}>
        <defs>
          <radialGradient id={`${gid}-ca`} cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#81C784" />
            <stop offset="50%" stopColor="#4CAF50" />
            <stop offset="100%" stopColor="#2E7D32" />
          </radialGradient>
          <linearGradient id={`${gid}-tr`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5D4037" />
            <stop offset="40%" stopColor="#795548" />
            <stop offset="100%" stopColor="#4E342E" />
          </linearGradient>
        </defs>
        {/* ground shadow */}
        <ellipse cx={0} cy={0} rx={13} ry={2.5} fill="#1a1a1a" opacity={0.13} />
        {/* curved trunk */}
        <path d="M -1.5 0 Q 3 -14 1 -30 Q -1 -42 0 -50"
          stroke={`url(#${gid}-tr)`} strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* branch left */}
        <path d="M 0 -32 Q -8 -36 -14 -30"
          stroke={`url(#${gid}-tr)`} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* branch right */}
        <path d="M 1 -40 Q 9 -44 13 -38"
          stroke={`url(#${gid}-tr)`} strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* branch mid-left */}
        <path d="M 0 -24 Q -5 -26 -8 -22"
          stroke={`url(#${gid}-tr)`} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {/* canopy — 5 overlapping circles */}
        <circle cx={0}   cy={-54} r={16} fill={`url(#${gid}-ca)`} opacity={0.9} />
        <circle cx={-12} cy={-46} r={13} fill={`url(#${gid}-ca)`} opacity={0.88} />
        <circle cx={13}  cy={-47} r={13} fill={`url(#${gid}-ca)`} opacity={0.88} />
        <circle cx={-6}  cy={-60} r={12} fill={`url(#${gid}-ca)`} opacity={0.85} />
        <circle cx={8}   cy={-58} r={11} fill={`url(#${gid}-ca)`} opacity={0.85} />
        {/* highlight */}
        <circle cx={-4} cy={-56} r={8} fill="white" opacity={0.06} />
      </g>
    )
  }

  // ── STRESSED ──────────────────────────────────────────────────────────────────
  if (state === 'stressed') {
    // pct within stressed window → 0–1
    const stressPct = Math.max(0, Math.min(1, (pct - (pct < 100 ? pct : 0)) / 15))
    const leaf1Color = lerpColor('#9CCC65', '#F9A825', stressPct)
    const leaf2Color = lerpColor('#8BC34A', '#E65100', stressPct)

    return (
      <g transform={`translate(${x}, ${y}) scale(${scale})`}>
        <defs>
          <radialGradient id={`${gid}-cs`} cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor={lerpColor('#C5E1A5', '#FFE082', stressPct)} />
            <stop offset="50%" stopColor={lerpColor('#8BC34A', '#FFA000', stressPct)} />
            <stop offset="100%" stopColor={lerpColor('#558B2F', '#BF360C', stressPct)} />
          </radialGradient>
          <linearGradient id={`${gid}-ts`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5D4037" />
            <stop offset="40%" stopColor="#795548" />
            <stop offset="100%" stopColor="#4E342E" />
          </linearGradient>
        </defs>
        {/* ground shadow */}
        <ellipse cx={0} cy={0} rx={11} ry={2} fill="#1a1a1a" opacity={0.10} />
        {/* curved trunk — slightly leaning */}
        <path d="M -1.5 0 Q 3 -14 1 -28 Q -1 -38 0 -46"
          stroke={`url(#${gid}-ts)`} strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* branch left */}
        <path d="M 0 -30 Q -7 -33 -12 -28"
          stroke={`url(#${gid}-ts)`} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        {/* branch right */}
        <path d="M 1 -38 Q 8 -41 12 -36"
          stroke={`url(#${gid}-ts)`} strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* canopy — 4 overlapping circles */}
        <circle cx={0}   cy={-50} r={14} fill={`url(#${gid}-cs)`} opacity={0.88} />
        <circle cx={-10} cy={-43} r={11} fill={`url(#${gid}-cs)`} opacity={0.82} />
        <circle cx={11}  cy={-44} r={11} fill={`url(#${gid}-cs)`} opacity={0.82} />
        <circle cx={2}   cy={-56} r={10} fill={`url(#${gid}-cs)`} opacity={0.78} />
        {/* falling leaves */}
        <ellipse cx={-16} cy={-32} rx={3} ry={1.4} fill={leaf1Color} opacity={0.65}
          transform="rotate(-25, -16, -32)" />
        <ellipse cx={14}  cy={-26} rx={2.8} ry={1.3} fill={leaf2Color} opacity={0.55}
          transform="rotate(30, 14, -26)" />
        <ellipse cx={-8}  cy={-20} rx={2.5} ry={1.2} fill={leaf1Color} opacity={0.5}
          transform="rotate(-15, -8, -20)" />
      </g>
    )
  }

  // ── BURNING ───────────────────────────────────────────────────────────────────
  if (state === 'burning') {
    return (
      <g transform={`translate(${x}, ${y}) scale(${scale})`}>
        <defs>
          <radialGradient id={`${gid}-fire1`} cx="50%" cy="60%" r="55%">
            <stop offset="0%" stopColor="#FFEB3B" stopOpacity="1" />
            <stop offset="40%" stopColor="#FF6F00" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#BF360C" stopOpacity="0.4" />
          </radialGradient>
          <radialGradient id={`${gid}-fire2`} cx="50%" cy="60%" r="55%">
            <stop offset="0%" stopColor="#FFF176" stopOpacity="1" />
            <stop offset="35%" stopColor="#FF8F00" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#E64A19" stopOpacity="0.3" />
          </radialGradient>
        </defs>
        {/* charring ground */}
        <ellipse cx={0} cy={0} rx={10} ry={2} fill="#1a1a1a" opacity={0.35} />
        {/* black trunk */}
        <path d="M -1.5 0 Q 2 -12 0 -24 Q -1 -34 0 -42"
          stroke="#1a1a1a" strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* outer fire blobs */}
        <ellipse cx={-6} cy={-38} rx={9} ry={14} fill={`url(#${gid}-fire1)`} opacity={0.85}>
          <animate attributeName="ry" values="14;18;13;17;14" dur="0.45s" repeatCount="indefinite" />
          <animate attributeName="cx" values="-6;-7;-5;-6" dur="0.3s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx={7} cy={-42} rx={8} ry={13} fill={`url(#${gid}-fire1)`} opacity={0.8}>
          <animate attributeName="ry" values="13;16;11;15;13" dur="0.55s" repeatCount="indefinite" />
          <animate attributeName="cx" values="7;8;6;7" dur="0.4s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx={0} cy={-46} rx={7} ry={12} fill={`url(#${gid}-fire2)`} opacity={0.75}>
          <animate attributeName="ry" values="12;15;10;14;12" dur="0.38s" repeatCount="indefinite" />
        </ellipse>
        {/* inner bright yellow core */}
        <ellipse cx={0} cy={-36} rx={5} ry={8} fill="#FFF9C4" opacity={0.7}>
          <animate attributeName="ry" values="8;11;7;10;8" dur="0.3s" repeatCount="indefinite" />
        </ellipse>
        {/* sparks */}
        <circle cx={-10} cy={-54} r={1.2} fill="#FFEE58" opacity={0.9}>
          <animate attributeName="cy" values="-54;-62;-54" dur="0.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0;0.9" dur="0.6s" repeatCount="indefinite" />
        </circle>
        <circle cx={9} cy={-58} r={1} fill="#FFCA28" opacity={0.85}>
          <animate attributeName="cy" values="-58;-68;-58" dur="0.75s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.85;0;0.85" dur="0.75s" repeatCount="indefinite" />
        </circle>
      </g>
    )
  }

  // ── CHARRED ───────────────────────────────────────────────────────────────────
  // state === 'charred'
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* ash patch at base */}
      <ellipse cx={0} cy={0} rx={8} ry={1.8} fill="#424242" opacity={0.4} />
      {/* broken trunk — ends abruptly */}
      <path d="M -1.5 0 Q 2 -10 0 -20 Q -1.5 -26 1 -30"
        stroke="#212121" strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* branch stub left */}
      <path d="M 0 -20 Q -5 -22 -7 -19"
        stroke="#212121" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* branch stub right — shorter */}
      <path d="M 0 -26 Q 4 -28 5 -25"
        stroke="#1a1a1a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* smoke wisps */}
      <ellipse cx={-2} cy={-34} rx={3} ry={2} fill="#757575" opacity={0.35}>
        <animate attributeName="cy" values="-34;-50;-34" dur="3.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.35;0.05;0.35" dur="3.2s" repeatCount="indefinite" />
        <animate attributeName="rx" values="3;6;3" dur="3.2s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx={3} cy={-38} rx={2.5} ry={1.8} fill="#616161" opacity={0.25}>
        <animate attributeName="cy" values="-38;-56;-38" dur="4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.25;0.03;0.25" dur="4s" repeatCount="indefinite" />
        <animate attributeName="rx" values="2.5;5;2.5" dur="4s" repeatCount="indefinite" />
      </ellipse>
      {/* ember at base */}
      <circle cx={1} cy={-2} r={1.5} fill="#FF6F00" opacity={0.6}>
        <animate attributeName="opacity" values="0.6;0.15;0.6" dur="2s" repeatCount="indefinite" />
      </circle>
    </g>
  )
}

export function Trees({ percentage }: Props) {
  return (
    <g>
      {TREES.map((tree, i) => (
        <SingleTree
          key={i}
          i={i}
          x={tree.x}
          y={tree.y}
          state={getTreeState(percentage, tree)}
          scale={tree.scale}
          pct={percentage}
        />
      ))}
    </g>
  )
}
