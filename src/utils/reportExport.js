import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatus(r) {
  return String(r.MIGRATION_STATUS ?? r.migration_status ?? r.status ?? '')
}

function getDocId(r) {
  return r.OBJECT_ID ?? r.object_id ?? r.DOCUMENT_ID ?? r.document_id ?? '—'
}

function getMigratedDate(r) {
  return r.MIGRATED_DATE ?? r.migrated_date ?? r.CREATE_DATE ?? r.create_date ?? '—'
}

function fmt(n) { return n.toLocaleString() }
function pct(n, of) { return of > 0 ? ((n / of) * 100).toFixed(2) + '%' : '0.00%' }

function isSuccess(r) {
  const s = getStatus(r).toLowerCase()
  return s === 'success' || s === 'migrated'
}

function isFailed(r) {
  const s = getStatus(r).toLowerCase()
  return s === 'failed'
}

function isPending(r) {
  const s = getStatus(r).toLowerCase()
  return s === 'pending'
}
function detectReportType(from, to) {
  if (from === to) return 'Daily'
  if (from && to) {
    const f = new Date(from), t = new Date(to)
    if (f.getFullYear() === t.getFullYear() && f.getMonth() === t.getMonth()) return 'Monthly'
  }
  return 'Custom'
}

function buildSummaryRows({ tableLabel, reportType, fromDate, toDate, totalRecords, periodRecords, failedRecords }) {
  const generatedAt   = new Date().toLocaleString()
  const overallTotal  = totalRecords.length
  const periodTotal   = periodRecords.length
  const periodSuccess = periodRecords.filter(r => isSuccess(r)).length
  const periodFailed  = failedRecords.length
  const periodPending = periodRecords.filter(r => isPending(r)).length
  let periodRange = 'All time';
  if (fromDate) {
    periodRange = fromDate;
    if (toDate && toDate !== fromDate) {
      periodRange += ' to ' + toDate;
    }
  }

  return {
    generatedAt, overallTotal, periodTotal, periodSuccess, periodFailed, periodPending, periodRange,

    // Structured rows with clear column headers: Label | Value | Notes
    infoRows: [
      ['Field',            'Value',           ''],
      ['Report Title',     `Migration ${reportType} Report`, ''],
      ['Table',            tableLabel,        ''],
      ['Report Type',      reportType,        ''],
      ['Period',           periodRange,       ''],
      ['Generated At',     generatedAt,       ''],
    ],

    overallRows: [
      ['Metric',                       'Count',         'Notes'],
      ['Total Records in Database',    fmt(overallTotal), 'All records across all time'],
    ],

    periodRows: [
      ['Metric',                       'Count',          'Percentage / Notes'],
      ['Records in Period',            fmt(periodTotal),  pct(periodTotal, overallTotal) + ' of total DB'],
      ['Successfully Migrated',        fmt(periodSuccess), pct(periodSuccess, periodTotal) + ' of period records'],      ['Failed',                       fmt(periodFailed),  pct(periodFailed, periodTotal) + ' of period records'],
      ['Pending',                      fmt(periodPending), pct(periodPending, periodTotal) + ' of period records'],
    ],

    progressRows: [
      ['Progress Metric',                     'Value',                   'Notes'],
      ['% of DB Migrated (Success)',           pct(periodSuccess, overallTotal), `${fmt(periodSuccess)} out of ${fmt(overallTotal)}`],
      ['% of DB Failed',                       pct(periodFailed, overallTotal),  `${fmt(periodFailed)} out of ${fmt(overallTotal)}`],
      ['Remaining (not yet migrated)',         fmt(overallTotal - periodSuccess), 'Total DB minus successful'],
    ],

    failedRows: [
      ['#', 'Document ID', 'Migration Status', 'Migrated Date'],
      ...failedRecords.map((r, i) => [
        i + 1,
        getDocId(r),
        getStatus(r) || 'Failed',
        getMigratedDate(r),
      ]),
    ],
  }
}

// ── Excel ─────────────────────────────────────────────────────────────────────

export function generateSummaryExcel(opts) {
  const { tableLabel, fromDate, toDate, totalRecords, periodRecords, failedRecords } = opts
  const reportType = opts.reportType || detectReportType(fromDate, toDate)
  const { infoRows, overallRows, periodRows, progressRows, failedRows } = buildSummaryRows(
    { tableLabel, reportType, fromDate, toDate, totalRecords, periodRecords, failedRecords }
  )

  // Sheet 1 — Summary
  const gap = [[]]
  const summaryData = [
    ...infoRows, ...gap,
    ['OVERALL DATABASE'], ...overallRows, ...gap,
    ['PERIOD SUMMARY'], ...periodRows, ...gap,
    ['MIGRATION PROGRESS'], ...progressRows,
  ]

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  wsSummary['!cols'] = [{ wch: 36 }, { wch: 22 }, { wch: 36 }]

  // Sheet 2 — Failed IDs
  const wsFailed = XLSX.utils.aoa_to_sheet(failedRows)
  wsFailed['!cols'] = [{ wch: 5 }, { wch: 44 }, { wch: 20 }, { wch: 26 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')
  XLSX.utils.book_append_sheet(wb, wsFailed, 'Failed IDs')

  const filename = `Migration_${reportType}_Report_${(fromDate || 'overall').replace(/-/g, '')}.xlsx`
  XLSX.writeFile(wb, filename)
}

// ── CSV ───────────────────────────────────────────────────────────────────────

export function generateSummaryCSV(opts) {
  const { tableLabel, fromDate, toDate, totalRecords, periodRecords, failedRecords } = opts
  const reportType = opts.reportType || detectReportType(fromDate, toDate)
  const { infoRows, overallRows, periodRows, progressRows, failedRows } = buildSummaryRows(
    { tableLabel, reportType, fromDate, toDate, totalRecords, periodRecords, failedRecords }
  )

  const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const toLine = row => row.map(esc).join(',')
  const gap = ['']

  const lines = [
    '=== SUMMARY ===',
    ...infoRows.map(toLine), gap,
    'OVERALL DATABASE', ...overallRows.map(toLine), gap,
    'PERIOD SUMMARY', ...periodRows.map(toLine), gap,
    'MIGRATION PROGRESS', ...progressRows.map(toLine), gap, gap,
    '=== FAILED IDs ===',
    ...failedRows.map(toLine),
  ]

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Migration_${reportType}_Report_${(fromDate || 'overall').replace(/-/g, '')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── PDF ───────────────────────────────────────────────────────────────────────

export function generateSummaryPDF(opts) {
  const { tableLabel, fromDate, toDate, totalRecords, periodRecords, failedRecords } = opts
  const reportType = opts.reportType || detectReportType(fromDate, toDate)
  const { generatedAt, overallRows, periodRows, progressRows, failedRows, periodRange } =
    buildSummaryRows({ tableLabel, reportType, fromDate, toDate, totalRecords, periodRecords, failedRecords })

  const doc = new jsPDF({ orientation: 'portrait' })
  let y = 16

  doc.setFontSize(15); doc.setFont(undefined, 'bold')
  doc.text(`Migration ${reportType} Report`, 14, y); y += 8

  doc.setFontSize(9); doc.setFont(undefined, 'normal'); doc.setTextColor(100)
  doc.text(`Table: ${tableLabel}   |   Period: ${periodRange}   |   Generated: ${generatedAt}`, 14, y); y += 8

  doc.setTextColor(30)

  const tableStyle = {
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  }

  doc.setFontSize(10); doc.setFont(undefined, 'bold')
  doc.text('Overall Database', 14, y); y += 4
  autoTable(doc, { head: [overallRows[0]], body: overallRows.slice(1), startY: y, ...tableStyle })
  y = doc.lastAutoTable.finalY + 8

  doc.setFontSize(10); doc.setFont(undefined, 'bold')
  doc.text('Period Summary', 14, y); y += 4
  autoTable(doc, { head: [periodRows[0]], body: periodRows.slice(1), startY: y, ...tableStyle })
  y = doc.lastAutoTable.finalY + 8

  doc.setFontSize(10); doc.setFont(undefined, 'bold')
  doc.text('Migration Progress', 14, y); y += 4
  autoTable(doc, { head: [progressRows[0]], body: progressRows.slice(1), startY: y, ...tableStyle })
  y = doc.lastAutoTable.finalY + 10

  if (failedRows.length > 1) {
    doc.setFontSize(10); doc.setFont(undefined, 'bold')
    doc.text('Failed Document IDs', 14, y); y += 4
    autoTable(doc, { head: [failedRows[0]], body: failedRows.slice(1), startY: y, ...tableStyle })
  }

  doc.save(`Migration_${reportType}_Report_${(fromDate || 'overall').replace(/-/g, '')}.pdf`)
}

// keep old export for any remaining usage
export { generateSummaryExcel as generateSummaryReport }
