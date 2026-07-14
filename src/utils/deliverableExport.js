import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const AGGREGATED_HEADERS = [
  'S.No', 'Object Stores', 'Documentation Class',
  'Total No Documents', 'Total Files Size (in GB)', 'No. Extracted(FileNet)',
  'No. Extraction Failed', 'No. Remaining', 'Extracted File Size (in GB)',
  '% Completion', '% Failed'
]

function getRecordColumns(data, meta) {
  if (!data || data.length === 0) return []
  const reconProps = meta?.reconProps || {
    customMetadata: []
  }
  const formatHeader = (key) => {
    const k = key.toLowerCase()
    if (k === 'filefullpath') return 'File Path'
    if (k.startsWith('u') && k.includes('_')) {
      return k.substring(k.indexOf('_') + 1).replace(/_/g, ' ').toUpperCase()
    }
    return key.replace(/_/g, ' ').toUpperCase()
  }
  const hasWildcard = !reconProps.customMetadata || reconProps.customMetadata.length === 0 || reconProps.customMetadata.includes('*');
  const visible = meta.visibleCustomColumns || new Set();
  
  const customCols = hasWildcard
    ? (() => {
        const isCustomCol = k => {
            if (k.toLowerCase().includes('objectstorename')) return false;
            return (k.startsWith('u') && k.includes('_')) || k === 'filefullpath' || k === 'folderpath';
        };
        const keys = Object.keys(data[0]).filter(isCustomCol);
        return keys.filter(k => visible.size === 0 || visible.has(k)).map(k => ({ key: k.toLowerCase(), label: formatHeader(k) }));
      })()
    : (reconProps.customMetadata || []).filter(k => visible.size === 0 || visible.has(k.toLowerCase()) || visible.has(k)).map(k => ({ key: k.toLowerCase(), label: formatHeader(k) }))
  const hasFailed = data.some(r => String(r.migration_status ?? '').toLowerCase() === 'failed')

  return [
    { key: 'application', label: 'Application' },
    { key: 'objectStore', label: 'Object Store' },
    { key: 'object_id', label: 'Source Document GUID' },
    { key: 'mime_type', label: 'MIME Type' },
    { key: 'content_size', label: 'Size (KB)' },
    { key: 'migrated_date', label: 'Migration Date' },
    { key: 'p8_doc_id', label: 'Target Document GUID' },
    { key: 'migration_status', label: 'Migration Status' },
    ...customCols,
    ...(hasFailed ? [{ key: 'error_info', label: 'Error Info' }] : [])
  ]
}

function buildRows(data, meta) {
  if (!data || data.length === 0) return { headers: [], rows: [] }
  const isAggregated = data[0].isAggregated ?? true

  if (isAggregated) {
    let sno = 1
    let lastApp = null
    const rows = data.map(r => {
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
    return { headers: AGGREGATED_HEADERS, rows }
  } else {
    const cols = getRecordColumns(data, meta)
    const headers = cols.map(c => c.label)
    const rows = data.map(r => {
      return cols.map(c => {
        let val = r[c.key] || r[c.key.toUpperCase()] || r[c.key.toLowerCase()]
        if (c.key === 'application' && !val && meta.selectedAppName) val = meta.selectedAppName;
        if (val == null) return ''
        return String(val)
      })
    })
    return { headers, rows }
  }
}

export function exportDeliverableExcel(data, meta = {}) {
  const { headers, rows } = buildRows(data, meta)
  const isAggregated = data && data[0] && (data[0].isAggregated ?? true)
  const titleText = isAggregated ? 'Total control Reconciliation Report' : 'Migration Reconciliation Records'
  const titleRow = [titleText]
  const ws = XLSX.utils.aoa_to_sheet([titleRow, headers, ...rows])

  // Merge title across all columns
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }]
  ws['!cols'] = headers.map((h, i) => ({ wch: i === 2 ? 32 : i === 1 ? 20 : 18 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Reconciliation Report')
  XLSX.writeFile(wb, 'total_control_reconciliation_report.xlsx')
}

export function exportDeliverableCSV(data, meta = {}) {
  const { headers, rows } = buildRows(data, meta)
  const isAggregated = data && data[0] && (data[0].isAggregated ?? true)
  const titleText = isAggregated ? 'Total control Reconciliation Report' : 'Migration Reconciliation Records'
  const escape = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const lines = [
    [titleText].map(escape).join(','),
    headers.map(escape).join(','),
    ...rows.map(r => r.map(escape).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'total_control_reconciliation_report.csv'; a.click()
  URL.revokeObjectURL(url)
}

export function exportDeliverablePDF(data, meta = {}) {
  const { headers, rows } = buildRows(data)
  const isAggregated = data && data[0] && (data[0].isAggregated ?? true)
  const titleText = isAggregated ? 'Total control Reconciliation Report' : 'Migration Reconciliation Records'
  const doc = new jsPDF({ orientation: 'landscape' })

  doc.setFontSize(14)
  doc.setTextColor(31, 41, 55)
  doc.text(titleText, 14, 16)

  if (meta.generatedAt) {
    doc.setFontSize(8)
    doc.setTextColor(107, 114, 128)
    doc.text('Generated: ' + meta.generatedAt, 14, 22)
  }

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 26,
    styles: { fontSize: 6.5, cellPadding: 2 },
    headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 10, right: 10 },
    didParseCell(data) {
      if (isAggregated && data.section === 'body' && data.column.index === 1 && data.cell.raw !== '') {
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  doc.save('total_control_reconciliation_report.pdf')
}
