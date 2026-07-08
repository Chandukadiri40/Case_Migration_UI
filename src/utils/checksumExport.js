import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function fmt(n) { return (n ?? 0).toLocaleString() }
function pct(n, total) { return total > 0 ? ((n / total) * 100).toFixed(2) + '%' : '0.00%' }

function getFailedRecords(records) {
  return records.filter(r => r.checksumStatus?.toLowerCase() !== 'completed')
}

function buildSummaryRows({ summary, meta }) {
  const { total = 0, completed = 0, pending = 0 } = summary
  const { fromDate, toDate, generatedAt } = meta
  const period = fromDate ? `${fromDate}${toDate ? ' to ' + toDate : ''}` : 'All time'

  return [
    ['Checksum Validation Report'],
    [],
    ['Period',       period],
    ['Generated At', generatedAt],
    [],
    ['Status',                    'Count',       '%'],
    ['Total Records',             fmt(total),    '100%'],
    ['Checksum Success',          fmt(completed), pct(completed, total)],
    ['Checksum Failed',           fmt(pending),   pct(pending, total)],
  ]
}

function buildFailedRows(records) {
  const failed = getFailedRecords(records)
  return {
    headers: ['#', 'Document ID', 'File Name', 'Checksum Status'],
    rows: failed.map((r, i) => [
      i + 1,
      r.documentId     ?? '—',
      r.fileName       ?? '—',
      r.checksumStatus ?? '—',
    ]),
  }
}

// ── Excel ─────────────────────────────────────────────────────────────────────

export function generateChecksumExcel({ summary, records }, meta) {
  const sumRows = buildSummaryRows({ summary, meta })
  const { headers, rows } = buildFailedRows(records)

  const wsSummary = XLSX.utils.aoa_to_sheet(sumRows)
  wsSummary['!cols'] = [{ wch: 36 }, { wch: 18 }, { wch: 12 }]

  const wsFailed = XLSX.utils.aoa_to_sheet([headers, ...rows])
  wsFailed['!cols'] = [{ wch: 5 }, { wch: 42 }, { wch: 40 }, { wch: 20 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')
  XLSX.utils.book_append_sheet(wb, wsFailed, 'Failed IDs')

  XLSX.writeFile(wb, `Checksum_Report_${(meta.fromDate || 'overall').replace(/-/g, '')}.xlsx`)
}

// ── CSV ───────────────────────────────────────────────────────────────────────

export function generateChecksumCSV({ summary, records }, meta) {
  const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const toLine = row => row.map(esc).join(',')

  const sumRows = buildSummaryRows({ summary, meta })
  const { headers, rows } = buildFailedRows(records)

  const lines = [
    ...sumRows.map(toLine),
    '', '',
    '=== FAILED IDs ===',
    toLine(headers),
    ...rows.map(toLine),
  ]

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Checksum_Report_${(meta.fromDate || 'overall').replace(/-/g, '')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── PDF ───────────────────────────────────────────────────────────────────────

export function generateChecksumPDF({ summary, records }, meta) {
  const { total = 0, completed = 0, pending = 0 } = summary
  const { fromDate, toDate, generatedAt } = meta
  const period = fromDate ? `${fromDate}${toDate ? ' to ' + toDate : ''}` : 'All time'
  const { headers, rows } = buildFailedRows(records)

  const doc = new jsPDF({ orientation: 'portrait' })
  let y = 16

  doc.setFontSize(14); doc.setFont(undefined, 'bold')
  doc.text('Checksum Validation Report', 14, y); y += 8

  doc.setFontSize(9); doc.setFont(undefined, 'normal'); doc.setTextColor(100)
  doc.text(`Period: ${period}   |   Generated: ${generatedAt}`, 14, y); y += 8
  doc.setTextColor(30)

  const style = {
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  }

  autoTable(doc, {
    head: [['Status', 'Count', '%']],
    body: [
      ['Total Records',    fmt(total),     '100%'],
      ['Checksum Success', fmt(completed), pct(completed, total)],
      ['Checksum Failed',  fmt(pending),   pct(pending, total)],
    ],
    startY: y, ...style,
  })
  y = doc.lastAutoTable.finalY + 10

  if (rows.length > 0) {
    doc.setFontSize(10); doc.setFont(undefined, 'bold')
    doc.text('Failed / Pending Document IDs', 14, y); y += 4
    autoTable(doc, { head: [headers], body: rows, startY: y, ...style })
  }

  doc.save(`Checksum_Report_${(meta.fromDate || 'overall').replace(/-/g, '')}.pdf`)
}
