import { useState, useEffect } from 'react'
import { getLogDates, getLogs } from './api'
import { RefreshCw, Download, Search, AlertCircle } from 'lucide-react'

export default function LogViewer({ config }) {
  const [dates, setDates] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingDates, setLoadingDates] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState('ALL')

  const fetchDates = async () => {
    setLoadingDates(true)
    setError('')
    try {
      const res = await getLogDates()
      setDates(res.data)
      if (res.data.length > 0) {
        setSelectedDate(res.data[0]) 
      }
    } catch (err) {
      setError('Failed to fetch available dates')
    } finally {
      setLoadingDates(false)
    }
  }

  const fetchLogs = async (date) => {
    if (!date) return
    setLoading(true)
    setError('')
    try {
      const res = await getLogs(date)
      setLogs(res.data)
    } catch (err) {
      setError('Failed to fetch logs for selected date')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDates()
  }, [config])

  useEffect(() => {
    if (selectedDate) {
      fetchLogs(selectedDate)
    }
  }, [selectedDate])

  const filteredLogs = logs.filter(log => {
    const matchLevel = levelFilter === 'ALL' || log.level === levelFilter
    const matchSearch = searchTerm === '' || 
      (log.message && log.message.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.logger && log.logger.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.thread && log.thread.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchLevel && matchSearch
  })

  const levels = ['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG', 'TRACE']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
      {/* Controls */}
      <div className="control-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="rg-field">
            <label className="rg-label">Select Date</label>
            <select 
              className="auth-input" 
              style={{ padding: '8px 12px', minWidth: '150px' }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              disabled={loadingDates || dates.length === 0}
            >
              {dates.length === 0 && <option value="">No dates available</option>}
              {dates.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          
          <div className="rg-field">
            <label className="rg-label">Log Level</label>
            <select 
              className="auth-input" 
              style={{ padding: '8px 12px' }}
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
            >
              {levels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div className="rg-field" style={{ minWidth: '250px' }}>
            <label className="rg-label">Search</label>
            <div className="auth-input-wrap">
              <Search className="auth-input-icon" size={16} style={{ left: '10px' }} />
              <input 
                type="text" 
                className="auth-input" 
                style={{ padding: '8px 12px 8px 32px' }}
                placeholder="Search message, logger..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" style={{ background: 'white', border: '1px solid var(--gray-300)' }} onClick={() => fetchLogs(selectedDate)} disabled={!selectedDate || loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="auth-error" style={{ marginBottom: 0 }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '400px' }}>
        {loading ? (
          <div className="loading-card" style={{ height: '100%', minHeight: '200px' }}>
            <span className="spinner" />
            <span>Parsing logs...</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table className="results-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '160px' }}>Timestamp</th>
                  <th style={{ width: '80px' }}>Level</th>
                  <th style={{ width: '150px' }}>Logger/Class</th>
                  <th style={{ width: '120px' }}>Thread</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
                      No logs found matching criteria
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <tr key={idx} style={{ background: log.level === 'ERROR' ? 'var(--danger-light)' : log.level === 'WARN' ? 'var(--warning-light)' : 'transparent' }}>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--gray-600)' }}>{log.timestamp}</td>
                      <td>
                        <span style={{ 
                          fontWeight: 600, 
                          color: log.level === 'ERROR' ? 'var(--danger)' : log.level === 'WARN' ? 'var(--warning)' : log.level === 'INFO' ? 'var(--primary)' : 'var(--gray-600)' 
                        }}>
                          {log.level}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--gray-600)' }}>{log.logger}</td>
                      <td style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{log.thread}</td>
                      <td style={{ wordBreak: 'break-word', fontFamily: 'monospace', fontSize: '12.5px' }}>{log.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: '12px 16px', background: 'var(--gray-50)', borderTop: '1px solid var(--gray-200)', fontSize: '12px', color: 'var(--gray-600)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Showing {filteredLogs.length} entries</span>
        </div>
      </div>
    </div>
  )
}
