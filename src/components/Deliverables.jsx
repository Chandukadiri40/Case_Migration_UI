import React, { useState, useEffect } from 'react'
import axios from 'axios'
import ChecksumReport from './ChecksumReport'
import { apiGetDeliverableMigrationReport, apiGetTenantConfig } from '../utils/api'
import { exportDeliverableExcel, exportDeliverableCSV } from '../utils/deliverableExport'
import { useAlert } from '../context/AlertContext'
import { FileSpreadsheet, Download, Search, Database, Settings, Loader2 } from 'lucide-react'

const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const STATUS_OPTIONS = ['All', 'Success', 'Failed']

function getCellValue(r, cKey, selectedAppName) {
  if (cKey === 'objectStore') {
    const k = Object.keys(r).find(x => {
      const clean = x.toLowerCase().replace(/^(u[0-9a-f]+_)/i, '');
      return clean === 'targetobjectstorename' || clean === 'object_store';
    });
    if (k && r[k]) return r[k];
  }

  let matchingKey = Object.keys(r).find(x => x.toLowerCase() === cKey.toLowerCase());

  if (!matchingKey) {
    const cleanCKey = cKey.toLowerCase().replace(/^(u[0-9a-f]+_)/i, '');
    matchingKey = Object.keys(r).find(x => {
      const cleanX = x.toLowerCase().replace(/^(u[0-9a-f]+_)/i, '');
      return cleanX === cleanCKey;
    });
  }

  let val = matchingKey ? r[matchingKey] : undefined;

  if (cKey === 'application' && !val && selectedAppName) {
    val = selectedAppName;
  }
  return val;
}

const toNum = (val) => Number(val) || 0;

function renderAggregatedRow(r, sno, isNewApp, appCount, selectedAppName) {
  const compPct = toNum(r.percentCompletion);
  const failPct = toNum(r.percentFailed);
  const runDays = toNum(r.runTimeDays);

  let completionClass = 'status-badge';
  if (compPct >= 100) completionClass = 'status-badge status-success';
  else if (compPct > 0) completionClass = 'status-badge status-pending';

  let failedRender = <span className="cell-empty">0.0%</span>;
  if (failPct > 0) {
    failedRender = <span className="status-badge status-failed">{failPct.toFixed(1)}%</span>;
  }

  let runTimeRender = <span className="cell-empty">0.00 days</span>;
  if (runDays > 0) {
    runTimeRender = `${runDays.toFixed(2)} days`;
  }

  const objStoreStr = r.objectStore ? String(r.objectStore) : 'na';
  const docClassStr = r.documentClass ? String(r.documentClass) : 'na';
  const rowKey = `agg-${objStoreStr}-${docClassStr}`;

  const docClassEl = r.documentClass ? r.documentClass : <em className="cell-empty">NULL</em>;
  const appNameEl = selectedAppName ? selectedAppName : <em className="cell-empty">NULL</em>;

  return (
    <tr key={rowKey}>
      <td style={{ textAlign: 'center' }}>{sno}</td>
      {isNewApp ? (
        <td rowSpan={appCount} style={{ fontWeight: 700, color: '#1e293b', verticalAlign: 'middle', textAlign: 'center', background: '#f8fafc' }}>
          {appNameEl}
        </td>
      ) : null}
      <td>{docClassEl}</td>
      <td style={{ textAlign: 'right' }}>{toNum(r.totalDocuments).toLocaleString()}</td>
      <td style={{ textAlign: 'right' }}>{toNum(r.totalFileSizeGb).toFixed(2)}</td>
      <td style={{ textAlign: 'right' }}>{toNum(r.extractedFileNet).toLocaleString()}</td>
      <td style={{ textAlign: 'right' }}>{toNum(r.extractionFailed).toLocaleString()}</td>
      <td style={{ textAlign: 'right' }}>{toNum(r.remaining).toLocaleString()}</td>
      <td style={{ textAlign: 'right' }}>{toNum(r.extractedFileSizeGb).toFixed(2)}</td>
      <td style={{ textAlign: 'right' }}>
        <span className={completionClass}>{compPct.toFixed(1)}%</span>
      </td>
      <td style={{ textAlign: 'right' }}>{failedRender}</td>
      <td style={{ textAlign: 'right' }}>{runTimeRender}</td>
    </tr>
  );
}

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

const tdStyle = {
  padding: '10px 12px',
  color: '#334155',
  borderBottom: '1px solid #f1f5f9',
  fontSize: '11px',
}

function renderTableCell(r, c, selectedAppName) {
  const val = getCellValue(r, c.key, selectedAppName);

  switch (c.key) {
    case 'migration_status': {
      const isSuccess = val?.toLowerCase() === 'success' || val?.toLowerCase() === 'migrated';
      const statusCls = isSuccess ? 'status-badge status-success' : 'status-badge status-failed';
      return (
        <td key={c.key} style={tdStyle}>
          <span className={statusCls}>{val || '—'}</span>
        </td>
      );
    }
    case 'error_info': {
      let displayVal = '—';
      if (val) {
        displayVal = val.length > 40 ? val.substring(0, 40) + '...' : val;
      }
      return (
        <td key={c.key} style={tdStyle}>
          <span
            title={val || 'No error info'}
            style={{
              cursor: 'pointer', color: '#e11d48', background: '#fff1f2',
              padding: '2px 6px', borderRadius: '4px', border: '1px solid #ffe4e6',
              fontSize: '9px', display: 'inline-block', maxWidth: '240px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}
          >
            {displayVal}
          </span>
        </td>
      );
    }
    case 'object_id':
    case 'p8_doc_id':
      return <td key={c.key} className="cell-mono" style={{ ...tdStyle }}>{val || '—'}</td>;
    case 'migrated_date':
      return <td key={c.key} style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{val ? new Date(val).toLocaleString() : '—'}</td>;
    default:
      return (
        <td key={c.key} style={tdStyle} title={val}>
          {val == null || val === '' ? <span className="cell-empty">—</span> : String(val)}
        </td>
      );
  }
}


const DeliverableFilterPanel = ({
  apps,
  selectedApp,
  setSelectedApp,
  docClasses,
  selectedDocClass,
  setSelectedDocClass,
  docClassLoading,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  migrationStatus,
  setMigrationStatus,
  data,
  handleReset,
  handleSearch,
  loading
}) => {
  return (
    <div className="filters-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', background: 'white', padding: '10px 14px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', position: 'relative' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>

        <div>
          <label style={labelStyle}>Application</label>
          <select
            value={selectedApp}
            onChange={e => setSelectedApp(e.target.value)}
            style={fieldStyle}
            onFocus={e => e.target.style.borderColor = '#4f46e5'}
            onBlur={e => e.target.style.borderColor = '#cbd5e1'}
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
            onBlur={e => e.target.style.borderColor = '#cbd5e1'}
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
            onBlur={e => e.target.style.borderColor = '#cbd5e1'}
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
            onBlur={e => e.target.style.borderColor = '#cbd5e1'}
          />
        </div>

        <div>
          <label style={labelStyle}>Migration Status</label>
          <select
            value={migrationStatus}
            onChange={e => setMigrationStatus(e.target.value)}
            style={fieldStyle}
            onFocus={e => e.target.style.borderColor = '#4f46e5'}
            onBlur={e => e.target.style.borderColor = '#cbd5e1'}
          >
            <option value="" disabled hidden>Select Status</option>
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
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Searching...
              </>
            ) : (
              <>
                <Search size={14} /> Search
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// -- Migration Report Tab --
function MigrationReportTab() {
  const { showAlert } = useAlert()
  const [apps, setApps] = useState([])
  const [selectedApp, setSelectedApp] = useState('')

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
  const [docClasses, setDocClasses] = useState([])
  const [selectedDocClass, setSelectedDocClass] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [migrationStatus, setMigrationStatus] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [docClassLoading, setDocClassLoading] = useState(false)
  const [metadataFields, setMetadataFields] = useState([])

  // Pagination states for records view
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(100)

  // Column visibility states
  const [allCustomColumns, setAllCustomColumns] = React.useState([])
  const [visibleCustomColumns, setVisibleCustomColumns] = useState(new Set())
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const columnSettingsRef = React.useRef(null)

  useEffect(() => {
    function handleOutside(e) {
      if (columnSettingsRef.current && !columnSettingsRef.current.contains(e.target)) {
        setShowColumnSettings(false);
      }
    }
    if (showColumnSettings) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showColumnSettings]);

  // Load doc classes when app changes -- same as Exceptions
  useEffect(() => {
    if (!selectedApp) { setDocClasses([]); setSelectedDocClass(''); setMetadataFields([]); return }
    setDocClassLoading(true)
    axios.get(`${BASE}/discovery/doc-classes?appId=${selectedApp}`)
      .then(res => { setDocClasses(res.data); setSelectedDocClass(''); setMetadataFields([]) })
      .catch(console.error)
      .finally(() => setDocClassLoading(false))
  }, [selectedApp])

  // Fetch Metadata fields when App or Doc Class changes
  useEffect(() => {
    if (!selectedApp) {
      setMetadataFields([]);
      return;
    }
    const classParam = (!selectedDocClass || selectedDocClass === 'All') ? '' : `&documentClass=${encodeURIComponent(selectedDocClass)}`;
    axios.get(`${BASE}/exceptions/metadata-fields?appId=${selectedApp}${classParam}`)
      .then(res => setMetadataFields(res.data))
      .catch(console.error);
  }, [selectedApp, selectedDocClass]);

  const buildSearchPayload = () => {
    const payload = {}
    if (selectedApp) payload.applicationName = apps.find(a => a.appId === selectedApp)?.appName || selectedApp
    if (selectedDocClass && selectedDocClass !== 'All') payload.documentClass = selectedDocClass
    if (startDate) payload.startDate = startDate + 'T00:00:00'
    if (endDate) payload.endDate = endDate + 'T23:59:59'
    if (migrationStatus && migrationStatus !== 'All') payload.migrationStatus = migrationStatus
    return payload;
  }

  const targetGuidCol = apps.find(a => String(a.appId) === String(selectedApp))?.systemColumns?.['target-guid-col'] || 'p8_doc_id';
  const explicitCols = [
    { key: 'application', label: 'Application' },
    { key: 'objectStore', label: 'Object Store' },
    { key: 'object_id', label: 'Source Document GUID' },
    { key: 'mime_type', label: 'MIME Type' },
    { key: 'content_size', label: 'Size (KB)' },
    { key: 'migrated_date', label: 'Migration Date' },
    { key: targetGuidCol, label: 'Target Document GUID' },
    { key: 'migration_status', label: 'Migration Status' }
  ];

  const cleanColumnName = (col) => {
    const cleaned = col.replace(/^(U[0-9a-f]+_)/i, '');
    if (cleaned.toLowerCase() === 'targetobjectstorename') {
      return 'Object Store';
    }
    return cleaned;
  };

  const extractCustomKeys = (result, strictCustomFields) => {
    const keys = new Set();
    result.forEach(row => {
      Object.keys(row).forEach(k => {
        const lower = k.toLowerCase();
        const isSystem = explicitCols.some(ec => ec.key.toLowerCase() === lower) || lower === 'error_info';
        const cleanedK = cleanColumnName(k).toLowerCase();
        if (!isSystem && (strictCustomFields.includes(cleanedK) || cleanedK === 'documenttitle')) {
          keys.add(k);
        }
      });
    });
    return Array.from(keys).sort((a, b) => {
      const cleanA = cleanColumnName(a).toLowerCase();
      const cleanB = cleanColumnName(b).toLowerCase();
      if (cleanA.includes('documenttitle') && !cleanB.includes('documenttitle')) return -1;
      if (!cleanA.includes('documenttitle') && cleanB.includes('documenttitle')) return 1;
      return cleanA.localeCompare(cleanB);
    });
  };

  const getDefaultCustomCols = (customColsArray) => {
    const defaults = new Set();
    const docTitleCol = customColsArray.find(c => c.toLowerCase().includes('documenttitle'));
    if (docTitleCol) defaults.add(docTitleCol);
    for (const col of customColsArray) {
      if (defaults.size >= 3) break;
      defaults.add(col);
    }
    return defaults;
  };

  const handleCustomColumns = (result) => {
    const isAgg = result && result.length > 0 && (result[0].isAggregated ?? true);
    if (!isAgg && result && result.length > 0) {
      const strictCustomFields = metadataFields.map(mf => typeof mf === 'string' ? mf.toLowerCase() : '');
      const customColsArray = extractCustomKeys(result, strictCustomFields);
      setAllCustomColumns(customColsArray);
      setVisibleCustomColumns(getDefaultCustomCols(customColsArray));
    } else {
      setAllCustomColumns([]);
      setVisibleCustomColumns(new Set());
    }
  }

  async function handleSearch() {
    if (!selectedApp) {
      showAlert('Please select an Application before running the report.')
      return
    }
    if (!selectedDocClass) {
      showAlert("Please select a Document Class (or 'All').")
      return;
    }
    if (!migrationStatus) {
      showAlert('Please select a Migration Status.')
      return
    }
    setError(''); setLoading(true); setPage(1)
    try {
      const payload = buildSearchPayload();
      const result = await apiGetDeliverableMigrationReport(payload)
      setData(result)
      handleCustomColumns(result);
    } catch (e) {
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
    if (key.toLowerCase() === 'filefullpath') return 'File Path';
    const cleaned = cleanColumnName(key);
    if (cleaned.toLowerCase() === 'documenttitle') return 'Document Title';
    return cleaned.replace(/_/g, ' ').toUpperCase();
  };

  const customCols = allCustomColumns
    .filter(k => visibleCustomColumns.has(k))
    .map(k => ({ key: k.toLowerCase(), label: formatHeader(k) }));

  const isFailedView = data && data.length > 0 && !isAggregated && data.some(r => r.migration_status?.toLowerCase() === 'failed');

  const recordCols = [
    ...explicitCols,
    ...(isFailedView ? [{ key: 'error_info', label: 'Error Info' }] : []),
    ...customCols
  ];

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil((data || []).length / pageSize))
  const pageData = (data || []).slice((page - 1) * pageSize, page * pageSize)

  function pageNums() {
    const nums = []
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) nums.push(i)
    return nums
  }

  const selectedAppName = apps.find(a => String(a.appId) === String(selectedApp))?.appName || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0 }}>
      <DeliverableFilterPanel
        apps={apps}
        selectedApp={selectedApp}
        setSelectedApp={setSelectedApp}
        docClasses={docClasses}
        selectedDocClass={selectedDocClass}
        setSelectedDocClass={setSelectedDocClass}
        docClassLoading={docClassLoading}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        migrationStatus={migrationStatus}
        setMigrationStatus={setMigrationStatus}
        data={data}
        handleReset={handleReset}
        handleSearch={handleSearch}
        loading={loading}
      />

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 14 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          {error}
        </div>
      )}

      {/* Results */}
      <div className="grid-container" style={{ background: 'white', padding: '8px', borderRadius: '12px', flex: 1, minHeight: 0, minWidth: 0, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', color: '#4f46e5', gap: '10px' }}>
            <Database size={40} className="animate-pulse" />
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Running Total control Reconciliation...</span>
          </div>
        )}

        {!loading && !data && (
          <div className="empty-state" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#94a3b8' }}>
            <Database size={32} style={{ opacity: 0.5 }} />
            <span>Apply filters to generate Deliverables Workspace Report</span>
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
                {!isAggregated && (
                  <div ref={columnSettingsRef} style={{ position: 'relative' }}>
                    <button onClick={() => setShowColumnSettings(!showColumnSettings)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 8px', height: '24px', boxSizing: 'border-box', background: 'white', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }} title="Column Settings">
                      <Settings size={14} />
                    </button>

                    {showColumnSettings && (
                      <div style={{ position: 'absolute', top: '100%', right: '0', marginTop: '4px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', zIndex: 50, minWidth: '200px', maxHeight: '300px', overflowY: 'auto' }}>
                        <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase' }}>Custom Metadata Fields</div>
                        {allCustomColumns.length > 0 && (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#1e293b', fontWeight: 'bold', padding: '4px 0', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', marginBottom: '4px', paddingBottom: '8px' }}>
                            <input
                              type="checkbox"
                              checked={visibleCustomColumns.size === allCustomColumns.length}
                              onChange={(e) => {
                                if (e.target.checked) setVisibleCustomColumns(new Set(allCustomColumns));
                                else setVisibleCustomColumns(new Set());
                              }}
                            />
                            Select All
                          </label>
                        )}
                        {allCustomColumns.length === 0 ? (
                          <div style={{ fontSize: '11px', color: '#94a3b8', padding: '4px 0' }}>No custom fields found.</div>
                        ) : (
                          allCustomColumns.map(col => (
                            <label key={col} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#334155', padding: '4px 0', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={visibleCustomColumns.has(col)}
                                onChange={() => {
                                  const newSet = new Set(visibleCustomColumns);
                                  if (newSet.has(col)) newSet.delete(col);
                                  else newSet.add(col);
                                  setVisibleCustomColumns(newSet);
                                }}
                              />
                              {formatHeader(col)}
                            </label>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
                <button onClick={() => exportDeliverableCSV(data, { ...meta, selectedAppName, visibleCustomColumns, allCustomColumns })} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', color: '#374151' }}>
                  <Download size={12} /> CSV
                </button>
                <button onClick={() => exportDeliverableExcel(data, { ...meta, selectedAppName, visibleCustomColumns, allCustomColumns })} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#10b981', color: 'white', cursor: 'pointer' }}>
                  <Download size={12} /> Excel
                </button>
              </div>
            </div>

            <div className="table-wrap" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              {isAggregated ? (
                // ── INSIGHTS (ALL STATUS SCENARIO) ──
                <table>
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Application</th>
                      <th>Documentation Class</th>
                      <th>Total No Documents</th>
                      <th>Total Files Size (in GB)</th>
                      <th>No. Extracted(FileNet)</th>
                      <th>No. Extraction Failed</th>
                      <th>No. Remaining</th>
                      <th>Extracted File Size (in GB)</th>
                      <th>% Completion</th>
                      <th>% Failed</th>
                      <th>Run Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let sno = 1;
                      let lastApp = null;
                      return data.map(r => {
                        const isNewApp = selectedAppName !== lastApp;
                        lastApp = selectedAppName;
                        const appCount = data.length;
                        return renderAggregatedRow(r, sno++, isNewApp, appCount, selectedAppName);
                      });
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
                    {pageData.map((r, i) => (
                      <tr key={r.object_id || r[targetGuidCol] || i}>
                        <td style={{ textAlign: 'center' }}>{(page - 1) * pageSize + i + 1}</td>
                        {recordCols.map(c => renderTableCell(r, c, selectedAppName))}
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
                      <polyline points="6 9 12 15 18 9" />
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
          <FileSpreadsheet size={18} color="#4f46e5" /> Deliverables Workspace
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