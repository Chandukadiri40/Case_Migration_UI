import { useState, useEffect, useRef } from 'react'
import { SYSTEM_FIELDS, TABLE_METADATA, STATUS_OPTIONS } from '../config/tableConfig'
import BulkUpload from './BulkUpload'
import { apiGetCustomColumns, apiGetAvailableFields, apiGetTenantConfig } from '../utils/api'

export default function SearchPanel({ tableId, filters, setFilters, onSearch, onReset, loading, error }) {
  const [collapsed, setCollapsed] = useState(false)
  const [bulkMode, setBulkMode]   = useState(false)
  const [bulkIds, setBulkIds]     = useState([])

  const [activeFields, setActiveFields] = useState([])
  const [dropdownFields, setDropdownFields] = useState([])
  const [defaultActiveFields, setDefaultActiveFields] = useState([])
  const [defaultDropdownFields, setDefaultDropdownFields] = useState([])
  const [defaultConfiguredKeys, setDefaultConfiguredKeys] = useState([])
  const [availableDbFields, setAvailableDbFields] = useState([])
  const [apiLoading, setApiLoading] = useState(false)
  
  const [appsData, setAppsData] = useState([])

  // Custom dropdown states
  const [addFieldDropdownOpen, setAddFieldDropdownOpen] = useState(false)
  const addFieldDropdownRef = useRef()
  const [fieldSearchText, setFieldSearchText] = useState('')

  // Fetch dynamic available fields mapping from backend once on mount
  useEffect(() => {
    apiGetAvailableFields()
      .then(data => {
        setAvailableDbFields(Array.isArray(data) ? data : [])
      })
      .catch(err => {
        console.error("Failed to load available fields mappings:", err)
      })
      
    apiGetTenantConfig()
      .then(res => {
        if (res && res.applications) {
          setAppsData(res.applications)
        }
      })
      .catch(err => console.error("Failed to load tenant apps:", err))
  }, [])

  // Fetch configured columns for the current table when tableId changes or DB available fields load
  useEffect(() => {
    if (!tableId) return

    setFieldSearchText('')
    setApiLoading(true)
    apiGetCustomColumns(tableId)
      .then(configuredKeys => {
        const configKeysLower = (configuredKeys || []).map(k => k.toLowerCase())
        setDefaultConfiguredKeys(configKeysLower)
        
        const defaultFields = []
        const remainingFields = []
        const seenLabels = new Set()
        const seenKeys = new Set()

        // Build active and dropdown fields dynamically from database-loaded mappings
        if (availableDbFields && availableDbFields.length > 0) {
          availableDbFields.forEach(dbField => {
            if (!dbField.columnName || !dbField.displayName) return

            // Deduplicate by both display name AND column name
            const labelKey = dbField.displayName.toLowerCase().replace(/[^a-z0-9]/g, '')
            const colKey = dbField.columnName.toLowerCase().trim()
            if (seenLabels.has(labelKey) || seenKeys.has(colKey)) return
            seenLabels.add(labelKey)
            seenKeys.add(colKey)

            const colNameLower = colKey
            
            // Map integer datatype or field display name to input type
            let resolvedType = 'text'
            const dispLower = dbField.displayName.toLowerCase()
            if (dbField.dataType === 3 || dispLower.includes('date') || dispLower.includes('time')) {
              resolvedType = 'date'
            } else if (dbField.dataType === 2) {
              resolvedType = 'boolean'
            } else if (dbField.dataType === 4 || dbField.dataType === 6 || dispLower.includes('number') || dispLower.includes('size')) {
              resolvedType = 'number'
            }

            const fieldDef = {
              key: colNameLower,
              label: dbField.displayName,
              type: resolvedType,
              placeholder: `Search ${dbField.displayName}`
            }

            if (configKeysLower.includes(colNameLower)) {
              defaultFields.push(fieldDef)
            } else {
              remainingFields.push(fieldDef)
            }
          })
        }

        // Sort both lists alphabetically by display name for a premium user experience
        defaultFields.sort((a, b) => a.label.localeCompare(b.label))
        remainingFields.sort((a, b) => a.label.localeCompare(b.label))

        setActiveFields(defaultFields)
        setDropdownFields(remainingFields)
        setDefaultActiveFields(defaultFields)
        setDefaultDropdownFields(remainingFields)
      })
      .catch(err => {
        console.error("Failed to load custom columns configuration:", err)
        setActiveFields([])
        setDropdownFields([])
        setDefaultActiveFields([])
        setDefaultDropdownFields([])
        setDefaultConfiguredKeys([])
      })
      .finally(() => {
        setApiLoading(false)
      })
  }, [tableId, availableDbFields])

  // Handle click-away for custom metadata field dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (addFieldDropdownRef.current && !addFieldDropdownRef.current.contains(e.target)) {
        setAddFieldDropdownOpen(false)
      }
    }
    if (addFieldDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [addFieldDropdownOpen])

  function handleAddField(fieldKey) {
    if (!fieldKey) return
    const fieldToAdd = dropdownFields.find(f => f.key === fieldKey)
    if (fieldToAdd) {
      setActiveFields(prev => [...prev, fieldToAdd])
      setDropdownFields(prev => prev.filter(f => f.key !== fieldKey))
    }
  }

  function handleRemoveField(fieldKey) {
    const fieldToRemove = activeFields.find(f => f.key === fieldKey)
    if (fieldToRemove) {
      setActiveFields(prev => prev.filter(f => f.key !== fieldKey))
      setDropdownFields(prev => [...prev, fieldToRemove])
      // Clear the filter value for this field from the parent state
      setFilters(prev => {
        const next = { ...prev }
        delete next[fieldToRemove.label]
        delete next[fieldToRemove.key]
        return next
      })
    }
  }

  function isConfiguredByDefault(fieldKey) {
    if (!fieldKey) return false
    return defaultConfiguredKeys.includes(fieldKey.toLowerCase())
  }

  function handleChange(e) {
    const { name, value } = e.target
    setFilters(f => ({ ...f, [name]: value }))
  }

  function handleBulkIds(ids) {
    setBulkIds(ids)
    setFilters(f => ({ ...f, 'doc-id': ids.join(',') }))
  }

  function handleReset() {
    setBulkMode(false)
    setBulkIds([])
    setActiveFields(defaultActiveFields)
    setDropdownFields(defaultDropdownFields)
    onReset()
  }

  const activeCount = Object.entries(filters).filter(
    ([k, v]) => v && v !== 'Total' && k !== 'tableId' && k !== 'startDate' && k !== 'endDate'
  ).length + (filters.startDate || filters.endDate ? 1 : 0)

  // Build the dropdown list: all fields (active + inactive), deduped by label, filtered by search text
  const seenDropdownLabels = new Set()
  const filteredDropdownFields = [...activeFields, ...dropdownFields]
    .filter(field => {
      if (!field || !field.label) return false
      const labelKey = String(field.label).toLowerCase().trim()
      if (seenDropdownLabels.has(labelKey)) return false
      seenDropdownLabels.add(labelKey)
      const searchVal = fieldSearchText.trim().toLowerCase()
      if (!searchVal) return true
      return labelKey.includes(searchVal)
    })
    .sort((a, b) => String(a.label).localeCompare(String(b.label)))

  return (
    <div className="search-panel-card">
      {/* ── Header — click anywhere to expand, only button to collapse ── */}
      <div
        className="sp-header"
        onClick={() => setCollapsed(c => !c)}
        style={{ cursor: 'pointer' }}
      >
        <div className="sp-header-left">
          <div className="sp-header-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
          </div>
          <div>
            <div className="sp-title">Search Filters</div>
            <div className="sp-subtitle">Fill at least one column below to perform a search</div>
          </div>
          {activeCount > 0 && (
            <span className="sp-active-count">{activeCount} active</span>
          )}
        </div>
        <button
          className="icon-btn"
          onClick={e => { e.stopPropagation(); setCollapsed(c => !c) }}
          aria-label="Toggle"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {collapsed ? <polyline points="6 9 12 15 18 9"/> : <polyline points="18 15 12 9 6 15"/>}
          </svg>
        </button>
      </div>

      {!collapsed && (
        <>
          {error && (
            <div className="alert alert-error" style={{ margin: '0 20px 0', borderRadius: 0, borderLeft: 'none', borderRight: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* ── Main filter grid — all sections in one horizontal row ── */}
          <div className="sp-filter-row">

            {/* COL 1 — Application + Status (staging only) + Date Range */}
            <div className="sp-col sp-col--narrow">
              
              <div className="sp-field-group">
                <div className="sp-group-label">Application (Object Store)</div>
                <div className="sp-field">
                  <select
                    name="appId"
                    className="sp-input"
                    value={filters.appId || ''}
                    onChange={e => setFilters(prev => ({ ...prev, appId: e.target.value }))}
                  >
                    <option value="">Select App</option>
                    {appsData.map(a => (
                      <option key={a.appId} value={a.appId}>{a.appName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status — only for staging table */}
              {tableId === 'staging' && (
                <div className="sp-field-group">
                  <div className="sp-group-label">Migration Status</div>
                  <div className="sp-field">
                    <select
                      name="status"
                      className="sp-input"
                      value={filters.status || 'Total'}
                      onChange={handleChange}
                      aria-label="Migration status"
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Date Range */}
              <div className="sp-field-group" style={{ marginTop: 14 }}>
                <div className="sp-group-label">Date Range</div>
                <div className="date-col">
                  <div className="sp-field">
                    <label className="sp-input-label">Start Date</label>
                    <input type="date" name="startDate" className="sp-input"
                      value={filters.startDate || ''} onChange={handleChange} />
                  </div>
                  <div className="sp-field">
                    <label className="sp-input-label">End Date</label>
                    <input type="date" name="endDate" className="sp-input"
                      value={filters.endDate || ''} onChange={handleChange} />
                  </div>
                </div>
              </div>
            </div>

            {/* DIVIDER */}
            <div className="sp-col-divider" />

            {/* COL 2 — System Properties */}
            <div className="sp-col">
              <div className="sp-group-label">
                System Properties
              </div>
              <div className="sp-fields-grid">
                {/* Doc ID spans full width of this column */}
                <div className="sp-field sp-field--full">
                  <div className="sp-input-label-row">
                    <label className="sp-input-label">Document ID</label>
                    <div className="docid-mode-toggle">
                      <button type="button"
                        className={'dmt-btn' + (!bulkMode ? ' active' : '')}
                        onClick={() => setBulkMode(false)}>Manual</button>
                      <button type="button"
                        className={'dmt-btn' + (bulkMode ? ' active' : '')}
                        onClick={() => setBulkMode(true)}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="17 8 12 3 7 8"/>
                          <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        Bulk
                      </button>
                    </div>
                  </div>
                  {!bulkMode ? (
                    <input type="text" name="doc-id" className="sp-input"
                      placeholder="e.g. 0900000180001234, comma-separated"
                      value={filters['doc-id'] || ''} onChange={handleChange} />
                  ) : (
                    <BulkUpload onIds={handleBulkIds} />
                  )}
                  {bulkIds.length > 0 && (
                    <span className="bulk-count-badge">{bulkIds.length} IDs loaded</span>
                  )}
                </div>

                {/* Remaining system fields */}
                {SYSTEM_FIELDS.filter(f => f.key !== 'doc-id').map(field => (
                  <div className="sp-field" key={field.key}>
                    <label className="sp-input-label">{field.label}</label>
                    <input type={field.type === 'date' ? 'date' : 'text'} name={field.key} className="sp-input"
                      placeholder={field.placeholder}
                      value={filters[field.key] || ''} onChange={handleChange} />
                  </div>
                ))}
              </div>
            </div>

            {/* DIVIDER */}
            {(activeFields.length > 0 || dropdownFields.length > 0) && <div className="sp-col-divider" />}

            {/* COL 3 — Custom Metadata */}
            {(activeFields.length > 0 || dropdownFields.length > 0) && (
              <div className="sp-col">
                <div className="sp-group-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', overflow: 'visible' }}>
                  <span>Custom Metadata</span>
                  {dropdownFields.length > 0 && (
                    <div className="add-field-dropdown-container" ref={addFieldDropdownRef}>
                      <button
                        type="button"
                        className="btn-add-field-trigger"
                        onClick={() => {
                          setAddFieldDropdownOpen(o => !o);
                          setFieldSearchText('');
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '1px' }}>
                          <line x1="12" y1="5" x2="12" y2="19"/>
                          <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Add Field
                      </button>
                      {addFieldDropdownOpen && (
                        <div className="add-field-dropdown-menu">
                          <div className="add-field-dropdown-header">Select Metadata Field</div>
                          <div className="add-field-dropdown-search-wrap">
                            <input
                              type="text"
                              placeholder="Search fields..."
                              value={fieldSearchText}
                              onChange={e => setFieldSearchText(e.target.value)}
                              className="add-field-search-input"
                              autoFocus
                              onClick={e => e.stopPropagation()}
                            />
                          </div>
                          <div className="add-field-dropdown-list">
                            {filteredDropdownFields.map(field => {
                              const isActive = activeFields.some(af => af.key === field.key);
                              return (
                                  <div
                                    key={field.key}
                                    className="add-field-dropdown-item checkbox-item"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isActive) {
                                        if (!isConfiguredByDefault(field.key)) {
                                          handleRemoveField(field.key);
                                        }
                                      } else {
                                        handleAddField(field.key);
                                      }
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isActive}
                                      disabled={isConfiguredByDefault(field.key)}
                                      readOnly
                                      className="add-field-checkbox"
                                    />
                                    <span className={`add-field-label ${isConfiguredByDefault(field.key) ? 'disabled-label' : ''}`} title={field.label}>
                                      {field.label}
                                    </span>
                                  </div>
                                );
                              })}
                            {filteredDropdownFields.length === 0 && (
                              <div style={{ padding: '12px', color: 'var(--gray-400)', textAlign: 'center', fontStyle: 'italic', fontSize: '12px' }}>
                                No matching fields
                              </div>
                            )}
                          </div>
                          <div className="add-field-dropdown-footer">
                            <button
                              type="button"
                              className="btn-done-add-field"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAddFieldDropdownOpen(false);
                              }}
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {apiLoading ? (
                  <div style={{ padding: '12px 0', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="spinner spinner--dark" />
                    <span>Loading metadata fields...</span>
                  </div>
                ) : activeFields.length === 0 ? (
                  <div style={{ padding: '16px', color: 'var(--gray-400)', textAlign: 'center', fontStyle: 'italic', border: '1px dashed var(--gray-200)', borderRadius: '6px' }}>
                    No metadata fields configured.
                  </div>
                ) : (
                  <div className="sp-fields-grid">
                    {activeFields.map(field => (
                      <div className="sp-field" key={field.key}>
                        <div className="sp-input-label-row">
                          <label className="sp-input-label">{field.label}</label>
                          {!isConfiguredByDefault(field.key) && (
                            <button
                              type="button"
                              onClick={() => handleRemoveField(field.key)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--danger)',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title={`Remove ${field.label}`}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                          )}
                        </div>
                        {field.type === 'date' ? (
                          <input
                            type="date"
                            name={field.label}
                            className="sp-input"
                            value={filters[field.label] || ''}
                            onChange={handleChange}
                          />
                        ) : field.type === 'boolean' ? (
                          <select
                            name={field.label}
                            className="sp-input"
                            value={filters[field.label] || ''}
                            onChange={handleChange}
                            aria-label={`Select ${field.label}`}
                          >
                            <option value="">Any</option>
                            <option value="true">True</option>
                            <option value="false">False</option>
                          </select>
                        ) : field.type === 'number' ? (
                          <input
                            type="number"
                            name={field.label}
                            className="sp-input"
                            placeholder={field.placeholder || 'Search ' + field.label}
                            value={filters[field.label] || ''}
                            onChange={handleChange}
                          />
                        ) : (
                          <input
                            type="text"
                            name={field.label}
                            className="sp-input"
                            placeholder={field.placeholder || 'Search ' + field.label}
                            value={filters[field.label] || ''}
                            onChange={handleChange}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Actions ── */}
          <div className="sp-actions">
            <span className="sp-actions-info">
              {activeCount > 0 && (
                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>{activeCount} filter{activeCount !== 1 ? 's' : ''} applied</>
              )}
            </span>
            <div className="sp-actions-right">
              <button type="button" className="btn-reset" onClick={handleReset} disabled={loading}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
                Clear
              </button>
              <button type="button" className="btn-search" onClick={() => onSearch()} disabled={loading}>
                {loading ? (
                  <><span className="spinner spinner--dark" />Searching...</>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    Search
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
