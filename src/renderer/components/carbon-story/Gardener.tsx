// src/renderer/components/carbon-story/Gardener.tsx
import './animations.css'
import type { Phase } from './utils'
import { getPhase } from './utils'

interface Props {
  percentage: number
}

const PHASE_ANIMATION: Record<Phase, string> = {
  planting:  'gardenerPlanting 1.2s ease-in-out infinite',
  watering:  'gardenerWatering 1.4s ease-in-out infinite',
  sweating:  'gardenerSweating 0.8s ease-in-out infinite',
  panicking: 'gardenerPanicking 0.6s ease-in-out infinite',
  burning:   'gardenerBurning 0.5s ease-in-out infinite',
  dead:      'none',
}

const PHASE_X: Record<Phase, number> = {
  planting:  250,
  watering:  350,
  sweating:  400,
  panicking: 400,
  burning:   450,
  dead:      420,
}

// ─── Gradient defs ───────────────────────────────────────────────────────────

function GardenerDefs({ soot }: { soot: boolean }) {
  return (
    <defs>
      {/* Skin */}
      <radialGradient id="gardSkin" cx="40%" cy="35%" r="60%">
        <stop offset="0%" stopColor="#FFE0B2" />
        <stop offset="100%" stopColor="#FFD9B3" />
      </radialGradient>
      {/* Soot-darkened skin overlay */}
      {soot && (
        <radialGradient id="gardSkinSoot" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#C49070" />
          <stop offset="100%" stopColor="#B07850" />
        </radialGradient>
      )}
      {/* Body / torso */}
      <linearGradient id="gardBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#66BB6A" />
        <stop offset="100%" stopColor="#43A047" />
      </linearGradient>
      {/* Apron */}
      <linearGradient id="gardApron" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#A5D6A7" />
        <stop offset="100%" stopColor="#81C784" />
      </linearGradient>
      {/* Hat */}
      <linearGradient id="gardHat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#D4B87A" />
        <stop offset="100%" stopColor="#B8975A" />
      </linearGradient>
      {/* Boot */}
      <linearGradient id="gardBoot" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6D4C41" />
        <stop offset="100%" stopColor="#4E342E" />
      </linearGradient>
      {/* Pants / legs */}
      <linearGradient id="gardLegs" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#388E3C" />
        <stop offset="100%" stopColor="#2E7D32" />
      </linearGradient>
    </defs>
  )
}

// ─── Face helpers ────────────────────────────────────────────────────────────

function Eyes({ phase }: { phase: Phase }) {
  const skinFill = (phase === 'burning' || phase === 'dead') ? 'url(#gardSkinSoot)' : 'url(#gardSkin)'

  if (phase === 'dead') {
    return (
      <g>
        <line x1="-9" y1="-3" x2="-5" y2="1" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="-9" y1="1" x2="-5" y2="-3" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="5" y1="-3" x2="9" y2="1" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="5" y1="1" x2="9" y2="-3" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    )
  }

  if (phase === 'panicking' || phase === 'burning') {
    // Wide panicked eyes with iris + pupil + highlight
    return (
      <g>
        {/* Left eye */}
        <ellipse cx="-7" cy="-1" rx="4" ry="5" fill="white" />
        <circle cx="-7" cy="-1" r="3" fill="#6B9AC4" />
        <circle cx="-7" cy="-1" r="2" fill="#222" />
        <circle cx="-5.5" cy="-2.5" r="0.9" fill="white" />
        <path d="M-11,-1 Q-9,3 -3,-1" fill="none" stroke={skinFill} strokeWidth="0.8" opacity="0.3" />
        {/* Right eye */}
        <ellipse cx="7" cy="-1" rx="4" ry="5" fill="white" />
        <circle cx="7" cy="-1" r="3" fill="#6B9AC4" />
        <circle cx="7" cy="-1" r="2" fill="#222" />
        <circle cx="8.5" cy="-2.5" r="0.9" fill="white" />
        <path d="M3,-1 Q5,3 11,-1" fill="none" stroke={skinFill} strokeWidth="0.8" opacity="0.3" />
      </g>
    )
  }

  if (phase === 'sweating') {
    // Worried narrowed eyes with iris + pupil + highlight
    return (
      <g>
        {/* Left eye */}
        <ellipse cx="-7" cy="-1" rx="3.5" ry="3" fill="white" />
        <circle cx="-7" cy="-1" r="2.2" fill="#6B9AC4" />
        <circle cx="-7" cy="-1" r="1.4" fill="#222" />
        <circle cx="-5.8" cy="-2" r="0.8" fill="white" />
        <path d="M-10.5,-1 Q-8.5,1.5 -3.5,-1" fill="none" stroke={skinFill} strokeWidth="0.7" opacity="0.3" />
        {/* Right eye */}
        <ellipse cx="7" cy="-1" rx="3.5" ry="3" fill="white" />
        <circle cx="7" cy="-1" r="2.2" fill="#6B9AC4" />
        <circle cx="7" cy="-1" r="1.4" fill="#222" />
        <circle cx="8.2" cy="-2" r="0.8" fill="white" />
        <path d="M3.5,-1 Q5.5,1.5 10.5,-1" fill="none" stroke={skinFill} strokeWidth="0.7" opacity="0.3" />
      </g>
    )
  }

  // Happy eyes (planting / watering)
  return (
    <g>
      {/* Left eye */}
      <ellipse cx="-7" cy="-1" rx="3.5" ry="4" fill="white" />
      <circle cx="-7" cy="-1" r="2.5" fill="#6B9AC4" />
      <circle cx="-7" cy="-1" r="1.6" fill="#222" />
      <circle cx="-5.6" cy="-2.4" r="0.9" fill="white" />
      <path d="M-10.5,-1 Q-8.5,2 -3.5,-1" fill="none" stroke={skinFill} strokeWidth="0.7" opacity="0.3" />
      {/* Right eye */}
      <ellipse cx="7" cy="-1" rx="3.5" ry="4" fill="white" />
      <circle cx="7" cy="-1" r="2.5" fill="#6B9AC4" />
      <circle cx="7" cy="-1" r="1.6" fill="#222" />
      <circle cx="8.4" cy="-2.4" r="0.9" fill="white" />
      <path d="M3.5,-1 Q5.5,2 10.5,-1" fill="none" stroke={skinFill} strokeWidth="0.7" opacity="0.3" />
    </g>
  )
}

function Eyebrows({ phase }: { phase: Phase }) {
  if (phase === 'sweating' || phase === 'panicking' || phase === 'burning') {
    return (
      <g stroke="#5D3A1A" strokeWidth="1.8" strokeLinecap="round" fill="none">
        <path d="M-11,-8 Q-7,-11 -4,-8" />
        <path d="M4,-8 Q7,-11 11,-8" />
      </g>
    )
  }
  if (phase === 'dead') {
    return (
      <g stroke="#5D3A1A" strokeWidth="1.8" strokeLinecap="round" fill="none">
        <path d="M-11,-7 L-4,-7" />
        <path d="M4,-7 L11,-7" />
      </g>
    )
  }
  // Raised happy brows
  return (
    <g stroke="#5D3A1A" strokeWidth="1.8" strokeLinecap="round" fill="none">
      <path d="M-11,-9 Q-7,-12 -4,-9" />
      <path d="M4,-9 Q7,-12 11,-9" />
    </g>
  )
}

function Mouth({ phase }: { phase: Phase }) {
  switch (phase) {
    case 'planting':
    case 'watering':
      // Big smile with lip fill
      return (
        <g>
          <path d="M-7,5 Q0,12 7,5" fill="#C97A50" fillOpacity="0.25" stroke="none" />
          <path d="M-7,5 Q0,11 7,5" fill="none" stroke="#A0522D" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      )
    case 'sweating':
      return (
        <g>
          <path d="M-6,6 Q0,8 6,6" fill="#C97A50" fillOpacity="0.15" stroke="none" />
          <path d="M-6,6 Q0,7 6,6" fill="none" stroke="#A0522D" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      )
    case 'panicking':
      return <ellipse cx="0" cy="7" rx="5" ry="4" fill="#A0522D" />
    case 'burning':
      return (
        <g>
          <path d="M-7,6 Q0,4 7,6" fill="#C97A50" fillOpacity="0.2" stroke="none" />
          <path d="M-7,6 Q0,4 7,6" fill="none" stroke="#A0522D" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="-5" y1="7" x2="-3" y2="7" stroke="#FFD9B3" strokeWidth="1" />
          <line x1="-1" y1="7" x2="1" y2="7" stroke="#FFD9B3" strokeWidth="1" />
          <line x1="3" y1="7" x2="5" y2="7" stroke="#FFD9B3" strokeWidth="1" />
        </g>
      )
    case 'dead':
      return (
        <g stroke="#A0522D" strokeWidth="1.5" strokeLinecap="round">
          <line x1="-5" y1="4" x2="-2" y2="8" />
          <line x1="-5" y1="8" x2="-2" y2="4" />
          <line x1="2" y1="4" x2="5" y2="8" />
          <line x1="2" y1="8" x2="5" y2="4" />
        </g>
      )
  }
}

// ─── Accessories ─────────────────────────────────────────────────────────────

function Shovel() {
  return (
    <g transform="translate(18, -10)">
      {/* Handle */}
      <line x1="0" y1="0" x2="-6" y2="26" stroke="#8D6E63" strokeWidth="2.5" strokeLinecap="round" />
      {/* Blade */}
      <rect x="-9" y="26" width="6" height="10" rx="2" fill="#90A4AE" />
      {/* Blade shine */}
      <path d="M-8,27 L-8,34" stroke="white" strokeWidth="0.8" strokeOpacity="0.4" strokeLinecap="round" />
    </g>
  )
}

function WateringCan() {
  return (
    <g transform="translate(20, -5)">
      {/* Body */}
      <rect x="-12" y="-8" width="20" height="14" rx="4" fill="#42A5F5" />
      {/* Body shine */}
      <path d="M-10,-6 Q-7,-8 -4,-7" stroke="white" strokeWidth="1.2" strokeOpacity="0.4" strokeLinecap="round" fill="none" />
      {/* Spout */}
      <path d="M8,-2 L18,2 L16,6 L6,2 Z" fill="#1E88E5" />
      {/* Handle */}
      <path d="M-12,-4 Q-18,-10 -12,-14 Q-6,-18 -6,-12" fill="none" stroke="#1E88E5" strokeWidth="2.5" strokeLinecap="round" />
      {/* Water drops */}
      <ellipse cx="19" cy="8" rx="1.5" ry="2" fill="#90CAF9" opacity="0.8" />
      <ellipse cx="22" cy="11" rx="1.5" ry="2" fill="#90CAF9" opacity="0.6" />
    </g>
  )
}

function Bucket() {
  return (
    <g transform="translate(20, 0)">
      {/* Bucket body */}
      <path d="M-8,-10 L-10,10 L10,10 L8,-10 Z" fill="#FFA726" />
      <rect x="-8" y="-10" width="16" height="3" rx="1" fill="#FF8F00" />
      {/* Bucket shine */}
      <path d="M-6,-8 L-7,6" stroke="white" strokeWidth="1" strokeOpacity="0.35" strokeLinecap="round" />
      {/* Handle */}
      <path d="M-8,-10 Q0,-18 8,-10" fill="none" stroke="#FF8F00" strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}

// ─── Sweat drops ─────────────────────────────────────────────────────────────

function SweatDrops({ phase }: { phase: Phase }) {
  if (phase !== 'sweating' && phase !== 'panicking') return null
  return (
    <g fill="#90CAF9">
      <ellipse cx="14" cy="-28" rx="2" ry="3" style={{ animation: 'sweatDrop 1.2s ease-in-out infinite' }} />
      <ellipse cx="18" cy="-22" rx="1.5" ry="2.5" style={{ animation: 'sweatDrop 1.2s ease-in-out 0.3s infinite' }} />
      <ellipse cx="12" cy="-20" rx="1.5" ry="2" style={{ animation: 'sweatDrop 1.2s ease-in-out 0.6s infinite' }} />
    </g>
  )
}

// ─── Soot overlay ────────────────────────────────────────────────────────────

function SootOverlay({ phase }: { phase: Phase }) {
  if (phase !== 'burning' && phase !== 'dead') return null
  return (
    <>
      <rect x="-12" y="-50" width="24" height="55" rx="8" fill="#1a1a1a" opacity="0.28" />
      <circle cx="-6" cy="-35" r="2" fill="#1a1a1a" opacity="0.22" />
      <circle cx="6" cy="-30" r="1.5" fill="#1a1a1a" opacity="0.18" />
    </>
  )
}

// ─── Hope sprout (dead phase) ─────────────────────────────────────────────────

function HopeSprout({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x + 28} y1={y - 2} x2={x + 28} y2={y - 14} stroke="#66BB6A" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      <ellipse cx={x + 24} cy={y - 16} rx="4" ry="3" fill="#66BB6A" opacity="0.85" />
      <ellipse cx={x + 32} cy={y - 18} rx="4" ry="3" fill="#81C784" opacity="0.85" />
    </g>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Gardener({ percentage }: Props) {
  const phase = getPhase(percentage)
  const x = PHASE_X[phase]
  const y = phase === 'dead' ? 215 : 208

  const transform = `translate(${x}, ${y})`
  const animStyle: React.CSSProperties = { animation: PHASE_ANIMATION[phase] }

  const innerTransform = phase === 'dead' ? 'rotate(80) translateX(5)' : undefined

  const soot = phase === 'burning' || phase === 'dead'
  const skinFill = soot ? 'url(#gardSkinSoot)' : 'url(#gardSkin)'

  const isHappy = phase === 'planting' || phase === 'watering'

  return (
    <>
      {/* Gradient defs — render once outside the animated group */}
      <GardenerDefs soot={soot} />

      <g style={animStyle}>
        <g transform={transform}>
          {/* Ground shadow */}
          {phase !== 'dead' && (
            <ellipse cx={0} cy={45} rx={16} ry={3.5} fill="black" opacity={0.1} />
          )}
          {phase === 'dead' && (
            <ellipse cx={10} cy={48} rx={22} ry={3.5} fill="black" opacity={0.1} />
          )}

          <g transform={innerTransform}>
            {/* ── Hat ─────────────────────────────────────── */}
            {/* Hat brim */}
            <ellipse cx="0" cy="-54" rx="18" ry="4" fill="url(#gardHat)" />
            {/* Hat crown */}
            <path d="M-10,-54 Q-11,-72 0,-74 Q11,-72 10,-54 Z" fill="url(#gardHat)" />
            {/* Hat band */}
            <rect x="-10" y="-59" width="20" height="4" rx="1" fill="#A0845C" />
            {/* Hat band ellipse (strap hint) */}
            <ellipse cx="0" cy="-57" rx="10" ry="2" fill="none" stroke="#8B6914" strokeWidth="0.8" opacity="0.5" />
            {/* Hat highlight */}
            <path d="M-7,-72 Q-3,-74 2,-71" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.08" />
            {/* Small leaf decoration on hat band */}
            <ellipse cx="9" cy="-57" rx="3" ry="2" fill="#66BB6A" transform="rotate(-30, 9, -57)" opacity="0.9" />
            <ellipse cx="11" cy="-59" rx="2.5" ry="1.5" fill="#81C784" transform="rotate(-45, 11, -59)" opacity="0.85" />

            {/* ── Head ────────────────────────────────────── */}
            <rect x="-12" y="-50" width="24" height="22" rx="12" fill={skinFill} />

            {/* ── Face group ──────────────────────────────── */}
            <g transform="translate(0, -39)">
              <Eyebrows phase={phase} />
              <Eyes phase={phase} />
              {/* Nose */}
              <ellipse cx="0" cy="3" rx="2" ry="1.5" fill={soot ? '#C99070' : '#FFBB8A'} />
              {/* Nose shadow */}
              <ellipse cx="0.5" cy="4.2" rx="1.5" ry="0.8" fill={soot ? '#A06040' : '#F0A060'} opacity="0.3" />
              <Mouth phase={phase} />
              {/* Blush (happy phases only) */}
              {isHappy && (
                <g opacity="0.25">
                  <ellipse cx="-11" cy="3" rx="5" ry="3.5" fill="#FFAB91" />
                  <ellipse cx="11" cy="3" rx="5" ry="3.5" fill="#FFAB91" />
                </g>
              )}
              {/* Freckles (happy phases only) */}
              {isHappy && (
                <g fill="#C97A50" opacity="0.28">
                  {/* Left cheek freckles */}
                  <circle cx="-10" cy="2" r="0.55" />
                  <circle cx="-8.5" cy="4" r="0.5" />
                  <circle cx="-11.5" cy="4.5" r="0.5" />
                  {/* Right cheek freckles */}
                  <circle cx="10" cy="2" r="0.55" />
                  <circle cx="8.5" cy="4" r="0.5" />
                  <circle cx="11.5" cy="4.5" r="0.5" />
                </g>
              )}
            </g>

            {/* ── Soot overlay (burning / dead) ───────────── */}
            <SootOverlay phase={phase} />

            {/* ── Sweat drops ─────────────────────────────── */}
            <SweatDrops phase={phase} />

            {/* ── Body (torso) ────────────────────────────── */}
            <path d="M-11,-28 Q-13,-10 -11,2 Q0,5 11,2 Q13,-10 11,-28 Z" fill="url(#gardBody)" />

            {/* ── Apron ───────────────────────────────────── */}
            <path d="M-8,-24 Q-9,-8 -7,2 Q0,4 7,2 Q9,-8 8,-24 Z" fill="url(#gardApron)" opacity="0.9" />
            {/* Apron strap hints */}
            <line x1="-8" y1="-24" x2="-6" y2="-28" stroke="#81C784" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
            <line x1="8" y1="-24" x2="6" y2="-28" stroke="#81C784" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
            {/* Apron pocket */}
            <rect x="-4" y="-14" width="8" height="7" rx="2" fill="#C8E6C9" opacity="0.85" />
            {/* Pocket stitch (dashed) */}
            <rect x="-3.2" y="-13.2" width="6.4" height="5.4" rx="1.5" fill="none" stroke="#66BB6A" strokeWidth="0.7" strokeDasharray="1.5,1" opacity="0.6" />

            {/* ── Arms ────────────────────────────────────── */}
            {/* Left arm */}
            <path d="M-11,-22 Q-20,-18 -22,-8" fill="none" stroke={skinFill} strokeWidth="5" strokeLinecap="round" />
            {/* Right arm */}
            <path d="M11,-22 Q20,-18 22,-8" fill="none" stroke={skinFill} strokeWidth="5" strokeLinecap="round" />

            {/* ── Hands ───────────────────────────────────── */}
            <circle cx="-22" cy="-8" r="4" fill={skinFill} />
            {/* Left thumb hint */}
            <circle cx="-25" cy="-10" r="2" fill={skinFill} />
            <circle cx="22" cy="-8" r="4" fill={skinFill} />
            {/* Right thumb hint */}
            <circle cx="25" cy="-10" r="2" fill={skinFill} />

            {/* ── Legs ────────────────────────────────────── */}
            <rect x="-9" y="2" width="7" height="16" rx="3" fill="url(#gardLegs)" />
            <rect x="2" y="2" width="7" height="16" rx="3" fill="url(#gardLegs)" />

            {/* ── Boots ───────────────────────────────────── */}
            <ellipse cx="-5.5" cy="18" rx="7" ry="4" fill="url(#gardBoot)" />
            {/* Boot sole (darker) */}
            <ellipse cx="-5.5" cy="20" rx="7" ry="2" fill="#3E2723" opacity="0.6" />
            <ellipse cx="5.5" cy="18" rx="7" ry="4" fill="url(#gardBoot)" />
            {/* Boot sole (darker) */}
            <ellipse cx="5.5" cy="20" rx="7" ry="2" fill="#3E2723" opacity="0.6" />

            {/* ── Accessory ───────────────────────────────── */}
            {phase === 'planting' && <Shovel />}
            {(phase === 'watering' || phase === 'sweating') && <WateringCan />}
            {phase === 'panicking' && <Bucket />}
          </g>
        </g>
      </g>

      {/* ── Hope sprout (dead only, outside animated group) ── */}
      {phase === 'dead' && <HopeSprout x={x} y={y} />}
    </>
  )
}
