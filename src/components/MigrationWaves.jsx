import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BASE, apiGetTenantConfig, apiGetMigrationProperties } from '../utils/api';
import { Layers, HardDrive, Box, Loader2, PlayCircle, BarChart3, AppWindow, Trash2, Edit2, AlertCircle, PlusCircle } from 'lucide-react';
import appMapping from '../config/appMapping.json';
import initialWavesConfig from '../config/wavesConfig.json';

export default function MigrationWaves() {
  const [waves, setWaves] = useState(() => {
    const saved = localStorage.getItem('migrationWaves_v2');
    return saved ? JSON.parse(saved) : initialWavesConfig;
  });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [migrationProps, setMigrationProps] = useState({ docsPerHour: 50000, hoursPerDay: 4 });

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingWaveId, setEditingWaveId] = useState(null);
  const [waveToDelete, setWaveToDelete] = useState(null);
  const [newWaveName, setNewWaveName] = useState('');
  
  const appOptions = Object.keys(appMapping);
  const [activeApp, setActiveApp] = useState(appOptions[0]);
  const [selectedClasses, setSelectedClasses] = useState({}); // { "App": ["class1", "class2"] }

  const handleClassToggle = (app, cls) => {
    const appClasses = selectedClasses[app] || [];
    if (appClasses.includes(cls)) {
      setSelectedClasses({
        ...selectedClasses,
        [app]: appClasses.filter(c => c !== cls)
      });
    } else {
      setSelectedClasses({
        ...selectedClasses,
        [app]: [...appClasses, cls]
      });
    }
  };

  const handleSelectAllForApp = (app, isSelectAll) => {
    if (isSelectAll) {
      setSelectedClasses({
        ...selectedClasses,
        [app]: [...appMapping[app]]
      });
    } else {
      const newSelections = { ...selectedClasses };
      delete newSelections[app];
      setSelectedClasses(newSelections);
    }
  };

  const handleSaveWave = () => {
    const appsWithSelections = Object.keys(selectedClasses).filter(app => selectedClasses[app].length > 0);
    if (!newWaveName || appsWithSelections.length === 0) return;
    
    let updatedWaves;
    if (editingWaveId) {
      updatedWaves = waves.map(w => w.id === editingWaveId ? {
        ...w,
        name: newWaveName,
        apps: appsWithSelections,
        selectedClasses: selectedClasses
      } : w);
    } else {
      const newWave = {
        id: `wave-${Date.now()}`,
        name: newWaveName,
        apps: appsWithSelections,
        selectedClasses: selectedClasses
      };
      updatedWaves = [...waves, newWave];
    }
    
    setWaves(updatedWaves);
    localStorage.setItem('migrationWaves_v2', JSON.stringify(updatedWaves));
    
    setNewWaveName('');
    setSelectedClasses({});
    setEditingWaveId(null);
    setShowForm(false);
  };

  const confirmDeleteWave = () => {
    if (!waveToDelete) return;
    const updatedWaves = waves.filter(w => w.id !== waveToDelete.id);
    setWaves(updatedWaves);
    localStorage.setItem('migrationWaves_v2', JSON.stringify(updatedWaves));
    setWaveToDelete(null);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [configRes, propsRes] = await Promise.all([
          apiGetTenantConfig(),
          apiGetMigrationProperties().catch(() => ({ docsPerHour: 50000, hoursPerDay: 4 }))
        ]);
        
        if (propsRes) {
          setMigrationProps(propsRes);
        }

        const appId = configRes?.applications?.[0]?.appId || 'default';
        // Fetch document count data
        const res = await axios.post(`${BASE}/discovery/doc-count`, { appId });
        setData(res.data);
      } catch (err) {
        console.error("Failed to load wave metrics", err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Compute metrics per wave
  const waveMetrics = waves.map(wave => {
    let totalDocs = 0;
    let totalSizeBytes = 0;
    let allAssociatedClasses = [];

    if (wave.selectedClasses) {
      Object.values(wave.selectedClasses).forEach(classes => {
        allAssociatedClasses = [...allAssociatedClasses, ...classes];
      });
    } else {
      wave.apps.forEach(app => {
        const classes = appMapping[app] || [];
        allAssociatedClasses = [...allAssociatedClasses, ...classes];
      });
    }

    allAssociatedClasses.forEach(cls => {
      const row = data.find(r => (r.class_name || r.CLASS_NAME) === cls);
      if (row) {
        totalDocs += Number(row.total_documents || row.TOTAL_DOCUMENTS || 0);
        totalSizeBytes += Number(row.total_size_bytes || row.TOTAL_SIZE_BYTES || 0);
      }
    });

    // Auto-calculate Duration based on properties
    const totalEstHours = Math.ceil(totalDocs / migrationProps.docsPerHour);
    const totalEstDays = Math.max(1, Math.ceil(totalEstHours / migrationProps.hoursPerDay));

    return {
      ...wave,
      totalDocs,
      totalSizeGb: totalSizeBytes / (1024 * 1024 * 1024),
      classesCount: allAssociatedClasses.length,
      totalEstHours,
      totalEstDays,
      allAssociatedClasses
    };
  });

  return (
    <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 2px rgba(16,24,40,.04)', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#111827' }}>Migration Waves</h2>
        </div>
        <button onClick={() => { setEditingWaveId(null); setNewWaveName(''); setSelectedClasses({}); setShowForm(true); }} style={{ padding: '6px 12px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <PlusCircle size={14} /> Add Wave
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#6B7280' }}>
          <Loader2 size={32} className="animate-spin" style={{ marginBottom: '16px', color: '#2563EB' }} />
          <span>Calculating wave metrics...</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {waveMetrics.map((wave, idx) => (
            <div key={wave.id} style={{ border: '1px solid #E3E7EE', borderRadius: '8px', padding: '12px 16px', background: '#FAFBFC' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#DBEAFE', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                    {idx + 1}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1E293B' }}>{wave.name}</h3>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><AppWindow size={14}/> {wave.apps.length} Departments</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Box size={14}/> {wave.classesCount} Classes</span>
                      
                      {wave.apps.length > 0 && <div style={{ borderLeft: '1px solid #CBD5E1', height: '14px', margin: '0 2px' }}></div>}
                      
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {wave.apps.map(app => (
                          <div key={app} style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', color: '#475569' }}>
                            {app}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ background: '#fff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #E2E8F0', minWidth: '110px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>
                      Documents
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>{wave.totalDocs.toLocaleString()}</div>
                  </div>
                  <div style={{ background: '#fff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #E2E8F0', minWidth: '110px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>
                      Storage
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>{wave.totalSizeGb.toFixed(1)} GB</div>
                  </div>
                  <div style={{ background: '#fff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #E2E8F0', minWidth: '110px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>
                      Est. Duration
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>{wave.totalDocs > 0 ? `${wave.totalEstDays} days` : '0 days'} <span style={{fontSize: '12px', color: '#64748B', fontWeight: '500'}}>({wave.totalDocs > 0 ? wave.totalEstHours : 0} hrs)</span></div>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingWaveId(wave.id);
                      setNewWaveName(wave.name);
                      setSelectedClasses(wave.selectedClasses || {});
                      setShowForm(true);
                    }} 
                    style={{ background: 'transparent', border: '1px solid transparent', color: '#2563EB', padding: '6px', cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '4px' }} 
                    title="Edit Wave"
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => setWaveToDelete(wave)} 
                    style={{ background: 'transparent', border: '1px solid transparent', color: '#EF4444', padding: '6px', cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                    title="Delete Wave"
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.borderColor = '#FCA5A5'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Wave Modal Form */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '0', width: '550px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ background: '#F8FAFC', padding: '20px 24px', borderBottom: '1px solid #E2E8F0' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1E293B' }}>{editingWaveId ? 'Edit Wave' : 'Create New Wave'}</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>Group departments into a logical migration wave.</p>
            </div>
            
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Wave Name <span style={{color: '#ef4444'}}>*</span></label>
                <input type="text" value={newWaveName} onChange={(e) => setNewWaveName(e.target.value)} placeholder="e.g. Wave 4 - HR Departments" style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
              </div>

              <div style={{ marginBottom: '24px', display: 'flex', gap: '16px' }}>
                {/* Left Side: Department List */}
                <div style={{ width: '180px', flexShrink: 0 }}>
                   <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Department</label>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                     {appOptions.map(app => (
                       <div key={app} onClick={() => setActiveApp(app)} style={{ padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: activeApp === app ? '600' : '500', background: activeApp === app ? '#EFF6FF' : 'transparent', color: activeApp === app ? '#2563EB' : '#475569', border: activeApp === app ? '1px solid #BFDBFE' : '1px solid transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {app}
                          {selectedClasses[app]?.length > 0 && <span style={{ background: '#2563EB', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px' }}>{selectedClasses[app].length}</span>}
                       </div>
                     ))}
                   </div>
                </div>

                {/* Right Side: Document Classes */}
                <div style={{ flex: 1 }}>
                   <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                     <span>Document Classes</span>
                     <span 
                        onClick={() => handleSelectAllForApp(activeApp, (selectedClasses[activeApp] || []).length !== appMapping[activeApp].length)}
                        style={{ fontSize: '12px', color: '#2563EB', cursor: 'pointer', fontWeight: '500' }}>
                        {(selectedClasses[activeApp] || []).length === appMapping[activeApp].length ? 'Deselect All' : 'Select All'}
                     </span>
                   </label>
                   <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '12px', maxHeight: '200px', overflowY: 'auto', background: '#FAFBFC', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                     {appMapping[activeApp].map(cls => (
                       <label key={cls} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', color: '#334155', padding: '4px 0' }}>
                         <input type="checkbox" checked={(selectedClasses[activeApp] || []).includes(cls)} onChange={() => handleClassToggle(activeApp, cls)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                         {cls}
                       </label>
                     ))}
                   </div>
                </div>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => { setShowForm(false); setEditingWaveId(null); }} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSaveWave} style={{ padding: '8px 16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                {editingWaveId ? 'Save Changes' : 'Create Wave'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {waveToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: '#FEE2E2', color: '#EF4444', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={24} />
              </div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>Delete Wave</h2>
            </div>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#4B5563', lineHeight: '1.5' }}>
              Are you sure you want to delete <strong>{waveToDelete.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setWaveToDelete(null)} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={confirmDeleteWave} style={{ padding: '8px 16px', background: '#EF4444', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: '#fff', cursor: 'pointer' }}>
                Delete Wave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
