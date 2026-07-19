import { useState, useRef } from 'react'
import Papa from 'papaparse'
import * as XLSX from '@e965/xlsx'

export default function BulkUpload({ onIds }) {
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [count, setCount] = useState(0)
  const [error, setError] = useState('')
  const inputRef = useRef()

  function parseFile(file) {
    setError('')
    const ext = file.name.split('.').pop().toLowerCase()

    if (!['txt', 'csv', 'xlsx', 'xls'].includes(ext)) {
      setError('Unsupported file type. Use TXT, CSV, or Excel.')
      return
    }

    if (ext === 'txt') {
      const reader = new FileReader()
      reader.onload = e => {
        const ids = e.target.result.split(/[\r\n,]+/).map(s => s.trim()).filter(Boolean)
        setFileName(file.name)
        setCount(ids.length)
        onIds(ids)
      }
      reader.readAsText(file)
    } else if (ext === 'csv') {
      Papa.parse(file, {
        complete: ({ data }) => {
          const ids = data.flat().map(s => String(s).trim()).filter(Boolean)
          setFileName(file.name)
          setCount(ids.length)
          onIds(ids)
        },
      })
    } else {
      const reader = new FileReader()
      reader.onload = e => {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
        const ids = rows.flat().map(s => String(s).trim()).filter(Boolean)
        setFileName(file.name)
        setCount(ids.length)
        onIds(ids)
      }
      reader.readAsArrayBuffer(file)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  function handleChange(e) {
    const file = e.target.files[0]
    if (file) parseFile(file)
  }

  function clear() {
    setFileName('')
    setCount(0)
    onIds([])
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <div
        className={`bulk-upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        aria-label="Upload document IDs file"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p>Drop file here or click to browse</p>
        <p style={{ fontSize: 11 }}>Supports TXT, CSV, XLSX — one Document ID per line/cell</p>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.csv,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleChange}
        />
      </div>

      {error && <p className="error-text mt-1">{error}</p>}

      {fileName && (
        <div className="upload-tags">
          <span className="tag tag-blue">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            {fileName}
          </span>
          <span className="tag tag-green">{count} IDs loaded</span>
          <button
            type="button"
            className="tag tag-red"
            onClick={e => { e.stopPropagation(); clear() }}
            style={{ cursor: 'pointer', border: 'none' }}
          >
            ✕ Clear
          </button>
        </div>
      )}
    </div>
  )
}
