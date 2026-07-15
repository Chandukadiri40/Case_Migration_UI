import React, { useState, useEffect } from 'react';
import { apiGetTenantConfig, apiSaveTenantConfig, apiGetDbMetadata } from '../utils/api';
import { Plus, Trash2, Save, Database, Server, RefreshCw } from 'lucide-react';

export default function Configuration() {
  const [config, setConfig] = useState({ applications: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dbMetadata, setDbMetadata] = useState({}); // Cache for schema -> {table: [columns]}
  const [explorerState, setExplorerState] = useState({ hiddenTables: {}, selectedTable: {} });
  const [activeTabs, setActiveTabs] = useState({}); // { appIndex: 'config' | 'mapping' }

  const hideExplorerTable = (appIndex, tableName) => {
    setExplorerState(prev => {
      const hidden = prev.hiddenTables[appIndex] || [];
      if (!hidden.includes(tableName)) {
        return { ...prev, hiddenTables: { ...prev.hiddenTables, [appIndex]: [...hidden, tableName] } };
      }
      return prev;
    });
  };

  const selectExplorerTable = (appIndex, tableName) => {
    setExplorerState(prev => ({
      ...prev,
      selectedTable: { ...prev.selectedTable, [appIndex]: tableName }
    }));
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await apiGetTenantConfig();
      setConfig(res || { applications: [] });
    } catch (err) {
      setError(err.message || 'Failed to load configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await apiSaveTenantConfig(config);
      setSuccess('Configuration saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleAddApp = () => {
    const newApp = {
      appId: '',
      appName: '',
      objectStore: '',
      schema: '',
      classifiedTables: {
        source: [],
        staging: [],
        target: [],
        product: []
      },
      primaryColumns: {
        source: "object_id",
        staging: "stg_object_id",
        target: "p8_doc_id"
      },
      systemColumns: {
        status: "migration_status",
        date: "create_date",
        "content-size": "content_size",
        "mime-type": "mime_type"
      },
      propertyMappings: []
    };
    setConfig({ ...config, applications: [...config.applications, newApp] });
  };

  const handleRemoveApp = (index) => {
    const newApps = [...config.applications];
    newApps.splice(index, 1);
    setConfig({ ...config, applications: newApps });
  };

  const updateAppField = (appIndex, field, value) => {
    const newApps = [...config.applications];
    newApps[appIndex][field] = value;
    setConfig({ ...config, applications: newApps });
  };

  const updateTableField = (appIndex, tableType, field, value) => {
    const newApps = [...config.applications];
    newApps[appIndex].tables[tableType][field] = value;
    setConfig({ ...config, applications: newApps });
  };

  const updateColumnField = (appIndex, tableType, columnKey, value) => {
    const newApps = [...config.applications];
    newApps[appIndex].tables[tableType].columns[columnKey] = value;
    setConfig({ ...config, applications: newApps });
  };
  const updateSystemColumn = (appIndex, columnKey, value) => {
    const newApps = [...config.applications];
    if (!newApps[appIndex].systemColumns) {
      newApps[appIndex].systemColumns = {};
    }
    newApps[appIndex].systemColumns[columnKey] = value;
    setConfig({ ...config, applications: newApps });
  };

  const updateTableClassification = (appIndex, tableName, newRole) => {
    const newApps = [...config.applications];
    if (!newApps[appIndex].classifiedTables) {
      newApps[appIndex].classifiedTables = { source: [], staging: [], target: [], product: [] };
    }
    const ct = newApps[appIndex].classifiedTables;
    
    // Remove from any existing role
    Object.keys(ct).forEach(role => {
      ct[role] = ct[role].filter(t => t !== tableName);
    });

    // Add to new role if not unassigned
    if (newRole && newRole !== 'unassigned' && ct[newRole]) {
      if (['source', 'staging', 'target'].includes(newRole)) {
        ct[newRole] = [tableName]; // Enforce max 1 table
      } else {
        ct[newRole].push(tableName);
      }
    }
    
    setConfig({ ...config, applications: newApps });
  };

  const addPropertyMapping = (appIndex) => {
    const newApps = [...config.applications];
    if (!newApps[appIndex].propertyMappings) newApps[appIndex].propertyMappings = [];
    newApps[appIndex].propertyMappings.push({
      sourceTable: '', sourceColumn: '', targetTable: '', targetColumn: ''
    });
    setConfig({ ...config, applications: newApps });
  };

  const updatePropertyMapping = (appIndex, mappingIndex, field, value) => {
    const newApps = [...config.applications];
    newApps[appIndex].propertyMappings[mappingIndex][field] = value;
    setConfig({ ...config, applications: newApps });
  };

  const removePropertyMapping = (appIndex, mappingIndex) => {
    const newApps = [...config.applications];
    newApps[appIndex].propertyMappings.splice(mappingIndex, 1);
    setConfig({ ...config, applications: newApps });
  };

  const fetchMetadataForSchema = async (schema) => {
    if (!schema || dbMetadata[schema]) return; // Already cached
    try {
      const res = await apiGetDbMetadata(schema);
      setDbMetadata(prev => ({ ...prev, [schema]: res || {} }));
    } catch (err) {
      console.warn('Failed to fetch metadata for schema:', schema);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', color: '#4f46e5' }}>Loading configuration...</div>;
  }

  return (
    <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={24} color="#4f46e5" /> System Configuration
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
            Map applications, object stores, and schemas dynamically.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchConfig}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#475569' }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <Save size={16} /> {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {error && <div style={{ padding: '10px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', marginBottom: '16px' }}>{error}</div>}
      {success && <div style={{ padding: '10px', background: '#ecfdf5', color: '#10b981', border: '1px solid #a7f3d0', borderRadius: '6px', marginBottom: '16px' }}>{success}</div>}

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
        {config.applications.map((app, appIdx) => (
          <div key={appIdx} style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#334155' }}>Application Configuration {appIdx + 1}</h3>
              <button onClick={() => handleRemoveApp(appIdx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Trash2 size={16} /> Remove App
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>App ID (Short Code)</label>
                <input type="text" value={app.appId} onChange={e => updateAppField(appIdx, 'appId', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} placeholder="e.g. ccol" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>Application Name</label>
                <input type="text" value={app.appName} onChange={e => updateAppField(appIdx, 'appName', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} placeholder="e.g. Core App" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>Object Store</label>
                <input type="text" value={app.objectStore} onChange={e => updateAppField(appIdx, 'objectStore', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} placeholder="e.g. CCOL_OS" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>Database Schema</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input type="text" value={app.schema} onChange={e => updateAppField(appIdx, 'schema', e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchMetadataForSchema(app.schema)} style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} placeholder="e.g. public" />
                  <button onClick={() => fetchMetadataForSchema(app.schema)} style={{ padding: '8px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '12px' }} title="Fetch Schema Metadata">
                    <Database size={14} /> Discover
                  </button>
                </div>
              </div>
            </div>
            {/* TABS Navigation */}
            <div style={{ display: 'inline-flex', background: '#f8fafc', padding: '4px', borderRadius: '8px', marginBottom: '24px', gap: '4px' }}>
              <button
                onClick={() => setActiveTabs({ ...activeTabs, [appIdx]: 'config' })}
                style={{
                  background: (activeTabs[appIdx] !== 'mapping') ? 'white' : 'transparent',
                  border: 'none', 
                  padding: '8px 16px', 
                  cursor: 'pointer', 
                  fontSize: '14px', 
                  fontWeight: '600',
                  color: (activeTabs[appIdx] !== 'mapping') ? '#4338ca' : '#64748b',
                  borderRadius: '6px',
                  boxShadow: (activeTabs[appIdx] !== 'mapping') ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                Application Configuration
              </button>
              <button
                onClick={() => setActiveTabs({ ...activeTabs, [appIdx]: 'mapping' })}
                style={{
                  background: activeTabs[appIdx] === 'mapping' ? 'white' : 'transparent',
                  border: 'none', 
                  padding: '8px 16px', 
                  cursor: 'pointer', 
                  fontSize: '14px', 
                  fontWeight: '600',
                  color: activeTabs[appIdx] === 'mapping' ? '#4338ca' : '#64748b',
                  borderRadius: '6px',
                  boxShadow: activeTabs[appIdx] === 'mapping' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                Property Mapping
              </button>
            </div>

            <div style={{ display: activeTabs[appIdx] !== 'mapping' ? 'block' : 'none' }}>
              {/* Schema Explorer */}
            {dbMetadata[app.schema] && Object.keys(dbMetadata[app.schema]).length > 0 && (
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={16} color="#3b82f6" /> Schema Explorer
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', height: '300px' }}>
                  {/* Left: Table List */}
                  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflowY: 'auto' }}>
                    {Object.keys(dbMetadata[app.schema])
                      .filter(t => {
                        const ct = app.classifiedTables || { source: [], staging: [], target: [], product: [] };
                        return !(ct.source?.includes(t) || ct.staging?.includes(t) || ct.target?.includes(t) || ct.product?.includes(t));
                      })
                      .map(tName => (
                        <div 
                          key={tName} 
                          onClick={() => selectExplorerTable(appIdx, tName)}
                          style={{ 
                            padding: '10px 12px', 
                            borderBottom: '1px solid #f1f5f9', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            background: explorerState.selectedTable[appIdx] === tName ? '#eff6ff' : 'white',
                            color: explorerState.selectedTable[appIdx] === tName ? '#1d4ed8' : '#334155'
                          }}
                        >
                          <span style={{ fontSize: '13px', fontWeight: explorerState.selectedTable[appIdx] === tName ? 'bold' : 'normal', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tName}</span>
                          
                          {(() => {
                            const ct = app.classifiedTables || { source: [], staging: [], target: [], product: [] };
                            let currentRole = 'unassigned';
                            if (ct.source?.includes(tName)) currentRole = 'source';
                            else if (ct.staging?.includes(tName)) currentRole = 'staging';
                            else if (ct.target?.includes(tName)) currentRole = 'target';
                            else if (ct.product?.includes(tName)) currentRole = 'product';

                            return (
                              <select
                                value={currentRole}
                                onClick={e => e.stopPropagation()}
                                onChange={e => updateTableClassification(appIdx, tName, e.target.value)}
                                style={{ 
                                  fontSize: '11px', 
                                  padding: '2px 4px', 
                                  border: '1px solid #cbd5e1', 
                                  borderRadius: '4px', 
                                  background: currentRole !== 'unassigned' ? '#e0e7ff' : 'white',
                                  color: currentRole !== 'unassigned' ? '#3730a3' : '#64748b'
                                }}
                              >
                                <option value="unassigned">Unassigned</option>
                                <option value="source">Source</option>
                                <option value="staging">Staging</option>
                                <option value="target">Target</option>
                                <option value="product">Product</option>
                              </select>
                            );
                          })()}
                        </div>
                    ))}
                  </div>
                  {/* Right: Column Details */}
                  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflowY: 'auto', padding: '16px' }}>
                    {explorerState.selectedTable[appIdx] ? (
                      <div>
                        <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#334155' }}>
                          Columns in <strong>{explorerState.selectedTable[appIdx]}</strong>
                        </h5>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                          {(dbMetadata[app.schema][explorerState.selectedTable[appIdx]] || []).map(col => (
                            <div key={col} style={{ fontSize: '12px', padding: '6px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', color: '#475569' }}>
                              {col}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
                        Select a table from the left to view its columns.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* 4-Bucket Classification */}
            {dbMetadata[app.schema] && Object.keys(dbMetadata[app.schema]).length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                {['source', 'staging', 'target', 'product'].map(role => {
                  const tablesInRole = app.classifiedTables?.[role] || [];
                  return (
                    <div key={role} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px' }}>
                      <h5 style={{ margin: '0 0 10px 0', textTransform: 'capitalize', color: '#1e293b', fontSize: '13px' }}>{role} Table(s)</h5>
                      {tablesInRole.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {tablesInRole.map(t => (
                            <div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '6px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '4px', color: '#3b82f6', fontWeight: 'bold' }}>
                              <span>{t}</span>
                              <button onClick={() => updateTableClassification(appIdx, t, 'unassigned')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }} title="Unassign table">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>No {role} tables assigned.</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}


            </div> {/* End of Tab 1 */}

            {/* TAB 2: Property Mappings */}
            {activeTabs[appIdx] === 'mapping' && (
              <div style={{ background: '#fdf4ff', border: '1px solid #f5d0fe', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, color: '#86198f', fontSize: '15px' }}>Cross-Table Property Mappings</h4>
                  <button onClick={() => addPropertyMapping(appIdx)} style={{ background: '#d946ef', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>
                    + Add Mapping
                  </button>
                </div>
                
                {app.propertyMappings && app.propertyMappings.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {app.propertyMappings.map((mapping, mIdx) => {
                      const allTables = Object.keys(dbMetadata[app.schema] || {});
                      const availableSourceCols = mapping.sourceTable ? (dbMetadata[app.schema] || {})[mapping.sourceTable] || [] : [];
                      const availableTargetCols = mapping.targetTable ? (dbMetadata[app.schema] || {})[mapping.targetTable] || [] : [];

                      return (
                        <div key={mIdx} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #f0abfc' }}>
                          {/* LEFT SIDE (SOURCE) */}
                          <div style={{ flex: 1, padding: '12px', background: '#faf5ff', borderRadius: '6px', border: '1px dashed #e879f9' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#a21caf', marginBottom: '8px' }}>Side A</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <select value={mapping.sourceTable} onChange={e => updatePropertyMapping(appIdx, mIdx, 'sourceTable', e.target.value)} style={{ flex: 1, padding: '6px', fontSize: '12px', border: '1px solid #e879f9', borderRadius: '4px' }}>
                                <option value="">-- Select Table --</option>
                                {allTables.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <select value={mapping.sourceColumn} onChange={e => updatePropertyMapping(appIdx, mIdx, 'sourceColumn', e.target.value)} style={{ flex: 1, padding: '6px', fontSize: '12px', border: '1px solid #e879f9', borderRadius: '4px' }}>
                                <option value="">-- Select Column --</option>
                                {availableSourceCols.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          </div>

                          <div style={{ color: '#d946ef', fontWeight: 'bold', fontSize: '20px' }}>&rarr;</div>

                          {/* RIGHT SIDE (TARGET) */}
                          <div style={{ flex: 1, padding: '12px', background: '#faf5ff', borderRadius: '6px', border: '1px dashed #e879f9' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#a21caf', marginBottom: '8px' }}>Side B</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <select value={mapping.targetTable} onChange={e => updatePropertyMapping(appIdx, mIdx, 'targetTable', e.target.value)} style={{ flex: 1, padding: '6px', fontSize: '12px', border: '1px solid #e879f9', borderRadius: '4px' }}>
                                <option value="">-- Select Table --</option>
                                {allTables.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <select value={mapping.targetColumn} onChange={e => updatePropertyMapping(appIdx, mIdx, 'targetColumn', e.target.value)} style={{ flex: 1, padding: '6px', fontSize: '12px', border: '1px solid #e879f9', borderRadius: '4px' }}>
                                <option value="">-- Select Column --</option>
                                {availableTargetCols.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          </div>

                          <button onClick={() => removePropertyMapping(appIdx, mIdx)} style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', cursor: 'pointer', padding: '8px', borderRadius: '6px' }} title="Remove Mapping">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: '#a21caf', fontStyle: 'italic', textAlign: 'center', padding: '20px', background: 'white', borderRadius: '8px', border: '1px dashed #e879f9' }}>
                    No property mappings defined. Click '+ Add Mapping' to create a relationship between tables.
                  </div>
                )}
              </div>
            )}

          </div>
        ))}

        <button
          onClick={handleAddApp}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: 'white', border: '2px dashed #cbd5e1', color: '#4f46e5', borderRadius: '12px', cursor: 'pointer', width: '100%', justifyContent: 'center', fontWeight: 'bold' }}
        >
          <Plus size={20} /> Add Application Mapping
        </button>
      </div>
    </div>
  );
}
