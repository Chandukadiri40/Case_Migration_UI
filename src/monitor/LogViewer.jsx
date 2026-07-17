import { useState, useEffect } from 'react'
import { getLogDates, getLogs } from './api'
import { RefreshCw, Search, AlertCircle } from 'lucide-react'
import LogConfig from './LogConfig'

const getRowStyle = (level) => {
  if (level === 'ERROR') return { background: 'var(--danger-light)' };
  if (level === 'WARN') return { background: 'var(--warning-light)' };
  return { background: 'transparent' };
}

const getLevelStyle = (level) => {
  if (level === 'ERROR') return 'var(--danger)';
  if (level === 'WARN') return 'var(--warning)';
  if (level === 'INFO') return 'var(--primary)';
  return 'var(--gray-600)';
}

export default function LogViewer({ config, onConfigSaved }) {
  const [dates, setDates] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingDates, setLoadingDates] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState('ALL')

  const formatLogDate = (filename) => {
    if (!filename) return '';
    const appErrMatch = filename.match(/AppErr(\d{2})(\d{2})(\d{4})/i);
    if (appErrMatch) return `${appErrMatch[1]}-${appErrMatch[2]}-${appErrMatch[3]}`;
    const stdMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
    if (stdMatch) return stdMatch[1];
    return filename;
  }

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

  const levels = ['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: 0 }}>
      <div className="filters-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'white', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', marginBottom: '0' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Logs</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '2.1fr 0.7fr 0.6fr 2.1fr auto', gap: '12px', alignItems: 'end' }}>
          
          <LogConfig config={config} onConfigSaved={onConfigSaved} />

          <div>
            <label style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select Date</label>
            <select 
              style={{ padding: '5px 8px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none', transition: 'border-color 0.2s', height: '28px' }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              disabled={loadingDates || dates.length === 0}
              onFocus={(e) => e.target.style.borderColor = '#4f46e5'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            >
              {dates.length === 0 && <option value="">-- No dates --</option>}
              {dates.map(d => <option key={d} value={d}>{formatLogDate(d)}</option>)}
            </select>
          </div>
          
          <div>
            <label style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Log Level</label>
            <select 
              style={{ padding: '5px 8px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none', transition: 'border-color 0.2s', height: '28px' }}
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              onFocus={(e) => e.target.style.borderColor = '#4f46e5'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            >
              {levels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                style={{ padding: '5px 8px 5px 24px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none', transition: 'border-color 0.2s', height: '28px', boxSizing: 'border-box' }}
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={(e) => e.target.style.borderColor = '#4f46e5'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <button
              onClick={() => fetchLogs(selectedDate)}
              disabled={loading || !selectedDate}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '5px 14px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', height: '28px', fontSize: '9px', transition: 'all 0.2s', width: '100%', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)', opacity: (loading || !selectedDate) ? 0.6 : 1 }}
              onMouseOver={(e) => { if(!loading && selectedDate) { e.target.style.background = '#4338ca'; e.target.style.transform = 'translateY(-1px)'; } }}
              onMouseOut={(e) => { if(!loading && selectedDate) { e.target.style.background = '#4f46e5'; e.target.style.transform = 'translateY(0)'; } }}
            >
              <RefreshCw size={12} className={loading ? 'spin' : ''} /> {loading ? 'Loading...' : 'Refresh Logs'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="auth-error" style={{ marginBottom: 0 }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, marginBottom: 0 }}>
        {loading ? (
          <div className="loading-card" style={{ height: '100%', minHeight: '200px' }}>
            <span className="spinner" />
            <span>Parsing logs...</span>
          </div>
        ) : (
          <div style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
            <table className="results-table" style={{ width: '100%' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
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
                    <tr key={`${log.timestamp}-${idx}`} style={getRowStyle(log.level)}>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--gray-600)' }}>{log.timestamp}</td>
                      <td>
                        <span style={{ 
                          fontWeight: 600, 
                          color: getLevelStyle(log.level)
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
        <div style={{ padding: '6px 16px', background: 'var(--gray-50)', borderTop: '1px solid var(--gray-200)', fontSize: '11px', color: 'var(--gray-600)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Showing {filteredLogs.length} entries</span>
        </div>
      </div>
    </div>
  )
}
