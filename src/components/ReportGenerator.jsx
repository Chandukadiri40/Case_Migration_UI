import { useState } from 'react'
import { apiSearch } from '../utils/api'
import { generateSummaryReport } from '../utils/reportExport'
import { TABLES, resolveDatePreset } from '../config/tableConfig'

const REPORT_TYPES = [
  { value: 'Daily',    label: 'Daily',    preset: 'today' },
  { value: 'Weekly',   label: 'Weekly',   preset: 'this_week' },
  { value: 'Monthly',  label: 'Monthly',  preset: 'this_month' },
  { value: 'Overall',  label: 'Overall',  preset: 'overall' },
  { value: 'Custom',   label: 'Custom',   preset: 'custom' },
]

export default function ReportGenerator() {
  const [collapsed, setCollapsed] = useState(false)
  const [tableId, setTableId]     = useState('staging')
  const [reportType, setReportType] = useState('Daily')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [lastGenerated, setLastGenerated] = useState(null)

  const isCustom = reportType === 'Custom'

  async function handleGenerate() {
    setError('')
    setLoading(true)

    try {
      const preset = REPORT_TYPES.find(r => r.value === reportType)?.preset
      const { startDate, endDate } = isCustom
        ? { startDate: customFrom, endDate: customTo }
        : resolveDatePreset(preset)

      const tableLabel = TABLES.find(t => t.id === tableId)?.label ?? tableId

      // Fetch all 3 datasets in parallel
      const [totalRecords, periodRecords, failedRecords] = await Promise.all([
        // 1. All records ever (no date filter, all statuses)
        apiSearch({ table: tableId, status: 'total', fromDate: null, toDate: null }),

        // 2. Records in the selected period (all statuses)
        apiSearch({
          table: tableId, status: 'total',
          fromDate: startDate ? startDate + 'T00:00:00' : null,
          toDate:   endDate   ? endDate   + 'T23:59:59' : null,
        }),

        // 3. Failed records in the selected period
        apiSearch({
          table: tableId, status: 'Failed',
          fromDate: startDate ? startDate + 'T00:00:00' : null,
          toDate:   endDate   ? endDate   + 'T23:59:59' : null,
        }),
      ])

      generateSummaryReport({
        tableLabel,
        reportType,
        fromDate: startDate,
        toDate:   endDate,
        totalRecords:  totalRecords  ?? [],
        periodRecords: periodRecords ?? [],
        failedRecords: failedRecords ?? [],
      })

      setLastGenerated({
        type: reportType, table: tableLabel,
        from: startDate, to: endDate,
        total: totalRecords?.length ?? 0,
        period: periodRecords?.length ?? 0,
        failed: failedRecords?.length ?? 0,
      })
    } catch (err) {
      setError(err.message || 'Failed to generate report.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card rg-card">
      {/* Header */}
      <div
        className="card-header"
        onClick={() => setCollapsed(c => !c)}
        style={{ cursor: 'pointer' }}
      >
        <span className="card-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          Summary Report Generator
          <span className="tag tag-blue" style={{ fontSize: 11 }}>Excel</span>
        </span>
        <button
          className="collapse-btn"
          onClick={e => { e.stopPropagation(); setCollapsed(c => !c) }}
          aria-label="Toggle"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {collapsed ? <polyline points="6 9 12 15 18 9"/> : <polyline points="18 15 12 9 6 15"/>}
          </svg>
        </button>
      </div>

      {!collapsed && (
        <div className="card-body">
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 14 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <div className="rg-controls">
            {/* Table */}
            <div className="rg-field">
              <label className="rg-label">Data</label>
              <select className="sp-input" value={tableId} onChange={e => setTableId(e.target.value)}>
                {TABLES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>

            {/* Report type */}
            <div className="rg-field">
              <label className="rg-label">Report Period</label>
              <select className="sp-input" value={reportType} onChange={e => setReportType(e.target.value)}>
                {REPORT_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            {/* Custom date range */}
            {isCustom && (
              <>
                <div className="rg-field">
                  <label className="rg-label">From Date</label>
                  <input type="date" className="sp-input" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
                </div>
                <div className="rg-field">
                  <label className="rg-label">To Date</label>
                  <input type="date" className="sp-input" value={customTo} onChange={e => setCustomTo(e.target.value)} />
                </div>
              </>
            )}

            <div className="rg-field rg-field--action">
              <button className="btn-search" onClick={handleGenerate} disabled={loading}>
                {loading ? (
                  <><span className="spinner spinner--dark" /> Generating...</>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Last generated summary */}
          {lastGenerated && (
            <div className="rg-result">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>
                <strong>{lastGenerated.type} report</strong> generated for{' '}
                <strong>{lastGenerated.table}</strong>
                {lastGenerated.from && ` · ${lastGenerated.from}${lastGenerated.to ? ' → ' + lastGenerated.to : ''}`}
                {' · '}{lastGenerated.period.toLocaleString()} period records
                {' · '}<span style={{ color: 'var(--danger)' }}>{lastGenerated.failed.toLocaleString()} failed</span>
                {' · '}DB total: {lastGenerated.total.toLocaleString()}
              </span>
            </div>
          )}

          <p className="rg-hint">
            Generates an Excel with two sheets — <strong>Summary</strong> (stats &amp; percentages) and <strong>Failed IDs</strong> (list of failed document IDs for the period).
          </p>
        </div>
      )}
    </div>
  )
}
