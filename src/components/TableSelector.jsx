import { useRef, useState, useEffect } from 'react'
import { TABLES } from '../config/tableConfig'

const TABLE_ICONS = {
  source: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
  ),
  staging: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  ),
  target: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  ),
}

const ACCENT = {
  source:  { bg: '#dcfce7', color: '#16a34a' },
  staging: { bg: '#fef3c7', color: '#d97706' },
  target:  { bg: '#eff6ff', color: '#2563eb' },
}

export default function TableSelector({ tableId, onSelect }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const selected = TABLES.find(t => t.id === tableId)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="ts-wrapper" ref={ref}>
      <label className="ts-label">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
        Data Source
      </label>

      <button
        className={'ts-trigger' + (open ? ' open' : '') + (selected ? ' has-value' : '')}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        type="button"
      >
        {selected ? (
          <span className="ts-selected">
            <span className="ts-sel-text">
              <span className="ts-sel-name">{selected.label}</span>
              <span className="ts-sel-desc">{selected.description}</span>
            </span>
          </span>
        ) : (
          <span className="ts-placeholder">
            Select migration data to begin...
          </span>
        )}
        <svg className="ts-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="ts-dropdown" role="listbox">
          <div className="ts-dropdown-header">Select Migration Data</div>
          {TABLES.map(t => (
            <button
              key={t.id}
              className={'ts-option' + (tableId === t.id ? ' selected' : '')}
              onClick={() => { onSelect(t.id); setOpen(false) }}
              role="option"
              aria-selected={tableId === t.id}
              type="button"
            >
              <span className="ts-opt-body">
                <span className="ts-opt-name">{t.label}</span>
                <span className="ts-opt-desc">{t.description}</span>
              </span>
              {tableId === t.id && (
                <svg className="ts-opt-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
