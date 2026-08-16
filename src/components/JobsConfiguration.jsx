import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Play, Square, Pause, RotateCw, Terminal, CheckCircle2, 
  XCircle, Clock, AlertCircle, RefreshCw, Trash2, Send, Timer, Layers, Sliders, Calendar, ArrowRight
} from 'lucide-react';
import axios from 'axios';
import { JOB_CATEGORIES, INITIAL_JOBS } from '../config/jobsConfig';
import CreateJobModal from './CreateJobModal';
import JobLogViewerModal from './JobLogViewerModal';
import { useAlert } from '../context/AlertContext';

export default function JobsConfiguration() {
  const { showAlert } = useAlert();
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  
  // Top phase navigation tab: 'extraction', 'transformation', 'import' (default active), 'scheduling'
  const [activeTab, setActiveTab] = useState('import');
  
  // Active Filter Pill
  const [activeFilterPill, setActiveFilterPill] = useState('all');
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Track previous statuses to detect completion transitions for live toast notifications
  const prevJobsRef = useRef({});

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);
  const [selectedJobForLogs, setSelectedJobForLogs] = useState(null);

  // Fetch jobs from backend API
  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('/api/jobs');
      if (Array.isArray(res.data)) {
        const fetchedJobs = res.data;
        
        // Detect transitions (Running -> Completed / Failed)
        fetchedJobs.forEach(j => {
          const prev = prevJobsRef.current[j.id];
          if (prev && prev.status === 'Running' && j.status === 'Completed') {
            if (showAlert) {
              showAlert(`🎉 Job "${j.name}" completed successfully in ${j.duration || 'a few seconds'}!`, 'Job Completed', 'success');
            }
          } else if (prev && prev.status === 'Running' && j.status === 'Failed') {
            if (showAlert) {
              showAlert(`❌ Job "${j.name}" execution failed or stopped.`, 'Job Failed', 'error');
            }
          }
          prevJobsRef.current[j.id] = j;
        });

        setJobs(fetchedJobs);
      }
    } catch (err) {
      console.warn("Backend API unavailable, using local state.", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  // Filter jobs based on active top tab ('import', 'extraction', etc.)
  const tabJobs = jobs.filter(j => {
    if (activeTab === 'import') {
      // Import Jobs tab contains both import_doc and import_metadata (or category 'import')
      return j.category === 'import' || j.category === 'import_doc' || j.category === 'import_metadata';
    }
    return j.category === activeTab;
  });
  
  const getFilteredJobs = () => {
    switch (activeFilterPill) {
      case 'bulk': return tabJobs.filter(j => j.type === 'Bulk');
      case 'adhoc': return tabJobs.filter(j => j.type === 'Ad-hoc');
      case 'exception': return tabJobs.filter(j => j.type === 'Exception');
      case 'running': return tabJobs.filter(j => j.status === 'Running');
      case 'completed': return tabJobs.filter(j => j.status === 'Completed');
      case 'failed': return tabJobs.filter(j => j.status === 'Failed');
      case 'paused': return tabJobs.filter(j => j.status === 'Paused');
      default: return tabJobs;
    }
  };

  const filteredJobs = getFilteredJobs();

  // Dynamic filter pill counts based on current active tab
  const getPillCount = (pillId) => {
    switch (pillId) {
      case 'all': return tabJobs.length;
      case 'bulk': return tabJobs.filter(j => j.type === 'Bulk').length;
      case 'adhoc': return tabJobs.filter(j => j.type === 'Ad-hoc').length;
      case 'exception': return tabJobs.filter(j => j.type === 'Exception').length;
      case 'running': return tabJobs.filter(j => j.status === 'Running').length;
      case 'completed': return tabJobs.filter(j => j.status === 'Completed').length;
      case 'failed': return tabJobs.filter(j => j.status === 'Failed').length;
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
  const updateSelectedJobsStatus = async (newStatus) => {
    const targetIds = selectedJobIds.length > 0 
      ? selectedJobIds 
      : filteredJobs.map(j => j.id);

    if (targetIds.length === 0) return;
    
    setJobs(prevJobs => prevJobs.map(job => {
      if (targetIds.includes(job.id)) {
        return { ...job, status: newStatus };
      }
      return job;
    }));

    for (const id of targetIds) {
      try {
        if (newStatus === 'Running') {
          await axios.post(`/api/jobs/${id}/start`);
        } else if (newStatus === 'Failed') {
          await axios.post(`/api/jobs/${id}/stop`);
        } else if (newStatus === 'Paused') {
          await axios.post(`/api/jobs/${id}/pause`);
        }
      } catch (e) {
        console.error(`Failed to update job ID ${id} to ${newStatus}`, e);
      }
    }
    
    const statusLabel = newStatus === 'Running' ? 'Started' : newStatus === 'Failed' ? 'Stopped' : newStatus;
    if (showAlert) {
      showAlert(`Successfully ${statusLabel.toLowerCase()} ${targetIds.length} job(s).`, `Jobs ${statusLabel}`, 'info');
    }
    
    setSelectedJobIds([]);
    fetchJobs();
  };

  // Single job status updater
  const handleSingleJobStatusUpdate = (jobId, newStatus) => {
    setJobs(prevJobs => prevJobs.map(job => {
      if (job.id === jobId) {
        return { ...job, status: newStatus };
      }
      return job;
    }));
  };

  const handleCreateJob = async (newJob) => {
    try {
      const res = await axios.post('/api/jobs', newJob);
      setJobs(prev => [res.data, ...prev]);
    } catch (e) {
      const nextId = (Math.max(...jobs.map(j => Number(j.id) || 0)) + 1);
      setJobs([ { ...newJob, id: nextId }, ...jobs]);
    }
    
    if (showAlert) {
      showAlert(`New job "${newJob.name}" created successfully.`, 'Job Configured', 'info');
    }
  };

  const handleDeleteJob = async (jobId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this job configuration?")) return;
    try {
      await axios.delete(`/api/jobs/${jobId}`);
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch (err) {
      setJobs(prev => prev.filter(j => j.id !== jobId));
    }
  };

  const handleRefresh = () => {
    setSelectedJobIds([]);
    fetchJobs();
    if (showAlert) {
      showAlert('Dashboard and job configurations refreshed successfully!', 'Refreshed', 'info');
    }
  };

  // Styling helper for status badges
  const renderStatusBadge = (statusVal) => {
    let background = '#f3f4f6';
    let color = '#4b5563';
    let icon = <Clock size={11} />;

    switch (statusVal) {
      case 'Running':
      case 'In Progress':
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
      default:
        break;
    }

    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px',
        borderRadius: '20px', background, color, fontSize: '11px', fontWeight: '700'
      }}>
        {icon}
        {statusVal}
      </span>
    );
  };

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto' }}>
      
      {/* Top Breadcrumb & Page Title Header */}
      <div>
        <div style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '4px', fontWeight: '500' }}>
          TrueMigrate Center &nbsp;›&nbsp; <span style={{ color: '#0f172a', fontWeight: '600' }}>Jobs Configuration</span>
        </div>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
          Jobs Configuration
        </h2>
      </div>

      {/* TOP PHASE NAVIGATION TABS (Extraction Jobs | Transformation Jobs | Import Jobs | Scheduling) */}
      <div style={{ display: 'flex', gap: '28px', borderBottom: '1px solid #e2e8f0', paddingBottom: '0' }}>
        {[
          { id: 'extraction', label: 'Extraction Jobs' },
          { id: 'transformation', label: 'Transformation Jobs' },
          { id: 'import', label: 'Import Jobs' },
          { id: 'scheduling', label: 'Scheduling' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setActiveFilterPill('all');
                setSelectedJobIds([]);
              }}
              style={{
                padding: '10px 4px 12px 4px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                color: isActive ? '#2563eb' : '#64748b',
                fontWeight: isActive ? '800' : '600',
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* CONTENT AREA BASED ON ACTIVE TAB */}
      {activeTab === 'transformation' ? (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto' }}>
            <Sliders size={24} />
          </div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Transformation Jobs Pipeline</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            New transformation jobs pipeline will be added here in the next release.
          </p>
        </div>
      ) : activeTab === 'scheduling' ? (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto' }}>
            <Calendar size={24} />
          </div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Automated Job Schedules</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Configure recurring cron schedules and automated job triggers here.
          </p>
        </div>
      ) : (
        /* MAIN CONSOLE FOR IMPORT JOBS & EXTRACTION JOBS */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#fff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.02)' }}>
          
          {/* Action Toolbar Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              
              <button
                onClick={() => setIsCreateOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                  background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px',
                  fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 6px rgba(37,99,235,0.18)'
                }}
              >
                <Plus size={15} /> Create New Job
              </button>

              <button
                onClick={() => updateSelectedJobsStatus('Running')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                  background: '#fff', color: '#1e293b', border: '1.5px solid #cbd5e1', borderRadius: '8px',
                  fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                }}
              >
                <Play size={12} style={{ color: '#10b981', fill: '#10b981' }} /> Start
              </button>

              <button
                onClick={() => updateSelectedJobsStatus('Failed')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                  background: '#fff', color: '#1e293b', border: '1.5px solid #cbd5e1', borderRadius: '8px',
                  fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                }}
              >
                <Square size={12} style={{ color: '#ef4444', fill: '#ef4444' }} /> Stop
              </button>

              <button
                onClick={() => updateSelectedJobsStatus('Paused')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                  background: '#fff', color: '#1e293b', border: '1.5px solid #cbd5e1', borderRadius: '8px',
                  fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                }}
              >
                <Pause size={12} style={{ color: '#eab308', fill: '#eab308' }} /> Pause
              </button>
            </div>

            <button
              onClick={handleRefresh}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                background: 'white', border: 'none', borderRadius: '6px', color: '#64748b',
                fontSize: '12px', fontWeight: '600', cursor: 'pointer'
              }}
            >
              <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {/* Quick Status Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { id: 'all', label: 'All Jobs' },
              { id: 'bulk', label: 'Bulk Import' },
              { id: 'adhoc', label: 'Ad-hoc Import' },
              { id: 'exception', label: 'Exception Import' },
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
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px',
                    borderRadius: '20px', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer',
                    background: isActive ? '#eff6ff' : '#ffffff',
                    color: isActive ? '#2563eb' : '#64748b',
                    border: isActive ? '1.5px solid #2563eb' : '1.5px solid #e2e8f0',
                    transition: 'all 0.15s'
                  }}
                >
                  {pill.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Jobs Data Table (Matching User Screenshot Headers) */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 14px', width: '30px' }}>
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll} 
                      checked={filteredJobs.length > 0 && selectedJobIds.length === filteredJobs.length}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>JOB NAME</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>JOB TYPE</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>TARGET SYSTEM</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>DATE RANGE</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>RECORDS</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>STATUS</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>CREATED BY</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>CREATED DATE</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      No jobs configured for {activeTab === 'import' ? 'Import Jobs' : 'Extraction Jobs'} yet. Click "+ Create New Job" to configure one!
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
                      <td style={{ padding: '12px 14px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedJobIds.includes(job.id)}
                          onChange={() => handleSelectJob(job.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: '800', color: '#0f172a' }}>{job.name}</span>
                          {job.processPid && (
                            <span style={{
                              fontFamily: 'monospace', fontSize: '9.5px', color: '#2563eb',
                              background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1px 5px',
                              borderRadius: '4px', width: 'fit-content'
                            }}>
                              PID: {job.processPid}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '600', color: '#334155' }}>
                        {job.runTypeDisplay || (job.type === 'Ad-hoc' ? 'Standard Ingestion' : job.type === 'Exception' ? 'Failed Recovery' : job.type === 'Bulk' ? 'Pending Date Filter' : job.type)}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>{job.source || 'FileNet P8'}</td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>{job.dateRange}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
                        {(job.records || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {renderStatusBadge(job.status)}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>{job.createdBy}</td>
                      <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '11px' }}>{job.createdDate}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            onClick={() => {
                              setSelectedJobForLogs(job);
                              setIsLogViewerOpen(true);
                            }}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px',
                              background: '#0f172a', color: 'white', border: 'none', borderRadius: '5px',
                              fontSize: '10px', fontWeight: 'bold', cursor: 'pointer'
                            }}
                            title="View Terminal Logs"
                          >
                            <Terminal size={11} /> Logs
                          </button>
                          <button
                            onClick={(e) => handleDeleteJob(job.id, e)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 6px',
                              background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: '5px',
                              cursor: 'pointer'
                            }}
                            title="Delete Job"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* Modals Integration */}
      <CreateJobModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreateJob={handleCreateJob}
        initialCategory={activeTab}
        existingJobs={jobs}
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
