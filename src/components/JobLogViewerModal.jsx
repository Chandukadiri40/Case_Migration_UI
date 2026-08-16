import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Square, Pause, Copy, Terminal, Download, Search, RefreshCw } from 'lucide-react';
import axios from 'axios';

export default function JobLogViewerModal({ job, isOpen, onClose, onUpdateJobStatus }) {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState(job?.status || 'Pending');
  const [isFetching, setIsFetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const terminalEndRef = useRef(null);
  const terminalContainerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const jobIdRef = useRef(job?.id);

  // Keep jobId ref in sync
  jobIdRef.current = job?.id;

  // Detect when user manually scrolls up in the terminal
  const handleTerminalScroll = () => {
    const el = terminalContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setUserScrolledUp(!isNearBottom);
  };

  // Simple direct fetch — uses ref for stable job ID
  const doFetchLogs = async () => {
    const id = jobIdRef.current;
    if (!id) return;
    try {
      setIsFetching(true);
      const res = await axios.get(`/api/jobs/${id}/logs?t=${Date.now()}`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        setLogs(res.data);
      }
    } catch (err) {
      // silently ignore fetch errors during polling
    } finally {
      setIsFetching(false);
    }
  };

  // Sync status from props
  useEffect(() => {
    if (job) {
      setStatus(job.status);
      doFetchLogs();
    }
  }, [job?.id, job?.status]);

  // Polling: start/stop based on status
  useEffect(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (status === 'Running' && isOpen) {
      // Poll every 2 seconds using a simple setInterval
      // doFetchLogs reads jobIdRef.current each time, so it's always fresh
      pollTimerRef.current = setInterval(doFetchLogs, 2000);
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [status, isOpen]);

  // Auto-scroll to bottom ONLY if user hasn't scrolled up manually
  useEffect(() => {
    if (terminalEndRef.current && !searchTerm && !userScrolledUp) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, searchTerm, userScrolledUp]);

  // Early return AFTER all hooks (React Rules of Hooks compliance)
  if (!isOpen || !job) return null;

  const getStatusColor = (currentStatus) => {
    switch (currentStatus) {
      case 'Running': return '#3b82f6';
      case 'Completed': return '#10b981';
      case 'Failed': return '#ef4444';
      case 'Paused': return '#eab308';
      default: return '#6b7280';
    }
  };

  const parseLogLevel = (logLine) => {
    if (typeof logLine !== 'string') return { text: String(logLine), color: '#e2e8f0', fontWeight: 'normal' };
    if (logLine.includes('[ERROR]') || logLine.includes('FATAL')) {
      return { text: logLine, color: '#f87171', fontWeight: 'bold' };
    }
    if (logLine.includes('[WARN]')) {
      return { text: logLine, color: '#fbbf24', fontWeight: 'normal' };
    }
    if (logLine.includes('[INFO]')) {
      return { text: logLine, color: '#38bdf8', fontWeight: 'normal' };
    }
    return { text: logLine, color: '#e2e8f0', fontWeight: 'normal' };
  };

  const handleRunCommand = async () => {
    try {
      setStatus('Running');
      onUpdateJobStatus(job.id, 'Running');
      await axios.post(`/api/jobs/${job.id}/start`);
      // Give SSH a moment to create the log file, then fetch
      setTimeout(doFetchLogs, 1500);
    } catch (err) {
      doFetchLogs();
    }
  };

  const handleStopProcess = async () => {
    try {
      setStatus('Failed');
      onUpdateJobStatus(job.id, 'Failed');
      await axios.post(`/api/jobs/${job.id}/stop`);
      doFetchLogs();
    } catch (err) {
      doFetchLogs();
    }
  };

  const handlePauseProcess = async () => {
    try {
      setStatus('Paused');
      onUpdateJobStatus(job.id, 'Paused');
      await axios.post(`/api/jobs/${job.id}/pause`);
      doFetchLogs();
    } catch (err) {
      doFetchLogs();
    }
  };

  const handleCopyLogs = () => {
    const fullLogText = logs.join('\n');
    navigator.clipboard.writeText(fullLogText);
    alert('Terminal logs copied to clipboard!');
  };

  const handleDownloadLogs = () => {
    const fullLogText = logs.join('\n');
    const blob = new Blob([fullLogText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job.name.toLowerCase()}_execution.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = searchTerm
    ? logs.filter(l => String(l).toLowerCase().includes(searchTerm.toLowerCase()))
    : logs;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{
        width: 'min(860px, 92vw)', background: '#090D10', borderRadius: '10px',
        overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid #1f2937', display: 'flex', flexDirection: 'column', height: 'min(580px, 82vh)'
      }}>
        
        {/* Terminal Header */}
        <div style={{
          background: '#0D1117', padding: '8px 14px', borderBottom: '1px solid #21262d',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Terminal size={15} style={{ color: '#38bdf8' }} />
            <span style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '12.5px' }}>{job.name}</span>
            <span style={{
              background: getStatusColor(status), color: '#fff', fontSize: '9.5px',
              padding: '2px 8px', borderRadius: '20px', fontWeight: 'bold', textTransform: 'uppercase'
            }}>
              {status}
            </span>
            {job.processPid && (
              <span style={{ color: '#94a3b8', fontSize: '10.5px', fontFamily: 'monospace' }}>PID: {job.processPid}</span>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', color: '#8b949e' }}>
            <span>Server: <b style={{ color: '#c9d1d9' }}>{job.env}</b></span>
            <button 
              onClick={onClose} 
              style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Command Subbar with Search Filter */}
        <div style={{
          background: '#161B22', padding: '5px 14px', borderBottom: '1px solid #21262d',
          fontSize: '10.5px', color: '#c9d1d9', fontFamily: 'monospace', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', gap: '10px'
        }}>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            <span style={{ color: '#8b949e' }}>Command: </span>
            <span style={{ color: '#58a6ff' }}>$ {job.command}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={doFetchLogs}
              style={{ background: '#21262d', border: '1px solid #30363d', color: '#c9d1d9', borderRadius: '4px', padding: '3px 8px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={11} className={isFetching ? "animate-spin" : ""} /> Refresh
            </button>
            <div style={{ display: 'flex', alignItems: 'center', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '2px 8px', gap: '6px' }}>
              <Search size={12} color="#8b949e" />
              <input
                type="text"
                placeholder="Filter logs..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#c9d1d9', fontSize: '10.5px', outline: 'none', width: '130px' }}
              />
              {searchTerm && (
                <X size={12} color="#8b949e" style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />
              )}
            </div>
          </div>
        </div>

        {/* Terminal Body */}
        <div
          ref={terminalContainerRef}
          onScroll={handleTerminalScroll}
          style={{
          flex: 1, padding: '10px 14px', overflowY: 'auto', background: '#090d10',
          fontFamily: "'Fira Code', 'Courier New', Courier, monospace", fontSize: '11px', lineHeight: '1.5'
        }}>
          {filteredLogs.map((line, idx) => {
            const parsed = parseLogLevel(line);
            return (
              <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                <span style={{ color: '#484f58', userSelect: 'none', width: '28px', textAlign: 'right', fontSize: '10px' }}>
                  {idx + 1}
                </span>
                <div style={{ color: parsed.color, fontWeight: parsed.fontWeight, whiteSpace: 'pre-wrap', flex: 1 }}>
                  {parsed.text}
                </div>
              </div>
            );
          })}
          <div ref={terminalEndRef} />
        </div>

        {/* Action Controls Footer */}
        <div style={{
          background: '#0D1117', padding: '8px 14px', borderTop: '1px solid #21262d',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleRunCommand}
              disabled={status === 'Running'}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                background: status === 'Running' ? '#1f2937' : '#238636', color: status === 'Running' ? '#8b949e' : '#fff',
                border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold',
                cursor: status === 'Running' ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
              }}
            >
              <Play size={12} /> {status === 'Paused' ? 'Resume Job' : 'Start Job'}
            </button>
            
            <button
              onClick={handleStopProcess}
              disabled={status !== 'Running' && status !== 'Paused'}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                background: '#da3633', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold',
                cursor: (status !== 'Running' && status !== 'Paused') ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', opacity: (status !== 'Running' && status !== 'Paused') ? 0.4 : 1
              }}
            >
              <Square size={12} /> Stop Process
            </button>

            <button
              onClick={handlePauseProcess}
              disabled={status !== 'Running'}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                background: '#eab308', color: '#000', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold',
                cursor: status !== 'Running' ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: status !== 'Running' ? 0.4 : 1
              }}
            >
              <Pause size={12} /> Pause
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCopyLogs}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d',
                borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              <Copy size={12} /> Copy
            </button>

            <button
              onClick={handleDownloadLogs}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                background: '#21262d', color: '#38bdf8', border: '1px solid #30363d',
                borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              <Download size={12} /> Download
            </button>

            <button
              onClick={onClose}
              style={{
                padding: '6px 14px', background: '#21262d', color: '#c9d1d9',
                border: '1px solid #30363d', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
