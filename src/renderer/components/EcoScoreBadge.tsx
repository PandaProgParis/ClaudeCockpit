import type { EcoScore } from '../lib/carbon'

interface Props {
  score: EcoScore
}

export function EcoScoreBadge({ score }: Props) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: 16,
            borderRadius: 2,
            background: i <= score.level ? score.color : 'var(--border)',
            transition: 'background 0.2s',
          }}
        />
      ))}
      <span style={{ color: score.color, fontSize: 11, marginLeft: 4, fontWeight: 600 }}>
        {score.letter}
      </span>
    </div>
  )
}
