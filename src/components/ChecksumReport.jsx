import { useState } from 'react'
import { apiGetChecksumReport } from '../utils/api'
import { generateChecksumExcel, generateChecksumCSV, generateChecksumPDF } from '../utils/checksumExport'

export default function ChecksumReport() {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [data, setData]         = useState(null)

  async function handleFetch() {
    setError('')
    setLoading(true)
    try {
      const result = await apiGetChecksumReport({
        fromDate: fromDate ? fromDate + 'T00:00:00' : null,
        toDate:   toDate   ? toDate   + 'T23:59:59' : null,
      })
      setData(result)
    } catch (e) {
      setError(e.message || 'Failed to fetch checksum data.')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setFromDate(''); setToDate(''); setData(null); setError('')
  }

  const meta = { fromDate, toDate, generatedAt: new Date().toLocaleString() }
  const s = data?.summary ?? {}
  const total     = s.total     ?? 0
  const completed = s.completed ?? 0
  const pending   = s.pending   ?? 0

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Checksum Validation Report
          <span className="tag tag-blue" style={{ fontSize: 11 }}>Staging × Checksum</span>
        </span>
      </div>

      <div className="card-body">
        {/* Filters */}
        <div className="rg-controls" style={{ marginBottom: 16 }}>
          <div className="rg-field">
            <label className="rg-label">From Date</label>
            <input type="date" className="sp-input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div className="rg-field">
            <label className="rg-label">To Date</label>
            <input type="date" className="sp-input" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <div className="rg-field rg-field--action" style={{ flexDirection: 'row', gap: 8 }}>
            <button className="btn-search" onClick={handleFetch} disabled={loading}>
              {loading
                ? <><span className="spinner spinner--dark" /> Loading...</>
                : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Load Report</>
              }
            </button>
            {data && <button className="btn-reset" onClick={handleReset}>Clear</button>}
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 14 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Summary cards — 3 clear tiles */}
            <div className="cs-summary-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <SummaryTile
                label="Total Records"
                value={total}
                sub="Documents checked in period"
                color="var(--primary)"
              />
              <SummaryTile
                label="Checksum Success"
                value={completed}
                sub={total > 0 ? pct(completed, total) : '—'}
                color="var(--success)"
              />
              <SummaryTile
                label="Checksum Failed"
                value={pending}
                sub={total > 0 ? pct(pending, total) : '—'}
                color="var(--danger)"
              />
            </div>

            {/* Export + results banner — same style as ResultsGrid */}
            <div className="cs-results-banner">
              <span className="cs-results-title">
                Results
                <span className="cs-results-count">({data.records.length.toLocaleString()})</span>
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm cs-export-btn" onClick={() => generateChecksumExcel(data, meta)}>Excel</button>
                <button className="btn btn-ghost btn-sm cs-export-btn" onClick={() => generateChecksumCSV(data, meta)}>CSV</button>
                <button className="btn btn-ghost btn-sm cs-export-btn" onClick={() => generateChecksumPDF(data, meta)}>PDF</button>
              </div>
            </div>

            {/* Table */}
            <div className="table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
              <table aria-label="Checksum records">
                <thead>
                  <tr>
                    <th>Document ID</th>
                    <th>Document Title</th>
                    <th>Document Class</th>
                    <th>File Name</th>
                    <th>Checksum Before</th>
                    <th>Checksum After</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.length === 0 ? (
                    <tr><td colSpan={6}>
                      <div className="empty-state" style={{ padding: 32 }}>
                        <p>No records found for the selected period.</p>
                      </div>
                    </td></tr>
                  ) : data.records.map((r, i) => (
                    <tr key={i}>
                      <td><span className="cell-mono">{r.documentId}</span></td>
                      <td>{r.documentTitle ?? r.u1708_documenttitle ?? <span className="cell-empty">—</span>}</td>
                      <td>{r.documentClass ?? r.objectClassId ?? r.object_class_id ?? <span className="cell-empty">—</span>}</td>
                      <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.fileName || <span className="cell-empty">—</span>}</td>
                      <td><span className="cell-mono" style={{ fontSize: 10 }}>{r.checksumBefore?.slice(0, 16)}…</span></td>
                      <td><span className="cell-mono" style={{ fontSize: 10 }}>{r.checksumAfter?.slice(0, 16)}…</span></td>
                      <td>
                        <span className={`status-badge ${r.checksumStatus?.toLowerCase() === 'completed' ? 'status-success' : 'status-pending'}`}>
                          {r.checksumStatus || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!data && !loading && (
          <div className="empty-state" style={{ padding: 48 }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <p className="empty-title">Run Checksum Report</p>
            <p className="empty-sub">Optionally filter by date range and click Load Report.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryTile({ label, value, color, sub }) {
  return (
    <div className="cs-tile" style={{ '--tile-color': color }}>
      <div className="cs-tile-label">{label}</div>
      <div className="cs-tile-value" style={{ color }}>{(value ?? 0).toLocaleString()}</div>
      {sub && <div className="cs-tile-sub">{sub}</div>}
    </div>
  )
}

function pct(n, total) {
  return total > 0 ? ((n / total) * 100).toFixed(1) + '%' : '—'
}
