import { useState, useCallback } from 'react'
import { apiSearchRecords } from '../utils/api'

const DEFAULT_FILTERS = {
  docIds: [],
  searchTerm: '',
}

export function useMigrationSearch() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  const search = useCallback(async (overrideFilters) => {
    const active = overrideFilters || filters

    setError('')
    setLoading(true)

    try {
      const data = await apiSearchRecords(active)
      const records = Array.isArray(data) ? data : (data.records ?? [])
      setResults(records)
      setSearched(true)
    } catch (err) {
      setError(err.message || 'Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  const reset = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setResults([])
    setSearched(false)
    setError('')
  }, [])

  // migration_status is the raw DB column name returned by the backend
  const getStatus = r => r.migration_status ?? r.status ?? ''
  const summary = {
    total: results.length,
    success: results.filter(r => getStatus(r) === 'Success').length,
    failed: results.filter(r => getStatus(r) === 'Failed').length,
    pending: results.filter(r => getStatus(r) === 'Pending').length,
    inProgress: results.filter(r => getStatus(r) === 'In Progress').length,
  }

  return { filters, setFilters, results, loading, searched, error, search, reset, summary }
}
