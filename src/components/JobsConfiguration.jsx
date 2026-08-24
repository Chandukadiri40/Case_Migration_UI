import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, Play, Square, Pause, RotateCw, Terminal, CheckCircle2, 
  XCircle, Clock, AlertCircle, RefreshCw, Trash2, Send, Timer, Layers, Sliders, Calendar, ArrowRight, Edit2
} from 'lucide-react';
import axios from 'axios';
import { JOB_CATEGORIES, INITIAL_JOBS } from '../config/jobsConfig';
import CreateJobModal from './CreateJobModal';
import { useAlert } from '../context/AlertContext';

export default function JobsConfiguration() {
  const { showAlert, showConfirm } = useAlert();
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  
  // Top phase navigation tab: 'extraction', 'transformation', 'import' (default active), 'scheduling'
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'import';
  const setActiveTab = (tab) => setSearchParams({ tab });
  
  // Active Filter Pill
  const [activeFilterPill, setActiveFilterPill] = useState('all');
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sorting State
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  // Resizable Column Widths State (Compact default base widths in pixels)
  const [colWidths, setColWidths] = useState({
    name: 1.6,
    type: 1.0,
    source: 1.0,
    status: 100,
    createdBy: 100,
    createdDate: 150,
    actions: 140
  });
  const [isResized, setIsResized] = useState(false);

  // Track previous statuses to detect completion transitions for live toast notifications
  const prevJobsRef = useRef({});

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [jobToEdit, setJobToEdit] = useState(null);

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
    const interval = setInterval(fetchJobs, 4000);
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
  
  const getJobDisplayType = (j) => {
    if (j.type === 'Bulk') return 'Legacy (Bulk)'; // Fallback for very old records
    return j.type || 'Standard';
  };

  const getFilteredJobs = () => {
    switch (activeFilterPill) {
      case 'adhoc': return tabJobs.filter(j => getJobDisplayType(j) === 'Standard');
      case 'bulk': return tabJobs.filter(j => getJobDisplayType(j) === 'Ad-hoc');
      case 'exception': return tabJobs.filter(j => getJobDisplayType(j) === 'Exception');
      case 'running': return tabJobs.filter(j => j.status === 'Running');
      case 'completed': return tabJobs.filter(j => j.status === 'Completed');
      case 'failed': return tabJobs.filter(j => j.status === 'Failed');
      case 'paused': return tabJobs.filter(j => j.status === 'Paused');
      default: return tabJobs;
    }
  };

  const filteredJobs = getFilteredJobs();

  // Sorting Handler & Memoized Sorted Jobs
  const handleSort = (key) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(null); setSortDir('asc'); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedJobs = useMemo(() => {
    if (!sortKey) return filteredJobs;
    return [...filteredJobs].sort((a, b) => {
      let valA = a[sortKey] ?? '';
      let valB = b[sortKey] ?? '';
      if (sortKey === 'records') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredJobs, sortKey, sortDir]);

  // Column Resizing Mouse Drag Handler
  const handleResizeMouseDown = (colKey, e) => {
    e.preventDefault();
    e.stopPropagation();

    let currentWidths = { ...colWidths };

    if (!isResized) {
      const headerGrid = e.currentTarget.closest('[style*="grid-template-columns"]');
      if (headerGrid) {
        const computedCols = window.getComputedStyle(headerGrid).gridTemplateColumns.split(' ');
        if (computedCols.length >= 10) {
          const parsedWidths = {
            name: parseFloat(computedCols[1]) || colWidths.name,
            type: parseFloat(computedCols[2]) || colWidths.type,
            source: parseFloat(computedCols[3]) || colWidths.source,
            status: parseFloat(computedCols[4]) || colWidths.status,
            createdBy: parseFloat(computedCols[5]) || colWidths.createdBy,
            createdDate: parseFloat(computedCols[6]) || colWidths.createdDate,
            actions: parseFloat(computedCols[7]) || colWidths.actions
          };
          currentWidths = parsedWidths;
          setColWidths(parsedWidths);
        }
      }
      setIsResized(true);
    }

    const startX = e.clientX;
    const startWidth = currentWidths[colKey];

    const onMouseMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(50, startWidth + delta);
      setColWidths(prev => ({
        ...prev,
        [colKey]: newWidth
      }));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Dynamic grid template: Proportional fluid distribution with minimum resize locks
  const gridTemplate = isResized 
    ? `36px ${colWidths.name}px ${colWidths.type}px ${colWidths.source}px ${colWidths.status}px ${colWidths.createdBy}px ${colWidths.createdDate}px ${colWidths.actions}px`
    : `36px minmax(120px, 2fr) minmax(100px, 1fr) minmax(120px, 1fr) ${colWidths.status}px ${colWidths.createdBy}px ${colWidths.createdDate}px ${colWidths.actions}px`;

  // Dynamic filter pill counts based on current active tab
  const getPillCount = (pillId) => {
    switch (pillId) {
      case 'all': return tabJobs.length;
      case 'bulk': return tabJobs.filter(j => getJobDisplayType(j) === 'Ad-hoc').length;
      case 'adhoc': return tabJobs.filter(j => getJobDisplayType(j) === 'Standard').length;
      case 'exception': return tabJobs.filter(j => getJobDisplayType(j) === 'Exception').length;
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

  // Helper to render interactive Sortable & Resizable Header Cell (Clean, without symbols)
  const renderHeaderCell = (label, colKey, align = 'left') => {
    const isSorted = sortKey === colKey;
    return (
      <div
        onClick={() => handleSort(colKey)}
        style={{
          padding: '0 8px 0 6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
          gap: '4px',
          cursor: 'pointer',
          userSelect: 'none',
          position: 'relative',
          height: '100%',
          color: isSorted ? '#0f172a' : '#64748b',
          fontWeight: isSorted ? '700' : '600',
          transition: 'color 0.15s'
        }}
        title={`Click to sort by ${label}`}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        {/* Resizer Handle */}
        <div
          onMouseDown={(e) => handleResizeMouseDown(colKey, e)}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            right: '-3px',
            top: '0px',
            bottom: '0px',
            width: '8px',
            cursor: 'col-resize',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Drag to resize column"
        >
          <div style={{ width: '1.5px', height: '14px', background: '#cbd5e1', borderRadius: '1px' }} />
        </div>
      </div>
    );
  };

  const handleCreateJob = async (newJob, isEdit = false, editId = null) => {
    // Optimistically update the UI immediately (no waiting for API)
    const tempId = Date.now();
    const optimisticJob = { ...newJob, id: isEdit ? editId : tempId };
    
    if (isEdit && editId) {
      setJobs(prev => prev.map(j => j.id === editId ? optimisticJob : j));
    } else {
      setJobs(prev => [optimisticJob, ...prev]);
    }
    
    if (showAlert) {
      showAlert(`Job "${newJob.name}" ${isEdit ? 'updated' : 'created'} successfully.`, 'Job Configured', 'info');
    }

    // Background: persist to backend and start if needed
    const payload = { ...newJob };
    try {
      let savedJob;
      if (isEdit && editId) {
        const res = await axios.put(`/api/jobs/${editId}`, payload);
        savedJob = res.data;
        setJobs(prev => prev.map(j => j.id === editId ? savedJob : j));
      } else {
        const res = await axios.post('/api/jobs', payload);
        savedJob = res.data;
        // Replace temp ID with real ID from DB
        setJobs(prev => prev.map(j => j.id === tempId ? savedJob : j));
      }

      // If auto-start, trigger execution
      if (savedJob && savedJob.status === 'Running' && savedJob.id) {
        try {
          await axios.post(`/api/jobs/${savedJob.id}/start`);
        } catch (e) {
          console.error('Failed to auto-start job:', e);
        }
      }
    } catch (e) {
      console.error('Failed to save job to backend:', e);
    }
  };

  const handleDeleteJob = async (jobId, e) => {
    e.stopPropagation();
    const isConfirmed = await showConfirm("Are you sure you want to delete this job configuration?", "Confirm Delete");
    if (!isConfirmed) return;
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
  const renderStatusBadge = (job) => {
    const statusVal = job.status;
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
      <span 
        title={statusVal === 'Failed' && job.failureReason ? `Failure Reason: ${job.failureReason}` : ''}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px',
          borderRadius: '20px', background, color, fontSize: '11px', fontWeight: '700',
          cursor: statusVal === 'Failed' && job.failureReason ? 'help' : 'default'
        }}>
        {icon}
        {statusVal}
      </span>
    );
  };

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflow: 'hidden' }}>
      
      {/* TOP PHASE NAVIGATION TABS (Extraction Jobs | Transformation Jobs | Import Jobs | Scheduling) */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '0', flexShrink: 0 }}>
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
                padding: '6px 4px 8px 4px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2.5px solid #2563eb' : '2.5px solid transparent',
                color: isActive ? '#2563eb' : '#64748b',
                fontWeight: isActive ? '600' : '500',
                fontSize: '13px',
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
      {activeTab === 'scheduling' ? (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '36px 24px', textAlign: 'center' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
            <Calendar size={22} />
          </div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '14.5px', fontWeight: '600', color: '#1e293b' }}>Automated Job Schedules</h3>
          <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
            Configure recurring cron schedules and automated job triggers here.
          </p>
        </div>
      ) : (
        /* MAIN CONSOLE FOR IMPORT JOBS & EXTRACTION JOBS */
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '12px', background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          
          {/* Action Toolbar Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              
              <button
                onClick={() => setIsCreateOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px',
                  background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px',
                  fontSize: '11.5px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 1px 3px rgba(37,99,235,0.15)'
                }}
              >
                <Plus size={13} /> Create New Job
              </button>

              <button
                onClick={() => updateSelectedJobsStatus('Running')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px',
                  background: '#fff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px',
                  fontSize: '11.5px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                <Play size={10} style={{ color: '#10b981', fill: '#10b981' }} /> Start
              </button>

              <button
                onClick={() => updateSelectedJobsStatus('Failed')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px',
                  background: '#fff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px',
                  fontSize: '11.5px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                <Square size={10} style={{ color: '#ef4444', fill: '#ef4444' }} /> Stop
              </button>

              <button
                onClick={() => updateSelectedJobsStatus('Paused')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px',
                  background: '#fff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px',
                  fontSize: '11.5px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                <Pause size={10} style={{ color: '#eab308', fill: '#eab308' }} /> Pause
              </button>
            </div>

            <button
              onClick={handleRefresh}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                background: 'white', border: 'none', borderRadius: '6px', color: '#64748b',
                fontSize: '12px', fontWeight: '500', cursor: 'pointer'
              }}
            >
              <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {/* Quick Status Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
            {[
              { id: 'all', label: 'All Jobs' },
              { id: 'adhoc', label: 'Standard' },
              { id: 'bulk', label: 'Ad-hoc' },
              { id: 'exception', label: 'Exception' },
              { id: 'running', label: 'Running' },
              { id: 'completed', label: 'Completed' },
              { id: 'failed', label: 'Failed' },
              { id: 'paused', label: 'Paused' }
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
                    display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 11px',
                    borderRadius: '16px', fontSize: '11.5px', fontWeight: isActive ? '600' : '500', cursor: 'pointer',
                    background: isActive ? '#eff6ff' : '#ffffff',
                    color: isActive ? '#2563eb' : '#64748b',
                    border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                    transition: 'all 0.15s'
                  }}
                >
                  {pill.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Jobs Data Table Card (Single Unified Scroll Container with Sticky Header) */}
          <div className="custom-table-scroll" style={{
            flex: 1,
            minHeight: 0,
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            overflow: 'auto',
            position: 'relative'
          }}>
            <div style={{
              minWidth: isResized ? 'max-content' : '100%',
              width: '100%'
            }}>
              
              {/* 1. Sticky Pinned Header Row */}
              <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 20,
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: gridTemplate,
                  alignItems: 'center',
                  padding: '10px 0',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll} 
                      checked={sortedJobs.length > 0 && selectedJobIds.length === sortedJobs.length}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                  {renderHeaderCell('JOB NAME', 'name', 'left')}
                  {renderHeaderCell('JOB TYPE', 'type', 'center')}
                  {renderHeaderCell('TARGET SYSTEM', 'source', 'center')}
                  {renderHeaderCell('STATUS', 'status', 'center')}
                  {renderHeaderCell('CREATED BY', 'createdBy', 'center')}
                  {renderHeaderCell('CREATED DATE', 'createdDate', 'center')}
                  <div style={{ padding: '0 6px', textAlign: 'center' }}>ACTIONS</div>
                </div>
              </div>

              {/* 2. Rows */}
              {sortedJobs.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
                  No jobs configured for {activeTab === 'import' ? 'Import Jobs' : 'Extraction Jobs'} yet. Click "+ Create New Job" to configure one!
                </div>
              ) : (
                sortedJobs.map((job) => {
                  // Format Criteria: Show raw date range or DocIDs. Hide 'N/A' defaults.
                  const rawDate = job.dateRange || '';
                  const displayCriteria = rawDate.startsWith('N/A') || rawDate === '-' || rawDate === '—' ? '—' : rawDate;

                  return (
                    <div 
                      key={job.id} 
                      style={{ 
                        display: 'grid',
                        gridTemplateColumns: gridTemplate,
                        alignItems: 'center',
                        padding: '10px 0',
                        borderBottom: '1px solid #f1f5f9', 
                        background: selectedJobIds.includes(job.id) ? '#eff6ff' : 'transparent',
                        transition: 'background 0.15s',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedJobIds.includes(job.id)}
                          onChange={() => handleSelectJob(job.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                      <div style={{ padding: '0 12px', minWidth: 0, overflow: 'hidden', textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                          <span style={{ fontWeight: '400', color: '#1e293b', fontSize: '12.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.name}</span>
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
                      </div>
                      <div style={{ padding: '0 6px', color: '#475569', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                        {getJobDisplayType(job)}
                      </div>
                      <div style={{ padding: '0 6px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>{job.source || 'FileNet P8'}</div>
                      <div style={{ padding: '0 6px', overflow: 'hidden', textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
                        {renderStatusBadge(job)}
                      </div>
                      <div style={{ padding: '0 6px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>{job.createdBy}</div>
                      <div style={{ padding: '0 6px', color: '#64748b', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
                        {job.createdAt ? new Date(job.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/,/, '') : ''}
                      </div>
                      <div style={{ padding: '0 6px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            onClick={() => {
                              setJobToEdit(job);
                              setIsCreateOpen(true);
                            }}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px',
                              background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '5px',
                              fontSize: '10.5px', fontWeight: '600', cursor: 'pointer'
                            }}
                            title="Edit Job Configuration"
                          >
                            <Edit2 size={11} /> Edit
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
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* Modals Integration */}
      <CreateJobModal 
        isOpen={isCreateOpen}
        initialCategory={activeTab}
        existingJobs={jobs}
        jobToEdit={jobToEdit}
        onClose={() => {
          setIsCreateOpen(false);
          setJobToEdit(null);
        }}
        onCreateJob={(newJob) => {
          handleCreateJob(newJob, !!jobToEdit, jobToEdit?.id);
          setIsCreateOpen(false);
          setJobToEdit(null);
        }}
      />


    </div>
  );
}
