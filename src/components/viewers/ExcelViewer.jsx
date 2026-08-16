import React, { useEffect, useRef, useState } from 'react'
import * as XLSX from '@e965/xlsx'
import Spreadsheet from 'x-data-spreadsheet'
import 'x-data-spreadsheet/dist/xspreadsheet.css'

/**
 * Converts a SheetJS workbook object into x-data-spreadsheet schema.
 */
function convertSheetJsToXSpreadsheet(workbook) {
  const out = []

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) return

    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
    const rows = {}

    // Extract merged cells
    const merges = (sheet['!merges'] || []).map(m => XLSX.utils.encode_range(m))

    // Extract column widths
    const cols = { len: range.e.c + 1 }
    if (sheet['!cols']) {
      sheet['!cols'].forEach((col, cIdx) => {
        if (col && col.wpx) {
          cols[cIdx] = { width: col.wpx }
        } else if (col && col.wch) {
          cols[cIdx] = { width: col.wch * 8 }
        }
      })
    }

    // Populate rows and cells
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cells = {}
      let hasContent = false

      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
        const cell = sheet[cellAddress]

        if (cell && cell.v !== undefined) {
          hasContent = true
          cells[C] = {
            text: String(cell.w || cell.v || '')
          }
        }
      }

      if (hasContent) {
        rows[R] = { cells }
      }
    }

    out.push({
      name: sheetName,
      merges,
      rows,
      cols
    })
  })

  return out
}

export default function ExcelViewer({ fileBuffer, blobUrl, workbookData }) {
  const containerRef = useRef(null)
  const spreadsheetRef = useRef(null)
  const [sheetNames, setSheetNames] = useState([])
  const [activeSheetIndex, setActiveSheetIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError(null)

    async function loadWorkbook() {
      try {
        let wb = workbookData

        if (!wb) {
          let buffer = fileBuffer
          if (!buffer && blobUrl) {
            const res = await fetch(blobUrl)
            if (!res.ok) throw new Error(`HTTP error ${res.status}`)
            buffer = await res.arrayBuffer()
          }

          if (!buffer) {
            throw new Error('No valid file buffer or blobUrl provided to ExcelViewer.')
          }

          wb = XLSX.read(buffer, { type: 'array', cellStyles: true, cellDates: true })
        }

        if (!isMounted) return

        const xData = convertSheetJsToXSpreadsheet(wb)
        setSheetNames(wb.SheetNames || [])

        // Clear existing DOM container
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
        }

        // Initialize x-data-spreadsheet in Read-Only Mode
        const xs = new Spreadsheet(containerRef.current, {
          mode: 'read',
          showToolbar: false,
          showGrid: true,
          showContextmenu: false,
          view: {
            height: () => (containerRef.current ? containerRef.current.clientHeight - 40 : 540),
            width: () => (containerRef.current ? containerRef.current.clientWidth : 880)
          }
        })

        xs.loadData(xData)
        spreadsheetRef.current = xs
        setLoading(false)
      } catch (err) {
        if (isMounted) {
          setError(err.message)
          setLoading(false)
        }
      }
    }

    loadWorkbook()

    return () => {
      isMounted = false
    }
  }, [fileBuffer, blobUrl, workbookData])

  function handleTabClick(index) {
    setActiveSheetIndex(index)
    if (spreadsheetRef.current && spreadsheetRef.current.sheet) {
      // Switch sheet in x-spreadsheet
      spreadsheetRef.current.sheet.selectSheet(index)
    }
  }

  if (error) {
    return (
      <div style={{ padding: '24px', background: '#fef2f2', color: '#991b1b', borderRadius: '6px', textAlign: 'center', border: '1px solid #fecaca' }}>
        <strong>Excel Grid Render Error:</strong> {error}
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#ffffff', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
      {loading && (
        <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>
          Parsing Excel spreadsheet grid (A, B, C... 1, 2, 3...)...
        </div>
      )}

      {/* Main Grid Container */}
      <div ref={containerRef} style={{ flex: 1, minHeight: '480px', overflow: 'hidden' }} />

      {/* Multi-Sheet Tabs Bar (Excel Bottom Sheet Bar) */}
      {sheetNames.length > 1 && (
        <div style={{
          display: 'flex', gap: '2px', background: '#e2e8f0', borderTop: '1px solid #cbd5e1', padding: '4px 12px 0 12px', fontSize: '11px'
        }}>
          {sheetNames.map((sName, idx) => (
            <button
              key={sName}
              onClick={() => handleTabClick(idx)}
              style={{
                padding: '6px 14px',
                border: '1px solid #cbd5e1',
                borderBottom: 'none',
                borderRadius: '5px 5px 0 0',
                cursor: 'pointer',
                fontWeight: 'bold',
                background: activeSheetIndex === idx ? '#ffffff' : '#f1f5f9',
                color: activeSheetIndex === idx ? '#16a34a' : '#64748b'
              }}
            >
              {sName}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
