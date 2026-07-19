import * as XLSX from '@e965/xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function toRows(data, visibleKeys, allColumns) {
  const keys = new Set(visibleKeys)
  const cols = allColumns.filter(c => keys.has(c.key))
  return {
    headers: cols.map(c => c.label),
    rows: data.map(r => cols.map(c => r[c.key] ?? '')),
  }
}

function filterSummaryLines(appliedFilters) {
  if (!appliedFilters) return []
  return Object.entries(appliedFilters)
    .filter(([, v]) => v && v !== 'All' && v !== '' && !Array.isArray(v))
    .map(([k, v]) => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) + ': ' + v)
}

export function exportToExcel(data, visibleKeys, allColumns, summary, meta = {}, filename = 'migration_report') {
  const { headers, rows } = toRows(data, visibleKeys, allColumns)
  const { tableLabel = '', appliedFilters = {}, generatedAt = new Date().toLocaleString() } = meta

  const filterLines = filterSummaryLines(appliedFilters)
  const metaRows = [
    ['Migration Report Dashboard'],
    ['Table:', tableLabel],
    ['Generated:', generatedAt],
    [],
    ['Summary'],
    ['Total', summary?.total ?? 0],
    ['Successful', summary?.success ?? 0],
    ['Failed', summary?.failed ?? 0],
    ...(filterLines.length ? [[], ['Applied Filters'], ...filterLines.map(l => [l])] : []),
    [],
  ]

  const ws = XLSX.utils.aoa_to_sheet([...metaRows, headers, ...rows])
  ws['!cols'] = [headers, ...rows][0]?.map(() => ({ wch: 20 })) ?? []

  // Style header row (bold)
  const headerRowIdx = metaRows.length
  headers.forEach((_, ci) => {
    const cellRef = XLSX.utils.encode_cell({ r: headerRowIdx, c: ci })
    if (!ws[cellRef]) return
    ws[cellRef].s = { font: { bold: true }, fill: { fgColor: { rgb: '2563EB' } } }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Migration Report')
  XLSX.writeFile(wb, filename + '.xlsx')
}

export function exportToCSV(data, visibleKeys, allColumns, summary, meta = {}, filename = 'migration_report') {
  const { headers, rows } = toRows(data, visibleKeys, allColumns)
  const { tableLabel = '', appliedFilters = {}, generatedAt = new Date().toLocaleString() } = meta

  const filterLines = filterSummaryLines(appliedFilters)
  const escape = v => '"' + String(v).replace(/"/g, '""') + '"'

  const metaSection = [
    ['Migration Report Dashboard'],
    ['Table', tableLabel],
    ['Generated', generatedAt],
    [''],
    ['Total', summary?.total ?? 0],
    ['Successful', summary?.success ?? 0],
    ['Failed', summary?.failed ?? 0],
    ...(filterLines.length ? [['Applied Filters'], ...filterLines.map(l => [l])] : []),
    [''],
  ].map(r => r.map(escape).join(','))

  const dataSection = [headers, ...rows].map(r => r.map(escape).join(','))
  const blob = new Blob([[...metaSection, ...dataSection].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename + '.csv'; a.click()
  URL.revokeObjectURL(url)
}

export function exportToPDF(data, visibleKeys, allColumns, summary, meta = {}, filename = 'migration_report') {
  const { headers, rows } = toRows(data, visibleKeys, allColumns)
  const { tableLabel = '', appliedFilters = {}, generatedAt = new Date().toLocaleString() } = meta

  const doc = new jsPDF({ orientation: 'landscape' })
  let y = 14

  // Title
  doc.setFontSize(16)
  doc.setTextColor(31, 41, 55)
  doc.text('Migration Report Dashboard', 14, y); y += 8

  // Table + date
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  if (tableLabel) { doc.text('Table: ' + tableLabel, 14, y); y += 5 }
  doc.text('Generated: ' + generatedAt, 14, y); y += 7

  // Summary box
  doc.setFontSize(10)
  doc.setTextColor(31, 41, 55)
  const summaryText = [
    'Total: ' + (summary?.total ?? 0),
    'Success: ' + (summary?.success ?? 0),
    'Failed: ' + (summary?.failed ?? 0),
    'Pending: ' + (summary?.pending ?? 0),
  ].join('     ')
  doc.text(summaryText, 14, y); y += 7

  // Applied filters
  const filterLines = filterSummaryLines(appliedFilters)
  if (filterLines.length) {
    doc.setFontSize(8)
    doc.setTextColor(107, 114, 128)
    doc.text('Filters: ' + filterLines.join(' | '), 14, y); y += 6
  }

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: y,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 14, right: 14 },
  })

  doc.save(filename + '.pdf')
}
