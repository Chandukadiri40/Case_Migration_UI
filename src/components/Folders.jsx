import React, { useState, useEffect } from 'react'
import { 
  Folder, FileText, ArrowLeft, RefreshCw, Download, Eye, X, 
  Search, HardDrive, Upload, 
  FileCode, Image as ImageIcon, FileSpreadsheet, FileArchive, Globe, CheckSquare, Square
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

  // Direct single file download helper without opening new tab
  function triggerDirectDownload(filePath, fileName) {
    const downloadUrl = apiGetDocumentDownloadUrl(filePath)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = downloadUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    if (showAlert) {
      showAlert(`Downloading document "${fileName}"...`, 'Downloading File', 'info')
    }
  }

  // Bulk download selected documents
  function handleBulkDownload() {
    if (selectedFilePaths.length === 0) return

    if (showAlert) {
      showAlert(`Starting bulk download for ${selectedFilePaths.length} selected document(s)...`, 'Bulk Download Started', 'info')
    }

    selectedFilePaths.forEach((path, idx) => {
      setTimeout(() => {
        const fileName = path.substring(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1)
        triggerDirectDownload(path, fileName)
      }, idx * 400)
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
    switch (file.type) {
      case 'pdf': return <FileText size={18} color="#ef4444" />
      case 'image': return <ImageIcon size={18} color="#10b981" />
      case 'sheet': return <FileSpreadsheet size={18} color="#059669" />
      case 'archive': return <FileArchive size={18} color="#8b5cf6" />
      case 'code': return <FileCode size={18} color="#6366f1" />
      case 'doc': return <FileText size={18} color="#2563eb" />
      default: return <FileText size={18} color="#64748b" />
    }
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
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            <Eye size={12} /> View Document
                          </button>
                          <button
                            onClick={() => triggerDirectDownload(itemPath, item.name)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                            title="Download document directly"
                          >
                            <Download size={12} />
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

      {/* Universal Document Viewer Drawer / Modal (In Current Page) */}
      {selectedFileForPreview && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            width: '880px', background: '#fff', borderRadius: '12px',
            overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            display: 'flex', flexDirection: 'column', height: '640px'
          }}>
            <div style={{ padding: '14px 20px', background: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {renderFileIcon(selectedFileForPreview)}
                <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{selectedFileForPreview.name}</span>
                <span style={{ background: '#3b82f6', color: '#fff', fontSize: '9px', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  {selectedFileForPreview.type}
                </span>
              </div>
              <button onClick={() => setSelectedFileForPreview(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '10px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569' }}>
              <span><b>Path:</b> {selectedFileForPreview.path || `${currentPath}/${selectedFileForPreview.name}`}</span>
              <span><b>Size:</b> {selectedFileForPreview.size} | <b>Modified:</b> {selectedFileForPreview.modified}</span>
            </div>

            {/* Document Viewer Frame inside Modal on Current Page */}
            <div style={{ flex: 1, background: '#1e293b', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {selectedFileForPreview.type === 'image' ? (
                <img
                  src={apiGetDocumentViewUrl(selectedFileForPreview.path || `${currentPath}/${selectedFileForPreview.name}`)}
                  alt={selectedFileForPreview.name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : (
                <iframe
                  src={apiGetDocumentViewUrl(selectedFileForPreview.path || `${currentPath}/${selectedFileForPreview.name}`)}
                  title={selectedFileForPreview.name}
                  style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                />
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '12px 20px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => triggerDirectDownload(selectedFileForPreview.path || `${currentPath}/${selectedFileForPreview.name}`, selectedFileForPreview.name)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                <Download size={14} /> Download Document
              </button>
              <button
                onClick={() => setSelectedFileForPreview(null)}
                style={{ padding: '7px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
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
