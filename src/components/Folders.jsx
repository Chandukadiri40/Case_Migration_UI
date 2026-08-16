import React, { useState, useEffect } from 'react'
import { 
  Folder, FileText, ArrowLeft, RefreshCw, Download, Eye, X, 
  Search, HardDrive, Upload, Copy, Check,
  FileCode, Image as ImageIcon, FileSpreadsheet, FileArchive, Globe
} from 'lucide-react'
import { useAlert } from '../context/AlertContext'
import { apiBrowseFolder, apiGetFolderConfig, apiGetDocumentViewUrl, apiGetDocumentDownloadUrl } from '../utils/api'

const DEFAULT_LINUX_PATH = '/home/skts/IS Migration/IS Documents'
const DEFAULT_HOST_IP = '192.168.1.105'

export default function Folders() {
  const { showAlert } = useAlert()
  const [currentPath, setCurrentPath] = useState(DEFAULT_LINUX_PATH)
  const [inputPath, setInputPath] = useState(DEFAULT_LINUX_PATH)
  const [hostIp, setHostIp] = useState(DEFAULT_HOST_IP)
  const [fileList, setFileList] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [autoRefreshSecs] = useState(5)
  const [countdown, setCountdown] = useState(5)
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true)
  const [selectedFileForPreview, setSelectedFileForPreview] = useState(null)
  const [previewContent, setPreviewContent] = useState('')
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isUploadingSim, setIsUploadingSim] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState(new Date().toLocaleTimeString())
  
  // Selection state for bulk downloads
  const [selectedFilePaths, setSelectedFilePaths] = useState([])

  // On mount: Fetch backend configuration
  useEffect(() => {
    async function loadBackendConfig() {
      try {
        console.log('[UI-FOLDER-DEBUG] Fetching backend default config...')
        const cfg = await apiGetFolderConfig()
        console.log('[UI-FOLDER-DEBUG] Backend default config received:', cfg)
        if (cfg && cfg.basePath) {
          setCurrentPath(cfg.basePath)
          setInputPath(cfg.basePath)
        }
        if (cfg && cfg.hostIp) {
          setHostIp(cfg.hostIp)
        }
      } catch (e) {
        console.warn("[UI-FOLDER-DEBUG] Backend folder config fetch failed:", e)
      }
    }
    loadBackendConfig()
  }, [])

  // Auto-refresh countdown effect for real-time document sync
  useEffect(() => {
    if (!isAutoRefreshEnabled) return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          refreshFolderContent(true)
          return autoRefreshSecs
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [currentPath, isAutoRefreshEnabled, autoRefreshSecs])

  // Sync file list when currentPath changes
  useEffect(() => {
    setInputPath(currentPath)
    setSelectedFilePaths([])
    refreshFolderContent(false)
  }, [currentPath])

  // Fetch document content directly when a file is selected for viewing in the modal
  useEffect(() => {
    if (!selectedFileForPreview) {
      setPreviewContent('')
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl)
        setPreviewBlobUrl(null)
      }
      return
    }

    const filePath = selectedFileForPreview.path || `${currentPath}/${selectedFileForPreview.name}`
    const viewUrl = apiGetDocumentViewUrl(filePath)
    setIsPreviewLoading(true)
    setPreviewContent('')
    setIsCopied(false)

    console.log('[UI-FOLDER-DEBUG] Loading preview content for:', selectedFileForPreview.name, viewUrl)

    fetch(viewUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`)
        return res.blob()
      })
      .then(async blob => {
        const lowerName = selectedFileForPreview.name.toLowerCase()
        const isImage = lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png') || lowerName.endsWith('.gif') || lowerName.endsWith('.bmp') || lowerName.endsWith('.webp')
        const isPdf = lowerName.endsWith('.pdf')

        if (isImage || isPdf) {
          const blobUrl = URL.createObjectURL(blob)
          setPreviewBlobUrl(blobUrl)
        } else {
          const text = await blob.text()
          setPreviewContent(text)
        }
        setIsPreviewLoading(false)
      })
      .catch(err => {
        console.error('[UI-FOLDER-DEBUG] Error fetching preview content:', err)
        setPreviewContent(`Failed to load document content. Error: ${err.message}`)
        setIsPreviewLoading(false)
      })
  }, [selectedFileForPreview])

  async function refreshFolderContent(isAuto = false) {
    setLastSyncTime(new Date().toLocaleTimeString())
    if (!isAuto) setIsLoading(true)

    console.log('[UI-FOLDER-DEBUG] Requesting directory browse for path:', currentPath)
    
    try {
      const res = await apiBrowseFolder(currentPath)
      console.log('[UI-FOLDER-DEBUG] Received backend response:', res)

      if (res) {
        if (res.configuredHostIp) setHostIp(res.configuredHostIp)
        if (Array.isArray(res.items)) {
          console.log(`[UI-FOLDER-DEBUG] Setting fileList with ${res.items.length} items from backend API.`)
          setFileList(res.items)
          setIsLoading(false)
          return
        }
      }
    } catch (e) {
      console.error("[UI-FOLDER-DEBUG] Error fetching folder contents from API:", e)
    }

    setIsLoading(false)
  }

  // Handle path submission via Enter key or Browse Path button
  function handleNavigatePath(e) {
    if (e) e.preventDefault()
    let clean = inputPath.trim().replace(/\/+$/, '')
    if (!clean) clean = '/'
    setCurrentPath(clean)
  }

  // Handle Sync Now button click
  function handleSyncNow() {
    refreshFolderContent(false)
  }

  // Direct single file download helper (No new browser tab, saves directly with actual name)
  async function triggerDirectDownload(filePath, fileName) {
    const downloadUrl = apiGetDocumentDownloadUrl(filePath)
    console.log('[UI-FOLDER-DEBUG] Triggering direct blob download for:', fileName, downloadUrl)

    try {
      const res = await fetch(downloadUrl)
      if (!res.ok) throw new Error(`HTTP error ${res.status}`)
      const blob = await res.blob()
      
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = blobUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(blobUrl)
      }, 200)
    } catch (e) {
      console.error('[UI-FOLDER-DEBUG] Download error:', e)
    }
  }

  // Bulk download selected documents
  function handleBulkDownload() {
    if (selectedFilePaths.length === 0) return

    selectedFilePaths.forEach((path, idx) => {
      setTimeout(() => {
        const fileName = path.substring(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1)
        triggerDirectDownload(path, fileName)
      }, idx * 300)
    })
  }

  // Checkbox management
  const documentFiles = fileList.filter(f => !f.isDir)
  const isAllSelected = documentFiles.length > 0 && selectedFilePaths.length === documentFiles.length

  function handleSelectAll(e) {
    if (e.target.checked) {
      setSelectedFilePaths(documentFiles.map(f => f.path || `${currentPath}/${f.name}`))
    } else {
      setSelectedFilePaths([])
    }
  }

  function handleToggleSelect(filePath) {
    if (selectedFilePaths.includes(filePath)) {
      setSelectedFilePaths(selectedFilePaths.filter(p => p !== filePath))
    } else {
      setSelectedFilePaths([...selectedFilePaths, filePath])
    }
  }

  function handleCopyContent() {
    if (previewContent) {
      navigator.clipboard.writeText(previewContent)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

  function handleSimulateUpload() {
    setIsUploadingSim(true)
    setTimeout(() => {
      setIsUploadingSim(false)
      const newDocId = Math.floor(1000 + Math.random() * 9000)
      const newFile = {
        name: `IS_Document_Batch_${newDocId}.pdf`,
        isDir: false,
        size: `${(Math.random() * 3 + 0.5).toFixed(1)} MB`,
        modified: new Date().toLocaleString(),
        type: 'pdf',
        path: `${currentPath}/IS_Document_Batch_${newDocId}.pdf`
      }

      setFileList(prev => [newFile, ...prev])
      
      if (showAlert) {
        showAlert(`New document "${newFile.name}" detected & synced from Linux host ${hostIp}!`, 'Real-time Document Detected', 'info')
      }
    }, 800)
  }

  function renderFileIcon(file) {
    if (file.isDir) return <Folder size={18} color="#3b82f6" fill="#eff6ff" />
    const lowerName = file.name.toLowerCase()
    if (lowerName.endsWith('.pdf')) return <FileText size={18} color="#ef4444" />
    if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png')) return <ImageIcon size={18} color="#10b981" />
    if (lowerName.endsWith('.csv') || lowerName.endsWith('.xlsx')) return <FileSpreadsheet size={18} color="#059669" />
    if (lowerName.endsWith('.zip') || lowerName.endsWith('.tar')) return <FileArchive size={18} color="#8b5cf6" />
    if (lowerName.endsWith('.xml') || lowerName.endsWith('.log') || lowerName.endsWith('.txt') || lowerName.endsWith('.json')) return <FileCode size={18} color="#6366f1" />
    return <FileText size={18} color="#64748b" />
  }

  const filteredFiles = searchTerm
    ? fileList.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : fileList

  const totalFilesCount = fileList.filter(f => !f.isDir).length
  const totalDirsCount = fileList.filter(f => f.isDir).length
  const pathParts = currentPath.split('/').filter(Boolean)

  return (
    <div style={{ padding: '20px 24px', height: '100%', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'hidden' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Folder color="#2563eb" fill="#dbeafe" size={22} /> Real-Time Linux Document Explorer
          </h2>
          <span style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'block' }}>
            Live reflection of Linux host <b style={{ color: '#1d4ed8' }}>{hostIp}</b> document directories
          </span>
        </div>

        {/* Live Status & Bulk Download Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {selectedFilePaths.length > 0 && (
            <button
              onClick={handleBulkDownload}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                background: '#10b981', color: 'white', border: 'none', borderRadius: '7px',
                fontSize: '11.5px', fontWeight: '700', cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(16,185,129,0.2)'
              }}
            >
              <Download size={14} /> Download Selected ({selectedFilePaths.length})
            </button>
          )}

          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', background: '#ecfdf5',
            color: '#047857', border: '1px solid #a7f3d0', padding: '5px 12px',
            borderRadius: '20px', fontSize: '11px', fontWeight: 'bold'
          }}>
            <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }}></span>
            <Globe size={13} color="#047857" />
            <span>Linux Host: {hostIp}</span>
            <span style={{ color: '#6b7280', fontWeight: 'normal', marginLeft: '4px' }}>({lastSyncTime})</span>
          </div>

          <button
            onClick={handleSimulateUpload}
            disabled={isUploadingSim}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
              background: '#2563eb', color: 'white', border: 'none', borderRadius: '7px',
              fontSize: '11.5px', fontWeight: '700', cursor: isUploadingSim ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
            }}
          >
            <Upload size={14} /> {isUploadingSim ? 'Detecting...' : 'Simulate Live Document Drop'}
          </button>
        </div>
      </div>

      {/* Path Input Toolbar */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
        <form onSubmit={handleNavigatePath} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => {
              const parent = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/'
              setCurrentPath(parent)
            }}
            disabled={currentPath === '/'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px',
              background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: currentPath === '/' ? 'not-allowed' : 'pointer', color: '#475569'
            }}
            title="Go to parent directory"
          >
            <ArrowLeft size={16} />
          </button>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '6px', padding: '0 10px' }}>
            <HardDrive size={16} color="#64748b" style={{ marginRight: '8px' }} />
            <input
              type="text"
              value={inputPath}
              onChange={e => setInputPath(e.target.value)}
              placeholder="Enter Linux path (e.g., /home/skts/IS Migration/IS Documents)..."
              style={{ width: '100%', border: 'none', background: 'transparent', padding: '8px 0', fontSize: '12.5px', fontFamily: 'monospace', color: '#0f172a', outline: 'none', fontWeight: 'bold' }}
            />
          </div>

          <button
            type="submit"
            style={{ padding: '8px 18px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.15s' }}
          >
            Browse Path
          </button>

          <button
            type="button"
            onClick={handleSyncNow}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#fff', border: '1.5px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', color: '#475569', cursor: 'pointer', transition: 'all 0.15s' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Sync Now
          </button>
        </form>

        {/* Breadcrumbs & Auto-Refresh Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
            <span onClick={() => setCurrentPath('/')} style={{ cursor: 'pointer', fontWeight: 'bold', color: '#2563eb' }}>root</span>
            {pathParts.map((part, idx) => {
              const fullSubPath = '/' + pathParts.slice(0, idx + 1).join('/')
              return (
                <React.Fragment key={idx}>
                  <span>/</span>
                  <span
                    onClick={() => setCurrentPath(fullSubPath)}
                    style={{ cursor: 'pointer', fontWeight: idx === pathParts.length - 1 ? 'bold' : '500', color: idx === pathParts.length - 1 ? '#0f172a' : '#2563eb' }}
                  >
                    {part}
                  </span>
                </React.Fragment>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: '#475569' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontFamily: 'monospace', fontWeight: 'bold' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
              <span>Auto-refresh: 00:0{countdown}s</span>
            </div>

            <button
              onClick={() => setIsAutoRefreshEnabled(!isAutoRefreshEnabled)}
              style={{ background: 'transparent', border: 'none', color: isAutoRefreshEnabled ? '#059669' : '#94a3b8', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {isAutoRefreshEnabled ? 'Pause Refresh' : 'Resume Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Directory Counters & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: '12.5px', color: '#475569', fontWeight: '600' }}>
          Directory Contents: <span style={{ color: '#0f172a', fontWeight: 'bold' }}>{totalFilesCount} documents</span>, <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{totalDirsCount} folders</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 10px', width: '220px' }}>
          <Search size={14} color="#94a3b8" style={{ marginRight: '6px' }} />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '11.5px', outline: 'none' }}
          />
        </div>
      </div>

      {/* Scrollable File & Folder Table View with Selection Checkboxes */}
      <div style={{ 
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', 
        overflowY: 'auto', flex: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        maxHeight: 'calc(100vh - 270px)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc' }}>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '10px 14px', width: '30px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '10px 14px', width: '40px' }}></th>
              <th style={{ padding: '10px 14px', fontWeight: 'bold', color: '#475569' }}>Name</th>
              <th style={{ padding: '10px 14px', fontWeight: 'bold', color: '#475569' }}>Type</th>
              <th style={{ padding: '10px 14px', fontWeight: 'bold', color: '#475569', textAlign: 'right' }}>Size</th>
              <th style={{ padding: '10px 14px', fontWeight: 'bold', color: '#475569' }}>Last Modified</th>
              <th style={{ padding: '10px 14px', fontWeight: 'bold', color: '#475569', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFiles.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                  {isLoading ? 'Syncing directory contents from backend...' : 'No files or documents found in this directory.'}
                </td>
              </tr>
            ) : (
              filteredFiles.map((item, idx) => {
                const itemPath = item.path || `${currentPath}/${item.name}`
                const isSelected = selectedFilePaths.includes(itemPath)

                return (
                  <tr 
                    key={idx} 
                    style={{ 
                      borderBottom: '1px solid #f1f5f9', 
                      background: isSelected ? '#eff6ff' : 'transparent',
                      cursor: item.isDir ? 'pointer' : 'default', transition: 'background 0.15s' 
                    }}
                    onClick={() => {
                      if (item.isDir) {
                        const nextPath = item.path || (currentPath === '/' ? '' : currentPath) + '/' + item.name
                        setCurrentPath(nextPath)
                      }
                    }}
                    onMouseOver={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc' }}
                    onMouseOut={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={{ padding: '10px 14px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      {!item.isDir ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(itemPath)}
                          style={{ cursor: 'pointer' }}
                        />
                      ) : null}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {renderFileIcon(item)}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 'bold', color: item.isDir ? '#2563eb' : '#0f172a' }}>
                      {item.name}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748b', textTransform: 'capitalize' }}>
                      {item.isDir ? 'Directory' : `${item.type.toUpperCase()} File`}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '600', fontVariantNumeric: 'tabular-nums', color: '#475569' }}>
                      {item.size}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>
                      {item.modified}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      {!item.isDir ? (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => setSelectedFileForPreview(item)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 12px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            <Eye size={13} /> View Document
                          </button>
                          <button
                            onClick={() => triggerDirectDownload(itemPath, item.name)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                            title="Download document directly with actual filename"
                          >
                            <Download size={13} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '11px', fontStyle: 'italic' }}>Folder</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Universal In-App Document Viewer Modal (White Theme & Expanded Dimensions) */}
      {selectedFileForPreview && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            width: '92vw', maxWidth: '1120px', background: '#ffffff', borderRadius: '14px',
            overflow: 'hidden', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.25)',
            display: 'flex', flexDirection: 'column', height: '84vh', maxHeight: '780px',
            border: '1px solid #cbd5e1'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '16px 24px', background: '#ffffff', color: '#0f172a', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {renderFileIcon(selectedFileForPreview)}
                <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#0f172a' }}>{selectedFileForPreview.name}</span>
                <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontSize: '10px', padding: '2px 10px', borderRadius: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  {selectedFileForPreview.type}
                </span>
              </div>
              <button 
                onClick={() => setSelectedFileForPreview(null)} 
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '50%', width: '32px', height: '32px', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Metadata Bar */}
            <div style={{ background: '#f8fafc', padding: '10px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
              <span><b>Path:</b> <span style={{ fontFamily: 'monospace', color: '#1e293b' }}>{selectedFileForPreview.path || `${currentPath}/${selectedFileForPreview.name}`}</span></span>
              <span><b>Size:</b> {selectedFileForPreview.size} | <b>Modified:</b> {selectedFileForPreview.modified}</span>
            </div>

            {/* Document Viewer Body (White Theme) */}
            <div style={{ flex: 1, background: '#f8fafc', overflow: 'hidden', padding: '16px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              {isPreviewLoading ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: '12px' }}>
                  <RefreshCw size={26} className="animate-spin" color="#2563eb" />
                  <span style={{ fontSize: '13.5px', fontWeight: 'bold', color: '#1e293b' }}>Fetching real-time document content...</span>
                </div>
              ) : previewBlobUrl && (selectedFileForPreview.name.toLowerCase().endsWith('.jpg') || selectedFileForPreview.name.toLowerCase().endsWith('.jpeg') || selectedFileForPreview.name.toLowerCase().endsWith('.png') || selectedFileForPreview.name.toLowerCase().endsWith('.gif') || selectedFileForPreview.name.toLowerCase().endsWith('.bmp') || selectedFileForPreview.name.toLowerCase().endsWith('.webp')) ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '12px' }}>
                  <img src={previewBlobUrl} alt={selectedFileForPreview.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '6px' }} />
                </div>
              ) : previewBlobUrl && selectedFileForPreview.name.toLowerCase().endsWith('.pdf') ? (
                <embed src={previewBlobUrl} type="application/pdf" style={{ width: '100%', height: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#ffffff' }} />
              ) : (
                <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <button
                    onClick={handleCopyContent}
                    style={{
                      position: 'absolute', top: '12px', right: '14px', zIndex: 10,
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                      background: '#ffffff', color: '#334155', border: '1px solid #cbd5e1',
                      borderRadius: '6px', fontSize: '11.5px', cursor: 'pointer', fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                    }}
                  >
                    {isCopied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    {isCopied ? 'Copied!' : 'Copy Code'}
                  </button>

                  <pre style={{
                    margin: 0, padding: '20px', flex: 1, overflow: 'auto',
                    fontFamily: 'Consolas, Monaco, "Andale Mono", monospace', fontSize: '12.5px',
                    color: '#0f172a', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0',
                    lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-all', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
                  }}>
                    {previewContent}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 24px', background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => triggerDirectDownload(selectedFileForPreview.path || `${currentPath}/${selectedFileForPreview.name}`, selectedFileForPreview.name)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12.5px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}
              >
                <Download size={15} /> Download Document
              </button>
              <button
                onClick={() => setSelectedFileForPreview(null)}
                style={{ padding: '8px 18px', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '7px', fontSize: '12.5px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
