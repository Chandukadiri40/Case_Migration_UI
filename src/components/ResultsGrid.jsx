import { useState, useMemo, useRef, useEffect } from 'react'
import { exportToCSV, exportToPDF } from '../utils/exportUtils'
import { generateSummaryExcel, generateSummaryCSV, generateSummaryPDF } from '../utils/reportExport'
import { apiSearch } from '../utils/api'

const STATUS_KEYS = ['migration_status', 'status', 'extraction_status', 'validation_status']

function getStatusVal(row) {
  for (const k of STATUS_KEYS) { if (row[k] != null) return String(row[k]) }
  return ''
}

const STATUS_CLASS = {
  success:         'status-success',
  failed:          'status-failed',
  pending:         'status-pending',
  'in progress':   'status-inprogress',
  extracted:       'status-success',
  'not extracted': 'status-failed',
  valid:           'status-success',
  invalid:         'status-failed',
}

function StatusBadge({ value }) {
  if (!value) return <span className="cell-empty">—</span>
  const cls = STATUS_CLASS[value.toLowerCase()] || ''
  return <span className={'status-badge ' + cls}>{value}</span>
}

function renderCell(col, row) {
  const val = row[col.key]
  if (STATUS_KEYS.includes(col.key)) return <StatusBadge value={val} />
  if (val == null || val === '') return <span className="cell-empty">—</span>
  if (col.key === 'object_id' || col.key === 'document_id') {
    return <span className="cell-mono">{val}</span>
  }
  return String(val)
}

/**
 * Detect report period from date range:
 * same day → Daily, same month → Monthly, no dates → Overall, else Custom
 */
function detectReportType(from, to) {
  if (!from && !to) return 'Overall'
  if (from === to) return 'Daily'
  if (from && to) {
    const f = new Date(from), t = new Date(to)
    if (f.getFullYear() === t.getFullYear() && f.getMonth() === t.getMonth()) return 'Monthly'
  }
  return 'Custom'
}

export default function ResultsGrid({ data, columns, summary, tableLabel, tableId, appliedFilters }) {
  const [visibleCols, setVisibleCols] = useState(
    () => new Set(columns.filter(c => c.visible !== false).map(c => c.key))
  )
  const [prevCols, setPrevCols] = useState(columns)
  if (columns !== prevCols) {
    setPrevCols(columns)
    setVisibleCols(new Set(columns.filter(c => c.visible !== false).map(c => c.key)))
  }

  const [sortKey, setSortKey] = useState('')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage]       = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [colDropdown, setColDropdown] = useState(false)
  const colDropdownRef = useRef()
  const [exporting, setExporting] = useState(false)

  async function buildReportData() {
    const fromDate = appliedFilters?.startDate || null
    const toDate   = appliedFilters?.endDate   || null
    const reportType = detectReportType(fromDate, toDate)
    const totalRecords = tableId
      ? await apiSearch({ table: tableId, status: 'total', fromDate: null, toDate: null })
      : []
    const failedRecords = data.filter(r =>
      String(r.MIGRATION_STATUS ?? r.migration_status ?? r.status ?? '').toLowerCase() === 'failed'
    )
    return { fromDate, toDate, reportType, totalRecords: totalRecords ?? [], failedRecords }
  }

  async function handleExcel() {
    if (!tableId) return
    setExporting(true)
    try {
      const { fromDate, toDate, reportType, totalRecords, failedRecords } = await buildReportData()
      generateSummaryExcel({ tableLabel, reportType, fromDate, toDate, totalRecords, periodRecords: data, failedRecords })
    } catch (e) { alert('Export failed: ' + e.message) }
    finally { setExporting(false) }
  }

  async function handleCSV() {
    if (!tableId) return
    setExporting(true)
    try {
      const { fromDate, toDate, reportType, totalRecords, failedRecords } = await buildReportData()
      generateSummaryCSV({ tableLabel, reportType, fromDate, toDate, totalRecords, periodRecords: data, failedRecords })
    } catch (e) { alert('Export failed: ' + e.message) }
    finally { setExporting(false) }
  }

  async function handlePDF() {
    if (!tableId) return
    setExporting(true)
    try {
      const { fromDate, toDate, reportType, totalRecords, failedRecords } = await buildReportData()
      generateSummaryPDF({ tableLabel, reportType, fromDate, toDate, totalRecords, periodRecords: data, failedRecords })
    } catch (e) { alert('Export failed: ' + e.message) }
    finally { setExporting(false) }
  }

  useEffect(() => {
    function handleOutside(e) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(e.target)) {
        setColDropdown(false)
      }
    }
    if (colDropdown) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [colDropdown])

  function toggleCol(key) {
    setVisibleCols(prev => {
      const next = new Set(prev)
      if (next.has(key)) { if (next.size > 1) next.delete(key) }
      else next.add(key)
      return next
    })
  }

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  const sorted = useMemo(() => {
    if (!sortKey) return [...data]
    return [...data].sort((a, b) => {
      const av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageData   = sorted.slice((page - 1) * pageSize, page * pageSize)
  const activeCols = columns.filter(c => visibleCols.has(c.key))

  function pageNums() {
    const nums = []
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) nums.push(i)
    return nums
  }

  if (columns.length === 0) {
    return (
      <div className="card results-section">
        <div className="empty-state" style={{ padding: 48 }}>
          <p>No results to display.</p>
        </div>
      </div>
    )
  }

  const exportMeta = { tableLabel, appliedFilters, generatedAt: new Date().toLocaleString() }

  return (    <div className="card results-section">
      {/* Header */}
      <div className="card-header">
        <span className="card-title">
          Results
          <span className="results-count">({sorted.length.toLocaleString()})</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Column visibility */}
          <div className="col-toggle-wrap" ref={colDropdownRef}>
            <button className="btn btn-ghost btn-sm" onClick={() => setColDropdown(d => !d)}>
              Columns
            </button>
            {colDropdown && (
              <div className="dropdown-menu">
                {columns.map(col => (
                  <label key={col.key} className="dropdown-item">
                    <input type="checkbox" checked={visibleCols.has(col.key)}
                      onChange={() => toggleCol(col.key)} />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="export-group">
            <button className="btn btn-ghost btn-sm" onClick={handleExcel} disabled={exporting}>
              {exporting ? '...' : 'Excel'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleCSV} disabled={exporting}>
              CSV
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handlePDF} disabled={exporting}>
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table aria-label="Search results">
          <thead>
            <tr>
              {activeCols.map(col => (
                <th key={col.key}
                  className={sortKey === col.key ? 'sorted' : ''}
                  style={{ cursor: col.sortable !== false ? 'pointer' : 'default' }}
                  onClick={() => col.sortable !== false && toggleSort(col.key)}>
                  <div className="th-inner">
                    {col.label}
                    {col.sortable !== false && (
                      <span className="sort-icon">
                        {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={activeCols.length}>
                  <div className="empty-state" style={{ padding: 40 }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <p>No records found.</p>
                  </div>
                </td>
              </tr>
            ) : pageData.map((row, i) => (
              <tr key={row.object_id ?? row.id ?? i}>
                {activeCols.map(col => (
                  <td key={col.key}>{renderCell(col, row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination — DMS portal style: showing text + rows select + prev/next only */}
      <div className="pagination">
        <div className="pagination-left">
          <span className="pagination-info">
            {sorted.length === 0 ? 'No records' : (
              <>
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of{' '}
                <strong>{sorted.length.toLocaleString()}</strong>
              </>
            )}
          </span>
          <div className="page-size-select">
            <select value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
              aria-label="Rows per page">
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
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
            <button key={n} className={'page-btn' + (n === page ? ' active' : '')} onClick={() => setPage(n)}>{n}</button>
          ))}
          <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages} aria-label="Next">›</button>
          <button className="page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages} aria-label="Last">»</button>
        </div>
      </div>
    </div>
  )
}
