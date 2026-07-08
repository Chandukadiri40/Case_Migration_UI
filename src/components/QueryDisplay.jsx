import { useState } from 'react'

const KW = ['SELECT','FROM','WHERE','AND','OR','ORDER','BY','DESC','ASC','BETWEEN','IN',
  'LIKE','NOT','NULL','LIMIT','OFFSET','GROUP','HAVING','JOIN','LEFT','INNER','ON',
  'AS','DISTINCT','ILIKE']

function highlight(sql) {
  if (!sql) return ''
  let out = sql.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  KW.forEach(kw => {
    out = out.replace(new RegExp('\\b' + kw + '\\b', 'g'), '<span class="sql-kw">' + kw + '</span>')
  })
  out = out.replace(/'([^']*)'/g, "<span class=\"sql-str\">'$1'</span>")
  out = out.replace(/--[^\n]*/g, m => '<span class="sql-comment">' + m + '</span>')
  return out
}

export default function QueryDisplay({ query }) {
  const [copied, setCopied] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  if (!query) return null

  function copy() {
    navigator.clipboard.writeText(query).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="card query-display-card">
      <div className="card-header">
        <span className="card-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
          </svg>
          Generated Query
          <span className="tag tag-blue" style={{ fontSize: 11 }}>read-only</span>
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={copy}>
            {copied ? (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>Copied</>
            ) : (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</>
            )}
          </button>
          <button className="icon-btn" onClick={() => setCollapsed(c => !c)} aria-label="Toggle">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {collapsed
                ? <polyline points="6 9 12 15 18 9"/>
                : <polyline points="18 15 12 9 6 15"/>
              }
            </svg>
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="card-body" style={{ padding: 0 }}>
          <pre
            className="sql-block"
            dangerouslySetInnerHTML={{ __html: highlight(query) }}
            aria-label="Generated SQL query"
          />
          <p className="query-audit-note">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            This query is for audit and debugging reference. Actual execution is handled securely by the backend.
          </p>
        </div>
      )}
    </div>
  )
}
