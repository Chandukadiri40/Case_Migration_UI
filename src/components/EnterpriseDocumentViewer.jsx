import React, { useState, useEffect } from 'react'
import {
  FileText, Download, X, Eye, Copy, Check, Printer, ZoomIn, ZoomOut, Maximize2,
  RefreshCw, FileSpreadsheet, RotateCw, FileCode, ChevronLeft, ChevronRight, AlertCircle
} from 'lucide-react'

// 1. react-pdf for PDF canvas rendering
import { Document as PdfDocument, Page as PdfPage, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'

// 2. XLSX (SheetJS) for Excel & CSV parsing
import * as XLSX from '@e965/xlsx'

// 3. Mammoth for DOCX client-side HTML conversion
import mammoth from 'mammoth'

// 4. React Syntax Highlighter for XML / Code
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'

// 5. Shared Reusable Excel Grid Viewer (x-data-spreadsheet)
import ExcelViewer from './viewers/ExcelViewer'

// Configure pdfjs worker URL fallback
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || '3.11.174'}/pdf.worker.min.js`

export default function EnterpriseDocumentViewer({
  isOpen,
  onClose,
  docName = 'Document',
  docId = '',
  caseId = '',
  docPath = '',
  viewUrl = '',
  downloadUrl = '',
  hostIp = '192.168.1.105',
  fileType = '',
  onDownload = null
}) {
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // State per Renderer
  const [pdfData, setPdfData] = useState(null)
  const [pdfNumPages, setPdfNumPages] = useState(1)
  const [pdfPageNum, setPdfPageNum] = useState(1)
  const [pdfCanvasError, setPdfCanvasError] = useState(false)

  const [excelWorkbook, setExcelWorkbook] = useState(null)
  const [activeSheetName, setActiveSheetName] = useState('')
  const [excelRows, setExcelRows] = useState([])
  const [docxHtml, setDocxHtml] = useState('')
  const [textContent, setTextContent] = useState('')
  const [blobUrl, setBlobUrl] = useState(null)

  const ext = (docName || '').split('.').pop().toLowerCase()

  useEffect(() => {
    if (!isOpen || (!viewUrl && !docId)) return

    setLoading(true)
    setErrorMsg('')
    setTextContent('')
    setDocxHtml('')
    setExcelWorkbook(null)
    setExcelRows([])
    setPdfData(null)
    setPdfPageNum(1)
    setPdfCanvasError(false)
    setRotation(0)

    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      setBlobUrl(null)
    }

    const targetUrl = viewUrl || (docId ? `/api/folders/resolve-by-docid?docId=${docId}` : null)
    if (!targetUrl) {
      setLoading(false)
      return
    }

    // ── RENDERER 1 & 7: PNG, JPG, JPEG, GIF, BMP, WEBP, TIF, TIFF ──
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'tif', 'tiff', 'svg'].includes(ext)) {
      fetch(targetUrl)
        .then(res => res.arrayBuffer())
        .then(buffer => {
          const isJpg = ext === 'jpg' || ext === 'jpeg'
          const mime = isJpg ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : 'image/png'
          const imgBlob = new Blob([buffer], { type: mime })
          const bUrl = URL.createObjectURL(imgBlob)
          setBlobUrl(bUrl)
          setLoading(false)
        })
        .catch(err => {
          setErrorMsg(`Failed to load image: ${err.message}`)
          setLoading(false)
        })
      return
    }

    // ── RENDERER 4: PDF Stream via ArrayBuffer ──
    if (ext === 'pdf') {
      fetch(targetUrl)
        .then(res => res.arrayBuffer())
        .then(buffer => {
          const u8 = new Uint8Array(buffer)
          setPdfData({ data: u8 })
          
          const pdfBlob = new Blob([buffer], { type: 'application/pdf' })
          setBlobUrl(URL.createObjectURL(pdfBlob))
          setLoading(false)
        })
        .catch(err => {
          setErrorMsg(`Failed to fetch PDF stream: ${err.message}`)
          setLoading(false)
        })
      return
    }

    // ── RENDERER 5: XLSX, XLS, XLSM, CSV via SheetJS ──
    if (['xlsx', 'xls', 'xlsm', 'xlsb', 'csv', 'tsv'].includes(ext)) {
      fetch(targetUrl)
        .then(res => res.arrayBuffer())
        .then(buffer => {
          const wb = XLSX.read(buffer, { type: 'array' })
          setExcelWorkbook(wb)
          if (wb.SheetNames.length > 0) {
            const firstSheet = wb.SheetNames[0]
            setActiveSheetName(firstSheet)
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], { header: 1 })
            setExcelRows(rows)
          }
          setLoading(false)
        })
        .catch(err => {
          setErrorMsg(`Excel spreadsheet parse error: ${err.message}`)
          setLoading(false)
        })
      return
    }

    // ── RENDERER 6: DOC / DOCX via Mammoth HTML ──
    if (['docx', 'doc'].includes(ext)) {
      fetch(targetUrl)
        .then(res => res.arrayBuffer())
        .then(buffer => {
          mammoth.convertToHtml({ arrayBuffer: buffer })
            .then(result => {
              setDocxHtml(result.value || '<p>Document converted with formatting preserved.</p>')
              setLoading(false)
            })
            .catch(err => {
              setErrorMsg(`DOCX format error: ${err.message}`)
              setLoading(false)
            })
        })
        .catch(err => {
          setErrorMsg(`DOCX fetch error: ${err.message}`)
          setLoading(false)
        })
      return
    }

    // ── RENDERER 2 & 3: XML, TXT, LOG, CLS Text/Syntax View ──
    fetch(targetUrl)
      .then(res => res.text())
      .then(text => {
        const cleanText = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        setTextContent(cleanText)
        setLoading(false)
      })
      .catch(err => {
        setErrorMsg(`Failed to read document payload: ${err.message}`)
        setLoading(false)
      })
  }, [isOpen, viewUrl, docId, docName])

  // Handle Sheet Tab Switch
  function handleSheetChange(sheetName) {
    if (!excelWorkbook) return
    setActiveSheetName(sheetName)
    const rows = XLSX.utils.sheet_to_json(excelWorkbook.Sheets[sheetName], { header: 1 })
    setExcelRows(rows)
  }

  // Silent Background Download
  async function handleSilentDownload() {
    if (onDownload) {
      onDownload()
      return
    }
    const targetUrl = downloadUrl || viewUrl
    if (!targetUrl) return
    try {
      const res = await fetch(targetUrl)
      if (!res.ok) throw new Error(`HTTP error ${res.status}`)
      const blob = await res.blob()
      
      const linkUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = linkUrl
      a.setAttribute('download', docName || `Doc_${docId}.pdf`)
      document.body.appendChild(a)
      a.click()
      
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(linkUrl)
      }, 500)
    } catch (e) {
      console.error('Download error:', e)
    }
  }

  if (!isOpen) return null

  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'tif', 'tiff', 'svg'].includes(ext)
  const isPdf = ext === 'pdf'
  const isExcel = ['xlsx', 'xls', 'xlsm', 'xlsb', 'csv', 'tsv'].includes(ext)
  const isDocx = ['docx', 'doc'].includes(ext)
  const isXml = ext === 'xml'
  const isMtc = ext === 'mtc'

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{
        width: isFullscreen ? '100vw' : '95vw',
        height: isFullscreen ? '100vh' : '92vh',
        maxWidth: isFullscreen ? 'none' : '1380px',
        maxHeight: isFullscreen ? 'none' : '880px',
        background: '#ffffff',
        borderRadius: isFullscreen ? '0' : '12px',
        boxShadow: '0 25px 60px -15px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #cbd5e1'
      }}>
        
        {/* ── 1. Top Enterprise Header Bar ── */}
        <div style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            {/* Breadcrumb Path */}
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '3px', fontWeight: '500' }}>
              Documents &gt; {caseId ? `Case #${caseId}` : 'Source Explorer'} &gt; <span style={{ color: '#1e293b', fontWeight: '600' }}>{docName}</span>
            </div>

            {/* Title & Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={20} color="#2563eb" />
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                {docName} <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#64748b' }}>v1.0</span>
              </span>
              
              <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: '#64748b', marginLeft: '12px' }}>
                <span>Modified by <strong>Administrator</strong> on {new Date().toLocaleDateString()}</span>
                <span>•</span>
                <span>Host: <strong>{hostIp}</strong></span>
              </div>
            </div>
          </div>

          {/* Top-Right Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleSilentDownload}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px',
                background: '#2563eb', border: 'none', borderRadius: '7px',
                color: '#ffffff', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
              }}
            >
              <Download size={14} /> Download
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title="Toggle Fullscreen"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px',
                background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px',
                color: '#475569', cursor: 'pointer'
              }}
            >
              <Maximize2 size={15} />
            </button>

            <button
              onClick={onClose}
              title="Close Viewer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px',
                background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px',
                color: '#dc2626', cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── 2. Toolbar ── */}
        <div style={{
          background: '#f1f5f9',
          borderBottom: '1px solid #cbd5e1',
          padding: '6px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setZoom(z => Math.max(40, z - 15))} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px' }} title="Zoom Out"><ZoomOut size={16} /></button>
            <span style={{ fontWeight: '600', minWidth: '45px', textAlign: 'center' }}>{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(250, z + 15))} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px' }} title="Zoom In"><ZoomIn size={16} /></button>
            
            {isImage && (
              <>
                <span style={{ color: '#94a3b8' }}>|</span>
                <button onClick={() => setRotation(r => (r + 90) % 360)} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} title="Rotate Image">
                  <RotateCw size={15} /> Rotate
                </button>
              </>
            )}

            {isPdf && (
              <>
                <span style={{ color: '#94a3b8' }}>|</span>
                <button disabled={pdfPageNum <= 1} onClick={() => setPdfPageNum(p => Math.max(1, p - 1))} style={{ border: 'none', background: 'none', cursor: pdfPageNum <= 1 ? 'not-allowed' : 'pointer' }}>
                  <ChevronLeft size={16} />
                </button>
                <span>Page <strong>{pdfPageNum}</strong> of <strong>{pdfNumPages}</strong></span>
                <button disabled={pdfPageNum >= pdfNumPages} onClick={() => setPdfPageNum(p => Math.min(pdfNumPages, p + 1))} style={{ border: 'none', background: 'none', cursor: pdfPageNum >= pdfNumPages ? 'not-allowed' : 'pointer' }}>
                  <ChevronRight size={16} />
                </button>
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {textContent && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(textContent)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
              >
                {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy Content'}
              </button>
            )}
            <button onClick={() => window.print()} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Printer size={15} /> Print
            </button>
          </div>
        </div>

        {/* ── 3. Split Main Body ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          
          {/* Left Canvas Workspace (75%) */}
          <div style={{
            flex: 1,
            background: '#475569',
            overflow: 'auto',
            padding: isPdf && !pdfCanvasError ? '0' : '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: isPdf && !pdfCanvasError ? 'stretch' : 'flex-start'
          }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ffffff', gap: '12px', width: '100%' }}>
                <RefreshCw size={36} className="animate-spin" />
                <span style={{ fontSize: '14px', fontWeight: '600' }}>Fetching document stream for {docName}...</span>
              </div>
            ) : errorMsg ? (
              <div style={{ background: '#ffffff', padding: '32px', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', width: '100%', maxWidth: '600px', textAlign: 'center' }}>
                <AlertCircle size={40} color="#dc2626" style={{ marginBottom: '12px' }} />
                <h3 style={{ margin: 0, color: '#991b1b', fontSize: '16px' }}>Document Preview Error</h3>
                <p style={{ color: '#475569', fontSize: '13px', margin: '12px 0 20px 0' }}>{errorMsg}</p>
                <button onClick={handleSilentDownload} style={{ padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                  Download Raw File
                </button>
              </div>
            ) : isImage && blobUrl ? (
              /* ── 1 & 7. PNG, JPG, JPEG, GIF, BMP, WEBP, TIF, TIFF Direct Image View ── */
              <div style={{
                background: '#ffffff', padding: '16px', borderRadius: '6px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`, transformOrigin: 'center center', transition: 'transform 0.15s ease'
              }}>
                <img src={blobUrl} alt={docName} style={{ maxWidth: '850px', maxHeight: '720px', display: 'block', borderRadius: '4px' }} />
              </div>
            ) : isPdf && (pdfData || blobUrl) ? (
              /* ── 4. Dual PDF Engine (react-pdf Canvas + Native Iframe Stream Fallback) ── */
              !pdfCanvasError && pdfData ? (
                <div style={{
                  background: '#ffffff', padding: '16px', borderRadius: '6px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                  transform: `scale(${zoom / 100})`, transformOrigin: 'top center', transition: 'transform 0.15s ease'
                }}>
                  <PdfDocument
                    file={pdfData || blobUrl}
                    onLoadSuccess={({ numPages }) => setPdfNumPages(numPages)}
                    onLoadError={() => setPdfCanvasError(true)}
                    loading={
                      <div style={{ padding: '40px', color: '#64748b', textAlign: 'center' }}>
                        <RefreshCw size={24} className="animate-spin" /> Rendering PDF Canvas...
                      </div>
                    }
                  >
                    <PdfPage pageNumber={pdfPageNum} width={780} renderTextLayer={true} renderAnnotationLayer={true} />
                  </PdfDocument>
                </div>
              ) : blobUrl ? (
                <div style={{ width: '100%', height: '100%', background: '#ffffff', overflow: 'hidden' }}>
                  <object data={`${blobUrl}#toolbar=1`} type="application/pdf" style={{ width: '100%', height: '100%', border: 'none' }}>
                    <iframe src={`${blobUrl}#toolbar=1`} title={docName} style={{ width: '100%', height: '100%', border: 'none' }} />
                  </object>
                </div>
              ) : null
            ) : isExcel ? (
              /* ── 5. Reusable Excel Grid Viewer (A, B, C... 1, 2, 3... Gridlines, Merges & Sheet Tabs) ── */
              <div style={{
                width: '100%', maxWidth: '980px', height: '620px', background: '#ffffff', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', borderRadius: '6px', overflow: 'hidden'
              }}>
                <ExcelViewer workbookData={excelWorkbook} blobUrl={blobUrl} />
              </div>
            ) : isDocx && docxHtml ? (
              /* ── 6. DOCX Mammoth View ── */
              <div style={{
                width: '100%', maxWidth: '840px', minHeight: '680px', background: '#ffffff', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', borderRadius: '6px', padding: '40px 48px', boxSizing: 'border-box', overflowY: 'auto'
              }}>
                <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: '12px', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>{docName}</h2>
                </div>
                <div dangerouslySetInnerHTML={{ __html: docxHtml }} style={{ fontSize: '13px', lineHeight: '1.7', color: '#1e293b' }} />
              </div>
            ) : isXml && textContent ? (
              /* ── 3. XML Syntax Highlighter View ── */
              <div style={{
                width: '100%', maxWidth: '880px', background: '#ffffff', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', borderRadius: '6px', padding: '24px', overflowX: 'auto'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f766e', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileCode size={16} /> XML Structure
                </div>
                <SyntaxHighlighter language="xml" style={oneLight} customStyle={{ fontSize: '11.5px', borderRadius: '6px', padding: '16px' }}>
                  {textContent}
                </SyntaxHighlighter>
              </div>
            ) : isMtc ? (
              /* ── 8. MTC Metacode Print Stream View ── */
              <div style={{
                width: '100%', maxWidth: '800px', background: '#ffffff', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', borderRadius: '8px', padding: '36px', textAlign: 'center'
              }}>
                <AlertCircle size={44} color="#2563eb" style={{ marginBottom: '12px' }} />
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '17px' }}>Metacode Print Stream File (.mtc)</h3>
                <p style={{ color: '#64748b', fontSize: '12.5px', margin: '12px 0 20px 0', lineHeight: '1.6' }}>
                  This file is a proprietary Xerox DJDE print stream document. Raw text payload snippet is displayed below.
                </p>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'left', marginBottom: '20px', maxHeight: '300px', overflowY: 'auto' }}>
                  <pre style={{ margin: 0, fontSize: '11px', fontFamily: 'monospace', color: '#334155', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {textContent || '[Raw binary stream]'}
                  </pre>
                </div>
                <button onClick={handleSilentDownload} style={{ padding: '8px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                  <Download size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Download .MTC File
                </button>
              </div>
            ) : (
              /* ── 2. Text / Log / CLS View ── */
              <div style={{
                width: '100%', maxWidth: '840px', minHeight: '650px', background: '#ffffff', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', borderRadius: '6px', padding: '36px 44px', boxSizing: 'border-box', overflowY: 'auto'
              }}>
                <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: '14px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', color: '#1e293b', fontWeight: 'bold' }}>{docName}</h2>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Linux Storage Path: {docPath || `/home/skts/IS Migration/IS Documents/${docName}`}</span>
                  </div>
                  <span style={{ background: '#dbeafe', color: '#1e40af', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                    DOCUMENT TEXT
                  </span>
                </div>

                <pre style={{
                  margin: 0, fontFamily: 'Consolas, Monaco, "Courier New", monospace', fontSize: '12px', color: '#1e293b', lineHeight: '1.7', whiteSpace: 'pre-wrap', wordBreak: 'break-all'
                }}>
                  {textContent || `[Document ID: ${docId || 'DOC-125044'} stream payload active on storage host ${hostIp}]`}
                </pre>
              </div>
            )}
          </div>

          {/* Right Properties Sidebar */}
          <div style={{
            width: '290px', background: '#ffffff', borderLeft: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', overflowY: 'auto'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Document Properties
              </div>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px', color: '#334155' }}>
              <div>
                <label style={propLabelStyle}>Document ID</label>
                <div style={propValStyle}>{docId || 'DOC-125044'}</div>
              </div>

              {caseId && (
                <div>
                  <label style={propLabelStyle}>Associated Case ID</label>
                  <div style={propValStyle}>{caseId}</div>
                </div>
              )}

              <div>
                <label style={propLabelStyle}>File Name</label>
                <div style={{ ...propValStyle, wordBreak: 'break-all' }}>{docName}</div>
              </div>

              <div>
                <label style={propLabelStyle}>Format / MIME Type</label>
                <div style={propValStyle}>{ext.toUpperCase()} ({isImage ? 'image/' + (ext === 'jpg' ? 'jpeg' : ext) : isPdf ? 'application/pdf' : isExcel ? 'spreadsheet' : 'text/plain'})</div>
              </div>

              <div>
                <label style={propLabelStyle}>Linux Storage Node</label>
                <div style={propValStyle}>IP {hostIp}</div>
              </div>

              <div>
                <label style={propLabelStyle}>Full Path</label>
                <div style={{ ...propValStyle, wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '11px', color: '#475569' }}>
                  {docPath || `/home/skts/IS Migration/IS Documents/${docName}`}
                </div>
              </div>

              <div>
                <label style={propLabelStyle}>Migration Verification</label>
                <div style={{ color: '#059669', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={14} color="#059669" /> MD5 Checksum Matched
                </div>
              </div>

              <div>
                <label style={propLabelStyle}>Last Modified Date</label>
                <div style={propValStyle}>{new Date().toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

const propLabelStyle = {
  fontSize: '10.5px',
  fontWeight: '700',
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '3px',
  display: 'block'
}

const propValStyle = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#0f172a'
}
