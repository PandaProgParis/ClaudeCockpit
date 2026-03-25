import { useState, useEffect } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useLanguage } from '../hooks/useLanguage'

interface Props {
  path: string
}

const contentBoxStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  background: 'var(--bg-card-hover)',
  border: '1px solid var(--border)',
  userSelect: 'text',
}

export function SkillViewer({ path }: Props) {
  const { t } = useLanguage()
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'rendered' | 'source'>('rendered')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/file-content?path=${encodeURIComponent(path)}`)
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 413) { setError(t.skillViewerTooLarge); return }
        if (!res.ok) { setError(t.skillViewerError); return }
        const data = await res.json()
        setContent(data.content)
      })
      .catch(() => { if (!cancelled) setError(t.skillViewerError) })
    return () => { cancelled = true }
  }, [path, t])

  if (error) {
    return (
      <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--red)', fontStyle: 'italic' }}>
        {error}
      </div>
    )
  }

  if (content === null) {
    return (
      <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
        {t.skillViewerLoading}
      </div>
    )
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 10,
    padding: '3px 10px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    background: active ? 'var(--accent)' : 'var(--bg-card-hover)',
    color: active ? '#fff' : 'var(--text-muted)',
  })

  return (
    <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10 }}>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'monospace', marginBottom: 6, wordBreak: 'break-all' }}>
        {path}
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, alignItems: 'center' }}>
        <button style={toggleStyle(mode === 'rendered')} onClick={() => setMode('rendered')}>
          {t.skillViewerRendered}
        </button>
        <button style={toggleStyle(mode === 'source')} onClick={() => setMode('source')}>
          {t.skillViewerSource}
        </button>
        <button
          onClick={handleCopy}
          style={{
            marginLeft: 'auto',
            fontSize: 10,
            padding: '3px 10px',
            borderRadius: 10,
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            background: copied ? 'var(--green-bg)' : 'var(--bg-card-hover)',
            color: copied ? 'var(--green)' : 'var(--text-muted)',
          }}
        >
          {copied ? '✓' : t.skillViewerCopy}
        </button>
      </div>

      {mode === 'source' ? (
        <pre style={{
          ...contentBoxStyle,
          fontSize: 11,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: 'var(--text)',
          margin: 0,
        }}>
          {content}
        </pre>
      ) : (
        <div className="skill-markdown" style={{
          ...contentBoxStyle,
          fontSize: 13,
          lineHeight: 1.6,
          color: 'var(--text)',
        }}>
          <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
        </div>
      )}
    </div>
  )
}
