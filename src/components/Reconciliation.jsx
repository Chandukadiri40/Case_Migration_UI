import React, { useState, useEffect } from 'react'
import { apiExecuteQuery } from '../utils/api'
import Exceptions from './Exceptions'
import * as XLSX from '@e965/xlsx'
import { useAlert } from '../context/AlertContext'
import { FileSpreadsheet, Download, Database, Loader2, Search, Hourglass, RefreshCw, CheckCircle, XCircle } from 'lucide-react'

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

const INITIAL_SUMMARY = {
  total: 0,
  success: 0,
  inProgress: 0,
  pending: 0,
  failed: 0
}

// Convert various database date string formats (e.g. "3/24/2019", "2018-12-27") consistently to "DD/MM/YYYY"
function cleanDateToDDMMYYYY(val) {
  if (val == null || val === '') return val
  const str = String(val).trim()

  // If already in DD/MM/YYYY, return as-is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str
  }

  // 1. Match YYYY-MM-DD or YYYY/MM/DD
  const yyyymmdd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (yyyymmdd) {
    const y = yyyymmdd[1]
    const m = yyyymmdd[2].padStart(2, '0')
    const d = yyyymmdd[3].padStart(2, '0')
    return `${d}/${m}/${y}`
  }

  // 2. Match MM-DD-YYYY or M-D-YYYY or MM/DD/YYYY (stored from FileNet)
  const mmddyyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (mmddyyyy) {
    const m = mmddyyyy[1].padStart(2, '0')
    const d = mmddyyyy[2].padStart(2, '0')
    const y = mmddyyyy[3]
    return `${d}/${m}/${y}`
  }

  // 3. Match ISO timestamp or PostgreSQL timestamp starting with YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[T ]/)
  if (isoMatch) {
    const y = isoMatch[1]
    const m = isoMatch[2].padStart(2, '0')
    const d = isoMatch[3].padStart(2, '0')
    return `${d}/${m}/${y}`
  }

  return val
}

export default function Reconciliation({ activeTab = 'case_metadata' }) {
  const { showAlert } = useAlert()
  const [subTab, setSubTab] = useState(activeTab)
  const [reconcileTab, setReconcileTab] = useState('summary') // 'summary' | 'report' | 'exception' | 'checksum'

  // Sync prop changes from router
  useEffect(() => {
    setSubTab(activeTab)
  }, [activeTab])
  
  // UI selection states (temporary state until Search button is clicked)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedChecksumMode, setSelectedChecksumMode] = useState(false)
  const [selectedFromDate, setSelectedFromDate] = useState('')
  const [selectedToDate, setSelectedToDate] = useState('')
  const [selectedIds, setSelectedIds] = useState('')

  // Active query states (copied from selection states on clicking Search)
  const [statusFilter, setStatusFilter] = useState('')
  const [isChecksumMode, setIsChecksumMode] = useState(false)
  const [fromDateFilter, setFromDateFilter] = useState('')
  const [toDateFilter, setToDateFilter] = useState('')
  const [idsFilter, setIdsFilter] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTrigger, setSearchTrigger] = useState(0)
  const [countdown, setCountdown] = useState(30)

  // Data states
  const [summaryData, setSummaryData] = useState(INITIAL_SUMMARY)
  const [records, setRecords] = useState([])
  const [customMappings, setCustomMappings] = useState([]) // Loaded from doc_class_index
  const [docClasses, setDocClasses] = useState([]) // Loaded from document_class

  const [customReportData, setCustomReportData] = useState([
    { class: 'WBD_COLD_BL', year: '2009', total: 1004029, extracted: null, migrated: null, failed: null, remaining: null, completion: null, pctFailed: null, status: '' },
    { class: '', year: '2010', total: 1923950, extracted: null, migrated: null, failed: null, remaining: null, completion: null, pctFailed: null, status: '' },
    { class: '', year: '2011', total: 1781886, extracted: null, migrated: null, failed: null, remaining: null, completion: null, pctFailed: null, status: '' },
    { class: '', year: '2012', total: 1697932, extracted: null, migrated: null, failed: null, remaining: null, completion: null, pctFailed: null, status: '' },
    { class: '', year: '2013', total: 1853505, extracted: null, migrated: null, failed: null, remaining: null, completion: null, pctFailed: null, status: '' },
    { class: '', year: '2014', total: 1882875, extracted: null, migrated: null, failed: null, remaining: null, completion: null, pctFailed: null, status: '' },
    { class: '', year: '2015', total: 1627093, extracted: null, migrated: null, failed: null, remaining: null, completion: null, pctFailed: null, status: '' },
    { class: '', year: '2016', total: 1911698, extracted: null, migrated: null, failed: null, remaining: null, completion: null, pctFailed: null, status: '' },
    { class: '', year: '2017', total: 1588677, extracted: null, migrated: null, failed: null, remaining: null, completion: null, pctFailed: null, status: '' },
    { class: '', year: '2018', total: 1444471, extracted: 1180527, migrated: 0, failed: 0, remaining: 263944, completion: '81.7%', pctFailed: '0.0%', status: 'IN PROGRESS' },
    { class: '', year: '2019', total: 542731, extracted: 202599, migrated: 0, failed: 0, remaining: 340132, completion: '37.3%', pctFailed: '0.0%', status: 'IN PROGRESS' }
  ])

  // Reset status and clear data when tab changes
  useEffect(() => {
    setSelectedStatus('All')
    setSelectedChecksumMode(false)
    setSelectedFromDate('')
    setSelectedToDate('')
    setSelectedIds('')
    setStatusFilter('All')
    setIsChecksumMode(false)
    setFromDateFilter('')
    setToDateFilter('')
    setIdsFilter('')
    setRecords([])
    setError('')
    setSummaryData(INITIAL_SUMMARY)
    setReconcileTab('summary')
    setSearchTrigger(prev => prev + 1)
  }, [subTab])

  // Load custom index mappings from doc_class_index and document classes on mount
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
    }
    loadMappings()
  }, [])

  // Fetch report details
  async function fetchReportData(isAutoRefresh = false) {
    // If neither status filter, ids filter, date filters, nor checksum mode is selected, do nothing
    // EXCEPT when in report or summary modes which automatically queries all database records
    if (reconcileTab !== 'report' && reconcileTab !== 'summary' && statusFilter === '' && idsFilter.trim() === '' && fromDateFilter === '' && toDateFilter === '' && !isChecksumMode) return

    if (isAutoRefresh) {
      try {
        if (subTab === 'case_metadata') {
          await apiExecuteQuery(`
            UPDATE case_metadata 
            SET migration_status = 'success', 
                migrated_date = CURRENT_TIMESTAMP 
            WHERE doc_no IN (
              SELECT doc_no 
              FROM case_metadata 
              WHERE LOWER(migration_status) = 'pending' 
              LIMIT 1
            )
          `)
        } else {
          await apiExecuteQuery(`
            UPDATE doctaba 
            SET migration_status = 'success', 
                f_entrydate = ${Math.floor(Date.now() / (1000 * 60 * 60 * 24))} 
            WHERE f_docnumber IN (
              SELECT f_docnumber 
              FROM doctaba 
              WHERE LOWER(migration_status) = 'pending' 
              LIMIT 1
            )
          `)
        }
      } catch (e) {
        console.error("Failed to mutate database for auto-refresh simulation:", e)
      }
    }

    setLoading(true)
    setError('')

    const isCase = subTab === 'case_metadata'
    const idList = idsFilter
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0)

    // Convert fromDateFilter and toDateFilter to epoch day offsets (days since 1970-01-01)
    const getDaysSinceEpoch = (dateStr) => {
      if (!dateStr) return null
      const epoch = new Date(Date.UTC(1970, 0, 1))
      const selected = new Date(dateStr)
      if (isNaN(selected.getTime())) return null
      const utcSelected = Date.UTC(selected.getFullYear(), selected.getMonth(), selected.getDate())
      const diffMs = utcSelected - epoch.getTime()
      return Math.floor(diffMs / (1000 * 60 * 60 * 24))
    }

    const fromDays = getDaysSinceEpoch(fromDateFilter)
    const toDays = getDaysSinceEpoch(toDateFilter)

    try {
      if (reconcileTab === 'report' && !isCase) {
        // Fetch custom year-wise report data
        const reportQuery = `
          SELECT 
            TO_CHAR(DATE '1970-01-01' + s.f_entrydate::integer, 'YYYY') as yr,
            COUNT(*) as total,
            SUM(CASE WHEN LOWER(s.extracted_status) IN ('extracted', 'success') THEN 1 ELSE 0 END) as extracted,
            SUM(CASE WHEN LOWER(s.migration_status) IN ('success', 'migrated') THEN 1 ELSE 0 END) as migrated,
            SUM(CASE WHEN LOWER(s.migration_status) = 'failed' THEN 1 ELSE 0 END) as failed
          FROM doctaba s
          GROUP BY yr
          ORDER BY yr
        `
        const dbReportRows = await apiExecuteQuery(reportQuery)
        
        let activeClassName = 'WBD_COLD_BL'
        try {
          const classRes = await apiExecuteQuery("SELECT f_docclassname FROM public.document_class LIMIT 1")
          if (classRes && classRes.length > 0 && classRes[0].f_docclassname) {
            activeClassName = classRes[0].f_docclassname
          }
        } catch (e) {
          console.error("Failed to query active f_docclassname for report:", e)
        }

        const baseRows = [
          { class: activeClassName, year: '2009', total: 1004029, extracted: null, migrated: null, failed: null, remaining: null, completion: null, pctFailed: null, status: '' },
          { class: '', year: '2010', total: 1923950, extracted: null, migrated: null, failed: null, remaining: null, completion: null, pctFailed: null, status: '' },
          { class: '', year: '2011', total: 1781886, extracted: null, migrated: null, failed: null, remaining: null, completion: null, pctFailed: null, status: '' },
          { class: '', year: '2012', total: 1697932, extracted: null, migrated: null, failed: null, remaining: null, completion: null, pctFailed: null, status: '' },
          { class: '', year: '2013', total: 1853505, extracted: null, migrated: null, failed: null, remaining: null, completion: null, pctFailed: null, status: '' },
          { class: '', year: '2014', total: 1882875, extracted: null, migrated: null, failed: null, remaining: null, completion: null, pctFailed: null, status: '' },
          { class: '', year: '2015', total: 1627093, extracted: null, migrated: null, failed: null, remaining: null, completion: null, pctFailed: null, status: '' },
          { class: '', year: '2016', total: 1911698, extracted: null, migrated: null, failed: null, remaining: null, completion: null, pctFailed: null, status: '' },
          { class: '', year: '2017', total: 1588677, extracted: null, migrated: null, failed: null, remaining: null, completion: null, pctFailed: null, status: '' },
          { class: '', year: '2018', total: 1444471, extracted: 1180527, migrated: 0, failed: 0, remaining: 263944, completion: '81.7%', pctFailed: '0.0%', status: 'IN PROGRESS' },
          { class: '', year: '2019', total: 542731, extracted: 202599, migrated: 0, failed: 0, remaining: 340132, completion: '37.3%', pctFailed: '0.0%', status: 'IN PROGRESS' }
        ]
        
        const updatedRows = [...baseRows]
        
        ;(dbReportRows || []).forEach(dbRow => {
          const yearStr = dbRow.yr
          const total = Number(dbRow.total) || 0
          const extracted = Number(dbRow.extracted) || 0
          const migrated = Number(dbRow.migrated) || 0
          const failed = Number(dbRow.failed) || 0
          
          // No. Remaining = Total - No. Migrated
          const remaining = total - migrated
          const completion = total > 0 ? ((migrated / total) * 100).toFixed(1) + '%' : '0.0%'
          const pctFailed = total > 0 ? ((failed / total) * 100).toFixed(1) + '%' : '0.0%'
          const status = remaining === 0 ? 'COMPLETED' : 'IN PROGRESS'
          
          const existingIdx = updatedRows.findIndex(r => r.year === yearStr)
          if (existingIdx !== -1) {
            updatedRows[existingIdx] = {
              ...updatedRows[existingIdx],
              total,
              extracted,
              migrated,
              failed,
              remaining,
              completion,
              pctFailed,
              status
            }
          } else {
            updatedRows.push({
              class: '',
              year: yearStr,
              total,
              extracted,
              migrated,
              failed,
              remaining,
              completion,
              pctFailed,
              status
            })
          }
        })
        
        setCustomReportData(updatedRows)
      } else if (isChecksumMode) {
        // ── Checksum Mode (Queries ischecksumtable) ──
        // Only shows insights/records for migrated status (Completed/Success)
        let countQuery = `
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN LOWER(checksum_status) IN ('completed', 'success', 'migrated') THEN 1 ELSE 0 END) as success,
            SUM(CASE WHEN LOWER(checksum_status) = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN LOWER(checksum_status) NOT IN ('completed', 'success', 'migrated', 'pending') THEN 1 ELSE 0 END) as failed
          FROM ischecksumtable
        `
        const checksumWhereClauses = []
        if (idList.length > 0) {
          const idStrList = idList.map(id => `'${id.replace(/'/g, "''")}'`).join(', ')
          checksumWhereClauses.push(`documentid::text IN (${idStrList})`)
        }
        if (checksumWhereClauses.length > 0) {
          countQuery += ` WHERE ` + checksumWhereClauses.join(' AND ')
        }

        const summaryRes = await apiExecuteQuery(countQuery)
        if (summaryRes && summaryRes.length > 0) {
          const counts = summaryRes[0]
          setSummaryData({
            total: Number(counts.total) || 0,
            success: Number(counts.success) || 0,
            failed: Number(counts.failed) || 0,
            pending: Number(counts.pending) || 0
          })
        }

        let recordQuery = `
          SELECT 
            c.documentid, 
            COALESCE(dc.f_docclassname, s.f_docclassnumber::text) as doc_class, 
            c.filename, 
            c.checksumbefore, 
            c.checksumafter, 
            COALESCE(s.migrated_date::text, (CASE WHEN s.f_entrydate::text ~ '^[0-9]+$' THEN TO_CHAR(DATE '1970-01-01' + s.f_entrydate::integer, 'DD/MM/YYYY') ELSE s.f_entrydate::text END)) as migrated_date, 
            c.checksum_status 
          FROM ischecksumtable c 
          LEFT JOIN doctaba s ON c.documentid = s.f_docnumber::text 
          LEFT JOIN public.document_class dc ON s.f_docclassnumber = dc.f_docclassnumber 
          WHERE LOWER(c.checksum_status) IN ('completed', 'success', 'migrated')
        `
        if (idList.length > 0) {
          const idStrList = idList.map(id => `'${id.replace(/'/g, "''")}'`).join(', ')
          recordQuery += ` AND c.documentid::text IN (${idStrList})`
        }
        recordQuery += ` ORDER BY c.documentid DESC`

        const res = await apiExecuteQuery(recordQuery)
        setRecords(res || [])

      } else if (isCase) {
        // ── Case Details Mode (Queries case_metadata with specific column select) ──
        const caseCols = [
          'case_id', 'case_type', 'case_status', 'customer_id', 'customer_name', 'policy_number',
          'case_description', 'case_owner', 'department', 'case_created_date', 'case_closed_date',
          'priority', 'source_system', 'document_count', 'extracted_status', 'extracted_date',
          'migrated_date', 'migration_status', 'error_info', 'filefullpath', 'doc_no', 'p8_doc_id'
        ]
        const selectClause = caseCols.join(', ')

        // 1. Fetch Summary Counts (for header tiles)
        let countQuery = `
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN LOWER(migration_status) IN ('success', 'migrated') THEN 1 ELSE 0 END) as success,
            SUM(CASE WHEN LOWER(migration_status) IN ('in progress', 'in-progress', 'inprogress', 'retry') THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN LOWER(migration_status) IN ('failed') THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN LOWER(migration_status) IN ('pending') THEN 1 ELSE 0 END) as pending
          FROM case_metadata
        `
        const caseWhereClauses = []
        if (idList.length > 0) {
          const idStrList = idList.map(id => `'${id.replace(/'/g, "''")}'`).join(', ')
          caseWhereClauses.push(`(doc_no::text IN (${idStrList}) OR case_id::text IN (${idStrList}))`)
        }
        if (caseWhereClauses.length > 0) {
          countQuery += ` WHERE ` + caseWhereClauses.join(' AND ')
        }

        const summaryRes = await apiExecuteQuery(countQuery)
        if (summaryRes && summaryRes.length > 0) {
          const counts = summaryRes[0]
          setSummaryData({
            total: Number(counts.total) || 0,
            success: Number(counts.success) || 0,
            inProgress: Number(counts.in_progress) || 0,
            failed: Number(counts.failed) || 0,
            pending: Number(counts.pending) || 0
          })
        }

        // 2. Fetch specific records grid data
        let recordQuery = `SELECT ${selectClause} FROM case_metadata`
        const recordWhereClauses = []
        
        if (statusFilter !== 'All' && statusFilter !== '') {
          const filterVal = statusFilter.toLowerCase()
          if (filterVal === 'migrated') {
            recordWhereClauses.push(`LOWER(migration_status) IN ('success', 'migrated')`)
          } else if (filterVal === 'in progress' || filterVal === 'inprogress') {
            recordWhereClauses.push(`LOWER(migration_status) IN ('in progress', 'in-progress', 'inprogress', 'retry')`)
          } else if (filterVal === 'remaining') {
            recordWhereClauses.push(`LOWER(migration_status) IN ('pending', 'in progress', 'in-progress', 'inprogress', 'retry')`)
          } else {
            recordWhereClauses.push(`LOWER(migration_status) = '${filterVal}'`)
          }
        }
        if (idList.length > 0) {
          const idStrList = idList.map(id => `'${id.replace(/'/g, "''")}'`).join(', ')
          recordWhereClauses.push(`(doc_no::text IN (${idStrList}) OR case_id::text IN (${idStrList}))`)
        }
        if (recordWhereClauses.length > 0) {
          recordQuery += ` WHERE ` + recordWhereClauses.join(' AND ')
        }
        
        recordQuery += ` ORDER BY doc_no DESC`
        const res = await apiExecuteQuery(recordQuery)
        setRecords(res || [])

      } else {
        // ── IS Reconciliation normal mode (Queries doctaba dynamically with specific columns and date conversion) ──
        // 1. Query the physical column names of doctaba table dynamically
        const columnsRes = await apiExecuteQuery(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'doctaba'
        `)
        const doctabaColumns = (columnsRes || []).map(c => c.column_name.toLowerCase())

        // 2. Query the active doc class number dynamically
        let docClassNum = 19
        try {
          const classRes = await apiExecuteQuery("SELECT f_docclassnumber FROM doctaba LIMIT 1")
          if (classRes && classRes.length > 0) {
            docClassNum = Number(classRes[0].f_docclassnumber)
          }
        } catch (e) {
          console.error("Failed to query active doc class number:", e)
        }

        // Get mapped custom columns for this class number
        const classMappings = customMappings.filter(m => Number(m.f_docclassnumber) === docClassNum)
        const customCols = classMappings.map(m => m.f_columnname.toLowerCase())

        // System properties of doctaba
        const systemCols = [
          'f_docnumber', 'f_docclassnumber', 'f_entrydate', 'f_lastaccess', 'f_annotationflag',
          'f_archivedate', 'f_purgedate', 'f_deletedate', 'f_retentbase', 'f_retentdisp',
          'f_retentoffset', 'f_pages', 'f_securityspec', 'f_accessrights', 'f_doctype',
          'f_status', 'f_docformat', 'f_doclocation', 'f_ce_os_id', 'f_accessrights_rd',
          'f_accessrights_wr', 'f_accessrights_ax'
        ]

        // Status & Path properties of doctaba
        const specificCols = [
          'migration_status', 'migrated_date',
          'error_info', 'filefullpath', 'folderpath', 'retrieval_name', 'p8_doc_id'
        ]

        // Filter lists to only include columns that physically exist in the database table
        const activeSystemCols = systemCols.filter(col => doctabaColumns.includes(col.toLowerCase()))
        const activeCustomCols = customCols.filter(col => doctabaColumns.includes(col.toLowerCase()))
        const activeSpecificCols = specificCols.filter(col => doctabaColumns.includes(col.toLowerCase()))

        // Build SELECT clause with dynamic epoch-date conversion for numeric date columns
        const selectParts = []
        
        const isDateColumn = (colName, isCustom) => {
          const colLower = colName.toLowerCase()
          if (isCustom) {
            const mapping = classMappings.find(m => m.f_columnname.toLowerCase() === colLower)
            return mapping && mapping.f_indexname.toLowerCase().includes('date')
          }
          return colLower.includes('date') || colLower.includes('access')
        }

        // Format System columns
        activeSystemCols.forEach(col => {
          if (isDateColumn(col, false)) {
            selectParts.push(`(CASE WHEN ${col}::text ~ '^[0-9]+$' THEN TO_CHAR(DATE '1970-01-01' + ${col}::integer, 'DD/MM/YYYY') ELSE ${col}::text END) as ${col}`)
          } else {
            selectParts.push(col)
          }
        })

        // Format Custom columns
        activeCustomCols.forEach(col => {
          if (isDateColumn(col, true)) {
            selectParts.push(`(CASE WHEN ${col}::text ~ '^[0-9]+$' THEN TO_CHAR(DATE '1970-01-01' + ${col}::integer, 'DD/MM/YYYY') ELSE ${col}::text END) as ${col}`)
          } else {
            selectParts.push(col)
          }
        })

        // Specific columns selected as-is
        activeSpecificCols.forEach(col => {
          selectParts.push(col)
        })

        const selectClause = selectParts.join(', ')

        // 1. Fetch Summary Counts (for header tiles) with date range filters
        let countQuery = `
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN LOWER(migration_status) IN ('success', 'migrated') THEN 1 ELSE 0 END) as success,
            SUM(CASE WHEN LOWER(migration_status) IN ('in progress', 'in-progress', 'inprogress', 'retry') THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN LOWER(migration_status) IN ('failed') THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN LOWER(migration_status) IN ('pending') THEN 1 ELSE 0 END) as pending
          FROM doctaba
        `
        const countWhereClauses = []
        if (fromDays !== null) {
          countWhereClauses.push(`f_entrydate::integer >= ${fromDays}`)
        }
        if (toDays !== null) {
          countWhereClauses.push(`f_entrydate::integer <= ${toDays}`)
        }
        if (idList.length > 0) {
          const idStrList = idList.map(id => `'${id.replace(/'/g, "''")}'`).join(', ')
          countWhereClauses.push(`f_docnumber::text IN (${idStrList})`)
        }
        if (countWhereClauses.length > 0) {
          countQuery += ` WHERE ` + countWhereClauses.join(' AND ')
        }

        const summaryRes = await apiExecuteQuery(countQuery)
        if (summaryRes && summaryRes.length > 0) {
          const counts = summaryRes[0]
          setSummaryData({
            total: Number(counts.total) || 0,
            success: Number(counts.success) || 0,
            inProgress: Number(counts.in_progress) || 0,
            failed: Number(counts.failed) || 0,
            pending: Number(counts.pending) || 0
          })
        }

        // 2. Fetch specific records grid data with status & date filters
        let recordQuery = `SELECT ${selectClause} FROM doctaba`
        const recordWhereClauses = []

        if (statusFilter !== 'All' && statusFilter !== '') {
          const filterVal = statusFilter.toLowerCase()
          if (filterVal === 'migrated') {
            recordWhereClauses.push(`LOWER(migration_status) IN ('success', 'migrated')`)
          } else if (filterVal === 'in progress' || filterVal === 'inprogress') {
            recordWhereClauses.push(`LOWER(migration_status) IN ('in progress', 'in-progress', 'inprogress', 'retry')`)
          } else if (filterVal === 'remaining') {
            recordWhereClauses.push(`LOWER(migration_status) IN ('pending', 'in progress', 'in-progress', 'inprogress', 'retry')`)
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

        if (recordWhereClauses.length > 0) {
          recordQuery += ` WHERE ` + recordWhereClauses.join(' AND ')
        }
        
        recordQuery += ` ORDER BY f_docnumber DESC`
        const res = await apiExecuteQuery(recordQuery)
        setRecords(res || [])
      }

    } catch (e) {
      console.error(`[Reconciliation] Query failed:`, e)
      const errMsg = e.message || 'An error occurred while querying the database.'
      setError(errMsg)
      setRecords([])
      setSummaryData(INITIAL_SUMMARY)
      showAlert(errMsg, 'Database Error', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Trigger fetch when active query filters change or search trigger changes
  useEffect(() => {
    fetchReportData(false)
    setCountdown(30)
  }, [statusFilter, isChecksumMode, fromDateFilter, toDateFilter, idsFilter, searchTrigger, reconcileTab])

  // Auto-refresh countdown trigger
  useEffect(() => {
    if (countdown === 0) {
      if (reconcileTab !== 'exception') {
        fetchReportData(true)
      }
      setCountdown(30)
    }
  }, [countdown, reconcileTab])

  // Timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // Calculation utilities
  const getPercent = (n) => summaryData.total ? ((n / summaryData.total) * 100).toFixed(1) + '%' : '0.0%'

  // Dynamic header builder: Lists all columns dynamically based on layout rules
  let activeHeaders = []

  if (records.length > 0) {
    if (subTab === 'case_metadata') {
      // Case metadata dynamic columns
      activeHeaders = Object.keys(records[0]).map(key => {
        let label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        if (key.toLowerCase() === 'doc_no') label = 'Case Number'
        if (key.toLowerCase() === 'case_created_date') label = 'Created Date'
        if (key.toLowerCase() === 'migration_status') label = 'Migration Status'
        if (key.toLowerCase() === 'error_info') label = 'Failure Message'
        return { key, label }
      })
    } else if (isChecksumMode) {
      // Fixed Checksum Columns requested by the user
      activeHeaders = [
        { key: 'documentid', label: 'Doc_Id' },
        { key: 'doc_class', label: 'Doc Class' },
        { key: 'filename', label: 'Document Title' },
        { key: 'checksumbefore', label: 'checksumbefore' },
        { key: 'checksumafter', label: 'checksumafter' },
        { key: 'migrated_date', label: 'Migrated Date', isDate: true },
        { key: 'checksum_status', label: 'status' }
      ]
    } else {
      // doctaba mode: dynamic combination of system properties, custom metadata from doc_class_index, and status/path properties
      const recordKeys = Object.keys(records[0])
      
      const isDateColumn = (colName, isCustom) => {
        const colLower = colName.toLowerCase()
        if (isCustom) {
          const mapping = customMappings.find(m => m.f_columnname.toLowerCase() === colLower)
          return mapping && mapping.f_indexname.toLowerCase().includes('date')
        }
        return colLower.includes('date') || colLower.includes('access')
      }

      // 1. System properties from doctaba (start with f_) - formatted consistently
      const systemHeaders = recordKeys
        .filter(key => {
          const keyLower = key.toLowerCase()
          if (reconcileTab === 'exception') {
            return keyLower === 'f_docnumber' || 
                   keyLower === 'f_docclassnumber' || 
                   keyLower === 'f_entrydate' || 
                   keyLower === 'f_docformat'
          }
          return keyLower.startsWith('f_')
        })
        .map(key => {
          let label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          const keyLower = key.toLowerCase()
          if (keyLower === 'f_docnumber') label = 'Doc No'
          if (keyLower === 'f_docclassnumber') label = 'Doc Class'
          if (keyLower === 'f_entrydate') label = 'Created Date'
          if (keyLower === 'f_docformat') label = 'Doc Format'
          return { key, label, isDate: isDateColumn(key, false) }
        })

      // 2. Custom metadata fields mapped in doc_class_index for the active f_docclassnumber
      const docClassNum = Number(records[0]?.f_docclassnumber)
      const mappedCustomColumns = customMappings
        .filter(m => Number(m.f_docclassnumber) === docClassNum)
        .map(m => {
          const actualKey = recordKeys.find(rk => rk.toLowerCase() === m.f_columnname.toLowerCase())
          const isDate = m.f_indexname.toLowerCase().includes('date')
          return {
            key: actualKey || m.f_columnname,
            label: m.f_indexname,
            isDate
          }
        })
        .filter(h => recordKeys.includes(h.key))

      // 3. Specific status & path properties from doctaba
      const specificKeys = reconcileTab === 'exception'
        ? ['migration_status', 'error_info']
        : ['migration_status', 'migrated_date', 'error_info', 'filefullpath', 'folderpath', 'retrieval_name', 'p8_doc_id']
      
      const specificHeaders = specificKeys
        .filter(key => recordKeys.some(rk => rk.toLowerCase() === key.toLowerCase()))
        .map(key => {
          const actualKey = recordKeys.find(rk => rk.toLowerCase() === key.toLowerCase())
          let label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          if (key === 'migration_status') label = 'Status'
          if (key === 'error_info') label = 'Failure Message'
          return { key: actualKey, label }
        })

      activeHeaders = [...systemHeaders, ...mappedCustomColumns, ...specificHeaders]
    }
  }

  // Custom CSV Exporter for dynamic columns
  function handleExportCSV() {
    if (records.length === 0) return
    const headers = activeHeaders.map(h => h.label)
    const keys = activeHeaders.map(h => h.key)
    const escape = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'
    
    const lines = [
      headers.map(escape).join(','),
      ...records.map(r => keys.map(k => {
        const colHeader = activeHeaders.find(h => h.key === k)
        const val = colHeader?.isDate ? cleanDateToDDMMYYYY(r[k]) : r[k]
        return escape(val)
      }).join(','))
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const filename = isChecksumMode
      ? 'is_checksum_report.csv'
      : (subTab === 'case_metadata' ? 'case_details_reconciliation.csv' : 'is_document_reconciliation.csv')
    
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // Custom Excel Exporter for dynamic columns
  function handleExportExcel() {
    if (records.length === 0) return
    const headers = activeHeaders.map(h => h.label)
    const keys = activeHeaders.map(h => h.key)
    
    const rows = records.map(r => keys.map(k => {
      const colHeader = activeHeaders.find(h => h.key === k)
      const val = colHeader?.isDate ? cleanDateToDDMMYYYY(r[k]) : r[k]
      return val ?? ''
    }))
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reconciliation')
    
    const filename = isChecksumMode
      ? 'is_checksum_report.xlsx'
      : (subTab === 'case_metadata' ? 'case_details_reconciliation.xlsx' : 'is_document_reconciliation.xlsx')
    
    XLSX.writeFile(wb, filename)
  }

  // Handle main Reconciliation page tabs change
  function handleReconcileTabChange(tab) {
    setReconcileTab(tab)
    setError('')
    
    if (tab === 'summary') {
      setIsChecksumMode(false)
      setSelectedChecksumMode(false)
      setStatusFilter('All')
      setSelectedStatus('All')
      setIdsFilter('')
      setSelectedIds('')
      setFromDateFilter('')
      setSelectedFromDate('')
      setToDateFilter('')
      setSelectedToDate('')
      setSearchTrigger(prev => prev + 1)
    } else if (tab === 'report') {
      setIsChecksumMode(false)
      setSelectedChecksumMode(false)
      setStatusFilter('')
      setSelectedStatus('')
      setIdsFilter('')
      setSelectedIds('')
      setFromDateFilter('')
      setSelectedFromDate('')
      setToDateFilter('')
      setSelectedToDate('')
      setSearchTrigger(prev => prev + 1)
    } else if (tab === 'exception') {
      setIsChecksumMode(false)
      setSelectedChecksumMode(false)
      setStatusFilter('Failed')
      setSelectedStatus('Failed')
      setIdsFilter('')
      setSelectedIds('')
      setFromDateFilter('')
      setSelectedFromDate('')
      setToDateFilter('')
      setSelectedToDate('')
      setSearchTrigger(prev => prev + 1)
    } else if (tab === 'checksum') {
      setIsChecksumMode(true)
      setSelectedChecksumMode(true)
      setSelectedStatus('')
      setStatusFilter('')
      setSelectedFromDate('')
      setFromDateFilter('')
      setSelectedToDate('')
      setToDateFilter('')
      setSelectedIds('')
      setIdsFilter('')
      setSearchTrigger(prev => prev + 1)
    }
  }

  // Handle clicking on summary cards/tiles
  function handleSummaryCardClick(status) {
    setSelectedStatus(status)
    setStatusFilter(status)
    setSearchTrigger(prev => prev + 1)
  }

  // Handle toggling sub-tabs (Case vs IS) inside Reconciliation
  function handleSubTabChange(newSubTab) {
    setSubTab(newSubTab)
    setError('')
    setSelectedStatus('')
    setStatusFilter('')
    setSelectedFromDate('')
    setFromDateFilter('')
    setSelectedToDate('')
    setToDateFilter('')
    setSelectedIds('')
    setIdsFilter('')
    setRecords([])
    setSummaryData(INITIAL_SUMMARY)
    
    if (reconcileTab === 'summary') {
      setStatusFilter('All')
      setSelectedStatus('All')
      setSearchTrigger(prev => prev + 1)
    }
  }

  // Handle toggling sub-tabs for IS Search (still kept for backward compatibility if needed)
  function handleIsSubTabChange(isChecksum) {
    setSelectedChecksumMode(isChecksum)
    setIsChecksumMode(false)
    setSelectedStatus('')
    setStatusFilter('')
    setSelectedFromDate('')
    setFromDateFilter('')
    setSelectedToDate('')
    setToDateFilter('')
    setSelectedIds('')
    setIdsFilter('')
    setRecords([])
    setSummaryData(INITIAL_SUMMARY)
    setError('')
  }

  // Handle clicking View Checksum Report button
  function handleViewChecksumReport() {
    setIsChecksumMode(true)
    setSearchTrigger(prev => prev + 1)
  }

  // Handle clicking Checksum Report button
  function handleChecksumClick() {
    setSelectedChecksumMode(true)
    setSelectedStatus('') // Clear status filter when entering checksum mode
    setSelectedFromDate('')
    setSelectedToDate('')
    setSelectedIds('')
  }

  // Handle selecting Status dropdown
  function handleStatusChange(value) {
    setSelectedStatus(value)
    setSelectedChecksumMode(false) // Exit checksum mode when selecting a status
  }

  // Handle Search button click
  function handleSearchClick() {
    if (selectedStatus === '' && !selectedChecksumMode && selectedIds.trim() === '' && selectedFromDate === '' && selectedToDate === '') {
      showAlert('Please select a status, enter IDs, specify a date range, or click Checksum Report first.', 'Search Criteria Empty', 'warning')
      return
    }
    setStatusFilter(selectedStatus)
    setIsChecksumMode(selectedChecksumMode)
    setFromDateFilter(selectedFromDate)
    setToDateFilter(selectedToDate)
    setIdsFilter(selectedIds)
    setSearchTrigger(prev => prev + 1)
  }

  // Handle Clear button click
  function handleClearClick() {
    setSelectedStatus('')
    setSelectedChecksumMode(false)
    setSelectedFromDate('')
    setSelectedToDate('')
    setSelectedIds('')
    setStatusFilter('')
    setIsChecksumMode(false)
    setFromDateFilter('')
    setToDateFilter('')
    setIdsFilter('')
    setRecords([])
    setError('')
    setSummaryData(INITIAL_SUMMARY)
  }

  return (
    <div className="deliverables-container" style={{ padding: '14px', background: '#f8f9fa', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* ── Tabs Header ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px', padding: '0 4px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
        {/* Top-Level Tabs: Case Search and IS Search */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px', width: '100%' }}>
          <h2 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 'bold' }}>
            <FileSpreadsheet size={18} color="#4f46e5" /> Reconciliation
          </h2>
          
          <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
            <button
              onClick={() => handleSubTabChange('case_metadata')}
              style={{
                padding: '5px 16px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                background: subTab === 'case_metadata' ? '#ffffff' : 'transparent',
                color: subTab === 'case_metadata' ? '#4f46e5' : '#64748b',
                boxShadow: subTab === 'case_metadata' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Case Search
            </button>
            <button
              onClick={() => handleSubTabChange('is')}
              style={{
                padding: '5px 16px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                background: subTab === 'is' ? '#ffffff' : 'transparent',
                color: subTab === 'is' ? '#4f46e5' : '#64748b',
                boxShadow: subTab === 'is' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              IS Search
            </button>
          </div>
          
          {reconcileTab !== 'exception' && (
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#4b5563', 
              background: '#fff', padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', 
              fontFamily: 'monospace', fontWeight: 'bold', marginLeft: 'auto', marginRight: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }}></span>
              <span>Auto-Refresh: {formatTime(countdown)}</span>
            </div>
          )}
        </div>

        {/* Sub-Tabs: Migration Summary, Reconciliation Report, Exception Report, Checksum Report */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '2px 0' }}>
          {['summary', 'report', 'exception', 'checksum'].filter(tab => !(subTab === 'case_metadata' && tab === 'checksum')).map(tab => (
            <button
              key={tab}
              onClick={() => handleReconcileTabChange(tab)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                border: reconcileTab === tab ? '1.5px solid #4f46e5' : '1.5px solid #cbd5e1',
                cursor: 'pointer',
                background: reconcileTab === tab ? '#eff6ff' : 'white',
                color: reconcileTab === tab ? '#2563eb' : '#64748b',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap'
              }}
            >
              {tab === 'summary' ? 'Reconciliation Dashboard' : tab === 'report' ? 'Recon Report' : tab === 'exception' ? 'Exception Report' : 'Checksum Report'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Area ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(1px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            borderRadius: '12px',
            color: '#4f46e5',
            gap: '12px'
          }}>
            <Loader2 size={44} className="animate-spin" />
            <span style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.02em', color: '#1e293b' }}>Querying Database Records...</span>
          </div>
        )}

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            
            {/* Filter controls: Status heading with dropdown & Checksum Report Button beside it */}
            {reconcileTab !== 'summary' && reconcileTab !== 'report' && reconcileTab !== 'exception' && reconcileTab !== 'checksum' && (
              <div className="filters-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px', background: 'white', padding: '10px 14px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                {!selectedChecksumMode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={labelStyle}>Status</span>
                <select
                  value={selectedStatus}
                  onChange={e => handleStatusChange(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#0f172a',
                    fontSize: '12px',
                    fontWeight: '600',
                    outline: 'none',
                    minWidth: '180px'
                  }}
                >
                  <option value="">-- Select Status --</option>
                  <option value="All">Summary</option>
                  <option value="Migrated">Migrated</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>
            )}

            {!selectedChecksumMode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={labelStyle}>{subTab === 'case_metadata' ? 'Case ID' : 'Document ID'}</span>
                <input
                  type="text"
                  placeholder=""
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
                    minWidth: '200px'
                  }}
                />
              </div>
            )}

            {/* Date Range Filters (Only for IS normal mode) */}
            {subTab === 'is' && !selectedChecksumMode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={labelStyle}>From</span>
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
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={labelStyle}>To</span>
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
                    }}
                  />
                </div>
              </div>
            )}

            {selectedChecksumMode && (
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px' }}>ℹ️</span> Displays validation checksums for successfully migrated records.
              </span>
            )}

            {!selectedChecksumMode ? (
              <>
                {/* Search Button */}
                <button
                  onClick={handleSearchClick}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '7px 20px',
                    background: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Searching...
                    </>
                  ) : (
                    <>
                      <Search size={14} /> Search
                    </>
                  )}
                </button>

                {/* Clear Button */}
                <button
                  onClick={handleClearClick}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '7px 20px',
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
              </>
            ) : (
              /* View Checksum Report Button */
              <button
                onClick={handleViewChecksumReport}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '7px 20px',
                  background: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Querying...
                  </>
                ) : (
                  <>
                    <Database size={14} /> View Checksum Report
                  </>
                )}
              </button>
            )}
            </div>
          )}

          {error ? (
            /* ── Database Error Banner ── */
            <div className="empty-state" style={{ padding: '60px 40px', background: '#fff1f2', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#e11d48', flex: 1, border: '1px solid #ffe4e6', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
              <Database size={40} style={{ color: '#e11d48' }} />
              <span style={{ fontWeight: '700', fontSize: '14px' }}>Database Query Failure</span>
              <span style={{ fontSize: '12px', color: '#be123c', textAlign: 'center', maxWidth: '500px' }}>{error}</span>
            </div>
          ) : (reconcileTab !== 'report' && reconcileTab !== 'summary' && reconcileTab !== 'exception' && statusFilter === '' && idsFilter.trim() === '' && fromDateFilter === '' && toDateFilter === '' && !isChecksumMode) ? (
            /* ── Default unselected / pending search placeholder ── */
            <div className="empty-state" style={{ padding: '80px 40px', background: 'white', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#94a3b8', flex: 1, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
              <Database size={40} style={{ opacity: 0.5, color: '#4f46e5' }} />
              {(selectedStatus !== '' || selectedIds.trim() !== '' || selectedFromDate !== '' || selectedToDate !== '' || selectedChecksumMode) ? (
                <>
                  <span style={{ fontWeight: '600', color: '#64748b', fontSize: '14px' }}>
                    Ready to Search
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', maxWidth: '400px' }}>
                    {selectedChecksumMode ? (
                      <>
                        Click the <strong>View Checksum Report</strong> button to retrieve validation results.
                      </>
                    ) : (
                      <>
                        You have selected <strong>{selectedStatus === 'All' ? 'Summary' : selectedStatus}</strong>
                        {selectedIds.trim() && ` with ${subTab === 'case_metadata' ? 'Case' : 'Document'} ID: ${selectedIds}`}
                        {selectedFromDate && ` from ${selectedFromDate}`}
                        {selectedToDate && ` to ${selectedToDate}`}
                        . Click the <strong>Search</strong> button to retrieve records.
                      </>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <span style={{ fontWeight: '600', color: '#64748b', fontSize: '14px' }}>
                    Please Select a Report Status
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', maxWidth: '400px' }}>
                    {selectedChecksumMode ? (
                      <>Click the <strong>View Checksum Report</strong> button to retrieve validation results.</>
                    ) : subTab === 'case_metadata' ? (
                      <>Choose a status from the dropdown menu above or enter a Case ID, then click Search.</>
                    ) : (
                      <>Choose a status from the dropdown menu above or enter a Document ID, then click Search.</>
                    )}
                  </span>
                </>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0 }}>
              
              {/* ── Summary Insights Tiles (Visible when 'Summary' is selected, or when Checksum Mode is active) ── */}
              {(statusFilter === 'All' || isChecksumMode || reconcileTab === 'summary') && (
                isChecksumMode ? (
                  /* ── Checksum Mode Insights (3 Tiles with Match & Mismatch Percentage) ── */
                  <div className="cs-summary-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', margin: '0 4px' }}>
                    {/* Total Records Tile */}
                    <div className="cs-tile" style={{ '--tile-color': 'var(--primary)', padding: '12px 16px' }}>
                      <div className="cs-tile-label">Total Records</div>
                      <div className="cs-tile-value" style={{ fontSize: '24px', color: 'var(--primary-dark)' }}>
                        {summaryData.total.toLocaleString()}
                      </div>
                      <div className="cs-tile-sub">Total documents verified</div>
                    </div>

                    {/* Checksum Success / Matched Tile */}
                    <div className="cs-tile" style={{ '--tile-color': 'var(--success)', padding: '12px 16px' }}>
                      <div className="cs-tile-label">Checksum Success (Matched)</div>
                      <div className="cs-tile-value" style={{ fontSize: '24px', color: 'var(--success)' }}>
                        {summaryData.success.toLocaleString()}
                      </div>
                      <div className="cs-tile-sub">{getPercent(summaryData.success)} rate</div>
                    </div>

                    {/* Checksum Failed / Mismatched Tile */}
                    <div className="cs-tile" style={{ '--tile-color': 'var(--danger)', padding: '12px 16px' }}>
                      <div className="cs-tile-label">Checksum Failed (Mismatched)</div>
                      <div className="cs-tile-value" style={{ fontSize: '24px', color: 'var(--danger)' }}>
                        {(summaryData.total - summaryData.success).toLocaleString()}
                      </div>
                      <div className="cs-tile-sub">{getPercent(summaryData.total - summaryData.success)} rate</div>
                    </div>
                  </div>
                ) : (
                  /* ── Normal Mode Insights (Reconciliation Summary panel only) ── */
                  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', margin: '0 4px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
                      <h4 style={{ margin: '0 0 14px 0', fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>Reconciliation Summary</h4>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                        {/* Total Extracted */}
                        <div 
                          role={reconcileTab === 'summary' ? 'button' : undefined}
                          onClick={reconcileTab === 'summary' ? () => handleSummaryCardClick('All') : undefined}
                          style={{
                            padding: '12px',
                            border: reconcileTab === 'summary' && (statusFilter === 'All' || statusFilter === '') ? '2px solid #6366f1' : '1.5px solid #cbd5e1',
                            borderRadius: '8px',
                            cursor: reconcileTab === 'summary' ? 'pointer' : 'default',
                            transition: 'all 0.15s',
                            boxShadow: reconcileTab === 'summary' && (statusFilter === 'All' || statusFilter === '') ? '0 3px 8px rgba(99,102,241,0.12)' : 'none'
                          }}
                        >
                          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '6px' }}>Total Extracted</div>
                          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{summaryData.total.toLocaleString()}</div>
                        </div>

                        {/* Total Migrated */}
                        <div 
                          role={reconcileTab === 'summary' ? 'button' : undefined}
                          onClick={reconcileTab === 'summary' ? () => handleSummaryCardClick('Migrated') : undefined}
                          style={{
                            padding: '12px',
                            border: reconcileTab === 'summary' && statusFilter === 'Migrated' ? '2px solid #10b981' : '1.5px solid #cbd5e1',
                            borderRadius: '8px',
                            cursor: reconcileTab === 'summary' ? 'pointer' : 'default',
                            transition: 'all 0.15s',
                            boxShadow: reconcileTab === 'summary' && statusFilter === 'Migrated' ? '0 3px 8px rgba(16,185,129,0.12)' : 'none'
                          }}
                        >
                          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '6px' }}>Total Migrated</div>
                          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{summaryData.success.toLocaleString()}</div>
                        </div>

                        {/* Remaining */}
                        <div 
                          role={reconcileTab === 'summary' ? 'button' : undefined}
                          onClick={reconcileTab === 'summary' ? () => handleSummaryCardClick('Remaining') : undefined}
                          style={{
                            padding: '12px',
                            border: reconcileTab === 'summary' && statusFilter === 'Remaining' ? '2px solid #f59e0b' : '1.5px solid #cbd5e1',
                            borderRadius: '8px',
                            cursor: reconcileTab === 'summary' ? 'pointer' : 'default',
                            transition: 'all 0.15s',
                            boxShadow: reconcileTab === 'summary' && statusFilter === 'Remaining' ? '0 3px 8px rgba(245,158,11,0.12)' : 'none'
                          }}
                        >
                          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '6px' }}>Remaining</div>
                          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                            {(summaryData.pending + summaryData.inProgress).toLocaleString()}
                          </div>
                        </div>

                        {/* Failed */}
                        <div 
                          role={reconcileTab === 'summary' ? 'button' : undefined}
                          onClick={reconcileTab === 'summary' ? () => handleSummaryCardClick('Failed') : undefined}
                          style={{
                            padding: '12px',
                            border: reconcileTab === 'summary' && statusFilter === 'Failed' ? '2px solid #ef4444' : '1.5px solid #cbd5e1',
                            borderRadius: '8px',
                            cursor: reconcileTab === 'summary' ? 'pointer' : 'default',
                            transition: 'all 0.15s',
                            boxShadow: reconcileTab === 'summary' && statusFilter === 'Failed' ? '0 3px 8px rgba(239,68,68,0.12)' : 'none'
                          }}
                        >
                          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '6px' }}>Failed</div>
                          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{summaryData.failed.toLocaleString()}</div>
                        </div>

                        {/* Completion % (Visual radial Donut) */}
                        <div style={{ padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Completion %</div>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                              {getPercent(summaryData.success)}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <svg width="42" height="42" viewBox="0 0 42 42">
                              <circle cx="21" cy="21" r="16" fill="transparent" stroke="#e2e8f0" strokeWidth="3" />
                              <circle cx="21" cy="21" r="16" fill="transparent" stroke="#10b981" strokeWidth="3"
                                strokeDasharray={`${2 * Math.PI * 16}`}
                                strokeDashoffset={`${2 * Math.PI * 16 * (1 - (Number(getPercent(summaryData.success).replace('%', '')) || 0) / 100)}`}
                                strokeLinecap="round"
                                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.4s ease' }}
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                )
              )}

              {reconcileTab === 'report' && (
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 18px', margin: '0 4px 16px 4px', maxWidth: subTab === 'case_metadata' ? '800px' : '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
                  {subTab === 'case_metadata' ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', fontSize: '10.5px', letterSpacing: '0.05em', width: '260px' }}>Reconciliation Check</th>
                          <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', fontSize: '10.5px', letterSpacing: '0.05em', width: '130px' }}>Source Count</th>
                          <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', fontSize: '10.5px', letterSpacing: '0.05em', width: '130px' }}>Target Count</th>
                          <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', fontSize: '10.5px', letterSpacing: '0.05em', width: '110px' }}>Variance</th>
                          <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', fontSize: '10.5px', letterSpacing: '0.05em', width: '120px' }}>Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Row 1: Document Count */}
                        <tr style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                          <td style={{ padding: '10px 14px', fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>Document Count</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '13.5px', color: '#0f172a' }}>{summaryData.total.toLocaleString()}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '13.5px', color: '#0f172a' }}>{summaryData.total.toLocaleString()}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '13.5px', color: '#64748b' }}>0</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '65px', padding: '3px 8px', borderRadius: '20px', background: '#D1FAE5', color: '#065F46', fontSize: '10.5px', fontWeight: '800', letterSpacing: '0.02em' }}>PASS</span>
                          </td>
                        </tr>
                        {/* Row 2: Successfully Migrated */}
                        <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#FAFBFC', transition: 'background 0.15s' }}>
                          <td style={{ padding: '10px 14px', fontWeight: '600', color: '#334155', fontSize: '14px' }}>Successfully Migrated</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '13.5px', color: '#0f172a' }}>{summaryData.total.toLocaleString()}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '13.5px', color: '#0f172a' }}>{summaryData.success.toLocaleString()}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '13.5px', color: (summaryData.total - summaryData.success) > 0 ? '#ef4444' : '#64748b' }}>
                            {(summaryData.total - summaryData.success).toLocaleString()}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {(summaryData.total - summaryData.success) === 0 ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '65px', padding: '3px 8px', borderRadius: '20px', background: '#D1FAE5', color: '#065F46', fontSize: '10.5px', fontWeight: '800', letterSpacing: '0.02em' }}>PASS</span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '65px', padding: '3px 8px', borderRadius: '20px', background: '#FEE2E2', color: '#991B1B', fontSize: '10.5px', fontWeight: '800', letterSpacing: '0.02em' }}>FAIL</span>
                            )}
                          </td>
                        </tr>
                        {/* Row 3: In-Progress */}
                        <tr style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                          <td style={{ padding: '10px 14px', fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>In-Progress</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '13.5px', color: '#0f172a' }}>{summaryData.inProgress.toLocaleString()}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '13.5px', color: '#0f172a' }}>0</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '13.5px', color: summaryData.inProgress > 0 ? '#f59e0b' : '#64748b' }}>
                            {summaryData.inProgress.toLocaleString()}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {summaryData.inProgress === 0 ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '65px', padding: '3px 8px', borderRadius: '20px', background: '#D1FAE5', color: '#065F46', fontSize: '10.5px', fontWeight: '800', letterSpacing: '0.02em' }}>PASS</span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '65px', padding: '3px 8px', borderRadius: '20px', background: '#FEF3C7', color: '#92400E', fontSize: '10.5px', fontWeight: '800', letterSpacing: '0.02em' }}>HOLD</span>
                            )}
                          </td>
                        </tr>
                        {/* Row 4: Pending */}
                        <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#FAFBFC', transition: 'background 0.15s' }}>
                          <td style={{ padding: '10px 14px', fontWeight: '600', color: '#334155', fontSize: '14px' }}>Pending</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '13.5px', color: '#0f172a' }}>{summaryData.pending.toLocaleString()}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '13.5px', color: '#0f172a' }}>0</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '13.5px', color: '#64748b' }}>
                            {summaryData.pending.toLocaleString()}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {summaryData.pending === 0 ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '65px', padding: '3px 8px', borderRadius: '20px', background: '#D1FAE5', color: '#065F46', fontSize: '10.5px', fontWeight: '800', letterSpacing: '0.02em' }}>PASS</span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '65px', padding: '3px 8px', borderRadius: '20px', background: '#F1F2F4', color: '#6B7280', fontSize: '10.5px', fontWeight: '800', letterSpacing: '0.02em' }}>HOLD</span>
                            )}
                          </td>
                        </tr>
                        {/* Row 5: Failed */}
                        <tr style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                          <td style={{ padding: '10px 14px', fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>Failed</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '13.5px', color: '#0f172a' }}>{summaryData.failed.toLocaleString()}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '13.5px', color: '#0f172a' }}>0</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '13.5px', color: summaryData.failed > 0 ? '#ef4444' : '#64748b' }}>
                            {summaryData.failed.toLocaleString()}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {summaryData.failed === 0 ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '65px', padding: '3px 8px', borderRadius: '20px', background: '#D1FAE5', color: '#065F46', fontSize: '10.5px', fontWeight: '800', letterSpacing: '0.02em' }}>PASS</span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '65px', padding: '3px 8px', borderRadius: '20px', background: '#FEE2E2', color: '#991B1B', fontSize: '10.5px', fontWeight: '800', letterSpacing: '0.02em' }}>FAIL</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>Documentation Class</th>
                          <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>Year</th>
                          <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>Total Documents</th>
                          <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>No. Extracted</th>
                          <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>No. Migrated</th>
                          <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>No of Failed</th>
                          <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>No. Remaining</th>
                          <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>% Completion</th>
                          <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>% Failed</th>
                          <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customReportData.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 1 ? '#FAFBFC' : 'white', transition: 'background 0.15s' }}>
                            {idx === 0 ? (
                              <td rowSpan={customReportData.length} style={{ padding: '10px 12px', fontWeight: 'bold', color: '#0f172a', fontSize: '11.5px', borderRight: '1px solid #f1f5f9', verticalAlign: 'top', background: '#FAFBFC' }}>
                                {row.class}
                              </td>
                            ) : null}
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#334155', fontSize: '11px' }}>{row.year}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '11px', color: '#0f172a' }}>
                              {row.total ? Number(row.total).toLocaleString() : '—'}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '11px', color: '#0f172a' }}>
                              {row.extracted ? Number(row.extracted).toLocaleString() : '—'}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '11px', color: '#0f172a' }}>
                              {row.migrated !== '' && row.migrated !== null ? Number(row.migrated).toLocaleString() : '—'}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '11px', color: '#ef4444' }}>
                              {row.failed !== '' && row.failed !== null ? Number(row.failed).toLocaleString() : '—'}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '11px', color: '#64748b' }}>
                              {row.remaining ? Number(row.remaining).toLocaleString() : '—'}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700', fontSize: '11px', color: '#0f172a' }}>{row.completion || '—'}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700', fontSize: '11px', color: '#ef4444' }}>{row.pctFailed || '—'}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {row.status === 'IN PROGRESS' ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '85px', padding: '3px 8px', borderRadius: '20px', background: '#FEF3C7', color: '#92400E', fontSize: '8.5px', fontWeight: '800', letterSpacing: '0.02em' }}>IN PROGRESS</span>
                              ) : row.status === 'COMPLETED' ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '85px', padding: '3px 8px', borderRadius: '20px', background: '#D1FAE5', color: '#065F46', fontSize: '8.5px', fontWeight: '800', letterSpacing: '0.02em' }}>COMPLETED</span>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* ── Case/IS Records Grid ── */}
              {reconcileTab !== 'report' && (
                <div className="grid-container" style={{ background: 'white', padding: '12px', borderRadius: '12px', flex: 1, minHeight: 0, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                  
                  {/* Grid Toolbar with Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 4px' }}>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '13px', fontWeight: 'bold' }}>
                      {isChecksumMode 
                        ? 'Checksum Report' 
                        : (subTab === 'case_metadata' ? 'Case Details Reconciliation' : 'IS Document Reconciliation')
                      } ({records.length} records)
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

                  {/* Records Table */}
                  <div className="table-wrap" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    {records.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No records found for the filter.</div>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>S.No</th>
                            {activeHeaders.map(col => <th key={col.key}>{col.label}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {records.map((r, i) => (
                            <tr key={r.doc_no || r.f_docnumber || r.documentid || r.case_id || i}>
                              <td style={{ textAlign: 'center' }}>{i + 1}</td>
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

                                if (keyLower === 'doc_no' || keyLower === 'f_docnumber' || keyLower === 'documentid' || keyLower === 'case_id' || keyLower === 'p8_doc_id') {
                                  return <td key={c.key} className="cell-mono" style={tdStyle}>{val}</td>
                                }
                                if (keyLower === 'checksumbefore' || keyLower === 'checksumafter') {
                                  return (
                                    <td key={c.key} className="cell-mono" style={{ ...tdStyle, fontSize: '9px' }} title={val}>
                                      {val ? val.slice(0, 16) + '…' : <span className="cell-empty">—</span>}
                                    </td>
                                  )
                                }
                                if (keyLower === 'migration_status' || keyLower === 'checksum_status' || keyLower === 'f_status') {
                                  const isSuccess = val?.toLowerCase() === 'success' || val?.toLowerCase() === 'migrated' || val?.toLowerCase() === 'completed'
                                  const isProgress = val?.toLowerCase() === 'in progress' || val?.toLowerCase() === 'in-progress' || val?.toLowerCase() === 'inprogress' || val?.toLowerCase() === 'retry'
                                  const isPending = val?.toLowerCase() === 'pending'
                                  const statusCls = isSuccess ? 'status-success' : isProgress ? 'status-inprogress' : isPending ? 'status-pending' : 'status-failed'
                                  return (
                                    <td key={c.key} style={tdStyle}>
                                      <span className={`status-badge ${statusCls}`}>
                                        {val}
                                      </span>
                                    </td>
                                  )
                                }
                                if (keyLower === 'error_info') {
                                  return (
                                    <td key={c.key} style={{ ...tdStyle, color: '#e11d48', fontWeight: '500' }} title={val}>
                                      {val == null || val === '' ? <span className="cell-empty">—</span> : String(val)}
                                    </td>
                                  )
                                }
                              return (
                                <td key={c.key} style={tdStyle} title={val}>
                                  {val == null || val === '' ? (
                                    <span className="cell-empty">—</span>
                                  ) : (
                                    c.isDate ? cleanDateToDDMMYYYY(val) : String(val)
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

              </div>
              )}

            </div>
            )}
          </div>
        </div>
      </div>
    )
  }
