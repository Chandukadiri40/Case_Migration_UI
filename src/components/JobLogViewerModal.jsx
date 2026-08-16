import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Square, Pause, Copy, Terminal } from 'lucide-react';

export default function JobLogViewerModal({ job, isOpen, onClose, onUpdateJobStatus }) {
  if (!isOpen || !job) return null;

  const [logs, setLogs] = useState([...job.logs]);
  const [status, setStatus] = useState(job.status);
  const [isSimulating, setIsSimulating] = useState(false);
  const terminalEndRef = useRef(null);
  const simulationIntervalRef = useRef(null);

  // Auto-scroll to bottom of terminal when logs update
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Clean up simulation on unmount
  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, []);

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
    if (logLine.includes('[ERROR]')) {
      return { text: logLine, color: '#f87171', fontWeight: 'bold' };
    }
    if (logLine.includes('[WARN]')) {
      return { text: logLine, color: '#fbbf24', fontWeight: 'normal' };
    }
    if (logLine.includes('[INFO]')) {
      // Highlight INFO level itself differently
      return { text: logLine, color: '#38bdf8', fontWeight: 'normal' };
    }
    return { text: logLine, color: '#e2e8f0', fontWeight: 'normal' };
  };

  // Simulate shell command running and logging
  const handleRunCommand = () => {
    if (isSimulating) return;

    setStatus('Running');
    onUpdateJobStatus(job.id, 'Running');
    setIsSimulating(true);

    const simulationLogs = [
      `[INFO] ${new Date().toISOString()} - Initializing simulation engine...`,
      `[INFO] Executing script: ${job.command}`,
      `[INFO] Target environment validation: SUCCESS`,
      `[INFO] Fetching records index from ${job.source}...`,
      `[INFO] Extracted record batch index loaded successfully.`,
      `[INFO] Processing record chunk 1/10...`,
      `[INFO] Processing record chunk 2/10...`,
      `[WARN] API Response delay: 150ms. Continuing...`,
      `[INFO] Processing record chunk 3/10...`,
      `[INFO] Processing record chunk 4/10...`,
      `[INFO] Processing record chunk 5/10...`,
      `[ERROR] Server connection error on chunk 6/10. Retrying...`,
      `[INFO] Retry SUCCESS. Connection restored.`,
      `[INFO] Processing record chunk 6/10...`,
      `[INFO] Processing record chunk 7/10...`,
      `[INFO] Processing record chunk 8/10...`,
      `[INFO] Processing record chunk 9/10...`,
      `[INFO] Processing record chunk 10/10...`,
      `[INFO] Finalizing output logs at ${job.logPath}...`,
      `[INFO] Process completed successfully. Exit code: 0`
    ];

    let currentLogIndex = 0;
    setLogs([`$ ${job.command}`, `[INFO] --- Starting Simulated Shell Run ---`]);

    simulationIntervalRef.current = setInterval(() => {
      if (currentLogIndex < simulationLogs.length) {
        setLogs(prev => [...prev, simulationLogs[currentLogIndex]]);
        currentLogIndex++;
      } else {
        clearInterval(simulationIntervalRef.current);
        setIsSimulating(false);
        setStatus('Completed');
        onUpdateJobStatus(job.id, 'Completed');
      }
    }, 1000);
  };

  const handleStopProcess = () => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }
    setIsSimulating(false);
    setStatus('Failed');
    onUpdateJobStatus(job.id, 'Failed');
    setLogs(prev => [...prev, `[ERROR] Process STOPPED by user administrative command. Exit code: 130`]);
  };

  const handlePauseProcess = () => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }
    setIsSimulating(false);
    setStatus('Paused');
    onUpdateJobStatus(job.id, 'Paused');
    setLogs(prev => [...prev, `[WARN] Process PAUSED by user configuration request.`]);
  };

  const handleCopyLogs = () => {
    const fullLogText = logs.join('\n');
    navigator.clipboard.writeText(fullLogText);
    alert('Terminal logs copied to clipboard!');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
    }}>
      <div style={{
        width: '800px', background: '#090D10', borderRadius: '12px',
        overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
        border: '1px solid #1f2937', display: 'flex', flexDirection: 'column', height: '600px'
      }}>
        
        {/* Terminal Header */}
        <div style={{
          background: '#0D1117', padding: '12px 18px', borderBottom: '1px solid #21262d',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={18} style={{ color: '#38bdf8' }} />
            <span style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '13px' }}>{job.name}</span>
            <span style={{
              background: getStatusColor(status), color: '#fff', fontSize: '9.5px',
              padding: '2px 8px', borderRadius: '20px', fontWeight: 'bold', textTransform: 'uppercase'
            }}>
              {status}
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#8b949e' }}>
            <span>Server: <b>{job.env}</b></span>
            <button 
              onClick={onClose} 
              style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Command Subbar */}
        <div style={{
          background: '#161B22', padding: '8px 18px', borderBottom: '1px solid #21262d',
          fontSize: '11px', color: '#c9d1d9', fontVariantLigatures: 'none', fontFamily: 'monospace'
        }}>
          <span style={{ color: '#8b949e' }}>Command: </span>
          <span style={{ color: '#58a6ff' }}>$ {job.command}</span>
        </div>

        {/* Terminal Body */}
        <div style={{
          flex: 1, padding: '16px', overflowY: 'auto', background: '#090d10',
          fontFamily: "'Fira Code', 'Courier New', Courier, monospace", fontSize: '11.5px', lineHeight: '1.6'
        }}>
          {logs.map((line, idx) => {
            const parsed = parseLogLevel(line);
            return (
              <div key={idx} style={{ color: parsed.color, fontWeight: parsed.fontWeight, whiteSpace: 'pre-wrap' }}>
                {parsed.text}
              </div>
            );
          })}
          {isSimulating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', marginTop: '6px' }}>
              <span style={{ width: '6px', height: '12px', background: '#10b981', display: 'inline-block', animation: 'pulse 1s infinite' }}></span>
              <span>Running simulation...</span>
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Action Controls Footer */}
        <div style={{
          background: '#0D1117', padding: '12px 18px', borderTop: '1px solid #21262d',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleRunCommand}
              disabled={isSimulating}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                background: isSimulating ? '#1f2937' : '#238636', color: isSimulating ? '#8b949e' : '#fff',
                border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold',
                cursor: isSimulating ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
              }}
            >
              <Play size={12} /> Run Command
            </button>
            
            <button
              onClick={handleStopProcess}
              disabled={status === 'Completed' || status === 'Failed'}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                background: '#da3633', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold',
                cursor: 'pointer', transition: 'all 0.2s', opacity: (status === 'Completed' || status === 'Failed') ? 0.4 : 1
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
                cursor: 'pointer', transition: 'all 0.2s', opacity: status !== 'Running' ? 0.4 : 1
              }}
            >
              <Pause size={12} /> Pause
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCopyLogs}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d',
                borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              <Copy size={12} /> Copy Logs
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
