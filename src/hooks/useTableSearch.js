import { useState, useCallback } from 'react'
import { apiSearch } from '../utils/api'
import { SYSTEM_FIELDS, TABLE_METADATA } from '../config/tableConfig'

/** Default filter state — reset when table changes */
function makeDefaults(tableId) {
  return {
    tableId,
    status: 'Total',
    startDate: '',
    endDate: '',
    'doc-id': '',
    'created-date': '',
    'content-size': '',
    'mime-type': '',
  }
}

/**
 * Builds the SearchRequest body matching the backend DTO:
 * {
 *   table:         "source" | "staging" | "target",
 *   status:        "Success" | "Failed" | "total",
 *   fromDate:      "YYYY-MM-DD" | null,
 *   toDate:        "YYYY-MM-DD" | null,
 *   docIds:        string[],          // parsed from comma-separated doc-id field
 *   systemFilters: { [systemKey]: value },   // created-date, content-size, mime-type
 *   customFilters: { [colName]: value }
 * }
 */
function buildPayload(filters) {
  // Parse doc IDs — comma-separated string → string[]
  const rawDocId = filters['doc-id'] || ''
  const docIds = rawDocId
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  // System filters — exclude doc-id (sent as docIds)
  const systemFilters = {}
  SYSTEM_FIELDS.forEach(f => {
    if (f.key === 'doc-id') return  // handled via docIds
    if (f.key === 'created-date') {
      const val = filters['created-date']
      if (val && val.trim()) systemFilters['created-date'] = val.trim()
      return
    }
    const val = filters[f.key]
    if (val && val.trim()) systemFilters[f.key] = val.trim()
  })

  // Custom metadata filters - all keys in filters that are not system keys and have a value
  const customFilters = {}
  const systemKeys = ['tableId', 'status', 'startDate', 'endDate', 'doc-id', 'created-date', 'content-size', 'mime-type']
  Object.keys(filters).forEach(key => {
    if (!systemKeys.includes(key)) {
      const val = filters[key]
      if (val && typeof val === 'string' && val.trim()) {
        customFilters[key] = val.trim()
      }
    }
  })

  return {
    table:         filters.tableId,
    status:        (!filters.status || filters.status === 'Total')
                     ? 'total'
                     : filters.status === 'Success' ? 'Migrated' : filters.status,
    fromDate:      filters.startDate ? filters.startDate + 'T00:00:00' : null,
    toDate:        filters.endDate   ? filters.endDate   + 'T23:59:59' : null,
    docIds:        docIds.length > 0 ? docIds : null,
    systemFilters: Object.keys(systemFilters).length > 0 ? systemFilters : null,
    customFilters: Object.keys(customFilters).length > 0 ? customFilters : null,
  }
}

export function useTableSearch() {
  const [tableId, setTableIdState] = useState('')
  const [filters, setFiltersState] = useState({})
  const [results, setResults]      = useState([])
  const [columns, setColumns]      = useState([])
  const [loading, setLoading]      = useState(false)
  const [searched, setSearched]    = useState(false)
  const [error, setError]          = useState('')

  function selectTable(id) {
    setTableIdState(id)
    setFiltersState(makeDefaults(id))
    setResults([])
    setColumns([])
    setSearched(false)
    setError('')
  }

  function setFilters(updater) {
    setFiltersState(prev =>
      typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
    )
  }

  const search = useCallback(async (overrideFilters) => {
    const active = overrideFilters || filters
    if (!active.tableId) { setError('Please select a table first.'); return }

    // Client-side type validation before sending query
    for (const [key, val] of Object.entries(active)) {
      if (!val || typeof val !== 'string' || !val.trim()) continue
      const trimmed = val.trim()

      // 1. Date Field Validation (includes system dates or custom fields with 'date' or 'time' in name/label)
      const isDateField = key.toLowerCase().includes('date') || key.toLowerCase().includes('time')
      if (isDateField) {
        const parsed = Date.parse(trimmed)
        // Allow a simple 4-digit year search (e.g. "2026"), but anything else must be a valid date format
        if (isNaN(parsed) && !/^\d{4}$/.test(trimmed)) {
          setError(`Field "${key.replace(/_/g, ' ')}" must be a valid date (e.g. YYYY-MM-DD).`)
          return
        }
      }

      // 2. Numeric Field Validation (includes custom fields with 'size', 'number', or 'count' in name/label)
      const isNumberField = key.toLowerCase().includes('size') || key.toLowerCase().includes('number') || key.toLowerCase().includes('count')
      if (isNumberField) {
        if (isNaN(Number(trimmed))) {
          setError(`Field "${key.replace(/_/g, ' ')}" must be a valid number.`)
          return
        }
      }
    }

    const payload = buildPayload(active)

    const hasOverallFilter = 
      (payload.docIds && payload.docIds.length > 0) ||
      payload.fromDate ||
      payload.toDate ||
      (payload.systemFilters && Object.keys(payload.systemFilters).length > 0) ||
      (payload.customFilters && Object.keys(payload.customFilters).length > 0)

    if (!hasOverallFilter) {
      setError('Please fill at least one field to search.')
      return
    }

    const hasSystemProperty = 
      (payload.docIds && payload.docIds.length > 0) ||
      (payload.systemFilters && Object.keys(payload.systemFilters).length > 0)

    if (!hasSystemProperty) {
      setError('Please fill at least one field in System Properties to search.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const data = await apiSearch(payload)
      const records = Array.isArray(data) ? data : (data.records ?? [])
      setResults(records)

      if (records.length > 0) {
        const inferred = Object.keys(records[0]).map(key => ({
          key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim(),
          sortable: true,
          visible: true,
        }))
        setColumns(inferred)
      } else {
        setColumns([
          ...SYSTEM_FIELDS.map(f => ({ key: f.key, label: f.label, sortable: true, visible: true })),
          ...(TABLE_METADATA[active.tableId] || []).map(f => ({ key: f.key, label: f.label, sortable: true, visible: true })),
        ])
      }

      setSearched(true)
    } catch (err) {
      setError(err.message || 'Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  const reset = useCallback(() => {
    setFiltersState(makeDefaults(tableId))
    setResults([])
    setSearched(false)
    setError('')
  }, [tableId])

  const getStatus = r => String(r.MIGRATION_STATUS ?? r.migration_status ?? r.status ?? '')
  const isSuccess = s => s === 'success' || s === 'migrated'

  const summary = {
    total:      results.length,
    success:    results.filter(r => isSuccess(getStatus(r).toLowerCase())).length,
    failed:     results.filter(r => getStatus(r).toLowerCase() === 'failed').length,
    pending:    results.filter(r => getStatus(r).toLowerCase() === 'pending').length,
    inProgress: results.filter(r => getStatus(r).toLowerCase() === 'in progress').length,
  }

  return {
    tableId, selectTable,
    filters, setFilters,
    results, columns,
    loading, searched, error,
    search, reset,
    summary,
  }
}
