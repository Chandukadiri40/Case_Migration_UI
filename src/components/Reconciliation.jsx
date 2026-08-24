import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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

// Comprehensive Checksum Status Helper resolving: 'Matched', 'Pending', 'Mismatched'
function getChecksumStatus(val, row) {
  const v = String(val || '').toLowerCase().trim()
  if (v === 'pending') return 'Pending'
  if (v === 'matched' || v === 'completed' || v === 'success' || v === 'migrated') return 'Matched'
  if (v === 'mismatched' || v === 'mismatch' || v === 'failed') return 'Mismatched'
  
  if (row?.checksumbefore && row?.checksumafter && String(row.checksumbefore).trim() !== '' && String(row.checksumafter).trim() !== '') {
    return String(row.checksumbefore).trim() === String(row.checksumafter).trim() ? 'Matched' : 'Mismatched'
  }
  
  return 'Pending'
}

export default function Reconciliation({ activeTab = 'is' }) {
  const { showAlert } = useAlert()
  const [subTab, setSubTab] = useState(activeTab)
  const [searchParams, setSearchParams] = useSearchParams();
  const reconcileTab = searchParams.get('view') || 'summary';
  const setReconcileTab = (view) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('view', view);
    setSearchParams(newParams);
  }

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
  const [countdown, setCountdown] = useState(10)

  // Data states
  const [summaryData, setSummaryData] = useState(INITIAL_SUMMARY)
  const [records, setRecords] = useState([])
  const [customMappings, setCustomMappings] = useState([]) // Loaded from doc_class_index
  const [docClasses, setDocClasses] = useState([]) // Loaded from document_class
  const [customReportData, setCustomReportData] = useState([])

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
      if (reconcileTab === 'report') {
        if (isCase) {
          // Fetch dynamic report data from case_metadata table with real data analysis
          const caseNormDateSql = `(
            CASE 
              WHEN case_created_date::text ~ '^[0-9]{4}[-/][0-9]{2}[-/][0-9]{2}' THEN SUBSTRING(case_created_date::text FROM 1 FOR 4) || '-' || SUBSTRING(case_created_date::text FROM 6 FOR 2) || '-' || SUBSTRING(case_created_date::text FROM 9 FOR 2)
              WHEN case_created_date::text ~ '^[0-9]{2}[-/][0-9]{2}[-/][0-9]{4}' THEN SUBSTRING(case_created_date::text FROM 7 FOR 4) || '-' || SUBSTRING(case_created_date::text FROM 4 FOR 2) || '-' || SUBSTRING(case_created_date::text FROM 1 FOR 2)
              WHEN case_created_date::text ~ '^[0-9]+$' THEN TO_CHAR(DATE '1970-01-01' + case_created_date::text::integer, 'YYYY-MM-DD')
              ELSE SUBSTRING(case_created_date::text FROM 1 FOR 10)
            END
          )`
          const caseReportWhere = []
          if (idList.length > 0) {
            const idStrList = idList.map(id => `'${id.replace(/'/g, "''")}'`).join(', ')
            caseReportWhere.push(`(doc_no::text IN (${idStrList}) OR case_id::text IN (${idStrList}))`)
          }
          if (fromDateFilter) {
            caseReportWhere.push(`${caseNormDateSql} >= '${fromDateFilter}'`)
          }
          if (toDateFilter) {
            caseReportWhere.push(`${caseNormDateSql} <= '${toDateFilter}'`)
          }
          const whereSql = caseReportWhere.length > 0 ? ` WHERE ${caseReportWhere.join(' AND ')}` : ''

          const reportQuery = `
            SELECT 
              class_name,
              yr,
              COUNT(*) as total,
              SUM(CASE WHEN LOWER(COALESCE(extracted_status, '')) IN ('extracted', 'success') OR extracted_status IS NOT NULL THEN 1 ELSE 0 END) as extracted,
              SUM(CASE WHEN LOWER(COALESCE(migration_status, '')) IN ('success', 'migrated') THEN 1 ELSE 0 END) as migrated,
              SUM(CASE WHEN LOWER(COALESCE(migration_status, '')) = 'failed' THEN 1 ELSE 0 END) as failed
            FROM (
              SELECT 
                COALESCE(NULLIF(case_type, ''), 'Standard Case') as class_name,
                COALESCE(NULLIF(SUBSTRING(case_created_date::text FROM '[0-9]{4}'), ''), 'Unknown') as yr,
                extracted_status,
                migration_status
              FROM case_metadata${whereSql}
            ) sub
            GROUP BY class_name, yr
            ORDER BY class_name, yr
          `
          const dbReportRows = await apiExecuteQuery(reportQuery)
          const calculatedRows = (dbReportRows || []).map(dbRow => {
            const yearStr = (dbRow.yr && dbRow.yr !== 'null' && dbRow.yr !== 'undefined') ? dbRow.yr : '—'
            const total = Number(dbRow.total) || 0
            const extractedRaw = Number(dbRow.extracted) || 0
            const extracted = extractedRaw > 0 ? extractedRaw : total
            const migrated = Number(dbRow.migrated) || 0
            const failed = Number(dbRow.failed) || 0
            
            const remaining = Math.max(0, total - migrated)
            const completion = total > 0 ? ((migrated / total) * 100).toFixed(1) + '%' : '0.0%'
            const pctFailed = total > 0 ? ((failed / total) * 100).toFixed(1) + '%' : '0.0%'
            
            let status = 'PENDING'
            if (migrated === 0 && failed === 0) {
              status = 'PENDING'
            } else if (remaining === 0 && total > 0) {
              status = 'COMPLETED'
            } else {
              status = 'IN PROGRESS'
            }

            return {
              class: dbRow.class_name,
              year: yearStr,
              total,
              extracted,
              migrated,
              failed,
              remaining,
              completion,
              pctFailed,
              status
            }
          })
          setCustomReportData(calculatedRows)
        } else {
          // Fetch real dynamic year-wise and class-wise report data from doctaba
          const isReportWhere = []
          if (idList.length > 0) {
            const idStrList = idList.map(id => `'${id.replace(/'/g, "''")}'`).join(', ')
            isReportWhere.push(`s.f_docnumber::text IN (${idStrList})`)
          }
          if (fromDays != null) {
            isReportWhere.push(`s.f_entrydate >= ${fromDays}`)
          }
          if (toDays != null) {
            isReportWhere.push(`s.f_entrydate <= ${toDays}`)
          }
          const isWhereSql = isReportWhere.length > 0 ? ` WHERE ${isReportWhere.join(' AND ')}` : ''

          const reportQuery = `
            SELECT 
              class_num,
              yr,
              COUNT(*) as total,
              SUM(CASE WHEN LOWER(COALESCE(extracted_status, '')) IN ('extracted', 'success') OR extracted_status IS NOT NULL THEN 1 ELSE 0 END) as extracted,
              SUM(CASE WHEN LOWER(COALESCE(migration_status, '')) IN ('success', 'migrated') THEN 1 ELSE 0 END) as migrated,
              SUM(CASE WHEN LOWER(COALESCE(migration_status, '')) = 'failed' THEN 1 ELSE 0 END) as failed
            FROM (
              SELECT 
                s.f_docclassnumber as class_num,
                CASE 
                  WHEN s.f_entrydate::text ~ '^[0-9]+$' THEN TO_CHAR(DATE '1970-01-01' + s.f_entrydate::integer, 'YYYY')
                  WHEN s.f_entrydate::text ~ '^[0-9]{4}' THEN SUBSTRING(s.f_entrydate::text FROM 1 FOR 4)
                  ELSE TO_CHAR(CURRENT_DATE, 'YYYY')
                END as yr,
                s.extracted_status,
                s.migration_status
              FROM doctaba_staging_table s${isWhereSql}
            ) sub
            GROUP BY class_num, yr
            ORDER BY class_num, yr
          `
          const dbReportRows = await apiExecuteQuery(reportQuery)
          
          let loadedClasses = docClasses
          if (!loadedClasses || loadedClasses.length === 0) {
            try {
              const classRes = await apiExecuteQuery("SELECT f_docclassnumber, f_docclassname FROM public.document_class")
              if (classRes && classRes.length > 0) {
                loadedClasses = classRes
                setDocClasses(classRes)
              }
            } catch (e) {
              console.error("Failed to query document_class for report:", e)
            }
          }

          const calculatedRows = (dbReportRows || []).map(dbRow => {
            const yearStr = dbRow.yr || '2026'
            const total = Number(dbRow.total) || 0
            const extractedRaw = Number(dbRow.extracted) || 0
            // In IS source table, records in doctaba are extracted documents
            const extracted = extractedRaw > 0 ? extractedRaw : total
            const migrated = Number(dbRow.migrated) || 0
            const failed = Number(dbRow.failed) || 0
            
            // No. Remaining = Total - No. Migrated
            const remaining = Math.max(0, total - migrated)
            const completion = total > 0 ? ((migrated / total) * 100).toFixed(1) + '%' : '0.0%'
            const pctFailed = total > 0 ? ((failed / total) * 100).toFixed(1) + '%' : '0.0%'
            
            let status = 'PENDING'
            if (migrated === 0 && failed === 0) {
              status = 'PENDING'
            } else if (remaining === 0 && total > 0) {
              status = 'COMPLETED'
            } else {
              status = 'IN PROGRESS'
            }
            
            const matchingClass = (loadedClasses || []).find(dc => Number(dc.f_docclassnumber) === Number(dbRow.class_num))
            const className = matchingClass?.f_docclassname || (dbRow.class_num ? `Class ${dbRow.class_num}` : 'WBD_COLD_BL')

            return {
              class: className,
              year: yearStr,
              total,
              extracted,
              migrated,
              failed,
              remaining,
              completion,
              pctFailed,
              status
            }
          })
          
          setCustomReportData(calculatedRows)
        }
      } else if (isChecksumMode) {
        // ── Checksum Mode (Queries ischecksumtable) ──
        let countQuery = `
          SELECT 
            COUNT(*) as total,
            SUM(CASE 
              WHEN LOWER(COALESCE(checksum_status, '')) = 'pending' THEN 0
              WHEN LOWER(COALESCE(checksum_status, '')) IN ('completed', 'success', 'migrated', 'matched') THEN 1
              WHEN (checksum_status IS NULL OR checksum_status = '') AND checksumbefore IS NOT NULL AND checksumafter IS NOT NULL AND checksumbefore != '' AND checksumafter != '' AND checksumbefore = checksumafter THEN 1
              ELSE 0 
            END) as success,
            SUM(CASE 
              WHEN LOWER(COALESCE(checksum_status, '')) = 'pending' THEN 0
              WHEN LOWER(COALESCE(checksum_status, '')) IN ('mismatched', 'failed', 'mismatch') THEN 1
              WHEN (checksum_status IS NULL OR checksum_status = '') AND checksumbefore IS NOT NULL AND checksumafter IS NOT NULL AND checksumbefore != '' AND checksumafter != '' AND checksumbefore != checksumafter THEN 1
              ELSE 0 
            END) as failed,
            SUM(CASE 
              WHEN LOWER(COALESCE(checksum_status, '')) = 'pending' THEN 1
              WHEN (checksum_status IS NULL OR checksum_status = '') AND (checksumafter IS NULL OR checksumafter = '') THEN 1
              ELSE 0 
            END) as pending
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
          LEFT JOIN doctaba_staging_table s ON c.documentid = s.f_docnumber::text 
          LEFT JOIN public.document_class dc ON s.f_docclassnumber = dc.f_docclassnumber
        `
        if (idList.length > 0) {
          const idStrList = idList.map(id => `'${id.replace(/'/g, "''")}'`).join(', ')
          recordQuery += ` WHERE c.documentid::text IN (${idStrList})`
        }
        recordQuery += ` ORDER BY c.documentid DESC`

        const res = await apiExecuteQuery(recordQuery)
        setRecords(res || [])

      } else if (isCase) {
        // ── Case Details Mode (Queries case_metadata with specific column select) ──
        const caseCols = [
          'case_id', 'doc_no', 'case_type', 'customer_id', 'customer_name', 'policy_number',
          'case_created_date', 'case_description', 'case_status', 'case_owner', 'department', 'case_closed_date',
          'priority', 'source_system', 'document_count',
          'migrated_date', 'migration_status', 'error_info', 'filefullpath', 'p8_doc_id'
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
        const caseNormDateSql = `(
          CASE 
            WHEN case_created_date::text ~ '^[0-9]{4}[-/][0-9]{2}[-/][0-9]{2}' THEN SUBSTRING(case_created_date::text FROM 1 FOR 4) || '-' || SUBSTRING(case_created_date::text FROM 6 FOR 2) || '-' || SUBSTRING(case_created_date::text FROM 9 FOR 2)
            WHEN case_created_date::text ~ '^[0-9]{2}[-/][0-9]{2}[-/][0-9]{4}' THEN SUBSTRING(case_created_date::text FROM 7 FOR 4) || '-' || SUBSTRING(case_created_date::text FROM 4 FOR 2) || '-' || SUBSTRING(case_created_date::text FROM 1 FOR 2)
            WHEN case_created_date::text ~ '^[0-9]+$' THEN TO_CHAR(DATE '1970-01-01' + case_created_date::text::integer, 'YYYY-MM-DD')
            ELSE SUBSTRING(case_created_date::text FROM 1 FOR 10)
          END
        )`
        const caseWhereClauses = []
        if (idList.length > 0) {
          const idStrList = idList.map(id => `'${id.replace(/'/g, "''")}'`).join(', ')
          caseWhereClauses.push(`(doc_no::text IN (${idStrList}) OR case_id::text IN (${idStrList}))`)
        }
        if (fromDateFilter) {
          caseWhereClauses.push(`${caseNormDateSql} >= '${fromDateFilter}'`)
        }
        if (toDateFilter) {
          caseWhereClauses.push(`${caseNormDateSql} <= '${toDateFilter}'`)
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

        // 2. Fetch specific records grid data (only for filtered status/criteria, not full Summary)
        if (statusFilter !== 'All' || idList.length > 0 || fromDateFilter || toDateFilter) {
          let recordQuery = `SELECT ${selectClause} FROM case_metadata`
          const recordWhereClauses = []
          
          if (statusFilter !== 'All' && statusFilter !== '') {
            const filterVal = statusFilter.toLowerCase().trim()
            if (filterVal === 'migrated' || filterVal === 'success' || filterVal === 'sucsess') {
              recordWhereClauses.push(`LOWER(migration_status) IN ('success', 'migrated', 'sucsess')`)
            } else if (filterVal === 'in progress' || filterVal === 'inprogress' || filterVal === 'in-progress') {
              recordWhereClauses.push(`LOWER(migration_status) IN ('in progress', 'in-progress', 'inprogress', 'retry')`)
            } else if (filterVal === 'failed' || filterVal === 'failure') {
              recordWhereClauses.push(`LOWER(migration_status) IN ('failed', 'failure', 'error')`)
            } else if (filterVal === 'pending') {
              recordWhereClauses.push(`LOWER(migration_status) IN ('pending', 'queued', 'not started', 'not_started')`)
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
          if (fromDateFilter) {
            recordWhereClauses.push(`${caseNormDateSql} >= '${fromDateFilter}'`)
          }
          if (toDateFilter) {
            recordWhereClauses.push(`${caseNormDateSql} <= '${toDateFilter}'`)
          }
          if (recordWhereClauses.length > 0) {
            recordQuery += ` WHERE ` + recordWhereClauses.join(' AND ')
          }
          
          recordQuery += ` ORDER BY case_id ASC`
          const res = await apiExecuteQuery(recordQuery)
          setRecords(res || [])
        } else {
          setRecords([])
        }

      } else {
        // ── IS Reconciliation normal mode (Queries doctaba_staging_table dynamically with specific columns and date conversion) ──
        // 1. Query the physical column names of doctaba_staging_table dynamically
        const columnsRes = await apiExecuteQuery(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'doctaba_staging_table'
        `)
        const doctabaColumns = (columnsRes || []).map(c => c.column_name.toLowerCase())

        // 2. Query the active doc class number dynamically
        let docClassNum = 19
        try {
          const classRes = await apiExecuteQuery("SELECT f_docclassnumber FROM doctaba_staging_table LIMIT 1")
          if (classRes && classRes.length > 0) {
            docClassNum = Number(classRes[0].f_docclassnumber)
          }
        } catch (e) {
          console.error("Failed to query active doc class number:", e)
        }

        // Get mapped custom columns for this class number
        const classMappings = customMappings.filter(m => Number(m.f_docclassnumber) === docClassNum)
        const customCols = classMappings.map(m => m.f_columnname.toLowerCase())

        // System properties of doctaba (Only: Document Number, Document Class, Created Date, Document Format)
        const systemCols = [
          'f_docnumber', 'f_docclassnumber', 'f_entrydate', 'f_docformat'
        ]

        // Status & Error Info properties of doctaba
        const specificCols = [
          'migration_status', 'error_info'
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
          FROM doctaba_staging_table
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
        // 2. Fetch specific records grid data (only for filtered status/criteria, not full Summary)
        if (statusFilter !== 'All' || idList.length > 0 || fromDays !== null || toDays !== null) {
          let recordQuery = `SELECT ${selectClause} FROM doctaba_staging_table`
          const recordWhereClauses = []

          if (statusFilter !== 'All' && statusFilter !== '') {
            const filterVal = statusFilter.toLowerCase().trim()
            if (filterVal === 'migrated' || filterVal === 'success' || filterVal === 'sucsess') {
              recordWhereClauses.push(`LOWER(migration_status) IN ('success', 'migrated', 'sucsess')`)
            } else if (filterVal === 'in progress' || filterVal === 'inprogress' || filterVal === 'in-progress') {
              recordWhereClauses.push(`LOWER(migration_status) IN ('in progress', 'in-progress', 'inprogress', 'retry')`)
            } else if (filterVal === 'failed' || filterVal === 'failure') {
              recordWhereClauses.push(`LOWER(migration_status) IN ('failed', 'failure', 'error')`)
            } else if (filterVal === 'pending') {
              recordWhereClauses.push(`LOWER(migration_status) IN ('pending', 'queued', 'not started', 'not_started')`)
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
        } else {
          setRecords([])
        }
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
    setCountdown(10)
  }, [statusFilter, isChecksumMode, fromDateFilter, toDateFilter, idsFilter, searchTrigger, reconcileTab])

  // Auto-refresh countdown trigger
  useEffect(() => {
    if (countdown === 0) {
      fetchReportData(true)
      setCountdown(10)
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

  // Helper to format any column key / custom metadata name nicely with spaces (e.g. PolicyNumber -> Policy Number, CIFNum -> CIF Num, AccountNo1 -> Account No 1)
  const formatColumnHeader = (str) => {
    if (!str) return ''
    const trimmed = str.trim()
    const lower = trimmed.toLowerCase()
    if (lower === 'f_docnumber' || lower === 'doc_no' || lower === 'doc no' || lower === 'docnumber') return 'Document Number'
    if (lower === 'f_docclassnumber' || lower === 'doc_class' || lower === 'doc class' || lower === 'docclass') return 'Document Class'
    if (lower === 'f_docformat' || lower === 'doc_format' || lower === 'doc format' || lower === 'docformat') return 'Document Format'
    if (lower === 'f_entrydate' || lower === 'entry_date' || lower === 'entrydate') return 'Created Date'
    if (lower === 'migration_status' || lower === 'checksum_status') return 'Status'
    if (lower === 'error_info') return 'Failure Message'
    if (lower === 'migrated_date') return 'Migrated Date'
    if (lower === 'p8_doc_id') return 'P8 Doc ID'
    if (lower === 'case_created_date') return 'Created Date'
    if (lower === 'filename') return 'Document Title'
    if (lower === 'checksumbefore') return 'Checksum Before'
    if (lower === 'checksumafter') return 'Checksum After'
    if (lower === 'filefullpath') return 'File Full Path'
    if (lower === 'folderpath') return 'Folder Path'
    if (lower === 'retrieval_name') return 'Retrieval Name'

    return trimmed
      .replace(/^u_/i, '')
      .replace(/^f_/i, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase / PascalCase boundary
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // Acronym to Camel boundary (CIFNum -> CIF Num)
      .replace(/([a-zA-Z])([0-9]+)/g, '$1 $2') // Letter to Number boundary (AccountNo1 -> Account No 1)
      .replace(/([0-9]+)([a-zA-Z])/g, '$1 $2') // Number to Letter boundary
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, c => c.toUpperCase())
  }

  // Dynamic header builder: Lists all columns dynamically based on layout rules
  let activeHeaders = []

  if (records.length > 0) {
    if (subTab === 'case_metadata') {
      // Case metadata dynamic columns
      const recordKeys = Object.keys(records[0])
      const isDateCol = (key) => {
        const kLower = key.toLowerCase()
        return kLower.includes('date') || kLower.includes('access')
      }
      
      // Preferred column order requested by user: Case Id, Document Number, Case Type, Migration Status...
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

      // Ignore internal sequence / id keys and excluded extracted columns from dynamic list
      const ignoredKeys = ['sno', 's_no', 'id', 'serial_no', 'serialno', 'extracted_status', 'extracted_date', 'extractedstatus', 'extracteddate']

      const displayedKeys = preferredOrder.filter(k => 
        recordKeys.some(rk => rk.toLowerCase() === k.toLowerCase())
      )

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
    } else if (isChecksumMode) {
      // Fixed Checksum Columns requested by the user
      activeHeaders = [
        { key: 'documentid', label: 'Document Number' },
        { key: 'doc_class', label: 'Document Class' },
        { key: 'filename', label: 'Document Title' },
        { key: 'checksumbefore', label: 'Checksum Before' },
        { key: 'checksumafter', label: 'Checksum After' },
        { key: 'migrated_date', label: 'Migrated Date', isDate: true },
        { key: 'checksum_status', label: 'Status' }
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

      // 1. System properties from doctaba (ONLY: Document Number, Document Class, Created Date, Document Format)
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

      // 2. Custom metadata fields mapped in doc_class_index for the active f_docclassnumber
      const docClassNum = Number(records[0]?.f_docclassnumber)
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

      // Any additional unmapped custom metadata fields in the record (e.g. starting with u_)
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
          isDate: isDateColumn(key, true)
        }))

      // 3. Status and Error Info (if failed)
      const statusKey = recordKeys.find(rk => rk.toLowerCase() === 'migration_status')
      const statusHeader = statusKey ? [{ key: statusKey, label: 'Status' }] : []
      const errorKey = recordKeys.find(rk => rk.toLowerCase() === 'error_info')
      const errorHeader = (errorKey && (statusFilter?.toLowerCase() === 'failed' || reconcileTab === 'exception')) ? [{ key: errorKey, label: 'Error Info' }] : []

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

  // Custom CSV Exporter for dynamic columns
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
          let val = colHeader?.isDate ? cleanDateToDDMMYYYY(r[k]) : r[k]
          if (k === 'checksum_status' || (isChecksumMode && colHeader?.label === 'Status')) {
            val = getChecksumStatus(val, r)
          }
          return escape(val)
        })
      ].join(','))
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const filename = isChecksumMode
      ? 'is_checksum_report.csv'
      : reconcileTab === 'exception'
        ? (subTab === 'case_metadata' ? 'case_exception_report.csv' : 'is_exception_report.csv')
        : (subTab === 'case_metadata' ? 'case_details_reconciliation.csv' : 'is_document_reconciliation.csv')
    
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // Custom Excel Exporter for dynamic columns
  function handleExportExcel() {
    if (records.length === 0) return
    const headers = ['S.No', ...activeHeaders.map(h => h.label)]
    const keys = activeHeaders.map(h => h.key)
    
    const rows = records.map((r, i) => [
      i + 1,
      ...keys.map(k => {
        const colHeader = activeHeaders.find(h => h.key === k)
        let val = colHeader?.isDate ? cleanDateToDDMMYYYY(r[k]) : r[k]
        if (k === 'checksum_status' || (isChecksumMode && colHeader?.label === 'Status')) {
          val = getChecksumStatus(val, r)
        }
        return val ?? ''
      })
    ])
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reconciliation')
    
    const filename = isChecksumMode
      ? 'is_checksum_report.xlsx'
      : reconcileTab === 'exception'
        ? (subTab === 'case_metadata' ? 'case_exception_report.xlsx' : 'is_exception_report.xlsx')
        : (subTab === 'case_metadata' ? 'case_details_reconciliation.xlsx' : 'is_document_reconciliation.xlsx')
    
    XLSX.writeFile(wb, filename)
  }

  // Recon Report CSV Exporter
  function handleExportReconReportCSV() {
    if (customReportData.length === 0) return
    const headers = [subTab === 'case_metadata' ? 'Case Type' : 'Document Class', 'Year', 'Total Documents', 'No. Extracted', 'No. Migrated', 'No of Failed', 'No. Remaining', '% Completion', '% Failed', 'Status']
    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = [
      headers.map(escape).join(','),
      ...customReportData.map(r => [
        r.class,
        r.year,
        r.total ?? 0,
        r.extracted ?? 0,
        r.migrated ?? 0,
        r.failed ?? 0,
        r.remaining ?? 0,
        r.completion ?? '0.0%',
        r.pctFailed ?? '0.0%',
        r.status ?? ''
      ].map(escape).join(','))
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = subTab === 'case_metadata' ? 'case_recon_report.csv' : 'is_recon_report.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Recon Report Excel Exporter
  function handleExportReconReportExcel() {
    if (customReportData.length === 0) return
    const headers = [subTab === 'case_metadata' ? 'Case Type' : 'Document Class', 'Year', 'Total Documents', 'No. Extracted', 'No. Migrated', 'No of Failed', 'No. Remaining', '% Completion', '% Failed', 'Status']
    const rows = customReportData.map(r => [
      r.class,
      r.year,
      r.total ?? 0,
      r.extracted ?? 0,
      r.migrated ?? 0,
      r.failed ?? 0,
      r.remaining ?? 0,
      r.completion ?? '0.0%',
      r.pctFailed ?? '0.0%',
      r.status ?? ''
    ])
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Recon Report')
    XLSX.writeFile(wb, subTab === 'case_metadata' ? 'case_recon_report.xlsx' : 'is_recon_report.xlsx')
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
    } else if (tab === 'search') {
      setIsChecksumMode(false)
      setSelectedChecksumMode(false)
      setSelectedStatus('')
      setStatusFilter('')
      setSelectedIds('')
      setIdsFilter('')
      setSelectedFromDate('')
      setFromDateFilter('')
      setSelectedToDate('')
      setToDateFilter('')
      setRecords([])
      setSummaryData(INITIAL_SUMMARY)
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
    if (value === 'All' || value === '') {
      setSelectedIds('')
      setSelectedFromDate('')
      setSelectedToDate('')
    }
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
    <div className="deliverables-container" style={{ padding: '10px 14px', background: '#f8f9fa', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* ── Tabs Header ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px', padding: '0 2px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
        {/* Top-Level Row: Mode Switcher & Auto Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '3px', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
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
            </div>
          </div>
          
          {reconcileTab !== 'exception' && (
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#6B7280', 
              background: '#fff', padding: '4px 10px', borderRadius: '6px', border: '1px solid #E3E7EE', 
              fontWeight: '600', marginLeft: 'auto', marginRight: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }}></span>
              <span>Auto-Refresh: {formatTime(countdown)}</span>
              <button
                onClick={() => {
                  fetchReportData(false);
                  setCountdown(10);
                }}
                title="Refresh Now"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', display: 'flex', alignItems: 'center', padding: '2px', marginLeft: '2px', borderRadius: '4px', transition: 'background 0.15s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          )}
        </div>

        {/* Sub-Tabs: Dashboard, Daily Report, Exception Report, Checksum Report */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
          {['summary', 'report', 'exception', 'checksum'].filter(tab => !(subTab === 'case_metadata' && tab === 'checksum')).map(tab => (
            <button
              key={tab}
              onClick={() => handleReconcileTabChange(tab)}
              style={{
                padding: '5px 12px',
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
              {tab === 'summary' ? 'Dashboard' : tab === 'report' ? 'Daily Report' : tab === 'exception' ? 'Exception Report' : 'Checksum Report'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        
        {/* Loading Overlay */}
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
                  /* ── Checksum Mode Insights (Total Checked, Matched, Mismatched, Pending Cards evenly distributed) ── */
                  <div style={{ display: 'grid', gridTemplateColumns: summaryData.pending > 0 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: '16px', margin: '0 4px 14px 4px' }}>
                    {/* Total Checked Card */}
                    <div style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '14px 20px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>
                        Total Checked
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                        {summaryData.total.toLocaleString()}
                      </div>
                    </div>

                    {/* Matched Card */}
                    <div style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '14px 20px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#059669', marginBottom: '6px' }}>
                        Matched
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: '#059669', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                        {summaryData.success.toLocaleString()}
                      </div>
                    </div>

                    {/* Mismatched Card */}
                    <div style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '14px 20px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#dc2626', marginBottom: '6px' }}>
                        Mismatched
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: '#dc2626', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                        {summaryData.failed.toLocaleString()}
                      </div>
                    </div>

                    {/* Pending Card */}
                    {summaryData.pending > 0 && (
                      <div style={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '14px 20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#2563EB', marginBottom: '6px' }}>
                          Pending
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#2563EB', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                          {summaryData.pending.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Normal Mode Insights (Reconciliation Summary panel only) ── */
                  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', margin: '0 4px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
                      <h4 style={{ margin: '0 0 14px 0', fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>Reconciliation Summary</h4>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                        {/* Total Count */}
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
                          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '6px' }}>Total Count</div>
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
                          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '6px', whiteSpace: 'nowrap' }}>Pending for Migration</div>
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
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 18px', margin: '0 4px 16px 4px', maxWidth: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
                  <div>
                    {/* Recon Report Header Toolbar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 2px' }}>
                      <h3 style={{ margin: 0, color: '#1e293b', fontSize: '13px', fontWeight: 'bold' }}>
                        Reconciliation Report ({customReportData.length} {customReportData.length === 1 ? 'row' : 'rows'})
                      </h3>
                      {customReportData.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={handleExportReconReportCSV} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', color: '#374151' }}>
                            <Download size={12} /> CSV
                          </button>
                          <button onClick={handleExportReconReportExcel} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#10b981', color: 'white', cursor: 'pointer' }}>
                            <Download size={12} /> Excel
                          </button>
                        </div>
                      )}
                    </div>

                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
                        <thead>
                          <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #e2e8f0' }}>
                            <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>{subTab === 'case_metadata' ? 'Case Type' : 'Document Class'}</th>
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
                          {customReportData.length === 0 ? (
                            <tr>
                              <td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '12px' }}>
                                No records found in database.
                              </td>
                            </tr>
                          ) : (
                            customReportData.map((row, idx) => {
                              const isFirstOfClass = idx === 0 || customReportData[idx - 1].class !== row.class
                              let classRowSpan = 1
                              if (isFirstOfClass) {
                                for (let k = idx + 1; k < customReportData.length; k++) {
                                  if (customReportData[k].class === row.class) {
                                    classRowSpan++
                                  } else {
                                    break
                                  }
                                }
                              }

                              return (
                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 1 ? '#FAFBFC' : 'white', transition: 'background 0.15s' }}>
                                  {isFirstOfClass && (
                                    <td rowSpan={classRowSpan} style={{ padding: '10px 12px', fontWeight: 'bold', color: '#0f172a', fontSize: '11.5px', borderRight: '1px solid #f1f5f9', verticalAlign: 'top', background: '#FAFBFC' }}>
                                      {row.class || '—'}
                                    </td>
                                  )}
                                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#334155', fontSize: '11px' }}>{row.year}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '11px', color: '#0f172a' }}>
                                    {row.total != null ? Number(row.total).toLocaleString() : '—'}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '11px', color: '#0f172a' }}>
                                    {row.extracted != null ? Number(row.extracted).toLocaleString() : '—'}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '11px', color: '#0f172a' }}>
                                    {row.migrated !== '' && row.migrated !== null ? Number(row.migrated).toLocaleString() : '—'}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '11px', color: '#ef4444' }}>
                                    {row.failed !== '' && row.failed !== null ? Number(row.failed).toLocaleString() : '—'}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '11px', color: '#64748b' }}>
                                    {row.remaining != null ? Number(row.remaining).toLocaleString() : '—'}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700', fontSize: '11px', color: '#0f172a' }}>{row.completion || '—'}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700', fontSize: '11px', color: '#ef4444' }}>{row.pctFailed || '—'}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    {row.status?.toUpperCase() === 'PENDING' ? (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '3px 10px',
                                        borderRadius: '16px',
                                        background: '#EFF6FF',
                                        color: '#2563EB',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        border: '1px solid #DBEAFE'
                                      }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB' }}></span>
                                        Pending
                                      </span>
                                    ) : row.status?.toUpperCase() === 'IN PROGRESS' ? (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '3px 10px',
                                        borderRadius: '16px',
                                        background: '#FFFBEB',
                                        color: '#D97706',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        border: '1px solid #FDE68A'
                                      }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B' }}></span>
                                        In Progress
                                      </span>
                                    ) : row.status?.toUpperCase() === 'COMPLETED' ? (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '3px 10px',
                                        borderRadius: '16px',
                                        background: '#ECFDF5',
                                        color: '#059669',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        border: '1px solid #A7F3D0'
                                      }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }}></span>
                                        Completed
                                      </span>
                                    ) : (
                                      <span style={{ color: '#94a3b8' }}>—</span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                </div>
              )}

              {/* ── Case/IS Records Grid (Hidden in Summary mode, shown for specific filtered status queries) ── */}
              {reconcileTab !== 'report' && (statusFilter !== 'All' || idsFilter.trim() || fromDateFilter || toDateFilter || isChecksumMode || reconcileTab === 'exception') && (
                <div className="grid-container" style={{ background: 'white', padding: '12px', borderRadius: '12px', flex: 1, minHeight: 0, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                  
                  {/* Grid Toolbar with Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 4px' }}>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '13px', fontWeight: 'bold' }}>
                      {isChecksumMode 
                        ? 'Checksum Report' 
                        : reconcileTab === 'exception'
                          ? (subTab === 'case_metadata' ? 'Case Exception Report' : 'Document Exception Report')
                          : reconcileTab === 'search'
                            ? (subTab === 'case_metadata' ? 'Case Search Results' : 'Document Search Results')
                            : (subTab === 'case_metadata' ? 'Case Details Reconciliation' : 'Document Reconciliation')
                      } ({records.length} {records.length === 1 ? 'record' : 'records'})
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
                            <tr key={`row-${r.case_id || r.documentid || r.f_docnumber || r.doc_no || 'idx'}-${i}`}>
                              <td style={{ textAlign: 'center', width: '48px', color: '#64748b', fontWeight: '600' }}>{i + 1}</td>
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
                                  return <td key={c.key} style={tdStyle}>{val}</td>
                                }
                                if (keyLower === 'checksumbefore' || keyLower === 'checksumafter') {
                                  return (
                                    <td key={c.key} style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '9.5px', color: '#64748b' }} title={val}>
                                      {val ? val.slice(0, 16) + '…' : <span className="cell-empty">—</span>}
                                    </td>
                                  )
                                }
                                if (keyLower === 'migration_status' || keyLower === 'checksum_status' || keyLower === 'f_status') {
                                  if (isChecksumMode || keyLower === 'checksum_status') {
                                    const chkStatus = getChecksumStatus(val, r)
                                    if (chkStatus === 'Matched') {
                                      return (
                                        <td key={c.key} style={tdStyle}>
                                          <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '3px 10px',
                                            borderRadius: '16px',
                                            background: '#ECFDF5',
                                            color: '#059669',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            border: '1px solid #A7F3D0'
                                          }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }}></span>
                                            Matched
                                          </span>
                                        </td>
                                      )
                                    }
                                    if (chkStatus === 'Pending') {
                                      return (
                                        <td key={c.key} style={tdStyle}>
                                          <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '3px 10px',
                                            borderRadius: '16px',
                                            background: '#EFF6FF',
                                            color: '#2563EB',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            border: '1px solid #DBEAFE'
                                          }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB' }}></span>
                                            Pending
                                          </span>
                                        </td>
                                      )
                                    }
                                    return (
                                      <td key={c.key} style={tdStyle}>
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          padding: '3px 10px',
                                          borderRadius: '16px',
                                          background: '#FEF2F2',
                                          color: '#DC2626',
                                          fontSize: '11px',
                                          fontWeight: '600',
                                          border: '1px solid #FECACA'
                                        }}>
                                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }}></span>
                                          Mismatched
                                        </span>
                                      </td>
                                    )
                                  }

                                  const isSuccess = val?.toLowerCase() === 'success' || val?.toLowerCase() === 'migrated' || val?.toLowerCase() === 'completed'
                                  const isProgress = val?.toLowerCase() === 'in progress' || val?.toLowerCase() === 'in-progress' || val?.toLowerCase() === 'inprogress' || val?.toLowerCase() === 'retry'
                                  const isPending = val?.toLowerCase() === 'pending'
                                  
                                  if (isPending) {
                                    return (
                                      <td key={c.key} style={tdStyle}>
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          padding: '3px 10px',
                                          borderRadius: '16px',
                                          background: '#EFF6FF',
                                          color: '#2563EB',
                                          fontSize: '11px',
                                          fontWeight: '600',
                                          border: '1px solid #DBEAFE'
                                        }}>
                                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB' }}></span>
                                          Pending
                                        </span>
                                      </td>
                                    )
                                  }
                                  if (isProgress) {
                                    return (
                                      <td key={c.key} style={tdStyle}>
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          padding: '3px 10px',
                                          borderRadius: '16px',
                                          background: '#FFFBEB',
                                          color: '#D97706',
                                          fontSize: '11px',
                                          fontWeight: '600',
                                          border: '1px solid #FDE68A'
                                        }}>
                                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B' }}></span>
                                          In Progress
                                        </span>
                                      </td>
                                    )
                                  }
                                  if (isSuccess) {
                                    const successLabel = val?.toLowerCase() === 'completed' ? 'Completed' : (val?.toLowerCase() === 'migrated' ? 'Migrated' : 'Migrated')
                                    return (
                                      <td key={c.key} style={tdStyle}>
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          padding: '3px 10px',
                                          borderRadius: '16px',
                                          background: '#ECFDF5',
                                          color: '#059669',
                                          fontSize: '11px',
                                          fontWeight: '600',
                                          border: '1px solid #A7F3D0'
                                        }}>
                                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }}></span>
                                          {successLabel}
                                        </span>
                                      </td>
                                    )
                                  }
                                  return (
                                    <td key={c.key} style={tdStyle}>
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '3px 10px',
                                        borderRadius: '16px',
                                        background: '#FEF2F2',
                                        color: '#DC2626',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        border: '1px solid #FECACA'
                                      }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }}></span>
                                        Failed
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
