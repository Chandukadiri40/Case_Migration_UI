import * as XLSX from '@e965/xlsx'

function getRecordColumns(records) {
  if (!records || records.length === 0) return []
  // No custom metadata as requested

  return [
    { key: 'application', label: 'Application' },
    { key: 'object_store', label: 'Object Store' },
    { key: 'documentid', label: 'Source Document GUID' },
    { key: 'mime_type', label: 'MIME Type' },
    { key: 'content_size', label: 'Size (KB)' },
    { key: 'migrated_date', label: 'Migration Date' },
    { key: 'p8_doc_id', label: 'Target Document GUID' },
    { key: 'checksumbefore', label: 'Source CheckSum' },
    { key: 'checksumafter', label: 'Target CheckSum' },
    { key: 'checksum_status', label: 'Validation Status' }
  ]
}

const processCellValue = (r, c, val, meta) => {
  if (c.key === 'application' && !val && meta?.selectedAppName) return meta.selectedAppName;
  if (c.key === 'object_store' && !val && r['objectstorename']) return r['objectstorename'];
  if (c.key === 'content_size' && val) return (Number(val) / 1024).toFixed(2);
  if (c.key === 'checksum_status') {
      const isMatched = val?.toLowerCase() === 'completed' || val?.toLowerCase() === 'matched';
      return isMatched ? 'Matched' : 'MisMatched';
  }
  return val == null ? '' : String(val);
}

function buildRows(records, meta) {
  if (!records || records.length === 0) return { headers: [], rows: [] }
  const cols = getRecordColumns(records)
  const headers = cols.map(c => c.label)
  const rows = records.map(r => {
    return cols.map(c => {
      const val = r[c.key] || r[c.key?.toUpperCase()] || r[c.key?.toLowerCase()];
      return processCellValue(r, c, val, meta);
    })
  })
  return { headers, rows }
}

export function generateChecksumExcel({ records }, meta) {
  const { headers, rows } = buildRows(records, meta)
  const titleRow = ['CheckSum Validation Report']
  const blankRow = []
  const ws = XLSX.utils.aoa_to_sheet([titleRow, blankRow, headers, ...rows])

  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }]
  ws['!cols'] = headers.map((h, i) => ({ wch: i === 1 ? 40 : 18 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Checksum Records')

  XLSX.writeFile(wb, `Checksum_Report_${(meta.fromDate || 'overall').replace(/-/g, '')}.xlsx`)
}

export function generateChecksumCSV({ records }, meta) {
  const { headers, rows } = buildRows(records, meta)
  const escape = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const lines = [
    ['Checksum Validation Records'].map(escape).join(','),
    '',
    headers.map(escape).join(','),
    ...rows.map(r => r.map(escape).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Checksum_Report_${(meta.fromDate || 'overall').replace(/-/g, '')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
