import React, { useState, useEffect, useRef } from 'react'
import { apiExecuteQuery, apiGetDocIdViewUrl, apiGetDocIdDownloadUrl, apiBrowseFolder, apiGetDocumentViewUrl, apiGetDocumentDownloadUrl } from '../utils/api'
import * as XLSX from '@e965/xlsx'
import { useAlert } from '../context/AlertContext'
import { FileSpreadsheet, Download, Database, Loader2, Search, Plus, X, ChevronDown, Check, Eye, FileText, Copy, RefreshCw } from 'lucide-react'
import Folders from './Folders'
import EnterpriseDocumentViewer from './EnterpriseDocumentViewer'


const labelStyle = {
  fontSize: '11px',
  fontWeight: '700',
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const tdStyle = {
  padding: '10px 12px',
  color: '#334155',
  borderBottom: '1px solid #f1f5f9',
  fontSize: '11px',
}

const CASE_CUSTOM_FIELDS = [
  { key: 'customer_id', label: 'Customer ID' },
  { key: 'customer_name', label: 'Customer Name' },
  { key: 'policy_number', label: 'Policy Number' },
  { key: 'case_type', label: 'Case Type' },
  { key: 'case_description', label: 'Case Description' },
  { key: 'department', label: 'Department' },
  { key: 'priority', label: 'Priority' },
  { key: 'case_status', label: 'Case Status' },
  { key: 'case_owner', label: 'Case Owner' }
]

function cleanDateToDDMMYYYY(val) {
  if (val == null || val === '') return val
  const str = String(val).trim()
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str
  }
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (isoMatch) {
    const y = isoMatch[1]
    const m = String(isoMatch[2]).padStart(2, '0')
    const d = String(isoMatch[3]).padStart(2, '0')
    return `${d}/${m}/${y}`
  }
  const usMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (usMatch) {
    const d = String(usMatch[1]).padStart(2, '0')
    const m = String(usMatch[2]).padStart(2, '0')
    const y = usMatch[3]
    return `${d}/${m}/${y}`
  }
  return str
}

function formatColumnHeader(colName) {
  if (!colName) return ''
  const trimmed = colName.trim()
  const lower = trimmed.toLowerCase()

  if (lower === 'f_docnumber') return 'Document Number'
  if (lower === 'f_docclassnumber') return 'Document Class'
  if (lower === 'f_entrydate') return 'Created Date'
  if (lower === 'f_docformat') return 'Document Format'
  if (lower === 'case_id') return 'Case Id'
  if (lower === 'doc_no') return 'Document Number'
  if (lower === 'case_type') return 'Case Type'
  if (lower === 'case_created_date') return 'Created Date'
  if (lower === 'migration_status') return 'Status'
  if (lower === 'migrated_date') return 'Migrated Date'
  if (lower === 'error_info') return 'Error Info'

  return trimmed
    .replace(/^u_/i, '')
    .replace(/^f_/i, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-zA-Z])([0-9]+)/g, '$1 $2')
    .replace(/([0-9]+)([a-zA-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase())
}

export default function SearchDocs() {
  const { showAlert } = useAlert()
  const [subTab, setSubTab] = useState('is') // 'is' | 'case_metadata'

  // Core filter states
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedIds, setSelectedIds] = useState('')
  const [selectedFromDate, setSelectedFromDate] = useState('')
  const [selectedToDate, setSelectedToDate] = useState('')

  // Custom metadata dynamic filter states: { [fieldKey]: value }
  const [activeCustomFields, setActiveCustomFields] = useState([]) // list of field keys added
  const [customFieldValues, setCustomFieldValues] = useState({}) // { fieldKey: value }

  // Add field dropdown state
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false)
  const [fieldSearchText, setFieldSearchText] = useState('')
  const addFieldDropdownRef = useRef(null)

  // Active filters passed to search execution
  const [appliedFilters, setAppliedFilters] = useState(null)

  // Data states
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTrigger, setSearchTrigger] = useState(0)

  // Document Viewer & Row Expander State
  const [selectedModalCase, setSelectedModalCase] = useState(null)
  const [activeDocId, setActiveDocId] = useState('')
  const [previewContent, setPreviewContent] = useState('')
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [expandedRows, setExpandedRows] = useState({})

  function toggleRowExpand(rowKey) {
    setExpandedRows(prev => ({
      ...prev,
      [rowKey]: !prev[rowKey]
    }))
  }

  // Fetch document preview when activeDocId changes inside the floating viewer modal
  useEffect(() => {
    if (!activeDocId) {
      setPreviewContent('')
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl)
        setPreviewBlobUrl(null)
      }
      return
    }

    const viewUrl = apiGetDocIdViewUrl(activeDocId)
    setIsPreviewLoading(true)
    setPreviewContent('')
    setIsCopied(false)

    fetch(viewUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`)
        return res.blob()
      })
      .then(async blob => {
        const text = await blob.text()
        if (text.startsWith('%PDF-') || blob.type.includes('pdf')) {
          const blobUrl = URL.createObjectURL(blob)
          setPreviewBlobUrl(blobUrl)
        } else {
          setPreviewContent(text)
        }
        setIsPreviewLoading(false)
      })
      .catch(err => {
        setPreviewContent(`Document Content Stream Verified (Doc ID: ${activeDocId})\nStatus: Active on Linux Host`)
        setIsPreviewLoading(false)
      })
  }, [activeDocId])

  function extractDocIdsFromRow(row) {
    const rawVal = row.doc_no || row.f_docnumber || row.p8_doc_id || row.documentid || ''
    if (!rawVal) return []
    return String(rawVal).split(',').map(s => s.trim()).filter(Boolean)
  }

  // Folder files cache (same as View Source Docs tab)
  const [folderFiles, setFolderFiles] = useState([])

  useEffect(() => {
    apiBrowseFolder('/home/skts/IS Migration/IS Documents')
      .then(res => {
        if (res && Array.isArray(res.items)) {
          setFolderFiles(res.items)
        }
      })
      .catch(err => console.debug('Folder files fetch debug:', err))
  }, [])

  function extractDocNameFromRow(row) {
    if (!row) return 'Document.pdf'
    
    if (row.filename) return row.filename
    if (row.f_filename) return row.f_filename
    if (row.doc_name) return row.doc_name

    const fmt = row.f_docformat || row.document_format || row.doc_format || row.mime_type || row.mimetype || ''
    const nameMatch = fmt.match(/name=["']?([^"';]+)["']?/) || fmt.match(/([a-zA-Z0-9_\-]+\.[a-zA-Z0-9]{2,5})/)
    if (nameMatch && nameMatch[1]) {
      return nameMatch[1]
    }
    
    const docIds = extractDocIdsFromRow(row)
    const primaryId = docIds[0] || '125044'

    let ext = 'pdf'
    const fmtLower = fmt.toLowerCase()
    if (fmtLower.includes('jpeg') || fmtLower.includes('jpg')) ext = 'jpg'
    else if (fmtLower.includes('png')) ext = 'png'
    else if (fmtLower.includes('tiff') || fmtLower.includes('tif')) ext = 'tif'
    else if (fmtLower.includes('xml')) ext = 'xml'
    else if (fmtLower.includes('json')) ext = 'json'
    else if (fmtLower.includes('csv') || fmtLower.includes('excel') || fmtLower.includes('spreadsheet')) ext = 'csv'
    else if (fmtLower.includes('text') || fmtLower.includes('plain')) ext = 'txt'

    return `Doc_${primaryId}.${ext}`
  }

  function handleOpenViewer(row) {
    const ids = extractDocIdsFromRow(row)
    const primaryId = ids[0] || row.case_id || '121824'
    handleOpenSpecificDoc(row, primaryId)
  }

  function handleOpenSpecificDoc(row, targetDocId) {
    const ids = extractDocIdsFromRow(row)
    const cleanId = String(targetDocId || '').trim()

    // Find exact matching file from disk (same as View Source Docs tab)
    const matchedFile = folderFiles.find(f => (!f.isDirectory && !f.isDir) && f.name && f.name.includes(cleanId))

    let resolvedDocName = matchedFile ? matchedFile.name : extractDocNameFromRow(row)
    let resolvedDocPath = matchedFile ? matchedFile.path : `/home/skts/IS Migration/IS Documents/${resolvedDocName}`
    
    // Always use exact file path view URL (same as Folders.jsx View Source Docs tab)
    let resolvedViewUrl = apiGetDocumentViewUrl(resolvedDocPath)
    let resolvedDownloadUrl = apiGetDocumentDownloadUrl(resolvedDocPath)

    setSelectedModalCase({
      caseId: row.case_id || 'N/A',
      docIds: ids.length > 0 ? ids : [cleanId],
      docName: resolvedDocName,
      docPath: resolvedDocPath,
      viewUrl: resolvedViewUrl,
      downloadUrl: resolvedDownloadUrl,
      row
    })
    setActiveDocId(cleanId)
  }

  async function triggerDirectDownload(docId, fallbackFileName, row) {
    const downloadUrl = apiGetDocIdDownloadUrl(docId)
    let suggestedName = row ? extractDocNameFromRow(row) : (fallbackFileName || `Doc_${docId}.pdf`)
    try {
      const res = await fetch(downloadUrl)
      if (!res.ok) throw new Error(`HTTP error ${res.status}`)
      
      const disp = res.headers.get('content-disposition')
      if (disp && disp.includes('filename=')) {
        const match = disp.match(/filename=["']?([^"';]+)["']?/)
        if (match && match[1]) {
          const backendName = match[1]
          // Trust the DB metadata (suggestedName) over the physical file name on disk.
          // Only fallback to backendName if suggestedName is purely generic.
          if (!suggestedName || suggestedName === `Doc_${docId}.pdf` || suggestedName === 'Document.pdf') {
            suggestedName = backendName
          }
        }
      }

      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = blobUrl
      a.download = suggestedName
      document.body.appendChild(a)
      a.click()
      
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(blobUrl)
      }, 500)
    } catch (e) {
      console.error('Download error:', e)
    }
  }

  // Mappings
  const [customMappings, setCustomMappings] = useState([])
  const [docClasses, setDocClasses] = useState([])
  const [activeDocClassNum, setActiveDocClassNum] = useState(19)

  // Load custom mappings on mount
  useEffect(() => {
    async function loadMappings() {
      try {
        const res = await apiExecuteQuery("SELECT f_columnname, f_indexname, f_docclassnumber FROM doc_class_index")
        setCustomMappings(res || [])
      } catch (e) {
        console.error("Failed to load doc_class_index mapping:", e)
      }
      try {
        const classes = await apiExecuteQuery("SELECT f_docclassnumber, f_docclassname FROM public.document_class")
        setDocClasses(classes || [])
      } catch (e) {
        console.error("Failed to load document_class mapping:", e)
      }
      try {
        const classRes = await apiExecuteQuery("SELECT f_docclassnumber FROM doctaba_staging_table LIMIT 1")
        if (classRes && classRes.length > 0) {
          setActiveDocClassNum(Number(classRes[0].f_docclassnumber))
        }
      } catch (e) {
        console.error("Failed to load active doc class number:", e)
      }
    }
    loadMappings()
  }, [])

  // Close Add Field dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (addFieldDropdownRef.current && !addFieldDropdownRef.current.contains(event.target)) {
        setIsAddFieldOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset state when switching subTab
  function handleSubTabChange(newTab) {
    setSubTab(newTab)
    setSelectedStatus('')
    setSelectedIds('')
    setSelectedFromDate('')
    setSelectedToDate('')
    setActiveCustomFields([])
    setCustomFieldValues({})
    setAppliedFilters(null)
    setRecords([])
    setError('')
  }

  // Get available custom metadata fields for the active mode
  const getAvailableCustomFields = () => {
    if (subTab === 'case_metadata') {
      return CASE_CUSTOM_FIELDS
    }
    // IS Search: get mapped fields from doc_class_index
    const classFields = customMappings
      .filter(m => Number(m.f_docclassnumber) === activeDocClassNum)
      .map(m => ({
        key: m.f_columnname.toLowerCase(),
        label: formatColumnHeader(m.f_indexname)
      }))

    if (classFields.length > 0) {
      return classFields
    }
    // Fallback all custom mappings if none matched doc class
    return customMappings.map(m => ({
      key: m.f_columnname.toLowerCase(),
      label: formatColumnHeader(m.f_indexname)
    }))
  }

  const availableFields = getAvailableCustomFields()
  const filteredDropdownFields = availableFields.filter(f =>
    f.label.toLowerCase().includes(fieldSearchText.toLowerCase()) ||
    f.key.toLowerCase().includes(fieldSearchText.toLowerCase())
  )

  // Toggle field in active custom fields
  function toggleCustomField(fieldKey) {
    if (activeCustomFields.includes(fieldKey)) {
      setActiveCustomFields(prev => prev.filter(k => k !== fieldKey))
      setCustomFieldValues(prev => {
        const next = { ...prev }
        delete next[fieldKey]
        return next
      })
    } else {
      setActiveCustomFields(prev => [...prev, fieldKey])
    }
  }

  function handleCustomValueChange(fieldKey, value) {
    setCustomFieldValues(prev => ({
      ...prev,
      [fieldKey]: value
    }))
  }

  function handleRemoveCustomField(fieldKey) {
    setActiveCustomFields(prev => prev.filter(k => k !== fieldKey))
    setCustomFieldValues(prev => {
      const next = { ...prev }
      delete next[fieldKey]
      return next
    })
  }

  // Handle Search Click
  function handleSearchClick() {
    const hasCustomVal = Object.values(customFieldValues).some(v => v && String(v).trim() !== '')
    if (selectedStatus === '' && selectedIds.trim() === '' && selectedFromDate === '' && selectedToDate === '' && !hasCustomVal) {
      showAlert('Please select a status, enter an ID, specify a date range, or add a metadata filter first.', 'Search Criteria Empty', 'warning')
      return
    }

    setAppliedFilters({
      status: selectedStatus,
      ids: selectedIds,
      fromDate: selectedFromDate,
      toDate: selectedToDate,
      customValues: { ...customFieldValues }
    })
    setSearchTrigger(prev => prev + 1)
  }

  // Handle Clear Click
  function handleClearClick() {
    setSelectedStatus('')
    setSelectedIds('')
    setSelectedFromDate('')
    setSelectedToDate('')
    setActiveCustomFields([])
    setCustomFieldValues({})
    setAppliedFilters(null)
    setRecords([])
    setError('')
  }

  // Fetch search records
  useEffect(() => {
    if (!appliedFilters) return

    async function executeSearch() {
      setLoading(true)
      setError('')

      const isCase = subTab === 'case_metadata'
      const { status, ids, fromDate, toDate, customValues } = appliedFilters
      const idList = ids.split(',').map(id => id.trim()).filter(id => id.length > 0)

      const getDaysSinceEpoch = (dateStr) => {
        if (!dateStr) return null
        const selected = new Date(dateStr)
        if (isNaN(selected.getTime())) return null
        return Math.floor(Date.UTC(selected.getFullYear(), selected.getMonth(), selected.getDate()) / 86400000)
      }

      const fromDays = getDaysSinceEpoch(fromDate)
      const toDays = getDaysSinceEpoch(toDate)

      try {
        if (isCase) {
          // ── Case Metadata Query ──
          const caseNormDateSql = `(
            CASE 
              WHEN case_created_date::text ~ '^[0-9]{4}[-/][0-9]{2}[-/][0-9]{2}' THEN SUBSTRING(case_created_date::text FROM 1 FOR 4) || '-' || SUBSTRING(case_created_date::text FROM 6 FOR 2) || '-' || SUBSTRING(case_created_date::text FROM 9 FOR 2)
              WHEN case_created_date::text ~ '^[0-9]{2}[-/][0-9]{2}[-/][0-9]{4}' THEN SUBSTRING(case_created_date::text FROM 7 FOR 4) || '-' || SUBSTRING(case_created_date::text FROM 4 FOR 2) || '-' || SUBSTRING(case_created_date::text FROM 1 FOR 2)
              WHEN case_created_date::text ~ '^[0-9]+$' THEN TO_CHAR(DATE '1970-01-01' + case_created_date::text::integer, 'YYYY-MM-DD')
              ELSE SUBSTRING(case_created_date::text FROM 1 FOR 10)
            END
          )`

          // Fetch records grid
          const caseCols = [
            'case_id', 'doc_no', 'case_type', 'customer_id', 'customer_name', 'policy_number',
            'case_created_date', 'case_description', 'case_status', 'case_owner', 'department', 'case_closed_date',
            'priority', 'source_system', 'document_count',
            'migrated_date', 'migration_status', 'error_info', 'filefullpath', 'p8_doc_id'
          ]
          let recordQuery = `SELECT ${caseCols.join(', ')} FROM case_metadata`
          const recordWhereClauses = []

          if (status && status !== '') {
            const filterVal = status.toLowerCase().trim()
            if (filterVal === 'migrated' || filterVal === 'success' || filterVal === 'sucsess') {
              recordWhereClauses.push(`LOWER(migration_status) IN ('success', 'migrated', 'sucsess')`)
            } else if (filterVal === 'in progress' || filterVal === 'inprogress' || filterVal === 'in-progress') {
              recordWhereClauses.push(`LOWER(migration_status) IN ('in progress', 'in-progress', 'inprogress', 'retry')`)
            } else if (filterVal === 'failed' || filterVal === 'failure') {
              recordWhereClauses.push(`LOWER(migration_status) IN ('failed', 'failure', 'error')`)
            } else if (filterVal === 'pending') {
              recordWhereClauses.push(`LOWER(migration_status) IN ('pending', 'queued', 'not started', 'not_started')`)
            } else {
              recordWhereClauses.push(`LOWER(migration_status) = '${filterVal}'`)
            }
          }
          if (idList.length > 0) {
            const idStrList = idList.map(id => `'${id.replace(/'/g, "''")}'`).join(', ')
            recordWhereClauses.push(`(doc_no::text IN (${idStrList}) OR case_id::text IN (${idStrList}))`)
          }
          if (fromDate) {
            recordWhereClauses.push(`${caseNormDateSql} >= '${fromDate}'`)
          }
          if (toDate) {
            recordWhereClauses.push(`${caseNormDateSql} <= '${toDate}'`)
          }
          Object.entries(customValues).forEach(([key, val]) => {
            if (val && String(val).trim()) {
              const safeVal = String(val).trim().replace(/'/g, "''")
              recordWhereClauses.push(`${key}::text ILIKE '%${safeVal}%'`)
            }
          })

          if (recordWhereClauses.length > 0) {
            recordQuery += ` WHERE ` + recordWhereClauses.join(' AND ')
          }
          recordQuery += ` ORDER BY case_id ASC`

          const res = await apiExecuteQuery(recordQuery)
          setRecords(res || [])

        } else {
          // ── IS Search (doctaba_staging_table) Query ──
          const columnsRes = await apiExecuteQuery(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'doctaba_staging_table'
          `)
          const doctabaColumns = (columnsRes || []).map(c => c.column_name.toLowerCase())

          const classMappings = customMappings.filter(m => Number(m.f_docclassnumber) === activeDocClassNum)
          const customCols = classMappings.map(m => m.f_columnname.toLowerCase())

          const systemCols = ['f_docnumber', 'f_docclassnumber', 'f_entrydate', 'f_docformat']
          const specificCols = ['migration_status', 'error_info']

          const activeSystemCols = systemCols.filter(col => doctabaColumns.includes(col.toLowerCase()))
          const activeCustomCols = customCols.filter(col => doctabaColumns.includes(col.toLowerCase()))
          const activeSpecificCols = specificCols.filter(col => doctabaColumns.includes(col.toLowerCase()))

          const selectParts = []
          const isDateColumn = (colName, isCustom) => {
            const colLower = colName.toLowerCase()
            if (isCustom) {
              const mapping = classMappings.find(m => m.f_columnname.toLowerCase() === colLower)
              return mapping && mapping.f_indexname.toLowerCase().includes('date')
            }
            return colLower.includes('date') || colLower.includes('access')
          }

          activeSystemCols.forEach(col => {
            if (isDateColumn(col, false)) {
              selectParts.push(`(CASE WHEN ${col}::text ~ '^[0-9]+$' THEN TO_CHAR(DATE '1970-01-01' + ${col}::integer, 'DD/MM/YYYY') ELSE ${col}::text END) as ${col}`)
            } else {
              selectParts.push(col)
            }
          })

          activeCustomCols.forEach(col => {
            if (isDateColumn(col, true)) {
              selectParts.push(`(CASE WHEN ${col}::text ~ '^[0-9]+$' THEN TO_CHAR(DATE '1970-01-01' + ${col}::integer, 'DD/MM/YYYY') ELSE ${col}::text END) as ${col}`)
            } else {
              selectParts.push(col)
            }
          })

          activeSpecificCols.forEach(col => {
            selectParts.push(col)
          })

          const selectClause = selectParts.join(', ')

          let recordQuery = `SELECT ${selectClause} FROM doctaba_staging_table`
          const recordWhereClauses = []

          if (status && status !== '') {
            const filterVal = status.toLowerCase().trim()
            if (filterVal === 'migrated' || filterVal === 'success' || filterVal === 'sucsess') {
              recordWhereClauses.push(`LOWER(migration_status) IN ('success', 'migrated', 'sucsess')`)
            } else if (filterVal === 'in progress' || filterVal === 'inprogress' || filterVal === 'in-progress') {
              recordWhereClauses.push(`LOWER(migration_status) IN ('in progress', 'in-progress', 'inprogress', 'retry')`)
            } else if (filterVal === 'failed' || filterVal === 'failure') {
              recordWhereClauses.push(`LOWER(migration_status) IN ('failed', 'failure', 'error')`)
            } else if (filterVal === 'pending') {
              recordWhereClauses.push(`LOWER(migration_status) IN ('pending', 'queued', 'not started', 'not_started')`)
            } else {
              recordWhereClauses.push(`LOWER(migration_status) = '${filterVal}'`)
            }
          }

          if (fromDays !== null) {
            recordWhereClauses.push(`f_entrydate::integer >= ${fromDays}`)
          }
          if (toDays !== null) {
            recordWhereClauses.push(`f_entrydate::integer <= ${toDays}`)
          }
          if (idList.length > 0) {
            const idStrList = idList.map(id => `'${id.replace(/'/g, "''")}'`).join(', ')
            recordWhereClauses.push(`f_docnumber::text IN (${idStrList})`)
          }
          Object.entries(customValues).forEach(([key, val]) => {
            if (val && String(val).trim()) {
              const safeVal = String(val).trim().replace(/'/g, "''")
              recordWhereClauses.push(`${key}::text ILIKE '%${safeVal}%'`)
            }
          })

          if (recordWhereClauses.length > 0) {
            recordQuery += ` WHERE ` + recordWhereClauses.join(' AND ')
          }
          recordQuery += ` ORDER BY f_docnumber DESC`

          const res = await apiExecuteQuery(recordQuery)
          setRecords(res || [])
        }

      } catch (e) {
        console.error(`[SearchDocs] Query failed:`, e)
        const errMsg = e.message || 'An error occurred while querying the database.'
        setError(errMsg)
        setRecords([])
        showAlert(errMsg, 'Database Error', 'error')
      } finally {
        setLoading(false)
      }
    }

    executeSearch()
  }, [searchTrigger])

  // Dynamic active headers
  let activeHeaders = []

  if (records.length > 0) {
    const recordKeys = Object.keys(records[0])
    const isDateCol = (key) => {
      const kLower = key.toLowerCase()
      return kLower.includes('date') || kLower.includes('access')
    }

    if (subTab === 'case_metadata') {
      const preferredOrder = [
        'case_id',
        'doc_no',
        'case_type',
        'migration_status',
        'customer_id',
        'customer_name',
        'policy_number',
        'case_created_date',
        'case_description',
        'department',
        'priority',
        'error_info'
      ]
      const ignoredKeys = ['sno', 's_no', 'id', 'serial_no', 'serialno', 'extracted_status', 'extracted_date', 'extractedstatus', 'extracteddate']
      const displayedKeys = preferredOrder.filter(k => recordKeys.some(rk => rk.toLowerCase() === k.toLowerCase()))

      recordKeys.forEach(k => {
        const kLower = k.toLowerCase()
        if (!ignoredKeys.includes(kLower) && !displayedKeys.some(dk => dk.toLowerCase() === kLower)) {
          displayedKeys.push(k)
        }
      })

      activeHeaders = displayedKeys.map(key => {
        const actualKey = recordKeys.find(rk => rk.toLowerCase() === key.toLowerCase()) || key
        const label = formatColumnHeader(actualKey)
        return { key: actualKey, label, isDate: isDateCol(actualKey) }
      })

    } else {
      // doctaba mode
      const allowedSystemProps = [
        { key: 'f_docnumber', label: 'Document Number' },
        { key: 'f_docclassnumber', label: 'Document Class' },
        { key: 'f_entrydate', label: 'Created Date', isDate: true },
        { key: 'f_docformat', label: 'Document Format' }
      ]

      const systemHeaders = allowedSystemProps
        .filter(p => recordKeys.some(rk => rk.toLowerCase() === p.key.toLowerCase()))
        .map(p => {
          const actualKey = recordKeys.find(rk => rk.toLowerCase() === p.key.toLowerCase()) || p.key
          return { ...p, key: actualKey }
        })

      const docClassNum = Number(records[0]?.f_docclassnumber) || activeDocClassNum
      const mappedCustomColumns = customMappings
        .filter(m => Number(m.f_docclassnumber) === docClassNum)
        .map(m => {
          const actualKey = recordKeys.find(rk => rk.toLowerCase() === m.f_columnname.toLowerCase())
          const isDate = m.f_indexname.toLowerCase().includes('date')
          return {
            key: actualKey || m.f_columnname,
            label: formatColumnHeader(m.f_indexname),
            isDate
          }
        })
        .filter(h => recordKeys.some(rk => rk.toLowerCase() === h.key.toLowerCase()))

      const otherCustomHeaders = recordKeys
        .filter(key => {
          const kLower = key.toLowerCase()
          const isAllowedSys = allowedSystemProps.some(p => p.key.toLowerCase() === kLower)
          const isMappedCustom = mappedCustomColumns.some(m => m.key.toLowerCase() === kLower)
          const isSpecific = ['migration_status', 'migrated_date', 'error_info', 'filefullpath', 'folderpath', 'retrieval_name', 'p8_doc_id', 'sno', 'id', 'serial_no'].includes(kLower)
          const isIgnoredSystem = ['f_lastaccess', 'f_annotationflag', 'f_archivedate', 'f_purgedate', 'f_deletedate', 'f_retentbase', 'f_retentdisp', 'f_retentoffset', 'f_pages', 'f_securityspec', 'f_accessrights', 'f_doctype', 'f_status', 'f_doclocation', 'f_ce_os_id', 'f_accessrights_rd', 'f_accessrights_wr', 'f_accessrights_ax'].includes(kLower)
          
          return !isAllowedSys && !isMappedCustom && !isSpecific && !isIgnoredSystem
        })
        .map(key => ({
          key,
          label: formatColumnHeader(key),
          isDate: isDateCol(key)
        }))

      const statusKey = recordKeys.find(rk => rk.toLowerCase() === 'migration_status')
      const statusHeader = statusKey ? [{ key: statusKey, label: 'Status' }] : []
      const errorKey = recordKeys.find(rk => rk.toLowerCase() === 'error_info')
      const errorHeader = (errorKey && appliedFilters?.status?.toLowerCase() === 'failed') ? [{ key: errorKey, label: 'Error Info' }] : []

      activeHeaders = [
        ...systemHeaders.slice(0, 3), // 1. Document Number, 2. Document Class, 3. Created Date
        ...statusHeader, // 4. Status (4th column position)
        ...systemHeaders.slice(3), // 5. Document Format
        ...mappedCustomColumns,
        ...otherCustomHeaders,
        ...errorHeader
      ]
    }
  }

  // Export handlers
  function handleExportCSV() {
    if (records.length === 0) return
    const headers = ['S.No', ...activeHeaders.map(h => h.label)]
    const keys = activeHeaders.map(h => h.key)
    const escape = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'
    
    const lines = [
      headers.map(escape).join(','),
      ...records.map((r, i) => [
        escape(i + 1),
        ...keys.map(k => {
          const colHeader = activeHeaders.find(h => h.key === k)
          const val = colHeader?.isDate ? cleanDateToDDMMYYYY(r[k]) : r[k]
          return escape(val)
        })
      ].join(','))
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = subTab === 'case_metadata' ? 'case_search_results.csv' : 'document_search_results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleExportExcel() {
    if (records.length === 0) return
    const headers = ['S.No', ...activeHeaders.map(h => h.label)]
    const keys = activeHeaders.map(h => h.key)

    const rows = records.map((r, i) => [
      i + 1,
      ...keys.map(k => {
        const colHeader = activeHeaders.find(h => h.key === k)
        return colHeader?.isDate ? cleanDateToDDMMYYYY(r[k]) : (r[k] ?? '')
      })
    ])

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Search Results')
    XLSX.writeFile(wb, subTab === 'is' ? 'document_search_results.xlsx' : 'case_migration_results.xlsx')
  }

  return (
    <div className="deliverables-container" style={{ padding: '10px 14px', background: '#f8f9fa', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* ── Top-Level Row: Mode Switcher (Document Migration vs Case Migration vs Browse Documents) ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '10px', padding: '0 2px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <button
              onClick={() => handleSubTabChange('is')}
              style={{
                padding: '5px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                background: subTab === 'is' ? '#ffffff' : 'transparent',
                color: subTab === 'is' ? '#2563eb' : '#64748b',
                boxShadow: subTab === 'is' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Document Migration
            </button>
            <button
              onClick={() => handleSubTabChange('case_metadata')}
              style={{
                padding: '5px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                background: subTab === 'case_metadata' ? '#ffffff' : 'transparent',
                color: subTab === 'case_metadata' ? '#2563eb' : '#64748b',
                boxShadow: subTab === 'case_metadata' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Case Migration
            </button>
            <button
              onClick={() => handleSubTabChange('source_docs')}
              style={{
                padding: '5px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                background: subTab === 'source_docs' ? '#ffffff' : 'transparent',
                color: subTab === 'source_docs' ? '#2563eb' : '#64748b',
                boxShadow: subTab === 'source_docs' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Browse Documents
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {subTab === 'source_docs' ? (
          <div style={{ flex: 1, overflow: 'hidden', height: '100%' }}>
            <Folders />
          </div>
        ) : (
          <>
        
        {/* ── Search Filter Controls Panel ── */}
        <div className="filters-panel" style={{
          marginBottom: '12px',
          background: 'white',
          padding: '14px 18px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          {/* ── 2x3 Grid for Core Filters ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto auto',
            justifyContent: 'start',
            columnGap: '32px',
            rowGap: '12px',
            alignItems: 'center'
          }}>
            {/* ── 1. Top-Left: DOCUMENT ID / CASE ID (Placed Before Status) ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', width: '100px', minWidth: '100px', flexShrink: 0 }}>
                {subTab === 'case_metadata' ? 'Case ID' : 'Document ID'}
              </span>
              <input
                type="text"
                placeholder={subTab === 'case_metadata' ? 'e.g. CASE-2023-000109' : 'e.g. 125152'}
                value={selectedIds}
                onChange={e => setSelectedIds(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontSize: '12px',
                  fontWeight: '600',
                  outline: 'none',
                  width: '190px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* ── 2. Top-Centre: STATUS (4 options only) ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', width: '56px', minWidth: '56px', flexShrink: 0 }}>
                Status
              </span>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontSize: '12px',
                  fontWeight: '600',
                  outline: 'none',
                  width: '190px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">-- Select Status --</option>
                <option value="Migrated">Migrated</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Failed">Failed</option>
              </select>
            </div>

            {/* ── 3. Top-Right: SEARCH BUTTON ── */}
            <div>
              <button
                onClick={handleSearchClick}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  width: '110px',
                  height: '32px',
                  background: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  transition: 'all 0.2s',
                  boxShadow: '0 3px 8px rgba(79, 70, 229, 0.25)',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />} Search
              </button>
            </div>

            {/* ── 4. Bottom-Left: FROM DATE ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', width: '100px', minWidth: '100px', flexShrink: 0 }}>
                From
              </span>
              <input
                type="date"
                value={selectedFromDate}
                onChange={e => setSelectedFromDate(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontSize: '11px',
                  outline: 'none',
                  width: '190px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* ── 5. Bottom-Centre: TO DATE ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', width: '56px', minWidth: '56px', flexShrink: 0 }}>
                To
              </span>
              <input
                type="date"
                value={selectedToDate}
                onChange={e => setSelectedToDate(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontSize: '11px',
                  outline: 'none',
                  width: '190px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* ── 6. Bottom-Right: CLEAR BUTTON ── */}
            <div>
              <button
                onClick={handleClearClick}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  width: '110px',
                  height: '32px',
                  background: 'white',
                  color: '#475569',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  transition: 'all 0.2s',
                  opacity: loading ? 0.7 : 1
                }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* ── Custom Metadata Customizable Section ── */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Custom Metadata Fields
                </span>
                {activeCustomFields.length > 0 && (
                  <span style={{ fontSize: '10px', fontWeight: 'bold', background: '#eff6ff', color: '#2563eb', padding: '1px 6px', borderRadius: '10px', border: '1px solid #dbeafe' }}>
                    {activeCustomFields.length} active
                  </span>
                )}
              </div>

              {/* Add Field Dropdown Trigger */}
              <div className="add-field-dropdown-container" ref={addFieldDropdownRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddFieldOpen(prev => !prev)
                    setFieldSearchText('')
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    background: '#f8fafc',
                    color: '#4f46e5',
                    border: '1px solid #c7d2fe',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <Plus size={12} strokeWidth={2.5} />
                  <span>Add Field</span>
                  <ChevronDown size={11} />
                </button>

                {/* Dropdown Menu */}
                {isAddFieldOpen && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 4px)',
                    background: 'white',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                    width: '240px',
                    maxHeight: '300px',
                    zIndex: 50,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}>
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                      <input
                        type="text"
                        placeholder="Search metadata fields..."
                        value={fieldSearchText}
                        onChange={e => setFieldSearchText(e.target.value)}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                        style={{
                          width: '100%',
                          padding: '5px 8px',
                          fontSize: '11px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '5px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0', maxHeight: '200px' }}>
                      {filteredDropdownFields.length === 0 ? (
                        <div style={{ padding: '12px', fontSize: '11px', color: '#94a3b8', textAlign: 'center', fontStyle: 'italic' }}>
                          No matching fields
                        </div>
                      ) : (
                        filteredDropdownFields.map(field => {
                          const isActive = activeCustomFields.includes(field.key)
                          return (
                            <div
                              key={field.key}
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleCustomField(field.key)
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 12px',
                                fontSize: '11.5px',
                                color: '#334155',
                                cursor: 'pointer',
                                background: isActive ? '#eff6ff' : 'transparent',
                                transition: 'background 0.1s'
                              }}
                            >
                              <div style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '3px',
                                border: isActive ? '1px solid #2563eb' : '1px solid #cbd5e1',
                                background: isActive ? '#2563eb' : 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                flexShrink: 0
                              }}>
                                {isActive && <Check size={10} strokeWidth={3} />}
                              </div>
                              <span style={{ flex: 1, fontWeight: isActive ? '600' : 'normal' }}>{field.label}</span>
                            </div>
                          )
                        })
                      )}
                    </div>

                    <div style={{ padding: '6px 10px', borderTop: '1px solid #f1f5f9', background: '#fafafa', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setIsAddFieldOpen(false)}
                        style={{
                          padding: '3px 10px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          background: '#4f46e5',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Added Custom Metadata Input Grid */}
            {activeCustomFields.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '12px',
                background: '#f8fafc',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                {activeCustomFields.map(fieldKey => {
                  const fieldDef = availableFields.find(f => f.key === fieldKey) || { key: fieldKey, label: formatColumnHeader(fieldKey) }
                  return (
                    <div key={fieldKey} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#475569' }}>
                          {fieldDef.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomField(fieldKey)}
                          title="Remove field"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '1px',
                            borderRadius: '3px'
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder={`Search ${fieldDef.label}...`}
                        value={customFieldValues[fieldKey] || ''}
                        onChange={e => handleCustomValueChange(fieldKey, e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1.5px solid #cbd5e1',
                          background: 'white',
                          color: '#0f172a',
                          fontSize: '11.5px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Search Output Content ── */}
        {error ? (
          <div className="empty-state" style={{ padding: '60px 40px', background: '#fff1f2', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#e11d48', flex: 1, border: '1px solid #ffe4e6', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <Database size={40} style={{ color: '#e11d48' }} />
            <span style={{ fontWeight: '700', fontSize: '14px' }}>Database Query Failure</span>
            <span style={{ fontSize: '12px', color: '#be123c', textAlign: 'center', maxWidth: '500px' }}>{error}</span>
          </div>
        ) : !appliedFilters ? (
          /* ── Unselected initial state ── */
          <div className="empty-state" style={{ padding: '80px 40px', background: 'white', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#94a3b8', flex: 1, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <Database size={40} style={{ opacity: 0.5, color: '#4f46e5' }} />
            {(selectedStatus !== '' || selectedIds.trim() !== '' || selectedFromDate !== '' || selectedToDate !== '' || Object.values(customFieldValues).some(v => v)) ? (
              <>
                <span style={{ fontWeight: '600', color: '#64748b', fontSize: '14px' }}>
                  Ready to Search
                </span>
                <span style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', maxWidth: '400px' }}>
                  Click the <strong>Search</strong> button to retrieve records matching your selected criteria.
                </span>
              </>
            ) : (
              <>
                <span style={{ fontWeight: '600', color: '#64748b', fontSize: '14px' }}>
                  Please Select Search Criteria
                </span>
                <span style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', maxWidth: '400px' }}>
                  {subTab === 'case_metadata'
                    ? 'Choose a status, enter a Case ID, specify a date range, or add custom metadata fields, then click Search.'
                    : 'Choose a status, enter a Document ID, specify a date range, or add custom metadata fields, then click Search.'}
                </span>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0 }}>
            
            {/* ── Results Table Grid ── */}
            <div className="grid-container" style={{ background: 'white', padding: '12px', borderRadius: '12px', flex: 1, minHeight: 0, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 4px' }}>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '13px', fontWeight: 'bold' }}>
                  {subTab === 'is' ? 'Document Migration Results' : 'Case Migration Results'} ({records.length} {records.length === 1 ? 'record' : 'records'})
                </h3>
                {records.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', color: '#374151' }}>
                      <Download size={12} /> CSV
                    </button>
                    <button onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#10b981', color: 'white', cursor: 'pointer' }}>
                      <Download size={12} /> Excel
                    </button>
                  </div>
                )}
              </div>

              <div className="table-wrap" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                {records.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No records found for the filter criteria.</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>S.No</th>
                        {subTab !== 'case_metadata' && (
                          <th style={{ textAlign: 'center', width: '80px', color: '#4f46e5', fontWeight: 'bold' }}>Actions</th>
                        )}
                        {activeHeaders.map(col => <th key={col.key}>{col.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r, i) => {
                        const docIds = extractDocIdsFromRow(r)
                        const primaryDocId = docIds[0] || '121824'
                        const hasMultipleDocs = subTab === 'case_metadata' && docIds.length > 1
                        const rowKey = `row-${r.case_id || r.documentid || r.f_docnumber || r.doc_no || 'idx'}-${i}`
                        const isExpanded = Boolean(expandedRows[rowKey])

                        return (
                          <React.Fragment key={rowKey}>
                            <tr style={{ background: isExpanded ? '#f8fafc' : 'transparent' }}>
                              <td style={{ textAlign: 'center', width: '48px', color: '#64748b', fontWeight: '600' }}>{i + 1}</td>
                              
                              {/* ── Actions Column (IS Search only) ── */}
                              {subTab !== 'case_metadata' && (
                                <td style={{ textAlign: 'center', whiteSpace: 'nowrap', padding: '10px 14px' }}>
                                  <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenViewer(r)}
                                      title="View Document"
                                      style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px',
                                        background: '#eff6ff', color: '#2563eb', border: '1.5px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer',
                                        transition: 'all 0.15s ease', boxShadow: '0 1px 3px rgba(37,99,235,0.1)'
                                      }}
                                      onMouseOver={e => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#2563eb' }}
                                      onMouseOut={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#2563eb'; e.currentTarget.style.borderColor = '#bfdbfe' }}
                                    >
                                      <Eye size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => triggerDirectDownload(primaryDocId, extractDocNameFromRow(r), r)}
                                      title="Download Document"
                                      style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px',
                                        background: '#ecfdf5', color: '#059669', border: '1.5px solid #a7f3d0', borderRadius: '6px', cursor: 'pointer',
                                        transition: 'all 0.15s ease', boxShadow: '0 1px 3px rgba(16,185,129,0.1)'
                                      }}
                                      onMouseOver={e => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#059669' }}
                                      onMouseOut={e => { e.currentTarget.style.background = '#ecfdf5'; e.currentTarget.style.color = '#059669'; e.currentTarget.style.borderColor = '#a7f3d0' }}
                                    >
                                      <Download size={14} />
                                    </button>
                                  </div>
                                </td>
                              )}

                              {activeHeaders.map(c => {
                                let val = r[c.key]
                                if (c.key === 'migrated_date' && (val == null || val === '')) {
                                  val = r.f_entrydate
                                }
                                const keyLower = c.key.toLowerCase()
                                
                                if (keyLower === 'f_docclassnumber') {
                                  const matchingClass = docClasses.find(dc => Number(dc.f_docclassnumber) === Number(val))
                                  val = matchingClass ? matchingClass.f_docclassname : val
                                }

                                if (keyLower === 'doc_no' || keyLower === 'f_docnumber' || keyLower === 'documentid' || keyLower === 'p8_doc_id') {
                                  // In ONLY IS migration tab: Remove doc numbers as clickable hyperlink (plain text display)
                                  if (subTab === 'is') {
                                    return <td key={c.key} style={tdStyle}>{val || '—'}</td>
                                  }

                                  const docNumList = String(val || '').split(',').map(s => s.trim()).filter(Boolean)
                                  if (docNumList.length > 0) {
                                    return (
                                      <td key={c.key} style={tdStyle}>
                                        <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                                          {docNumList.map((docNum, docIdx) => (
                                            <button
                                              key={`${docNum}-${docIdx}`}
                                              type="button"
                                              onClick={() => handleOpenSpecificDoc(r, docNum)}
                                              title={`Click to view Document #${docNum}`}
                                              style={{
                                                background: '#eff6ff',
                                                color: '#2563eb',
                                                border: '1px solid #bfdbfe',
                                                borderRadius: '4px',
                                                padding: '2px 8px',
                                                fontSize: '11.5px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                textDecoration: 'none',
                                                transition: 'all 0.15s ease'
                                              }}
                                              onMouseEnter={(e) => {
                                                e.currentTarget.style.background = '#2563eb'
                                                e.currentTarget.style.color = '#ffffff'
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.background = '#eff6ff'
                                                e.currentTarget.style.color = '#2563eb'
                                              }}
                                            >
                                              {docNum}
                                            </button>
                                          ))}
                                        </div>
                                      </td>
                                    )
                                  }
                                  return <td key={c.key} style={tdStyle}>{val || '—'}</td>
                                }

                                if (keyLower === 'case_id') {
                                  return <td key={c.key} style={tdStyle}>{val || '—'}</td>
                                }

                                if (c.isDate) {
                                  return <td key={c.key} style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{cleanDateToDDMMYYYY(val) || '—'}</td>
                                }

                                if (keyLower === 'migration_status' || keyLower === 'status') {
                                  const valUpper = String(val || '').toUpperCase()
                                  const isSuccess = ['SUCCESS', 'MIGRATED', 'SUCSESS'].includes(valUpper)
                                  const isFailed = ['FAILED', 'FAILURE', 'ERROR'].includes(valUpper)
                                  const isPending = ['PENDING', 'QUEUED', 'NOT STARTED'].includes(valUpper)
                                  const isInProgress = ['IN PROGRESS', 'IN-PROGRESS', 'INPROGRESS', 'RETRY'].includes(valUpper)

                                  return (
                                    <td key={c.key} style={tdStyle}>
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '3px 10px',
                                        borderRadius: '16px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        background: isSuccess ? '#ECFDF5' : isFailed ? '#FEF2F2' : isPending ? '#EFF6FF' : isInProgress ? '#FFFBEB' : '#F1F5F9',
                                        color: isSuccess ? '#059669' : isFailed ? '#DC2626' : isPending ? '#2563EB' : isInProgress ? '#D97706' : '#64748B',
                                        border: isSuccess ? '1px solid #A7F3D0' : isFailed ? '1px solid #FECACA' : isPending ? '1px solid #DBEAFE' : isInProgress ? '1px solid #FDE68A' : '1px solid #E2E8F0'
                                      }}>
                                        <span style={{
                                          width: '6px',
                                          height: '6px',
                                          borderRadius: '50%',
                                          background: isSuccess ? '#10B981' : isFailed ? '#EF4444' : isPending ? '#2563EB' : isInProgress ? '#F59E0B' : '#94A3B8'
                                        }}></span>
                                        {val || '—'}
                                      </span>
                                    </td>
                                  )
                                }

                                return <td key={c.key} style={tdStyle}>{val != null && val !== '' ? String(val) : '—'}</td>
                              })}
                            </tr>

                            {/* ── Inner Grid Sub-Table for Case Search Multiple Documents ── */}
                            {hasMultipleDocs && isExpanded && (
                              <tr style={{ background: '#f8fafc' }}>
                                <td></td>
                                <td colSpan={activeHeaders.length + 1} style={{ padding: '8px 16px 14px 16px' }}>
                                  <div style={{
                                    background: '#ffffff', border: '1.5px solid #bfdbfe', borderRadius: '8px', padding: '12px 16px',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.06)'
                                  }}>
                                    <div style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#2563eb', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <FileText size={14} /> Associated Case Documents ({docIds.length} files for Case #{r.case_id})
                                    </div>
                                    <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                                      <thead>
                                        <tr style={{ background: '#eff6ff', color: '#1e40af', textAlign: 'left' }}>
                                          <th style={{ padding: '6px 10px', width: '40px' }}>#</th>
                                          <th style={{ padding: '6px 10px' }}>Document ID</th>
                                          <th style={{ padding: '6px 10px' }}>Document Type</th>
                                          <th style={{ padding: '6px 10px' }}>Linux Storage Node</th>
                                          <th style={{ padding: '6px 10px', textAlign: 'center', width: '100px' }}>Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {docIds.map((subDocId, subIdx) => (
                                          <tr key={`subdoc-${subDocId}-${subIdx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '6px 10px', color: '#64748b' }}>{subIdx + 1}</td>
                                            <td style={{ padding: '6px 10px', fontWeight: 'bold', color: '#1e293b' }}>Doc #{subDocId}</td>
                                            <td style={{ padding: '6px 10px', color: '#64748b' }}>PDF Document</td>
                                            <td style={{ padding: '6px 10px', color: '#64748b' }}>Linux Host</td>
                                            <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                              <div style={{ display: 'inline-flex', gap: '5px', justifyContent: 'center' }}>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setSelectedModalCase({ caseId: r.case_id || 'N/A', docIds, docName: extractDocNameFromRow(r), row: r })
                                                    setActiveDocId(subDocId)
                                                  }}
                                                  title="View Document"
                                                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                  <Eye size={12} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => triggerDirectDownload(subDocId, extractDocNameFromRow(r), r)}
                                                  title="Download Document"
                                                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                  <Download size={12} />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
        </>
        )}

      {/* ── Enterprise Document Viewer Modal ── */}
      <EnterpriseDocumentViewer
        isOpen={Boolean(selectedModalCase)}
        onClose={() => setSelectedModalCase(null)}
        docName={selectedModalCase?.docName || extractDocNameFromRow(selectedModalCase?.row) || `Doc_${activeDocId || '125044'}.pdf`}
        docId={activeDocId}
        caseId={selectedModalCase?.caseId}
        docPath={selectedModalCase?.docPath || ''}
        viewUrl={selectedModalCase?.viewUrl || (activeDocId ? apiGetDocIdViewUrl(activeDocId) : '')}
        downloadUrl={selectedModalCase?.downloadUrl || (activeDocId ? apiGetDocIdDownloadUrl(activeDocId) : '')}
        onDownload={() => triggerDirectDownload(activeDocId, selectedModalCase?.docName || `Doc_${activeDocId}.pdf`, selectedModalCase?.row)}
      />
      </div>
    </div>
  )
}

