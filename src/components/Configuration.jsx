import React, { useState, useEffect } from 'react';
import { apiGetTenantConfig, apiSaveTenantConfig, apiGetDbMetadata, apiGetDbConfig, apiSaveDbConfig, apiTestDbConnection } from '../utils/api';
import { Plus, Trash2, Save, Database, Server, RefreshCw, ArrowLeft, Edit2 } from 'lucide-react';

export default function Configuration() {
  const [config, setConfig] = useState({ applications: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [dbMetadata, setDbMetadata] = useState({}); // Cache for schema -> {table: [columns]}
  const [explorerState, setExplorerState] = useState({ selectedTable: {} });
  
  // Database Config State
  const [dbConfigWrapper, setDbConfigWrapper] = useState({ activeDatabaseType: 'postgres', databases: [] });
  const [selectedDbIndex, setSelectedDbIndex] = useState(null); // null means Master View, -1 means Add New, >=0 means Edit
  const [dbConfig, setDbConfig] = useState({ url: '', username: '', password: '', host: '', driver: 'org.postgresql.Driver', databaseType: 'postgres' });
  const [savingDb, setSavingDb] = useState(false);
  const [testingDb, setTestingDb] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  
  // New Navigation State
  const [mainTab, setMainTab] = useState('appConfig'); // 'appConfig' | 'propertyMapping' | 'dbConfig'
  const [selectedAppIndex, setSelectedAppIndex] = useState(null); // Used for drill-down in appConfig and selection in propertyMapping
  const [activeRole, setActiveRole] = useState('source'); // 'source' | 'staging' | 'target' | 'product'
  const [activeTableDetail, setActiveTableDetail] = useState(null); // Selected table inside the role detail view

  // Modal states
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAppIndex, setDeleteAppIndex] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  const [showDeleteDbModal, setShowDeleteDbModal] = useState(false);
  const [deleteDbIndex, setDeleteDbIndex] = useState(null);
  const [deleteDbConfirmText, setDeleteDbConfirmText] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await apiGetTenantConfig();
      setConfig(res || { applications: [] });
      
      try {
        const dbRes = await apiGetDbConfig();
        if (dbRes && dbRes.databases) setDbConfigWrapper(dbRes);
      } catch (e) { console.warn('Failed to fetch DB config'); }
      
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

  const handleTestDbConnection = async () => {
    try {
      setTestingDb(true);
      setError('');
      setSuccess('');
      const result = await apiTestDbConnection(dbConfig);
      if (result.success) {
        setTestSuccess(true);
        setSuccess(result.message || 'Connection successful!');
      } else {
        setTestSuccess(false);
        setError(result.message || 'Connection failed.');
      }
    } catch (err) {
      setTestSuccess(false);
      setError(err.message || 'Connection test failed');
    } finally {
      setTestingDb(false);
    }
  };

  const handleSaveDbConfig = async () => {
    try {
      setSavingDb(true);
      setError('');
      setSuccess('');
      
      const newDbs = [...(dbConfigWrapper.databases || [])];
      if (selectedDbIndex === -1) {
        newDbs.push(dbConfig);
      } else if (selectedDbIndex !== null) {
        newDbs[selectedDbIndex] = dbConfig;
      }
      
      const payload = { ...dbConfigWrapper, databases: newDbs };
      
      await apiSaveDbConfig(payload);
      setSuccess('Database configuration saved successfully!');
      setDbConfigWrapper(payload);
      setSelectedDbIndex(null); // Return to Master view
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save Database configuration');
    } finally {
      setSavingDb(false);
    }
  };

  const handleAddDb = () => {
    if (dbConfigWrapper.databases?.length >= 2) return; // Max 1 postgres and 1 mssql
    const hasPostgres = dbConfigWrapper.databases?.some(db => db.databaseType === 'postgres');
    const newType = hasPostgres ? 'mssql' : 'postgres';
    const newDriver = newType === 'postgres' ? 'org.postgresql.Driver' : 'com.microsoft.sqlserver.jdbc.SQLServerDriver';
    
    setDbConfig({ url: '', username: '', password: '', host: '', driver: newDriver, databaseType: newType });
    setTestSuccess(false);
    setSelectedDbIndex(-1);
  };

  const handleEditDb = (index) => {
    setDbConfig({ ...dbConfigWrapper.databases[index], password: '' }); // Don't pre-fill password for security
    setTestSuccess(false);
    setSelectedDbIndex(index);
  };

  const handleDeleteDb = async (index) => {
    const newDbs = [...(dbConfigWrapper.databases || [])];
    newDbs.splice(index, 1);
    const payload = { ...dbConfigWrapper, databases: newDbs };
    try {
      await apiSaveDbConfig(payload);
      setDbConfigWrapper(payload);
      setSuccess('Database configuration removed');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to remove Database configuration');
    }
  };

  const handleSetActiveDb = async (type) => {
    const payload = { ...dbConfigWrapper, activeDatabaseType: type };
    try {
      await apiSaveDbConfig(payload);
      setDbConfigWrapper(payload);
      setSuccess(`Active Database set to ${type}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update Active Database');
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
    setSelectedAppIndex(config.applications.length); // Open detail view immediately
  };

  const handleRemoveApp = (index, e) => {
    if (e) e.stopPropagation();
    const newApps = [...config.applications];
    newApps.splice(index, 1);
    setConfig({ ...config, applications: newApps });
    if (selectedAppIndex === index) {
      setSelectedAppIndex(null);
    } else if (selectedAppIndex > index) {
      setSelectedAppIndex(selectedAppIndex - 1);
    }
  };

  const updateAppField = (appIndex, field, value) => {
    const newApps = [...config.applications];
    newApps[appIndex][field] = value;
    setConfig({ ...config, applications: newApps });
  };

  const selectExplorerTable = (appIndex, tableName) => {
    setExplorerState(prev => ({
      ...prev,
      selectedTable: { ...prev.selectedTable, [appIndex]: tableName }
    }));
  };

  const findOldRole = (ct, tableName) => {
    return Object.keys(ct).find(role => ct[role].includes(tableName)) || null;
  };

  const removeTableFromAllRoles = (ct, tableName) => {
    Object.keys(ct).forEach(role => {
      ct[role] = ct[role].filter(t => t !== tableName);
    });
  };

  const assignNewRole = (ct, tableName, newRole, oldRole) => {
    if (newRole === 'unassigned' && ['source', 'staging', 'target'].includes(oldRole)) {
      ct.product = [];
    }
    if (newRole && newRole !== 'unassigned' && ct[newRole]) {
      if (['source', 'staging', 'target'].includes(newRole)) {
        ct[newRole] = [tableName]; 
      } else {
        ct[newRole].push(tableName);
      }
    }
  };

  const autoAssignProductTables = (ct, dbMetadata, schema) => {
    if (ct.source.length > 0 && ct.staging.length > 0 && ct.target.length > 0) {
      if (dbMetadata[schema]) {
        const allTables = Object.keys(dbMetadata[schema]);
        const unassigned = allTables.filter(t => !(ct.source.includes(t) || ct.staging.includes(t) || ct.target.includes(t) || ct.product.includes(t)));
        if (unassigned.length > 0) {
          ct.product = [...ct.product, ...unassigned];
        }
      }
    }
  };

  const updateTableClassification = (appIndex, tableName, newRole) => {
    const newApps = [...config.applications];
    if (!newApps[appIndex].classifiedTables) {
      newApps[appIndex].classifiedTables = { source: [], staging: [], target: [], product: [] };
    }
    const ct = newApps[appIndex].classifiedTables;
    
    const oldRole = findOldRole(ct, tableName);
    removeTableFromAllRoles(ct, tableName);
    assignNewRole(ct, tableName, newRole, oldRole);
    autoAssignProductTables(ct, dbMetadata, newApps[appIndex].schema);
    
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

  const activeApp = selectedAppIndex !== null ? config.applications[selectedAppIndex] : null;

  return (
    <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* HEADER & TABS (styled like Deliverables workspace) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', padding: '0 4px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '15px', fontWeight: 'bold' }}>
            <Server size={18} color="#4f46e5" /> System Configuration
          </h2>
          
          <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px', alignSelf: 'flex-start' }}>
            <button
              onClick={() => { setMainTab('dbConfig'); setSelectedAppIndex(null); }}
              style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: mainTab === 'dbConfig' ? '#ffffff' : 'transparent', color: mainTab === 'dbConfig' ? '#4f46e5' : '#64748b', boxShadow: mainTab === 'dbConfig' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              Database Configuration
            </button>
            <button
              onClick={() => { setMainTab('appConfig'); setSelectedAppIndex(null); }}
              style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: mainTab === 'appConfig' ? '#ffffff' : 'transparent', color: mainTab === 'appConfig' ? '#4f46e5' : '#64748b', boxShadow: mainTab === 'appConfig' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              Application Configuration
            </button>
            <button
              onClick={() => { setMainTab('propertyMapping'); setSelectedAppIndex(null); }}
              style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: mainTab === 'propertyMapping' ? '#ffffff' : 'transparent', color: mainTab === 'propertyMapping' ? '#4f46e5' : '#64748b', boxShadow: mainTab === 'propertyMapping' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              Property Mapping
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {mainTab === 'dbConfig' && selectedDbIndex !== null && (
            <>
              <button
                onClick={handleTestDbConnection}
                disabled={testingDb}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 12px', background: 'white', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '6px', cursor: testingDb ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '11px' }}
              >
                <RefreshCw size={12} className={testingDb ? 'spin' : ''} /> {testingDb ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                onClick={handleSaveDbConfig}
                disabled={savingDb || !testSuccess}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 12px', background: (!testSuccess || savingDb) ? '#94a3b8' : '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: (!testSuccess || savingDb) ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '11px' }}
              >
                <Save size={12} /> {savingDb ? 'Saving...' : 'Save DB Config'}
              </button>
            </>
          )}
          {mainTab === 'propertyMapping' && (
            <>
              <button
                onClick={fetchConfig}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 12px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#475569', fontSize: '11px', fontWeight: 'bold' }}
              >
                <RefreshCw size={12} /> Refresh
              </button>
              <button
                onClick={() => setShowSaveModal(true)}
                disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 12px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}
              >
                <Save size={12} /> {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div style={{ padding: '10px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', marginBottom: '16px' }}>{error}</div>}
      {success && <div style={{ padding: '10px', background: '#ecfdf5', color: '#10b981', border: '1px solid #a7f3d0', borderRadius: '6px', marginBottom: '16px' }}>{success}</div>}

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
        
        {/* ==================================================== */}
        {/* TAB 0: DATABASE CONFIGURATION (Master-Detail)        */}
        {/* ==================================================== */}
        {mainTab === 'dbConfig' && (
          <>
            {/* MASTER VIEW (GRID) */}
            {selectedDbIndex === null ? (
              <div style={{ display: 'inline-block', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', overflow: 'hidden', minWidth: '600px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Activate/Deactivate</th>
                      <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Database Type</th>
                      <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Host</th>
                      <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Username</th>
                      <th style={{ padding: '6px 12px', textAlign: 'right', width: '140px' }}>
                        <button
                          onClick={handleAddDb}
                          disabled={dbConfigWrapper.databases?.length >= 2}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'white', border: '1px dashed #cbd5e1', color: dbConfigWrapper.databases?.length >= 2 ? '#94a3b8' : '#4f46e5', borderRadius: '6px', cursor: dbConfigWrapper.databases?.length >= 2 ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '11px' }}
                        >
                          <Plus size={12} /> Add DB
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {!dbConfigWrapper.databases || dbConfigWrapper.databases.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                          No database configurations added yet. Click "Add DB" to get started.
                        </td>
                      </tr>
                    ) : (
                      dbConfigWrapper.databases.map((db, index) => (
                        <tr key={db.databaseType || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', width: '120px', textAlign: 'center' }}>
                            {(() => {
                              const isActive = dbConfigWrapper.activeDatabaseType === db.databaseType;
                              const onlyOne = dbConfigWrapper.databases.length === 1;
                              return (
                                <div 
                                  onClick={() => {
                                    if (onlyOne) return;
                                    if (!isActive) {
                                      handleSetActiveDb(db.databaseType);
                                    } else {
                                      // If turning off the active one, activate the other one
                                      const otherDb = dbConfigWrapper.databases.find(d => d.databaseType !== db.databaseType);
                                      if (otherDb) handleSetActiveDb(otherDb.databaseType);
                                    }
                                  }}
                                  style={{
                                    width: '36px',
                                    height: '20px',
                                    borderRadius: '10px',
                                    background: isActive ? '#10b981' : '#cbd5e1',
                                    position: 'relative',
                                    cursor: onlyOne ? 'not-allowed' : 'pointer',
                                    opacity: onlyOne ? 0.6 : 1,
                                    transition: 'background 0.2s',
                                    margin: '0 auto'
                                  }}
                                  title={onlyOne ? "Cannot deactivate when only one database is configured" : (isActive ? "Deactivate and switch to the other database" : "Activate this database")}
                                >
                                  <div style={{
                                    width: '16px',
                                    height: '16px',
                                    background: 'white',
                                    borderRadius: '50%',
                                    position: 'absolute',
                                    top: '2px',
                                    left: isActive ? '18px' : '2px',
                                    transition: 'left 0.2s'
                                  }} />
                                </div>
                              );
                            })()}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '500', color: '#334155' }}>
                            {db.databaseType === 'postgres' ? 'PostgreSQL' : 'SQL Server'}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '13px', color: '#64748b' }}>{db.host}</td>
                          <td style={{ padding: '10px 12px', fontSize: '13px', color: '#64748b' }}>{db.username}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <button
                              onClick={() => handleEditDb(index)}
                              style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', color: '#4f46e5', marginRight: '4px' }}
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteDbIndex(index);
                                setDeleteDbConfirmText('');
                                setShowDeleteDbModal(true);
                              }}
                              style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', color: '#ef4444' }}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* DETAIL VIEW (EDIT/ADD FORM) */
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', maxWidth: '600px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <button
                    onClick={() => { setSelectedDbIndex(null); setTestSuccess(false); }}
                    style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <h3 style={{ margin: 0, color: '#1e293b' }}>
                    {selectedDbIndex === -1 ? 'Add New Database' : 'Edit Database Configuration'}
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Database Type</label>
                    <select value={dbConfig.databaseType || 'postgres'} onChange={e => { setDbConfig({...dbConfig, databaseType: e.target.value, driver: e.target.value === 'postgres' ? 'org.postgresql.Driver' : 'com.microsoft.sqlserver.jdbc.SQLServerDriver'}); setTestSuccess(false); }} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', background: 'white' }} disabled={selectedDbIndex !== -1}>
                      <option value="postgres" disabled={selectedDbIndex === -1 && dbConfigWrapper.databases?.some(db => db.databaseType === 'postgres')}>PostgreSQL</option>
                      <option value="mssql" disabled={selectedDbIndex === -1 && dbConfigWrapper.databases?.some(db => db.databaseType === 'mssql')}>SQL Server</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>JDBC URL</label>
                    <input type="text" value={dbConfig.url || ''} onChange={e => { setDbConfig({...dbConfig, url: e.target.value}); setTestSuccess(false); }} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} placeholder={dbConfig.databaseType === 'postgres' ? 'jdbc:postgresql://localhost:5432/db' : 'jdbc:sqlserver://localhost:1433;databaseName=db'} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Host</label>
                    <input type="text" value={dbConfig.host || ''} onChange={e => { setDbConfig({...dbConfig, host: e.target.value}); setTestSuccess(false); }} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} placeholder="localhost" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Username</label>
                    <input type="text" value={dbConfig.username || ''} onChange={e => { setDbConfig({...dbConfig, username: e.target.value}); setTestSuccess(false); }} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} placeholder="postgres" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Password</label>
                    <input type="password" value={dbConfig.password || ''} onChange={e => { setDbConfig({...dbConfig, password: e.target.value}); setTestSuccess(false); }} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} placeholder={selectedDbIndex === -1 ? 'Enter database password' : 'Enter new password or leave blank to keep current'} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Driver Class Name</label>
                    <input type="text" value={dbConfig.driver || ''} onChange={e => { setDbConfig({...dbConfig, driver: e.target.value}); setTestSuccess(false); }} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} placeholder="org.postgresql.Driver" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ==================================================== */}
        {/* TAB 1: APPLICATION CONFIGURATION (Master-Detail)       */}
        {/* ==================================================== */}
        {mainTab === 'appConfig' && (
          <>
            {/* MASTER VIEW (GRID) */}
            {selectedAppIndex === null || !activeApp ? (
              <div style={{ display: 'inline-block', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', overflow: 'hidden', minWidth: '600px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '600', color: '#64748b' }}>App ID</th>
                      <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Application Name</th>
                      <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Object Store</th>
                      <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Database Schema</th>
                      <th style={{ padding: '6px 12px', textAlign: 'right', width: '140px' }}>
                        <button
                          onClick={handleAddApp}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'white', border: '1px dashed #cbd5e1', color: '#4f46e5', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}
                        >
                          <Plus size={12} /> Add Application
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.applications.map((app, appIdx) => (
                      <tr 
                        key={app.appId || `app-${appIdx}`} 
                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                        onClick={() => { setSelectedAppIndex(appIdx); fetchMetadataForSchema(app.schema); }}
                        title="Click to configure"
                      >
                        <td style={{ padding: '10px 12px', fontSize: '12px', color: '#334155', fontWeight: '500' }}>{app.appId || '-'}</td>
                        <td style={{ padding: '10px 12px', fontSize: '12px', color: '#334155' }}>{app.appName || '-'}</td>
                        <td style={{ padding: '10px 12px', fontSize: '12px', color: '#334155' }}>{app.objectStore || '-'}</td>
                        <td style={{ padding: '10px 12px', fontSize: '12px', color: '#334155' }}>{app.schema || '-'}</td>
                        <td style={{ padding: '10px 12px' }}></td>
                      </tr>
                    ))}
                    {config.applications.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>
                          No applications configured yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* DETAIL VIEW (SCHEMA EXPLORER) */
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100%', background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button 
                      onClick={() => {
                        const active = config.applications[selectedAppIndex];
                        if (!active.appId && !active.appName && !active.objectStore && !active.schema) {
                          const newApps = [...config.applications];
                          newApps.splice(selectedAppIndex, 1);
                          setConfig({ ...config, applications: newApps });
                        }
                        setSelectedAppIndex(null);
                      }}
                      style={{ background: '#f1f5f9', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontWeight: 'bold', fontSize: '12px' }}
                    >
                      <ArrowLeft size={14} /> Back to List
                    </button>
                    <h3 style={{ margin: 0, fontSize: '12px', color: '#4f46e5' }}>
                      {activeApp.appName || 'New Application'}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={fetchConfig}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#475569', fontSize: '11px', fontWeight: 'bold' }}
                    >
                      <RefreshCw size={12} /> Refresh
                    </button>
                    <button
                      onClick={() => setShowSaveModal(true)}
                      disabled={saving}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}
                    >
                      <Save size={12} /> {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                    <button 
                      onClick={() => {
                        setDeleteAppIndex(selectedAppIndex);
                        setDeleteConfirmText('');
                        setShowDeleteModal(true);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginLeft: '8px' }}
                      title="Remove Application"
                    >
                      <Trash2 size={14} /> Delete App
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>App ID (Short Code)</label>
                    <input type="text" value={activeApp.appId} onChange={e => updateAppField(selectedAppIndex, 'appId', e.target.value)} style={{ width: '100%', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }} placeholder="Enter App ID" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Application Name</label>
                    <input type="text" value={activeApp.appName} onChange={e => updateAppField(selectedAppIndex, 'appName', e.target.value)} style={{ width: '100%', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }} placeholder="Enter Application Name" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Object Store</label>
                    <input type="text" value={activeApp.objectStore} onChange={e => updateAppField(selectedAppIndex, 'objectStore', e.target.value)} style={{ width: '100%', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }} placeholder="Enter Object Store" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Database Schema</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input 
                        type="text" 
                        value={activeApp.schema} 
                        onChange={e => updateAppField(selectedAppIndex, 'schema', e.target.value)} 
                        onKeyDown={e => {
                          if (e.key === 'Enter' && activeApp.appId && activeApp.appName && activeApp.objectStore && activeApp.schema) {
                            fetchMetadataForSchema(activeApp.schema);
                          }
                        }} 
                        style={{ flex: 1, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }} 
                        placeholder="Enter Database Schema" 
                      />
                      <button 
                        onClick={() => fetchMetadataForSchema(activeApp.schema)} 
                        disabled={!activeApp.appId || !activeApp.appName || !activeApp.objectStore || !activeApp.schema}
                        style={{ 
                          padding: '6px 10px', 
                          background: (!activeApp.appId || !activeApp.appName || !activeApp.objectStore || !activeApp.schema) ? '#94a3b8' : '#3b82f6', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '6px', 
                          cursor: (!activeApp.appId || !activeApp.appName || !activeApp.objectStore || !activeApp.schema) ? 'not-allowed' : 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          fontWeight: 'bold', 
                          fontSize: '11px' 
                        }} 
                        title={(!activeApp.appId || !activeApp.appName || !activeApp.objectStore || !activeApp.schema) ? "Please fill all fields first" : "Fetch Schema Metadata"}
                      >
                        <Database size={12} /> Discover
                      </button>
                    </div>
                  </div>
                </div>

                {dbMetadata[activeApp.schema] && Object.keys(dbMetadata[activeApp.schema]).length > 0 ? (
                  <>
                    {/* 4-Bucket Tabs (Horizontal) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                      {['source', 'staging', 'target', 'product'].map(role => {
                        const tablesInRole = activeApp.classifiedTables?.[role] || [];
                        const isActive = activeRole === role;
                        return (
                          <div 
                            key={role} 
                            onClick={() => { setActiveRole(role); setActiveTableDetail(null); }}
                            style={{ 
                              background: isActive ? '#eff6ff' : '#f8fafc', 
                              border: `1px solid ${isActive ? '#3b82f6' : '#cbd5e1'}`, 
                              borderRadius: '8px', 
                              padding: '12px',
                              cursor: 'pointer',
                              boxShadow: isActive ? '0 0 0 1px #3b82f6' : 'none',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <h5 style={{ margin: 0, textTransform: 'capitalize', color: isActive ? '#1d4ed8' : '#1e293b', fontSize: '13px' }}>{role} Table(s)</h5>
                            </div>
                            {tablesInRole.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
                                {tablesInRole.map(t => (
                                  <div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '6px', background: 'white', border: `1px solid ${isActive ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: '4px', color: '#3b82f6', fontWeight: 'bold' }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t}>{t}</span>
                                    <button onClick={(e) => { e.stopPropagation(); updateTableClassification(selectedAppIndex, t, 'unassigned'); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }} title="Unassign table">
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

                    {/* Active Role Detail View */}
                    {(() => {
                      const role = activeRole;
                      const tablesInRole = activeApp.classifiedTables?.[role] || [];
                      const isCore = ['source', 'staging', 'target'].includes(role);
                      const canAdd = role === 'product' || tablesInRole.length === 0;

                      const allTables = Object.keys(dbMetadata[activeApp.schema] || {});
                      const ct = activeApp.classifiedTables || { source: [], staging: [], target: [], product: [] };
                      const unassignedTables = allTables.filter(t => !(ct.source?.includes(t) || ct.staging?.includes(t) || ct.target?.includes(t) || ct.product?.includes(t)));

                      return (
                        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tablesInRole.length > 0 || canAdd ? '16px' : '0' }}>
                            <h4 style={{ margin: 0, textTransform: 'capitalize', color: '#1e293b', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {role === 'source' ? <Database size={18} color="#3b82f6" /> : null}
                              {role === 'staging' ? <Database size={18} color="#8b5cf6" /> : null}
                              {role === 'target' ? <Database size={18} color="#10b981" /> : null}
                              {role === 'product' ? <Database size={18} color="#f59e0b" /> : null}
                              {role} Table Mapping
                            </h4>
                            {canAdd && unassignedTables.length > 0 && (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <select 
                                  id={`select-${role}`}
                                  style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', minWidth: '250px' }}
                                  defaultValue=""
                                >
                                  <option value="" disabled>Select unassigned table...</option>
                                  {unassignedTables.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <button 
                                  onClick={() => {
                                    const sel = document.getElementById(`select-${role}`);
                                    if (sel && sel.value) {
                                      updateTableClassification(selectedAppIndex, sel.value, role);
                                      sel.value = "";
                                    }
                                  }}
                                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#3b82f6', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                  <Plus size={14} /> Add
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {tablesInRole.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', height: '300px' }}>
                              {/* Left: List of Mapped Tables */}
                              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflowY: 'auto' }}>
                                {tablesInRole.map(t => (
                                  <div 
                                    key={t}
                                    onClick={() => setActiveTableDetail(t)}
                                    style={{ 
                                      padding: '10px 12px', 
                                      borderBottom: '1px solid #f1f5f9', 
                                      cursor: 'pointer', 
                                      display: 'flex', 
                                      justifyContent: 'space-between', 
                                      alignItems: 'center',
                                      background: activeTableDetail === t ? '#eff6ff' : 'white',
                                      color: activeTableDetail === t ? '#1d4ed8' : '#334155'
                                    }}
                                  >
                                    <span style={{ fontSize: '13px', fontWeight: activeTableDetail === t ? 'bold' : 'normal', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t}</span>
                                    <button 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        updateTableClassification(selectedAppIndex, t, 'unassigned');
                                        if (activeTableDetail === t) setActiveTableDetail(null);
                                      }} 
                                      style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#ef4444', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex' }} 
                                      title="Remove mapping"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              {/* Right: Columns of Selected Table */}
                              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflowY: 'auto', padding: '16px' }}>
                                {activeTableDetail && tablesInRole.includes(activeTableDetail) ? (() => {
                                  const tableColumns = dbMetadata[activeApp.schema][activeTableDetail] || [];
                                  return (
                                    <div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                                        <h5 style={{ margin: 0, fontSize: '14px', color: '#334155' }}>
                                          Columns in <strong>{activeTableDetail}</strong> <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 'normal' }}>({tableColumns.length} total)</span>
                                        </h5>
                                      </div>
                                      <div style={{ borderRadius: '6px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                          <thead>
                                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                              <th style={{ padding: '8px 12px', textAlign: 'center', width: '50px', color: '#475569', fontWeight: 'bold' }}>S.No</th>
                                              <th style={{ padding: '8px 12px', textAlign: 'left', color: '#475569', fontWeight: 'bold' }}>Column Name</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {tableColumns.map((col, idx) => (
                                              <tr key={col} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                                                <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                                                <td style={{ padding: '8px 12px', color: '#334155', fontWeight: '500' }}>{col}</td>
                                              </tr>
                                            ))}
                                            {tableColumns.length === 0 && (
                                              <tr>
                                                <td colSpan={2} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No columns found.</td>
                                              </tr>
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  );
                                })() : (
                                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                    Select a mapped table from the left to view its columns.
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div style={{ padding: '24px', textAlign: 'center', background: 'white', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#94a3b8', fontSize: '14px', fontStyle: 'italic' }}>
                              No table mapped for {role}. Select one from the dropdown to map.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <Database size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                    <h3 style={{ color: '#475569', margin: '0 0 6px 0', fontSize: '14px' }}>Schema Metadata Not Loaded</h3>
                    <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
                      Enter a valid Database Schema above and click Discover to explore tables.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ==================================================== */}
        {/* TAB 2: PROPERTY MAPPING                              */}
        {/* ==================================================== */}
        {mainTab === 'propertyMapping' && (
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#334155' }}>Select Application:</h3>
              <select 
                value={selectedAppIndex !== null ? selectedAppIndex : ''} 
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') setSelectedAppIndex(null);
                  else {
                    setSelectedAppIndex(Number(val));
                    fetchMetadataForSchema(config.applications[Number(val)].schema);
                  }
                }}
                style={{ padding: '10px 16px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '300px' }}
              >
                <option value="">-- Choose an App to Map --</option>
                {config.applications.map((app, idx) => (
                  <option key={app.appId || `opt-${idx}`} value={idx}>{app.appName || app.appId || `App ${idx + 1}`}</option>
                ))}
              </select>
            </div>

            {selectedAppIndex !== null && activeApp ? (
              <div style={{ background: '#fdf4ff', border: '1px solid #f5d0fe', borderRadius: '8px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', color: '#86198f', fontSize: '16px' }}>Cross-Table Property Mappings</h4>
                    <p style={{ margin: 0, color: '#a21caf', fontSize: '13px' }}>Define how columns map between tables for {activeApp.appName}</p>
                  </div>
                  <button onClick={() => addPropertyMapping(selectedAppIndex)} style={{ background: '#d946ef', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={16} /> Add Mapping
                  </button>
                </div>
                
                {activeApp.propertyMappings && activeApp.propertyMappings.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {activeApp.propertyMappings.map((mapping, mIdx) => {
                      const allTables = Object.keys(dbMetadata[activeApp.schema] || {});
                      const availableSourceCols = mapping.sourceTable ? (dbMetadata[activeApp.schema] || {})[mapping.sourceTable] || [] : [];
                      const availableTargetCols = mapping.targetTable ? (dbMetadata[activeApp.schema] || {})[mapping.targetTable] || [] : [];

                      return (
                        <div key={`mapping-${mIdx}`} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #f0abfc', boxShadow: '0 2px 4px rgba(232,121,249,0.1)' }}>
                          {/* LEFT SIDE (SOURCE) */}
                          <div style={{ flex: 1, padding: '16px', background: '#faf5ff', borderRadius: '8px', border: '1px dashed #e879f9' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#a21caf', marginBottom: '12px' }}>Side A</label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <select value={mapping.sourceTable} onChange={e => updatePropertyMapping(selectedAppIndex, mIdx, 'sourceTable', e.target.value)} style={{ flex: 1, padding: '10px', fontSize: '13px', border: '1px solid #e879f9', borderRadius: '6px' }}>
                                <option value="">-- Select Table --</option>
                                {allTables.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <select value={mapping.sourceColumn} onChange={e => updatePropertyMapping(selectedAppIndex, mIdx, 'sourceColumn', e.target.value)} style={{ flex: 1, padding: '10px', fontSize: '13px', border: '1px solid #e879f9', borderRadius: '6px' }}>
                                <option value="">-- Select Column --</option>
                                {availableSourceCols.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          </div>

                          <div style={{ color: '#d946ef', fontWeight: 'bold', fontSize: '24px' }}>&rarr;</div>

                          {/* RIGHT SIDE (TARGET) */}
                          <div style={{ flex: 1, padding: '16px', background: '#faf5ff', borderRadius: '8px', border: '1px dashed #e879f9' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#a21caf', marginBottom: '12px' }}>Side B</label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <select value={mapping.targetTable} onChange={e => updatePropertyMapping(selectedAppIndex, mIdx, 'targetTable', e.target.value)} style={{ flex: 1, padding: '10px', fontSize: '13px', border: '1px solid #e879f9', borderRadius: '6px' }}>
                                <option value="">-- Select Table --</option>
                                {allTables.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <select value={mapping.targetColumn} onChange={e => updatePropertyMapping(selectedAppIndex, mIdx, 'targetColumn', e.target.value)} style={{ flex: 1, padding: '10px', fontSize: '13px', border: '1px solid #e879f9', borderRadius: '6px' }}>
                                <option value="">-- Select Column --</option>
                                {availableTargetCols.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          </div>

                          <button onClick={() => removePropertyMapping(selectedAppIndex, mIdx)} style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', cursor: 'pointer', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center' }} title="Remove Mapping">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '14px', color: '#a21caf', fontStyle: 'italic', textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', border: '2px dashed #e879f9' }}>
                    <div style={{ marginBottom: '12px' }}>✨</div>
                    No property mappings defined. Click <strong>+ Add Mapping</strong> to create relationships between tables.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <Server size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                <h3>Select an Application</h3>
                <p>Please choose an application from the dropdown above to edit its property mappings.</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* SAVE CONFIGURATION MODAL */}
      {showSaveModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', width: '400px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>Confirm Save</h3>
            <p style={{ color: '#475569', marginBottom: '24px', fontSize: '14px' }}>Are you sure you want to save the configuration?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowSaveModal(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}>Cancel</button>
              <button onClick={() => { setShowSaveModal(false); handleSave(); }} style={{ padding: '8px 16px', background: '#4f46e5', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: 'white' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE APPLICATION MODAL */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', width: '400px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>Delete Application</h3>
            <p style={{ color: '#475569', marginBottom: '16px', fontSize: '14px' }}>
              This action cannot be undone. To confirm, type <strong>delete</strong> in the box below.
            </p>
            <input 
              type="text" 
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="Type 'delete' to confirm"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '24px', fontSize: '14px', outline: 'none' }}
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}>Cancel</button>
              <button 
                onClick={() => { 
                  setShowDeleteModal(false); 
                  handleRemoveApp(deleteAppIndex); 
                }} 
                disabled={deleteConfirmText !== 'delete'}
                style={{ padding: '8px 16px', background: deleteConfirmText !== 'delete' ? '#fca5a5' : '#ef4444', border: 'none', borderRadius: '6px', cursor: deleteConfirmText !== 'delete' ? 'not-allowed' : 'pointer', fontWeight: 'bold', color: 'white' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE DATABASE MODAL */}
      {showDeleteDbModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', width: '400px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>Delete Database</h3>
            <p style={{ color: '#475569', marginBottom: '16px', fontSize: '14px' }}>
              This action cannot be undone. To confirm, type <strong>delete</strong> in the box below.
            </p>
            <input 
              type="text" 
              value={deleteDbConfirmText}
              onChange={e => setDeleteDbConfirmText(e.target.value)}
              placeholder="Type 'delete' to confirm"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '24px', fontSize: '14px', outline: 'none' }}
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowDeleteDbModal(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}>Cancel</button>
              <button 
                onClick={() => { 
                  setShowDeleteDbModal(false); 
                  handleDeleteDb(deleteDbIndex); 
                }} 
                disabled={deleteDbConfirmText !== 'delete'}
                style={{ padding: '8px 16px', background: deleteDbConfirmText !== 'delete' ? '#fca5a5' : '#ef4444', border: 'none', borderRadius: '6px', cursor: deleteDbConfirmText !== 'delete' ? 'not-allowed' : 'pointer', fontWeight: 'bold', color: 'white' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
