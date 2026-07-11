import { useState, useEffect } from 'react'
import axios from 'axios'
import ChecksumReport from './ChecksumReport'
import { apiGetDeliverableMigrationReport } from '../utils/api'
import { exportDeliverableExcel, exportDeliverableCSV, exportDeliverablePDF } from '../utils/deliverableExport'
import appsData from '../apps.json'

const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const STATUS_OPTIONS = ['All', 'Success', 'Failed', 'Pending', 'In Progress']

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

// -- Migration Report Tab --
function MigrationReportTab() {
  const [apps]                          = useState(appsData)
  const [selectedApp, setSelectedApp]   = useState('')
  const [docClasses, setDocClasses]     = useState([])
  const [selectedDocClass, setSelectedDocClass] = useState('')
  const [startDate, setStartDate]       = useState('')
  const [endDate, setEndDate]           = useState('')
  const [migrationStatus, setMigrationStatus] = useState('')
  const [data, setData]                 = useState(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [docClassLoading, setDocClassLoading] = useState(false)

  // Load doc classes when app changes -- same as Exceptions
  useEffect(() => {
    if (!selectedApp) { setDocClasses([]); setSelectedDocClass(''); return }
    setDocClassLoading(true)
    axios.get(`${BASE}/discovery/doc-classes?appId=${selectedApp}`)
      .then(res => { setDocClasses(res.data); setSelectedDocClass('') })
      .catch(console.error)
      .finally(() => setDocClassLoading(false))
  }, [selectedApp])

  async function handleSearch() {
    setError(''); setLoading(true)
    try {
      const payload = {}
      if (selectedApp)      payload.applicationName = apps.find(a => a.appId === selectedApp)?.appName || selectedApp
      if (selectedDocClass && selectedDocClass !== 'All') payload.documentClass = selectedDocClass
      if (startDate)        payload.startDate       = startDate + 'T00:00:00'
      if (endDate)          payload.endDate         = endDate   + 'T23:59:59'
      if (migrationStatus && migrationStatus !== 'All') payload.migrationStatus = migrationStatus
      const result = await apiGetDeliverableMigrationReport(payload)
      setData(result)
    } catch(e) {
      setError(e.message || 'Failed to fetch migration report.')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setSelectedApp(''); setSelectedDocClass(''); setDocClasses([])
setStartDate(''); setEndDate(''); setMigrationStatus('')
    setData(null); setError('')
  }

  const meta = { generatedAt: new Date().toLocaleString() }

  return (
    <div>
      {/* Filter Panel -- same look as Exceptions */}
      <div style={{ background: 'white', padding: '12px 16px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', marginBottom: 16 }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, alignItems: 'end' }}>

          <div>
            <label style={labelStyle}>App / Object Store</label>
            <select
              value={selectedApp}
              onChange={e => setSelectedApp(e.target.value)}
              style={fieldStyle}
              onFocus={e => e.target.style.borderColor = '#4f46e5'}
              onBlur={e  => e.target.style.borderColor = '#cbd5e1'}
            >
              <option value="">-- Select Object Store --</option>
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
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={fieldStyle}
              onFocus={e => e.target.style.borderColor = '#4f46e5'}
              onBlur={e  => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>

          <div>
            <label style={labelStyle}>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={fieldStyle}
              onFocus={e => e.target.style.borderColor = '#4f46e5'}
              onBlur={e  => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>

          <div>
            <label style={labelStyle}>Migration Status</label>
            <select
              value={migrationStatus}
              onChange={e => setMigrationStatus(e.target.value)}
              style={fieldStyle}
              onFocus={e => e.target.style.borderColor = '#4f46e5'}
              onBlur={e  => e.target.style.borderColor = '#cbd5e1'}
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14, gap: 8 }}>
          <button
            onClick={handleSearch}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', boxShadow: '0 4px 12px rgba(79,70,229,0.3)', opacity: loading ? 0.7 : 1 }}
            onMouseOver={e => { if (!loading) e.currentTarget.style.background = '#4338ca' }}
            onMouseOut={e  => { e.currentTarget.style.background = '#4f46e5' }}
          >
            {loading ? 'Loading...' : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Search
              </>
            )}
          </button>
          {data && (
            <button
              onClick={handleReset}
              style={{ padding: '6px 16px', background: 'white', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 14 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}

      {/* Results */}
      {data && data.length === 0 && (
        <div className="empty-state" style={{ padding: 40, background: 'white', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <p className="empty-title">No records found</p>
          <p className="empty-sub">Try adjusting your filters and search again.</p>
        </div>
      )}

      {data && data.length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div className="cs-results-banner">
            <span className="cs-results-title">
              Total No of Rows ({data.length.toLocaleString()})
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm cs-export-btn" onClick={() => exportDeliverableExcel(data, meta)}>Excel</button>
              <button className="btn btn-ghost btn-sm cs-export-btn" onClick={() => exportDeliverableCSV(data, meta)}>CSV</button>

            </div>
          </div>
          <div className="table-wrap" style={{ maxHeight: "calc(100vh - 340px)", overflowY: "auto", overflowX: "auto" }}>
            <table aria-label="Migration deliverables report">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Object Stores</th>
                  <th>Documentation Class</th>
                  <th>Total No Documents</th>
                  <th>Total Files Size (in GB)</th>
                  <th>No. Extracted(FileNet)</th>
                  <th>No. Extraction Failed</th>
                  <th>No. Remaining</th>
                  <th>Extracted File Size (in GB)</th>
                  <th>% Completion</th>
                  <th>% Failed</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let sno = 1; let lastApp = null
                  return data.map((r, i) => {
                    const isNewApp = r.objectStore !== lastApp
                    lastApp = r.objectStore
                    const appCount = data.filter(x => x.objectStore === r.objectStore).length
                    return (
                      <tr key={i} style={isNewApp && i > 0 ? { borderTop: '2px solid #e2e8f0' } : {}}>
                        <td style={{ textAlign: 'center', color: '#90a4ae', fontSize: 11 }}>{sno++}</td>
                        {isNewApp && (
                          <td rowSpan={appCount} style={{ fontWeight: 700, color: '#1e293b', verticalAlign: 'middle', borderRight: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            {r.objectStore || <span className="cell-empty">—</span>}
                          </td>
                        )}
                        <td>{r.documentClass || <span className="cell-empty">—</span>}</td>
                        <td style={{ textAlign: 'right' }}>{(r.totalDocuments ?? 0).toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>{Number(r.totalFileSizeGb ?? 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>{(r.extractedFileNet ?? 0).toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>{(r.extractionFailed ?? 0).toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>{(r.remaining ?? 0).toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>{Number(r.extractedFileSizeGb ?? 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={`status-badge ${ (r.percentCompletion ?? 0) >= 100 ? 'status-success' : (r.percentCompletion ?? 0) > 0 ? 'status-inprogress' : 'status-pending'}`}>
                            {Number(r.percentCompletion ?? 0).toFixed(1)}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {(r.percentFailed ?? 0) > 0
                            ? <span className="status-badge status-failed">{Number(r.percentFailed ?? 0).toFixed(1)}%</span>
                            : <span className="cell-empty">0.0%</span>
                          }
                        </td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!data && !loading && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 48, textAlign: 'center', color: '#90a4ae' }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: 12, opacity: 0.3 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <p className="empty-title">Run Migration Report</p>
          <p className="empty-sub">Select an application to load document classes, apply filters, then click Search.</p>
        </div>
      )}
    </div>
  )
}

// -- Main Deliverables Page --
export default function Deliverables() {
  const [tab, setTab] = useState('migration')

  return (
    <div className="app-layout">
      <header className="topbar">
        <div className="topbar-brand"><span>Deliverables</span></div>
        <div className="topbar-actions">
          <span className="topbar-date">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </header>

      <main className="main-content">
        <div style={{ marginBottom: 20, display: 'flex', gap: 8 }}>
          <button
            onClick={() => setTab('migration')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 18px',
              borderRadius: 8,
              border: tab === 'migration' ? 'none' : '1.5px solid #cbd5e1',
              background: tab === 'migration' ? '#1976d2' : 'white',
              color: tab === 'migration' ? 'white' : '#64748b',
              fontWeight: tab === 'migration' ? 700 : 500,
              fontSize: 13, cursor: 'pointer',
              boxShadow: tab === 'migration' ? '0 2px 8px rgba(25,118,210,0.3)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Migration Report
          </button>
          <button
            onClick={() => setTab('checksum')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 18px',
              borderRadius: 8,
              border: tab === 'checksum' ? 'none' : '1.5px solid #cbd5e1',
              background: tab === 'checksum' ? '#1976d2' : 'white',
              color: tab === 'checksum' ? 'white' : '#64748b',
              fontWeight: tab === 'checksum' ? 700 : 500,
              fontSize: 13, cursor: 'pointer',
              boxShadow: tab === 'checksum' ? '0 2px 8px rgba(25,118,210,0.3)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Checksum Report
          </button>
        </div>

        {tab === 'migration' && <MigrationReportTab />}
        {tab === 'checksum' && <ChecksumReport />}
      </main>
    </div>
  )
}