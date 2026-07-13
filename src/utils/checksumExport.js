import * as XLSX from 'xlsx'

function getRecordColumns(records) {
  if (!records || records.length === 0) return []
  const isCustomCol = k => (k.startsWith('u') && k.includes('_')) || k === 'filefullpath'
  const customKeys = Object.keys(records[0]).filter(isCustomCol)
  const formatHeader = (key) => {
    if (key === 'filefullpath') return 'File Path'
    if (key.startsWith('u') && key.includes('_')) {
      return key.substring(key.indexOf('_') + 1).replace(/_/g, ' ').toUpperCase()
    }
    return key.replace(/_/g, ' ').toUpperCase()
  }

  return [
    { key: 'documentid', label: 'Document ID' },
    { key: 'object_class_id', label: 'Document Class' },
    ...customKeys.map(k => ({ key: k, label: formatHeader(k) })),
    { key: 'filename', label: 'File Name' },
    { key: 'checksumbefore', label: 'Checksum Before' },
    { key: 'checksumafter', label: 'Checksum After' },
    { key: 'checksum_status', label: 'Status' }
  ]
}

function buildRows(records) {
  if (!records || records.length === 0) return { headers: [], rows: [] }
  const cols = getRecordColumns(records)
  const headers = ['S.No', ...cols.map(c => c.label)]
  let sno = 1
  const rows = records.map(r => {
    return [
      sno++,
      ...cols.map(c => {
        const val = r[c.key]
        if (val == null) return ''
        return String(val)
      })
    ]
  })
  return { headers, rows }
}

export function generateChecksumExcel({ records }, meta) {
  const { headers, rows } = buildRows(records)
  const titleRow = ['Checksum Validation Records']
  const blankRow = []
  const ws = XLSX.utils.aoa_to_sheet([titleRow, blankRow, headers, ...rows])

  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }]
  ws['!cols'] = headers.map((h, i) => ({ wch: i === 1 ? 40 : 18 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Checksum Records')

  XLSX.writeFile(wb, `Checksum_Report_${(meta.fromDate || 'overall').replace(/-/g, '')}.xlsx`)
}

export function generateChecksumCSV({ records }, meta) {
  const { headers, rows } = buildRows(records)
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
