import { useState, useEffect } from 'react'
import axios from 'axios'
import ChecksumReport from './ChecksumReport'
import { apiGetDeliverableMigrationReport, apiGetReconciliationProperties } from '../utils/api'
import { exportDeliverableExcel, exportDeliverableCSV } from '../utils/deliverableExport'
import appsData from '../apps.json'
import { FileSpreadsheet, Download, Search, Database } from 'lucide-react'

const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const STATUS_OPTIONS = ['All', 'Success', 'Failed']

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
  const [reconProps, setReconProps]     = useState({
    systemProperties: ['mime_type', 'create_date', 'modify_date', 'object_class_id'],
    customMetadata: ['u1708_documenttitle', 'ua8c8_user_name', 'ud5e8_address', 'uc7a6_order_no']
  })

  // Load configured reconciliation columns
  useEffect(() => {
    apiGetReconciliationProperties()
      .then(setReconProps)
      .catch(console.error)
  }, [])
  const [docClasses, setDocClasses]     = useState([])
  const [selectedDocClass, setSelectedDocClass] = useState('')
  const [startDate, setStartDate]       = useState('')
  const [endDate, setEndDate]           = useState('')
  const [migrationStatus, setMigrationStatus] = useState('')
  const [data, setData]                 = useState(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [docClassLoading, setDocClassLoading] = useState(false)

  // Pagination states for records view
  const [page, setPage]                 = useState(1)
  const [pageSize, setPageSize]         = useState(100)

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
    if (!selectedApp && (!selectedDocClass || selectedDocClass === 'All') && !startDate && !endDate && (!migrationStatus || migrationStatus === 'All')) {
      setError('Please select at least one search criteria.')
      return
    }
    setError(''); setLoading(true); setPage(1)
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
    setData(null); setError(''); setPage(1)
  }

  const meta = { generatedAt: new Date().toLocaleString() }

  const isAggregated = data && data.length > 0 && (data[0].isAggregated ?? true);

  // Columns for record details view
  const formatHeader = (key) => {
    const k = key.toLowerCase();
    if (k === 'mime_type') return 'Mime Type';
    if (k === 'create_date') return 'Created Date';
    if (k === 'modify_date') return 'Modified Date';
    if (k === 'object_class_id') return 'Document Class';
    if (k === 'filefullpath') return 'File Path';
    if (k.startsWith('u') && k.includes('_')) {
      const part = k.substring(k.indexOf('_') + 1);
      return part.replace(/_/g, ' ').toUpperCase();
    }
    return key.replace(/_/g, ' ').toUpperCase();
  }

  const systemCols = (reconProps.systemProperties || []).map(k => ({ key: k.toLowerCase(), label: formatHeader(k) }));
  const hasWildcard = !reconProps.customMetadata || reconProps.customMetadata.length === 0 || reconProps.customMetadata.includes('*');
  const customCols = hasWildcard
    ? (() => {
        const isCustomCol = k => (k.startsWith('u') && k.includes('_')) || k === 'filefullpath' || k === 'folderpath';
        const keys = !isAggregated && data && data.length > 0 ? Object.keys(data[0]).filter(isCustomCol) : [];
        return keys.map(k => ({ key: k.toLowerCase(), label: formatHeader(k) }));
      })()
    : (reconProps.customMetadata || []).map(k => ({ key: k.toLowerCase(), label: formatHeader(k) }));
  const isFailedView = data && data.length > 0 && !isAggregated && data.some(r => r.migration_status?.toLowerCase() === 'failed');

  const recordCols = [
    { key: 'objectStore', label: 'Application Type' },
    { key: 'object_id', label: 'Document ID' },
    { key: 'migration_status', label: 'Status' },
    { key: 'migrated_date', label: 'Migrated Date' },
    ...systemCols,
    ...customCols,
    ...(isFailedView ? [{ key: 'error_info', label: 'Error Info' }] : [])
  ];

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil((data || []).length / pageSize))
  const pageData   = (data || []).slice((page - 1) * pageSize, page * pageSize)

  function pageNums() {
    const nums = []
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) nums.push(i)
    return nums
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="filters-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', background: 'white', padding: '10px 14px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>

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
              onClick={handleSearch}
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
              <span style={{ fontSize: '14px', fontWeight: '600' }}>Running Total control Reconciliation...</span>
          </div>
      )}

      {!loading && data && data.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          No records found for the given criteria.
        </div>
      )}

      {!loading && data && data.length > 0 && (
        <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0, color: '#1976d2', borderBottom: '2px solid #1976d2', paddingBottom: '4px', display: 'inline-block', fontSize: '14px' }}>
              {isAggregated ? 'Total control Reconciliation' : 'Migration Reconciliation Records'} ({data.length} records)
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => exportDeliverableCSV(data, { ...meta, reconProps })} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', color: '#374151' }}>
                    <Download size={12} /> CSV
                </button>
                <button onClick={() => exportDeliverableExcel(data, { ...meta, reconProps })} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#10b981', color: 'white', cursor: 'pointer' }}>
                    <Download size={12} /> Excel
                </button>
            </div>
          </div>
          
          <div className="table-wrap" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {isAggregated ? (
              // ── INSIGHTS (ALL STATUS SCENARIO) ──
              <table>
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Application Type</th>
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
                        <tr key={i}>
                          <td style={{ textAlign: 'center' }}>{sno++}</td>
                          {isNewApp && (
                            <td rowSpan={appCount} style={{ fontWeight: 700, color: '#1e293b', verticalAlign: 'middle', background: '#f8fafc' }}>
                              {r.objectStore || <em className="cell-empty">NULL</em>}
                            </td>
                          )}
                          <td>{r.documentClass || <em className="cell-empty">NULL</em>}</td>
                          <td style={{ textAlign: 'right' }}>{(r.totalDocuments ?? 0).toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>{Number(r.totalFileSizeGb ?? 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>{(r.extractedFileNet ?? 0).toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>{(r.extractionFailed ?? 0).toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>{(r.remaining ?? 0).toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>{Number(r.extractedFileSizeGb ?? 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span className={ (r.percentCompletion ?? 0) >= 100 ? 'status-badge status-success' : (r.percentCompletion ?? 0) > 0 ? 'status-badge status-pending' : 'status-badge' }>
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
            ) : (
              // ── DETAILED RECORDS (SUCCESS/FAIL SCENARIO) WITH PAGINATION ──
              <table>
                <thead>
                  <tr>
                    <th>S.No</th>
                    {recordCols.map(col => <th key={col.key}>{col.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((row, i) => (
                    <tr key={row.object_id ?? i}>
                      <td style={{ textAlign: 'center' }}>{(page - 1) * pageSize + i + 1}</td>
                      {recordCols.map(col => {
                        const val = row[col.key]
                        if (col.key === 'migration_status') {
                          const statusCls = val?.toLowerCase() === 'success' ? 'status-badge status-success' : 'status-badge status-failed'
                          return (
                            <td key={col.key}>
                              <span className={statusCls}>{val || '—'}</span>
                            </td>
                          )
                        }
                        if (col.key === 'error_info') {
                          return (
                            <td key={col.key}>
                              <span 
                                title={val || 'No error info'} 
                                style={{ 
                                  cursor: 'pointer', 
                                  color: '#e11d48',
                                  background: '#fff1f2',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #ffe4e6',
                                  fontSize: '9px',
                                  display: 'inline-block',
                                  maxWidth: '240px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {val ? (val.length > 40 ? val.substring(0, 40) + '...' : val) : '—'}
                              </span>
                            </td>
                          )
                        }
                        if (col.key === 'object_id') {
                          return <td key={col.key} className="cell-mono" style={{ fontSize: '9px' }}>{val || '—'}</td>
                        }
                        if (col.key === 'migrated_date') {
                          return <td key={col.key} style={{ fontSize: '9px', whiteSpace: 'nowrap' }}>{val ? new Date(val).toLocaleString() : '—'}</td>
                        }
                        return (
                          <td key={col.key}>
                            {val == null || val === '' ? <span className="cell-empty">—</span> : String(val)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination for records view */}
          {!isAggregated && (
            <div className="pagination" style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
              <div className="pagination-left">
                <span className="pagination-info" style={{ fontSize: '10px' }}>
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.length)} of{' '}
                  <strong>{data.length.toLocaleString()}</strong>
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
          )}
        </div>
      )}

      </div>
      
      {!loading && !data && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Select an application to load document classes, apply filters, then click Search.
        </div>
      )}
    </div>
  )
}

// -- Main Deliverables Page --
export default function Deliverables() {
  const [tab, setTab] = useState('migration')

  return (
    <div className="deliverables-container" style={{ padding: '14px', background: '#f8f9fa', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Page Header with tabs stacked vertically */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', padding: '0 4px' }}>
          <h2 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '15px', fontWeight: 'bold' }}>
              <FileSpreadsheet size={18} color="#4f46e5" /> Deliverables
          </h2>
          <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px', alignSelf: 'flex-start' }}>
              <button 
                onClick={() => setTab('migration')} 
                style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: tab === 'migration' ? '#ffffff' : 'transparent', color: tab === 'migration' ? '#4f46e5' : '#64748b', boxShadow: tab === 'migration' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                Total control Reconciliation
              </button>
              <button 
                onClick={() => setTab('checksum')} 
                style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: tab === 'checksum' ? '#ffffff' : 'transparent', color: tab === 'checksum' ? '#4f46e5' : '#64748b', boxShadow: tab === 'checksum' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                Checksum Report
              </button>
          </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {tab === 'migration' ? (
          <MigrationReportTab />
        ) : (
          <ChecksumReport />
        )}
      </div>
    </div>
  )
}