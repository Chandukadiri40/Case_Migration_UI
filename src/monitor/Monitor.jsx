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
    <>
      <header className="topbar">
        <div className="topbar-brand">
          <span>Monitor Logs</span>
        </div>
        <div className="topbar-actions">
          <span className="topbar-date">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </header>

      <main className="main-content">
        <div className="control-row">
          <LogConfig config={config} onConfigSaved={setConfig} />
        </div>

        {config ? (
          <LogViewer config={config} />
        ) : (
          <div className="card empty-prompt">
            <div className="empty-state">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <p className="empty-title">Configure Log Path</p>
              <p className="empty-sub">Please configure a local Windows directory path above to view logs.</p>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
