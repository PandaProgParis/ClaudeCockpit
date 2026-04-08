import { computeTodayCO2, getEarthStep, DEFAULT_EQUIVALENCE_FACTORS } from '../lib/carbon'
import type { CarbonFactors } from '../lib/carbon'
import type { SessionEntry } from '../lib/types'
import { useLanguage } from '../hooks/useLanguage'
import { CarbonStoryScene } from './CarbonStoryScene'

interface Props {
  sessions: SessionEntry[]
  factors: CarbonFactors
  quotaDaily: number
  onNavigateToCarbon: () => void
}

function formatCompact(n: number, decimals2: number, decimals1: number): string {
  if (n < 0.1) return n.toFixed(decimals2 + 1)
  if (n < 1) return n.toFixed(decimals2)
  return n.toFixed(decimals1)
}

export function CarbonDashboardWidget({ sessions, factors, quotaDaily, onNavigateToCarbon }: Props) {
  const { t } = useLanguage()
  const todayCO2 = computeTodayCO2(sessions, factors.emission)
  const pct = quotaDaily > 0 ? (todayCO2 / quotaDaily) * 100 : 0
  const step = getEarthStep(pct)
  const exceeded = pct > 100

  const barColor = pct < 30 ? '#66BB6A' : pct < 60 ? '#FFB74D' : '#ef5350'
  const phoneCharges = todayCO2 / DEFAULT_EQUIVALENCE_FACTORS.phoneGramPerCharge
  const carKm = todayCO2 / DEFAULT_EQUIVALENCE_FACTORS.carGramPerKm

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }} onClick={onNavigateToCarbon}>

      {/* Scene + overlay */}
      <div
        style={{
          flex: 8,
          position: 'relative',
          border: `1px solid ${exceeded ? 'rgba(239,83,80,0.4)' : 'var(--border)'}`,
          borderRadius: 10,
          height: 200,
          maxWidth: 1080,
          overflow: 'hidden',
          cursor: 'pointer',
          background: '#1a1a1a',
        }}
      >
        <CarbonStoryScene percentage={pct} />

        {/* Overlay bottom-left */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 10,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)',
            borderRadius: 6,
            padding: '6px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>
              {todayCO2.toFixed(1)}g
            </span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>
              / {quotaDaily}g
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: barColor, fontSize: 11, fontWeight: 600 }}>
              {step.label} {step.emoji}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
              {Math.round(pct)}% {t.carbonUsed}
            </span>
          </div>
        </div>
      </div>

      {/* Equivalences panel — 20% */}
      {/* Equivalences panel — 20% */}
      <div
        style={{
          flex: 2,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          cursor: 'pointer',
          minWidth: 100,
          overflow: 'hidden',
        }}
      >
        <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'center' }}>aujourd'hui</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
              🔋 {formatCompact(phoneCharges, 2, 1)}x
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>recharges</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
              {Math.round(phoneCharges * 15)}
            </span>
            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Wh</span>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* Road animation */}
        <div style={{ position: 'relative', height: 46, marginTop: 20, marginLeft: -14, marginRight: -14, overflow: 'hidden' }}>
          {/* Trees — two identical sets for seamless loop */}
          <div className="trees-scroll" style={{ position: 'absolute', top: 0, left: 0, width: '200%', height: 'calc(100% - 23px)', display: 'flex', alignItems: 'flex-end', fontSize: 18 }}>
            <div style={{ width: '50%', display: 'flex', gap: 60 }}>
              <span style={{ marginLeft: 20 }}>🌲</span>
              <span style={{ marginLeft: 45 }}>🌳</span>
              <span style={{ marginLeft: 70 }}>🌲</span>
            </div>
            <div style={{ width: '50%', display: 'flex', gap: 60 }}>
              <span style={{ marginLeft: 20 }}>🌲</span>
              <span style={{ marginLeft: 45 }}>🌳</span>
              <span style={{ marginLeft: 70 }}>🌲</span>
            </div>
          </div>
          {/* Road */}
          <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: 8, background: '#444', transform: 'translateY(-50%)' }}>
            <div className="road-lines" style={{ position: 'absolute', top: '50%', left: 0, width: '200%', height: 1, display: 'flex', gap: 8, transform: 'translateY(-50%)' }}>
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} style={{ width: 8, height: 1, background: '#888', flexShrink: 0 }} />
              ))}
            </div>
          </div>
          {/* Car */}
          <div style={{ position: 'absolute', top: 'calc(50% - 9px)', left: '30%', transform: 'translate(-50%, -60%)', fontSize: 26, zIndex: 1 }}>
            <span className="car-bounce">🚗</span>
          </div>
        </div>

        {/* Distance counter */}
        <div style={{ textAlign: 'right', marginTop: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{Math.round(carKm * 1000)}m</span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 4 }}>en voiture</span>
        </div>
      </div>

      <style>{`
        @keyframes carBounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-1px) rotate(-1deg); }
          50% { transform: translateY(0) rotate(0deg); }
          75% { transform: translateY(1px) rotate(1deg); }
        }
        .car-bounce {
          display: inline-block;
          animation: carBounce 0.8s ease-in-out infinite;
        }
        @keyframes roadScroll {
          0% { transform: translateX(0) translateY(-50%); }
          100% { transform: translateX(-50%) translateY(-50%); }
        }
        .road-lines {
          animation: roadScroll 12s linear infinite;
        }
        .trees-scroll {
          animation: treesScroll 20s linear infinite;
        }
        @keyframes treesScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

    </div>
  )
}
