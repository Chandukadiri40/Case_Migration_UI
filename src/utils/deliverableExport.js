import * as XLSX from '@e965/xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const AGGREGATED_HEADERS = [
  'S.No', 'Object Stores', 'Documentation Class',
  'Total No Documents', 'Total Files Size (in GB)', 'No. Extracted(FileNet)',
  'No. Extraction Failed', 'No. Remaining', 'Extracted File Size (in GB)',
  '% Completion', '% Failed'
]

function formatHeader(key) {
  const k = key.toLowerCase()
  if (k === 'filefullpath') return 'File Path'
  if (k.startsWith('u') && k.includes('_')) {
    return k.substring(k.indexOf('_') + 1).replace(/_/g, ' ').toUpperCase()
  }
  return key.replace(/_/g, ' ').toUpperCase()
}

function getCustomColumns(data, meta) {
  if (meta && meta.allCustomColumns && meta.allCustomColumns.length > 0) {
    return meta.allCustomColumns.map(k => ({ key: k.toLowerCase(), label: formatHeader(k) }));
  }

  const visible = meta && meta.visibleCustomColumns ? meta.visibleCustomColumns : new Set();
  const isCustomCol = k => {
    if (k.toLowerCase().includes('objectstorename')) return false;
    return (k.startsWith('u') && k.includes('_')) || k === 'filefullpath' || k === 'folderpath' || visible.has(k);
  };
  const keys = Object.keys(data[0]).filter(isCustomCol);
  const customCols = keys;

  customCols.sort((a, b) => {
    const cleanA = a.replace(/^(U[0-9a-f]+_)/i, '').toLowerCase();
    const cleanB = b.replace(/^(U[0-9a-f]+_)/i, '').toLowerCase();
    if (cleanA.includes('documenttitle') && !cleanB.includes('documenttitle')) return -1;
    if (!cleanA.includes('documenttitle') && cleanB.includes('documenttitle')) return 1;
    return cleanA.localeCompare(cleanB);
  });

  return customCols.map(k => ({ key: k.toLowerCase(), label: formatHeader(k) }));
}

function getRecordColumns(data, meta) {
  if (!data || data.length === 0) return []

  const customCols = getCustomColumns(data, meta);
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
    ...(hasFailed ? [{ key: 'error_info', label: 'Error Info' }] : []),
    ...customCols
  ]
}

function buildAggregatedRows(data) {
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
}

function getCellValueExport(r, cKey, selectedAppName) {
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

function buildRecordRows(data, meta) {
  const cols = getRecordColumns(data, meta)
  const headers = cols.map(c => c.label)
  const rows = data.map(r => {
    return cols.map(c => {
      let val = getCellValueExport(r, c.key, meta.selectedAppName);
      if (val == null) return ''
      return String(val)
    })
  })
  return { headers, rows }
}

function buildRows(data, meta) {
  if (!data || data.length === 0) return { headers: [], rows: [] }
  const isAggregated = data[0].isAggregated ?? true

  if (isAggregated) {
    return buildAggregatedRows(data);
  } else {
    return buildRecordRows(data, meta);
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
  ws['!cols'] = headers.map((h, i) => {
    let width = 18;
    if (i === 1) width = 20;
    if (i === 2) width = 32;
    return { wch: width };
  })

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
