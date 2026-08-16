import React, { useState } from 'react';
import { 
  Plus, Play, Square, Pause, RotateCw, Terminal, CheckCircle2, 
  XCircle, Clock, AlertCircle, RefreshCw, ShieldAlert 
} from 'lucide-react';
import { JOB_CATEGORIES, INITIAL_JOBS } from '../config/jobsConfig';
import CreateJobModal from './CreateJobModal';
import JobLogViewerModal from './JobLogViewerModal';

export default function JobsConfiguration() {
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [activeCategory, setActiveCategory] = useState('extraction');
  const [activeFilterPill, setActiveFilterPill] = useState('all');
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);
  const [selectedJobForLogs, setSelectedJobForLogs] = useState(null);

  // Filter jobs based on active category and active status filter pill
  const categoryJobs = jobs.filter(j => j.category === activeCategory);
  
  const getFilteredJobs = () => {
    switch (activeFilterPill) {
      case 'bulk': return categoryJobs.filter(j => j.type === 'Bulk');
      case 'adhoc': return categoryJobs.filter(j => j.type === 'Ad-hoc');
      case 'exception': return categoryJobs.filter(j => j.type === 'Exception');
      case 'running': return categoryJobs.filter(j => j.status === 'Running');
      case 'completed': return categoryJobs.filter(j => j.status === 'Completed');
      case 'failed': return categoryJobs.filter(j => j.status === 'Failed');
      case 'paused': return categoryJobs.filter(j => j.status === 'Paused');
      default: return categoryJobs;
    }
  };

  const filteredJobs = getFilteredJobs();

  // Dynamic filter pill counts based on current category
  const getPillCount = (pillId) => {
    switch (pillId) {
      case 'all': return categoryJobs.length;
      case 'bulk': return categoryJobs.filter(j => j.type === 'Bulk').length;
      case 'adhoc': return categoryJobs.filter(j => j.type === 'Ad-hoc').length;
      case 'exception': return categoryJobs.filter(j => j.type === 'Exception').length;
      case 'running': return categoryJobs.filter(j => j.status === 'Running').length;
      case 'completed': return categoryJobs.filter(j => j.status === 'Completed').length;
      case 'failed': return categoryJobs.filter(j => j.status === 'Failed').length;
      default: return 0;
    }
  };

  // Checkbox management
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedJobIds(filteredJobs.map(j => j.id));
    } else {
      setSelectedJobIds([]);
    }
  };

  const handleSelectJob = (jobId) => {
    if (selectedJobIds.includes(jobId)) {
      setSelectedJobIds(selectedJobIds.filter(id => id !== jobId));
    } else {
      setSelectedJobIds([...selectedJobIds, jobId]);
    }
  };

  // Status handlers for selected jobs
  const updateSelectedJobsStatus = (newStatus) => {
    if (selectedJobIds.length === 0) return alert('Please select at least one job first.');
    
    setJobs(prevJobs => prevJobs.map(job => {
      if (selectedJobIds.includes(job.id)) {
        const timeStr = new Date().toISOString();
        const actionLog = newStatus === 'Running' 
          ? `[INFO] ${timeStr} - Process started by user action.` 
          : newStatus === 'Paused' 
            ? `[WARN] ${timeStr} - Process paused by user request.` 
            : `[ERROR] ${timeStr} - Process stopped/terminated by user action.`;
            
        return {
          ...job,
          status: newStatus,
          logs: [...job.logs, actionLog]
        };
      }
      return job;
    }));
    
    // Clear selections
    setSelectedJobIds([]);
  };

  // Single job status updater (used by logs modal simulation)
  const handleSingleJobStatusUpdate = (jobId, newStatus) => {
    setJobs(prevJobs => prevJobs.map(job => {
      if (job.id === jobId) {
        return { ...job, status: newStatus };
      }
      return job;
    }));
  };

  const handleCreateJob = (newJob) => {
    const nextId = (Math.max(...jobs.map(j => Number(j.id))) + 1).toString();
    setJobs([...jobs, { ...newJob, id: nextId }]);
  };

  const handleRefresh = () => {
    setSelectedJobIds([]);
    alert('Dashboard and job configurations refreshed successfully!');
  };

  // Styling helper for status badges
  const renderStatusBadge = (statusVal) => {
    let background = '#f3f4f6';
    let color = '#4b5563';
    let icon = <Clock size={11} />;

    switch (statusVal) {
      case 'Running':
        background = '#eff6ff';
        color = '#2563eb';
        icon = <RotateCw size={11} className="animate-spin" />;
        break;
      case 'Completed':
        background = '#ecfdf5';
        color = '#10b981';
        icon = <CheckCircle2 size={11} />;
        break;
      case 'Failed':
        background = '#fef2f2';
        color = '#ef4444';
        icon = <XCircle size={11} />;
        break;
      case 'Paused':
        background = '#fef9c3';
        color = '#eab308';
        icon = <AlertCircle size={11} />;
        break;
    }

    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px',
        borderRadius: '20px', background, color, fontSize: '10px', fontWeight: 'bold'
      }}>
        {icon}
        {statusVal}
      </span>
    );
  };

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto' }}>
      
      {/* Category Sub-Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', gap: '24px', paddingBottom: '2px' }}>
        {JOB_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              setActiveCategory(cat.id);
              setActiveFilterPill('all');
              setSelectedJobIds([]);
            }}
            style={{
              padding: '6px 4px 10px 4px', background: 'transparent', border: 'none',
              borderBottom: activeCategory === cat.id ? '2.5px solid #2563eb' : '2.5px solid transparent',
              color: activeCategory === cat.id ? '#1e293b' : '#94a3b8',
              fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s'
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Action Controls Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          
          <button
            onClick={() => setIsCreateOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
              background: '#2563eb', color: 'white', border: 'none', borderRadius: '7px',
              fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 4px rgba(37,99,235,0.1)'
            }}
          >
            <Plus size={14} /> Create New Job
          </button>

          <span style={{ width: '1px', height: '20px', background: '#cbd5e1', margin: '0 4px' }}></span>

          <button
            onClick={() => updateSelectedJobsStatus('Running')}
            disabled={selectedJobIds.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
              background: '#fff', color: '#1e293b', border: '1.5px solid #cbd5e1', borderRadius: '7px',
              fontSize: '11.5px', fontWeight: '700', cursor: selectedJobIds.length === 0 ? 'not-allowed' : 'pointer',
              opacity: selectedJobIds.length === 0 ? 0.5 : 1, transition: 'all 0.15s'
            }}
          >
            <Play size={12} style={{ color: '#10b981' }} /> Start
          </button>

          <button
            onClick={() => updateSelectedJobsStatus('Failed')}
            disabled={selectedJobIds.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
              background: '#fff', color: '#1e293b', border: '1.5px solid #cbd5e1', borderRadius: '7px',
              fontSize: '11.5px', fontWeight: '700', cursor: selectedJobIds.length === 0 ? 'not-allowed' : 'pointer',
              opacity: selectedJobIds.length === 0 ? 0.5 : 1, transition: 'all 0.15s'
            }}
          >
            <Square size={12} style={{ color: '#ef4444' }} /> Stop
          </button>

          <button
            onClick={() => updateSelectedJobsStatus('Paused')}
            disabled={selectedJobIds.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
              background: '#fff', color: '#1e293b', border: '1.5px solid #cbd5e1', borderRadius: '7px',
              fontSize: '11.5px', fontWeight: '700', cursor: selectedJobIds.length === 0 ? 'not-allowed' : 'pointer',
              opacity: selectedJobIds.length === 0 ? 0.5 : 1, transition: 'all 0.15s'
            }}
          >
            <Pause size={12} style={{ color: '#eab308' }} /> Pause
          </button>
        </div>

        <button
          onClick={handleRefresh}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px',
            background: 'white', border: '1.5px solid #cbd5e1', borderRadius: '7px', color: '#64748b', cursor: 'pointer'
          }}
          title="Refresh table"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Quick Filter Pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        {[
          { id: 'all', label: 'All Jobs' },
          { id: 'bulk', label: 'Bulk' },
          { id: 'adhoc', label: 'Ad-hoc' },
          { id: 'exception', label: 'Exception' },
          { id: 'running', label: 'Running' },
          { id: 'completed', label: 'Completed' },
          { id: 'failed', label: 'Failed' }
        ].map(pill => {
          const count = getPillCount(pill.id);
          const isActive = activeFilterPill === pill.id;
          return (
            <button
              key={pill.id}
              onClick={() => {
                setActiveFilterPill(pill.id);
                setSelectedJobIds([]);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
                borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
                background: isActive ? '#eff6ff' : '#f8fafc',
                color: isActive ? '#2563eb' : '#64748b',
                border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                transition: 'all 0.15s'
              }}
            >
              {pill.label}
              <span style={{
                background: isActive ? '#2563eb' : '#cbd5e1',
                color: '#fff', fontSize: '9px', padding: '1px 5px', borderRadius: '10px'
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Jobs Data Table */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '10px 14px', width: '30px' }}>
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll} 
                  checked={filteredJobs.length > 0 && selectedJobIds.length === filteredJobs.length}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '10px 14px', fontWeight: '700', color: '#475569' }}>Job Name</th>
              <th style={{ padding: '10px 14px', fontWeight: '700', color: '#475569' }}>Job Type</th>
              <th style={{ padding: '10px 14px', fontWeight: '700', color: '#475569' }}>Source System</th>
              <th style={{ padding: '10px 14px', fontWeight: '700', color: '#475569' }}>Date Range</th>
              <th style={{ padding: '10px 14px', fontWeight: '700', color: '#475569' }}>Filter Criteria</th>
              <th style={{ padding: '10px 14px', fontWeight: '700', color: '#475569', textAlign: 'right' }}>Records</th>
              <th style={{ padding: '10px 14px', fontWeight: '700', color: '#475569' }}>Status</th>
              <th style={{ padding: '10px 14px', fontWeight: '700', color: '#475569' }}>Created By</th>
              <th style={{ padding: '10px 14px', fontWeight: '700', color: '#475569' }}>Created Date</th>
              <th style={{ padding: '10px 14px', fontWeight: '700', color: '#475569', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  No jobs found matching the selected filters.
                </td>
              </tr>
            ) : (
              filteredJobs.map((job) => (
                <tr 
                  key={job.id} 
                  style={{ 
                    borderBottom: '1px solid #f1f5f9', 
                    background: selectedJobIds.includes(job.id) ? '#eff6ff' : 'transparent',
                    transition: 'background 0.15s' 
                  }}
                >
                  <td style={{ padding: '10px 14px' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedJobIds.includes(job.id)}
                      onChange={() => handleSelectJob(job.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 'bold', color: '#0f172a' }}>{job.name}</td>
                  <td style={{ padding: '10px 14px' }}>{job.type}</td>
                  <td style={{ padding: '10px 14px' }}>{job.source}</td>
                  <td style={{ padding: '10px 14px' }}>{job.dateRange}</td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{job.filterCriteria}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
                    {job.records.toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 14px' }}>{renderStatusBadge(job.status)}</td>
                  <td style={{ padding: '10px 14px', color: '#475569' }}>{job.createdBy}</td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{job.createdDate}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        setSelectedJobForLogs(job);
                        setIsLogViewerOpen(true);
                      }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px',
                        background: '#0f172a', color: 'white', border: 'none', borderRadius: '5px',
                        fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.15s'
                      }}
                    >
                      <Terminal size={11} /> Logs
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals Integration */}
      <CreateJobModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreateJob={handleCreateJob}
      />

      <JobLogViewerModal
        job={selectedJobForLogs}
        isOpen={isLogViewerOpen}
        onClose={() => {
          setIsLogViewerOpen(false);
          setSelectedJobForLogs(null);
        }}
        onUpdateJobStatus={handleSingleJobStatusUpdate}
      />

    </div>
  );
}
