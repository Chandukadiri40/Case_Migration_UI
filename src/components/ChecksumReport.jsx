import { useState, useEffect } from 'react'
import axios from 'axios'
import { apiGetChecksumReport, apiGetTenantConfig } from '../utils/api'
import { generateChecksumExcel, generateChecksumCSV } from '../utils/checksumExport'
import { Download, Search, Database } from 'lucide-react'

const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const fieldStyle = {
  padding: '5px 8px',
  width: '100%',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  background: '#f8fafc',
  color: '#0f172a',
  fontSize: '9px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
}

const labelStyle = {
  fontSize: '9px',
  fontWeight: '700',
  color: '#64748b',
  display: 'block',
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

function renderTableCell(r, col, selectedAppName) {
  let val = r[col.key] || r[col.key?.toUpperCase()] || r[col.key?.toLowerCase()];
  if (col.key === 'application' && !val && selectedAppName) val = selectedAppName;
  if (col.key === 'object_store' && !val && r['objectstorename']) val = r['objectstorename'];
  if (col.key === 'content_size' && val) val = (Number(val) / 1024).toFixed(2);

  if (col.key === 'checksum_status') {
    const isMatched = val?.toLowerCase() === 'completed' || val?.toLowerCase() === 'matched';
    const displayVal = isMatched ? 'Matched' : 'MisMatched';
    return (
      <td key={col.key}>
        <span style={{ fontWeight: 'bold', color: isMatched ? '#10b981' : '#ef4444' }}>
          {displayVal}
        </span>
      </td>
    );
  }
  if (col.key === 'checksumbefore' || col.key === 'checksumafter') {
    return (
      <td key={col.key}>
        <span className="cell-mono" title={val}>{val ? val.slice(0, 16) + '…' : '—'}</span>
      </td>
    );
  }
  if (col.key === 'documentid' || col.key === 'p8_doc_id') {
    return <td key={col.key} className="cell-mono" style={{ fontSize: '9px' }}>{val || '—'}</td>;
  }
  return (
    <td key={col.key} title={val}>
      {val == null || val === '' ? <span className="cell-empty">—</span> : String(val)}
    </td>
  );
}

export default function ChecksumReport() { // NOSONAR
  const [apps, setApps]                 = useState([])
  const [selectedApp, setSelectedApp]   = useState('')
  const [docClasses, setDocClasses]     = useState([])
  const [selectedDocClass, setSelectedDocClass] = useState('')
  const [fromDate, setFromDate]         = useState('')
  const [toDate, setToDate]             =             useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [data, setData]                 = useState(null)
  const [docClassLoading, setDocClassLoading] = useState(false)

  // Local pagination states
  const [page, setPage]                 = useState(1)
  const [pageSize, setPageSize]         = useState(100)

  // Load configured apps
  useEffect(() => {
    apiGetTenantConfig()
      .then(res => {
        if (res && res.applications) {
          setApps(res.applications)
        }
      })
      .catch(console.error)
  }, [])

  // Load doc classes when app changes
  useEffect(() => {
    if (!selectedApp) { setDocClasses([]); setSelectedDocClass(''); return }
    setDocClassLoading(true)
    axios.get(`${BASE}/discovery/doc-classes?appId=${selectedApp}`)
      .then(res => { setDocClasses(res.data); setSelectedDocClass('') })
      .catch(console.error)
      .finally(() => setDocClassLoading(false))
  }, [selectedApp])

  async function handleFetch() {
    if (!selectedApp) {
      setError('Please select an application.')
      return
    }
    setError('')
    setLoading(true)
    setPage(1)
    try {
      const result = await apiGetChecksumReport({
        appId: selectedApp,
        documentClass: selectedDocClass && selectedDocClass !== 'All' ? selectedDocClass : null,
        fromDate: fromDate ? fromDate + 'T00:00:00' : null,
        toDate:   toDate   ? toDate   + 'T23:59:59' : null,
        migrationStatus: 'Success'
      })
      setData(result)
    } catch (e) {
      setError(e.message || 'Failed to fetch checksum data.')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setSelectedApp('')
    setSelectedDocClass('')
    setDocClasses([])
    setFromDate('')
    setToDate('')
    setData(null)
    setError('')
    setPage(1)
  }

  const meta = { fromDate, toDate, generatedAt: new Date().toLocaleString() }
  const s = data?.summary ?? {}
  const total     = s.total     ?? 0
  const completed = s.completed ?? 0
  const pending   = s.pending   ?? 0

  // No custom metadata for Checksum report as requested


  const recordCols = [
    { key: 'application', label: 'Application' },
    { key: 'object_store', label: 'Object Store' },
    { key: 'documentid', label: 'Source Document GUID' },
    { key: 'mime_type', label: 'MIME Type' },
    { key: 'content_size', label: 'Size (KB)' },
    { key: 'migrated_date', label: 'Migration Date' },
    { key: 'p8_doc_id', label: 'Target Document GUID' },
    { key: 'checksumbefore', label: 'Source CheckSum' },
    { key: 'checksumafter', label: 'Target CheckSum' },
    { key: 'checksum_status', label: 'Validation Status' }
  ];

  const selectedAppName = apps.find(a => String(a.appId) === String(selectedApp))?.appName || '';

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil((data?.records || []).length / pageSize))
  const pageData   = (data?.records || []).slice((page - 1) * pageSize, page * pageSize)

  function pageNums() {
    const nums = []
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) nums.push(i)
    return nums
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="filters-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', background: 'white', padding: '10px 14px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={labelStyle}>Application</label>
              <select
                value={selectedApp}
                onChange={e => setSelectedApp(e.target.value)}
                style={fieldStyle}
                onFocus={e => e.target.style.borderColor = '#4f46e5'}
                onBlur={e  => e.target.style.borderColor = '#cbd5e1'}
              >
                <option value="">-- Select Application --</option>
                {apps.map(a => <option key={a.appId} value={a.appId}>{a.appName}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Document Class</label>
              <select
                value={selectedDocClass}
                onChange={e => setSelectedDocClass(e.target.value)}
                style={{ ...fieldStyle, opacity: !selectedApp ? 0.5 : 1 }}
                disabled={!selectedApp || docClassLoading}
                onFocus={e => e.target.style.borderColor = '#4f46e5'}
                onBlur={e  => e.target.style.borderColor = '#cbd5e1'}
              >
                <option value="">{docClassLoading ? 'Loading...' : '-- Select Document Class --'}</option>
                {docClasses.length > 0 && <option value="All">All Classes</option>}
                {docClasses.map(dc => <option key={dc} value={dc}>{dc}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Start Date</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={fieldStyle} onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
            </div>

            <div>
              <label style={labelStyle}>End Date</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={fieldStyle} onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
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

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 14 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}

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
          <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="cs-summary-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '8px' }}>
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

            <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
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

              <div className="table-wrap" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>S.No</th>
                      {recordCols.map(col => <th key={col.key}>{col.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                  {pageData.map((r, i) => (
                    <tr key={r.documentid ?? i}>
                      <td style={{ textAlign: 'center' }}>{(page - 1) * pageSize + i + 1}</td>
                      {recordCols.map(col => renderTableCell(r, col, selectedAppName))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>

            {/* Pagination Controls */}
            <div className="pagination" style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
              <div className="pagination-left">
                <span className="pagination-info" style={{ fontSize: '10px' }}>
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.records.length)} of{' '}
                  <strong>{data.records.length.toLocaleString()}</strong>
                </span>
                <div className="page-size-select">
                  <select value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                    aria-label="Rows per page"
                    style={{ fontSize: '10px' }}>
                    {[100, 500, 1000].map(n => <option key={n} value={n}>{n} / page</option>)}
                  </select>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>
              <div className="pagination-controls">
                <button className="page-btn" onClick={() => setPage(1)} disabled={page === 1} aria-label="First">«</button>
                <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1} aria-label="Prev">‹</button>
                {pageNums().map(n => (
                  <button key={n} className={'page-btn' + (n === page ? ' active' : '')} onClick={() => setPage(n)} style={{ fontSize: '10px', minWidth: '22px', height: '22px' }}>{n}</button>
                ))}
                <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages} aria-label="Next">›</button>
                <button className="page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages} aria-label="Last">»</button>
              </div>
            </div>
          </div>
        )}

        {!data && !loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            Select an application, document class, date ranges, and click Search.
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryTile({ label, value, color, sub }) {
  return (
    <div style={{ background: 'white', border: `1px solid ${color}33`, borderRadius: '6px', padding: '6px 10px', borderLeft: `3px solid ${color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '600', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: color, lineHeight: '1' }}>{(value ?? 0).toLocaleString()}</div>
        {sub && <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '500' }}>{sub}</div>}
      </div>
    </div>
  )
}

function pct(n, total) {
  return total > 0 ? ((n / total) * 100).toFixed(1) + '%' : '—'
}
