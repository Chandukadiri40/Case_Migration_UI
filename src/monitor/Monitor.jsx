import { useState, useEffect } from 'react'
import LogConfig from './LogConfig'
import LogViewer from './LogViewer'
import { getLogConfig } from './api'

export default function Monitor() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLogConfig().then(res => {
      setConfig(res.data) 
    }).catch(err => {
      console.error("Failed to load config", err)
    }).finally(() => {
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="main-content">
        <div className="card loading-card">
          <span className="spinner" />
          <span>Loading Monitor...</span>
        </div>
      </div>
    )
  }

  return (
    <main className="main-content" style={{ padding: '14px 14px 0 14px', height: '100%', display: 'flex', flexDirection: 'column', gap: '14px', background: '#f3f4f6', minHeight: 0 }}>
      {config ? (
        <LogViewer config={config} onConfigSaved={setConfig} />
      ) : (
        <>
          <div className="filters-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'white', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', marginBottom: '0' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Logs</h1>
            <LogConfig config={config} onConfigSaved={setConfig} />
          </div>
          <div className="card empty-prompt" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 0 }}>
            <div className="empty-state">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <p className="empty-title">Configure Log Path</p>
              <p className="empty-sub">Please configure a local Windows directory path above to view logs.</p>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
