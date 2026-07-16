import { useState, useRef } from 'react'
import { apiExecuteQuery } from '../utils/api'

const KEYWORDS = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER', 'BY', 'DESC', 'ASC',
  'IN', 'LIKE', 'NOT', 'NULL', 'BETWEEN', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'JOIN',
  'LEFT', 'INNER', 'ON', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX']

// Simple keyword highlight for the read-only preview overlay
function highlight(sql) {
  if (!sql) return ''
  let out = sql
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  KEYWORDS.forEach(kw => {
    out = out.replace(new RegExp(`\\b${kw}\\b`, 'g'), `<span class="qe-kw">${kw}</span>`)
  })
  out = out.replace(/'([^']*)'/g, `<span class="qe-str">'$1'</span>`)
  out = out.replace(/--[^\n]*/g, m => `<span class="qe-comment">${m}</span>`)
  return out
}


/**
 * props:
 *   onResults(records)  — called when query executes successfully
 *   onColumns(cols)     — called with inferred column defs from result keys
 *   onClear()           — called when user clears results
 */
export default function QueryExecutor({ onResults, onColumns, onClear }) {
  const [sql, setSql] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [execInfo, setExecInfo] = useState(null)
  const [collapsed, setCollapsed] = useState(false)
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef()

  async function execute() {
    const trimmed = sql.trim()
    if (!trimmed) {
      setError('Enter a SQL query to execute.')
      return
    }

    // Basic guard — only allow SELECT statements
    if (!/^SELECT\b/i.test(trimmed)) {
      setError('Only SELECT statements are permitted.')
      return
    }

    setError('')
    setLoading(true)
    setExecInfo(null)
    const t0 = performance.now()

    try {
      const data = await apiExecuteQuery(trimmed)
      const duration = ((performance.now() - t0) / 1000).toFixed(2)

      // Backend returns { records: [...] } or plain array
      const records = Array.isArray(data) ? data : (data.records ?? [])

      // Infer column defs from the first record's keys
      if (records.length > 0) {
        const inferredCols = Object.keys(records[0]).map(key => ({
          key,
          label: key
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/^\w/, c => c.toUpperCase())
            .trim(),
          sortable: true,
          visible: true,
        }))
        onColumns(inferredCols)
      } else {
        onColumns([])
      }

      onResults(records, trimmed)
      setExecInfo({ rowCount: records.length, duration })
    } catch (err) {
      setError(err.message || 'Query execution failed.')
    } finally {
      setLoading(false)
    }
  }

  function clear() {
    setSql('')
    setError('')
    setExecInfo(null)
    onClear()
  }

  function copyQuery() {
    navigator.clipboard.writeText(sql).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Ctrl+Enter to run
  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      execute()
    }
    // Tab inserts 2 spaces instead of focusing next element
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = textareaRef.current
      const start = el.selectionStart
      const end = el.selectionEnd
      const next = sql.substring(0, start) + '  ' + sql.substring(end)
      setSql(next)
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2
      })
    }
  }

  return (
    <div className="card qe-card">
      <div
        className="card-header"
        onClick={() => setCollapsed(c => !c)}
        style={{ cursor: 'pointer' }}
      >
        <span className="card-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
          Query Executor
          <span className="tag tag-blue" style={{ fontSize: 11 }}>SELECT only</span>
        </span>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {execInfo && (
            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
              {execInfo.rowCount.toLocaleString()} row{execInfo.rowCount !== 1 ? 's' : ''} — {execInfo.duration}s
            </span>
          )}
          <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); copyQuery() }} disabled={!sql.trim()}>
            {copied
              ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> Copied</>
              : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</>
            }
          </button>
          <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); clear() }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            Clear
          </button>
          <button className="collapse-btn" onClick={e => { e.stopPropagation(); setCollapsed(c => !c) }} aria-label="Toggle query executor">
            {collapsed
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
            }
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="card-body" style={{ paddingBottom: 14 }}>
          <p className="text-sm text-muted" style={{ marginBottom: 10 }}>
            Write a SELECT query and run it — results load in the grid below. Press <kbd className="qe-kbd">Ctrl+Enter</kbd> to execute.
          </p>

          {/* Editor */}
          <div className="qe-editor-wrap">
            {/* Line numbers — based on actual typed content, minimum 1 */}
            <div className="qe-gutter" aria-hidden="true">
              {(sql ? sql.split('\n') : ['']).map((_, i) => (
                <div key={`line-${i}`} className="qe-line-num">{i + 1}</div>
              ))}
            </div>

            <textarea
              ref={textareaRef}
              className="qe-textarea"
              value={sql}
              onChange={e => { setSql(e.target.value); setError('') }}
              onKeyDown={handleKeyDown}
              placeholder="Write your SELECT query here..."
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              rows={8}
              aria-label="SQL query editor"
            />
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginTop: 10 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button
              className="btn btn-primary"
              onClick={execute}
              disabled={loading || !sql.trim()}
            >
              {loading
                ? <><span className="spinner" /> Executing...</>
                : <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    Run Query
                  </>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
