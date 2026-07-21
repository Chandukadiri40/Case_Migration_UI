import { useState, useCallback } from 'react'
import { apiSearch } from '../utils/api'
import { SYSTEM_FIELDS, TABLE_METADATA } from '../config/tableConfig'

/** Default filter state — reset when table changes */
function makeDefaults(tableId) {
  return {
    tableId,
    appId: '',
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
 *   appId:         "ccol" | "lynx_bss",
 *   status:        "Success" | "Failed" | "total",
 *   fromDate:      "YYYY-MM-DD" | null,
 *   toDate:        "YYYY-MM-DD" | null,
 *   docIds:        string[],          // parsed from comma-separated doc-id field
 *   systemFilters: { [systemKey]: value },   // created-date, content-size, mime-type
 *   customFilters: { [colName]: value }
 * }
 */
function buildSystemFilters(filters) {
  const sysFilters = {};
  SYSTEM_FIELDS.forEach(f => {
    if (f.key === 'doc-id') return;
    if (f.key === 'created-date') {
      const val = filters['created-date'];
      if (val && val.trim()) sysFilters['created-date'] = val.trim();
      return;
    }
    const val = filters[f.key];
    if (val && val.trim()) sysFilters[f.key] = val.trim();
  });
  return Object.keys(sysFilters).length > 0 ? sysFilters : null;
}

function buildCustomFilters(filters) {
  const customFilters = {};
  const systemKeys = ['tableId', 'appId', 'status', 'startDate', 'endDate', 'doc-id', 'created-date', 'content-size', 'mime-type'];
  Object.keys(filters).forEach(key => {
    if (!systemKeys.includes(key)) {
      const val = filters[key];
      if (val && typeof val === 'string' && val.trim()) {
        customFilters[key] = val.trim();
      }
    }
  });
  return Object.keys(customFilters).length > 0 ? customFilters : null;
}

function buildPayload(filters) {
  const rawDocId = filters['doc-id'] || '';
  const docIds = rawDocId.split(',').map(s => s.trim()).filter(Boolean);

  let statusLower = filters.status === 'Total' ? '' : filters.status;

  return {
    table:         filters.tableId,
    appId:         filters.appId,
    status:        statusLower,
    fromDate:      filters.startDate || null,
    toDate:        filters.endDate || null,
    docIds:        docIds.length > 0 ? docIds : null,
    systemFilters: buildSystemFilters(filters),
    customFilters: buildCustomFilters(filters),
  };
}

function validateField(key, val) {
  if (!val || typeof val !== 'string' || !val.trim()) return null;
  const trimmed = val.trim();
  const keyLower = key.toLowerCase();
  
  if (keyLower.includes('date') || keyLower.includes('time')) {
    if (isNaN(Date.parse(trimmed)) && !/^\d{4}$/.test(trimmed)) {
      return `Field "${key.replace(/_/g, ' ')}" must be a valid date (e.g. YYYY-MM-DD).`;
    }
  }
  
  if (keyLower.includes('size') || keyLower.includes('number') || keyLower.includes('count')) {
    if (isNaN(Number(trimmed))) {
      return `Field "${key.replace(/_/g, ' ')}" must be a valid number.`;
    }
  }
  return null;
}

function validateFilters(filters) {
  for (const [key, val] of Object.entries(filters)) {
    const errorMsg = validateField(key, val);
    if (errorMsg) return errorMsg;
  }
  return null;
}

function validatePayload(payload) {
  const hasOverallFilter = 
    (payload.docIds && payload.docIds.length > 0) ||
    payload.fromDate ||
    payload.toDate ||
    (payload.systemFilters && Object.keys(payload.systemFilters).length > 0) ||
    (payload.customFilters && Object.keys(payload.customFilters).length > 0);

  if (!hasOverallFilter) return 'Please fill at least one field to search.';

  const hasSystemProperty = 
    (payload.docIds && payload.docIds.length > 0) ||
    (payload.systemFilters && Object.keys(payload.systemFilters).length > 0);

  if (!hasSystemProperty) return 'Please fill at least one field in System Properties to search.';

  return null;
}

function extractUniqueKeys(records) {
  const allKeys = [];
  records.forEach(r => {
    Object.keys(r).forEach(k => {
      if (!allKeys.includes(k)) allKeys.push(k);
    });
  });
  return allKeys;
}

function categorizeKeys(allKeys, systemKeyWords) {
  const baseKeys = [];
  let docTitleKey = null;
  const customKeys = [];

  allKeys.forEach(k => {
    const lower = k.toLowerCase();
    if (lower.includes('documenttitle')) {
      docTitleKey = k;
    } else if (systemKeyWords.includes(lower)) {
      baseKeys.push(k);
    } else {
      customKeys.push(k);
    }
  });
  return { baseKeys, docTitleKey, customKeys };
}

function deriveColumns(records, active) {
  if (records.length > 0) {
    const allKeys = extractUniqueKeys(records);
    const systemKeyWords = ['object_id', 'document_id', 'content_size', 'mime_type', 'created_date', 'migration_status', 'status', 'extraction_status', 'validation_status', 'filefullpath'];
    
    const { baseKeys, docTitleKey, customKeys } = categorizeKeys(allKeys, systemKeyWords);

    baseKeys.sort((a, b) => {
      const idxA = systemKeyWords.indexOf(a.toLowerCase());
      const idxB = systemKeyWords.indexOf(b.toLowerCase());
      return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
    });

    const orderedKeys = [...baseKeys];
    if (docTitleKey) orderedKeys.push(docTitleKey);
    orderedKeys.push(...customKeys);

    return orderedKeys.map(key => ({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim(),
      sortable: true,
      visible: true,
    }));
  } else {
    return [
      ...SYSTEM_FIELDS.map(f => ({ key: f.key, label: f.label, sortable: true, visible: true })),
      ...(TABLE_METADATA[active.tableId] || []).map(f => ({ key: f.key, label: f.label, sortable: true, visible: true })),
    ]
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

    const validationError = validateFilters(active);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = buildPayload(active);
    const payloadError = validatePayload(payload);
    if (payloadError) {
      setError(payloadError);
      return;
    }

    setError('')
    setLoading(true)

    try {
      const data = await apiSearch(payload)
      const records = Array.isArray(data) ? data : (data.records ?? [])

      const systemKeyWords = new Set(['object_id', 'document_id', 'content_size', 'mime_type', 'created_date', 'migration_status', 'status', 'extraction_status', 'validation_status', 'filefullpath']);
      
      const getCustomKeysSignature = (record) => {
        return Object.keys(record)
          .filter(k => {
             const lower = k.toLowerCase();
             return record[k] != null && record[k] !== '' && !systemKeyWords.has(lower) && !lower.includes('documenttitle');
          })
          .sort()
          .join(',');
      };

      records.sort((a, b) => getCustomKeysSignature(b).localeCompare(getCustomKeysSignature(a)));

      setResults(records)

      if (records.length > 0) {
        setColumns(deriveColumns(records, active));
      } else {
        setColumns(deriveColumns([], active));
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
