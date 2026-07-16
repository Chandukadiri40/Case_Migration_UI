import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTableSearch } from '../hooks/useTableSearch'
import { TABLES } from '../config/tableConfig'
import TableSelector from './TableSelector'
import SearchPanel from './SearchPanel'
import ResultsGrid from './ResultsGrid'
import QueryExecutor from './QueryExecutor'
import ChecksumReport from './ChecksumReport'

const MODES = [
  { id: 'filter', label: 'Filter Search',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> },
  { id: 'query',  label: 'Query Executor',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> },
  { id: 'checksum', label: 'Checksum Report',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
]

export default function Dashboard() {
  const { logout } = useAuth()
  const [mode, setMode] = useState('filter')

  const {
    tableId, selectTable,
    filters, setFilters,
    results, columns,
    loading, searched, error,
    search, reset,
    summary,
  } = useTableSearch()

  // Query executor state
  const [queryResults, setQueryResults]   = useState([])
  const [queryColumns, setQueryColumns]   = useState([])
  const [querySearched, setQuerySearched] = useState(false)

  function handleQueryResults(records) {
    setQueryResults(records)
    setQuerySearched(true)
  }
  function handleQueryColumns(cols) { setQueryColumns(cols) }
  function handleQueryClear() {
    setQueryResults([]); setQueryColumns([]); setQuerySearched(false);
  }

  const getStatus = r => r.migration_status ?? r.status ?? ''
  const querySummary = {
    total:      queryResults.length,
    success:    queryResults.filter(r => getStatus(r).toLowerCase() === 'success').length,
    failed:     queryResults.filter(r => getStatus(r).toLowerCase() === 'failed').length,
    pending:    queryResults.filter(r => getStatus(r).toLowerCase() === 'pending').length,
    inProgress: queryResults.filter(r => getStatus(r).toLowerCase() === 'in progress').length,
  }

  const selectedTableLabel = TABLES.find(t => t.id === tableId)?.label ?? ''

  return (
    <div className="app-layout">
      {/* ── Top bar ── */}
      <header className="topbar">
        <div className="topbar-brand">
          <span>Migration Report Dashboard</span>
          {selectedTableLabel && (
            <span className="topbar-table-badge">{selectedTableLabel}</span>
          )}
        </div>

        <div className="topbar-actions">
          <span className="topbar-date">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
          <button className="btn btn-ghost btn-sm topbar-signout" onClick={logout} aria-label="Sign out">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>
      </header>

      <main className="main-content">
        {/* ── Top control row: Table selector + Mode tabs ── */}
        <div className="control-row">
          <TableSelector tableId={tableId} onSelect={selectTable} />
          <div className="mode-tabs">
            {MODES.map(m => (
              <button
                key={m.id}
                className={`mode-tab${mode === m.id ? ' active' : ''}`}
                onClick={() => setMode(m.id)}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════ FILTER SEARCH MODE ══════════════ */}
        {mode === 'filter' && (
          <>
            {!tableId ? (
              <div className="card empty-prompt">
                <div className="empty-state">
                  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                  <p className="empty-title">Select a table to get started</p>
                  <p className="empty-sub">Choose Source, Staging, or Target from the dropdown above to load the search form.</p>
                </div>
              </div>
            ) : (
              <>
                <SearchPanel
                  tableId={tableId}
                  filters={filters}
                  setFilters={setFilters}
                  onSearch={search}
                  onReset={reset}
                  loading={loading}
                  error={error}
                />

                {loading && (
                  <div className="card loading-card">
                    <span className="spinner" />
                    <span>Querying {selectedTableLabel}...</span>
                  </div>
                )}

                {searched && !loading && (
                  <>
                    <ResultsGrid
                      data={results}
                      columns={columns}
                      summary={summary}
                      tableLabel={selectedTableLabel}
                      tableId={tableId}
                      appliedFilters={filters}
                    />
                  </>
                )}

                {!searched && !loading && (
                  <div className="card empty-prompt">
                    <div className="empty-state">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      <p className="empty-title">Ready to search {selectedTableLabel}</p>
                      <p className="empty-sub">Apply filters above and click Search to retrieve records.</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ══════════════ QUERY EXECUTOR MODE ══════════════ */}
        {mode === 'query' && (
          <>
            <QueryExecutor
              onResults={handleQueryResults}
              onColumns={handleQueryColumns}
              onClear={handleQueryClear}
            />
            {querySearched && (
              <ResultsGrid
                data={queryResults}
                columns={queryColumns}
                summary={querySummary}
                tableLabel="Custom Query"
                appliedFilters={{}}
              />
            )}
          </>
        )}

        {/* ══════════════ CHECKSUM REPORT MODE ══════════════ */}
        {mode === 'checksum' && <ChecksumReport />}
      </main>
    </div>
  )
}
