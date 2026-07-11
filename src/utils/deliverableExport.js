import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const HEADERS = [
  'S.No', 'Object Stores', 'Documentation Class',
  'Total No Documents', 'Total Files Size (in GB)', 'No. Extracted(FileNet)',
  'No. Extraction Failed', 'No. Remaining', 'Extracted File Size (in GB)',
  '% Completion', '% Failed'
]

function buildRows(data) {
  let sno = 1
  let lastApp = null
  return data.map(r => {
    const appCell = r.objectStore !== lastApp ? r.objectStore : ''
    lastApp = r.objectStore
    return [
      sno++,
      appCell,
      r.documentClass,
      r.totalDocuments,
      Number(r.totalFileSizeGb).toFixed(2),
      r.extractedFileNet,
      r.extractionFailed,
      r.remaining,
      Number(r.extractedFileSizeGb).toFixed(2),
      Number(r.percentCompletion).toFixed(1) + '%',
      Number(r.percentFailed).toFixed(1) + '%',
    ]
  })
}

export function exportDeliverableExcel(data, meta = {}) {
  const rows = buildRows(data)
  const titleRow = ['FileNet to Alfresco Migration']
  const blankRow = []
  const ws = XLSX.utils.aoa_to_sheet([titleRow, blankRow, HEADERS, ...rows])

  // Merge title across all columns
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: HEADERS.length - 1 } }]
  ws['!cols'] = HEADERS.map((h, i) => ({ wch: i === 2 ? 32 : i === 1 ? 20 : 18 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Migration Report')
  XLSX.writeFile(wb, 'migration_deliverable_report.xlsx')
}

export function exportDeliverableCSV(data, meta = {}) {
  const rows = buildRows(data)
  const escape = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const lines = [
    ['FileNet to Alfresco Migration'].map(escape).join(','),
    '',
    HEADERS.map(escape).join(','),
    ...rows.map(r => r.map(escape).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'migration_deliverable_report.csv'; a.click()
  URL.revokeObjectURL(url)
}

export function exportDeliverablePDF(data, meta = {}) {
  const rows = buildRows(data)
  const doc = new jsPDF({ orientation: 'landscape' })

  doc.setFontSize(14)
  doc.setTextColor(31, 41, 55)
  doc.text('FileNet to Alfresco Migration', 14, 16)

  if (meta.generatedAt) {
    doc.setFontSize(8)
    doc.setTextColor(107, 114, 128)
    doc.text('Generated: ' + meta.generatedAt, 14, 22)
  }

  autoTable(doc, {
    head: [HEADERS],
    body: rows,
    startY: 26,
    styles: { fontSize: 6.5, cellPadding: 2 },
    headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 10, right: 10 },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 1 && data.cell.raw !== '') {
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  doc.save('migration_deliverable_report.pdf')
}
