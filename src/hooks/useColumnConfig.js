import { useState, useEffect } from 'react'
import { apiGetColumnConfig } from '../utils/api'

/**
 * Fetches column configuration from the backend (sourced from app.properties).
 *
 * Expected API response shape:
 * [
 *   { key: "documentId",      label: "Document ID",    sortable: true,  visible: true  },
 *   { key: "migrationDate",   label: "Migration Date", sortable: true,  visible: true  },
 *   { key: "status",          label: "Status",         sortable: true,  visible: true  },
 *   ...
 * ]
 */
export function useColumnConfig() {
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiGetColumnConfig()
      .then(data => {
        setColumns(Array.isArray(data) ? data : [])
      })
      .catch(err => {
        setError(err.message || 'Failed to load column configuration.')
      })
      .finally(() => setLoading(false))
  }, [])

  return { columns, loading, error }
}
