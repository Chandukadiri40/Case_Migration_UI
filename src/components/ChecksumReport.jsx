import { useState } from 'react'
import { apiGetChecksumReport } from '../utils/api'
import { generateChecksumExcel, generateChecksumCSV, generateChecksumPDF } from '../utils/checksumExport'
import { FileSpreadsheet, Download, Search, Database, ArrowDown, ArrowUp } from 'lucide-react'

export default function ChecksumReport({ onTabChange, tab }) {
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
    <div className="deliverables-container" style={{ padding: '14px', background: '#f8f9fa', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="filters-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', background: 'white', padding: '10px 14px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '15px', fontWeight: 'bold' }}>
                  <FileSpreadsheet size={18} color="#4f46e5" /> Deliverables
              </h2>
              <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                  <button onClick={() => onTabChange('migration')} style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: tab === 'migration' ? '#ffffff' : 'transparent', color: tab === 'migration' ? '#4f46e5' : '#64748b', boxShadow: tab === 'migration' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>Migration Report</button>
                  <button onClick={() => onTabChange('checksum')} style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: tab === 'checksum' ? '#ffffff' : 'transparent', color: tab === 'checksum' ? '#4f46e5' : '#64748b', boxShadow: tab === 'checksum' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>Checksum Report</button>
              </div>
          </div>
          
          <div style={{ display: 'flex', gap: 12, alignItems: 'end', marginTop: 8 }}>
            <div style={{ flex: 1, maxWidth: 200 }}>
              <label style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>From Date</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ padding: '5px 8px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }} onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
            </div>
            <div style={{ flex: 1, maxWidth: 200 }}>
              <label style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>To Date</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ padding: '5px 8px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }} onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {data && (
                <button
                  onClick={handleReset}
                  style={{ padding: '6px 16px', background: 'white', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}
                >
                  Clear
                </button>
              )}
              <button
                onClick={handleFetch}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '6px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)', opacity: loading ? 0.7 : 1 }}
                onMouseOver={(e) => { if (!loading) { e.target.style.background = '#4338ca'; e.target.style.transform = 'translateY(-1px)'; } }} 
                onMouseOut={(e) => { if (!loading) { e.target.style.background = '#4f46e5'; e.target.style.transform = 'translateY(0)'; } }}
              >
                {loading ? 'Loading...' : (
                  <>
                    <Search size={14} /> Search
                  </>
                )}
              </button>
            </div>
          </div>
      </div>

      {/* Results */}
      <div className="grid-container" style={{ background: 'white', padding: '8px', borderRadius: '12px', flex: 1, minHeight: 0, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      
        {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', color: '#4f46e5', gap: '10px' }}>
                <Database size={40} className="animate-pulse" />
                <span style={{ fontSize: '14px', fontWeight: '600' }}>Running Checksum Report...</span>
            </div>
        )}

        {!loading && data && data.records.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No records found for the given criteria.
          </div>
        )}

        {!loading && data && data.records.length > 0 && (
          <>
            <div className="cs-summary-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
              <SummaryTile
                label="Total Records"
                value={total}
                sub="Documents checked in period"
                color="#4f46e5"
              />
              <SummaryTile
                label="Checksum Success"
                value={completed}
                sub={total > 0 ? pct(completed, total) : '—'}
                color="#10b981"
              />
              <SummaryTile
                label="Checksum Failed"
                value={pending}
                sub={total > 0 ? pct(pending, total) : '—'}
                color="#ef4444"
              />
            </div>

            <div style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, color: '#1976d2', borderBottom: '2px solid #1976d2', paddingBottom: '4px', display: 'inline-block', fontSize: '14px' }}>Checksum Results ({data.records.length} records)</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => generateChecksumCSV(data, meta)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', color: '#374151' }}>
                        <Download size={12} /> CSV
                    </button>
                    <button onClick={() => generateChecksumExcel(data, meta)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#10b981', color: 'white', cursor: 'pointer' }}>
                        <Download size={12} /> Excel
                    </button>
                </div>
              </div>

              <div className="table-wrap">
                <table>
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
                    <tr><td colSpan={7}>
                      <div className="empty-state" style={{ padding: 32, textAlign: 'center' }}>
                        <p>No records found for the selected period.</p>
                      </div>
                    </td></tr>
                  ) : data.records.map((r, i) => (
                    <tr key={i}>
                      <td><span className="cell-mono">{r.documentId}</span></td>
                      <td>{r.documentTitle ?? r.u1708_documenttitle ?? <em className="cell-empty">NULL</em>}</td>
                      <td>{r.documentClass ?? r.objectClassId ?? r.object_class_id ?? <em className="cell-empty">NULL</em>}</td>
                      <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.fileName || <em className="cell-empty">NULL</em>}</td>
                      <td><span className="cell-mono">{r.checksumBefore?.slice(0, 16)}…</span></td>
                      <td><span className="cell-mono">{r.checksumAfter?.slice(0, 16)}…</span></td>
                      <td>
                        <span className={ r.checksumStatus?.toLowerCase() === 'completed' ? 'status-badge status-success' : 'status-badge status-pending' }>
                          {r.checksumStatus || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          </>
        )}

        {!data && !loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            Select dates and click Search to load the Checksum Report.
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryTile({ label, value, color, sub }) {
  return (
    <div style={{ background: 'white', border: `1px solid ${color}33`, borderRadius: '8px', padding: '12px', borderLeft: `4px solid ${color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: color, lineHeight: '1' }}>{(value ?? 0).toLocaleString()}</div>
      {sub && <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px', fontWeight: '500' }}>{sub}</div>}
    </div>
  )
}

function pct(n, total) {
  return total > 0 ? ((n / total) * 100).toFixed(1) + '%' : '—'
}
