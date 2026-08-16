import React, { useState, useEffect } from 'react';
import { X, Cpu, Server, FileText } from 'lucide-react';

export default function CreateJobModal({ isOpen, onClose, onCreateJob }) {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [category, setCategory] = useState('extraction');
  const [type, setType] = useState('Bulk');
  const [source, setSource] = useState('FileNet P8');
  const [dateRange, setDateRange] = useState('01-May-2025 – 07-May-2025');
  const [filterCriteria, setFilterCriteria] = useState('Document Date');
  const [records, setRecords] = useState('10000');
  const [env, setEnv] = useState('Linux RHEL 8 (192.168.1.105)');
  const [command, setCommand] = useState('');
  const [logPath, setLogPath] = useState('');

  // Dynamically update shell command template when settings change
  useEffect(() => {
    const jobKey = name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'job_new';
    if (category === 'extraction') {
      if (type === 'Bulk') {
        setCommand(`bash /opt/truemigrate/scripts/extract_filenet_bulk.sh --source p8_prod --batch ${records || 10000}`);
        setLogPath(`/var/log/truemigrate/extract_${jobKey}.log`);
      } else if (type === 'Ad-hoc') {
        setCommand(`bash /opt/truemigrate/scripts/extract_sp_adhoc.sh --folder "/Contracts" --limit ${records || 100}`);
        setLogPath(`/var/log/truemigrate/extract_adhoc_${jobKey}.log`);
      } else {
        setCommand(`bash /opt/truemigrate/scripts/retry_exceptions.sh --error 500 --limit ${records || 100}`);
        setLogPath(`/var/log/truemigrate/retry_${jobKey}.log`);
      }
    } else {
      if (type === 'Bulk') {
        setCommand(`bash /opt/truemigrate/scripts/import_p8_bulk.sh --dest "/Imported" --batch ${records || 10000}`);
        setLogPath(`/var/log/truemigrate/import_${jobKey}.log`);
      } else if (type === 'Ad-hoc') {
        setCommand(`unzip /opt/truemigrate/uploads/test_upload.zip -d /opt/truemigrate/imports/`);
        setLogPath(`/var/log/truemigrate/import_adhoc_${jobKey}.log`);
      } else {
        setCommand(`bash /opt/truemigrate/scripts/retry_failed_imports.sh --batch ${records || 100}`);
        setLogPath(`/var/log/truemigrate/import_exc_${jobKey}.log`);
      }
    }
  }, [name, category, type, records]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('Please enter a job name');
    
    onCreateJob({
      name: name.toUpperCase(),
      category,
      type,
      source,
      dateRange,
      filterCriteria,
      records: Number(records) || 0,
      status: 'Pending',
      createdBy: 'admin',
      createdDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
      env,
      command,
      logPath,
      logs: [`[INFO] Job ${name.toUpperCase()} created successfully by admin. Status set to Pending.`]
    });
    
    onClose();
  };

  const labelStyle = {
    fontSize: '11px',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '6px',
    display: 'block'
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1.5px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '12.5px',
    outline: 'none',
    color: '#1e293b',
    background: '#fff',
    transition: 'border 0.15s'
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
    }}>
      <div style={{
        width: '600px', background: 'white', borderRadius: '12px',
        overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column'
      }}>
        
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>+ Create New Migration Job</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Main Info Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Job Name</label>
              <input 
                type="text" 
                placeholder="e.g. EXT_JOB_003" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                style={inputStyle}
                required
              />
            </div>
            
            <div>
              <label style={labelStyle}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
                <option value="extraction">Extraction Jobs</option>
                <option value="import">Import Jobs</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Job Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
                <option value="Bulk">Bulk</option>
                <option value="Ad-hoc">Ad-hoc</option>
                <option value="Exception">Exception</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Source System</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} style={inputStyle}>
                <option value="FileNet P8">FileNet P8</option>
                <option value="SharePoint">SharePoint</option>
                <option value="Database">Database</option>
                <option value="Local File System">Local File System</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Date Range / Target</label>
              <input 
                type="text" 
                value={dateRange} 
                onChange={(e) => setDateRange(e.target.value)} 
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Expected Records</label>
              <input 
                type="number" 
                value={records} 
                onChange={(e) => setRecords(e.target.value)} 
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Filter Criteria</label>
            <input 
              type="text" 
              value={filterCriteria} 
              onChange={(e) => setFilterCriteria(e.target.value)} 
              style={inputStyle}
            />
          </div>

          {/* Linux Command Configuration Section */}
          <div style={{
            marginTop: '10px', padding: '14px', background: '#f8fafc',
            borderRadius: '8px', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px'
          }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={14} style={{ color: '#4f46e5' }} /> Linux Shell Command Configuration
            </h4>

            <div>
              <label style={{ ...labelStyle, fontSize: '9.5px', color: '#64748b' }}>Target Execution Environment</label>
              <select value={env} onChange={(e) => setEnv(e.target.value)} style={{ ...inputStyle, background: '#fff' }}>
                <option value="Linux RHEL 8 (192.168.1.105)">Linux RHEL 8 (192.168.1.105)</option>
                <option value="Linux Ubuntu 22.04">Linux Ubuntu 22.04</option>
                <option value="Local Shell Process">Local Shell Process</option>
              </select>
            </div>

            <div>
              <label style={{ ...labelStyle, fontSize: '9.5px', color: '#64748b' }}>Shell Command / Script Path</label>
              <input 
                type="text" 
                value={command} 
                onChange={(e) => setCommand(e.target.value)} 
                style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '11px', background: '#fff' }}
              />
            </div>

            <div>
              <label style={{ ...labelStyle, fontSize: '9.5px', color: '#64748b' }}>Output Log Path</label>
              <input 
                type="text" 
                value={logPath} 
                onChange={(e) => setLogPath(e.target.value)} 
                style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '11px', background: '#fff' }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <button 
              type="button" 
              onClick={onClose} 
              style={{ padding: '7px 16px', background: 'white', color: '#475569', border: '1.5px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              style={{ padding: '7px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
            >
              Create Job
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
