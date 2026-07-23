import React, { useState, useEffect } from 'react';
import { apiGetTenantConfig, apiSaveTenantConfig, apiGetDbMetadata, apiGetDbConfig, apiSaveDbConfig, apiTestDbConnection, apiGetUISettings } from '../utils/api';
import { Plus, Trash2, Save, Database, Server, RefreshCw, ArrowLeft, Edit2 } from 'lucide-react';
const SystemColumnMappingSection = ({ config, setConfig, activeApp, selectedAppIndex, dbMetadata }) => {
  const ct = activeApp.classifiedTables || {};
  const systemColumnsByRole = [
    { role: 'source', key: 'doc-id', defaultName: 'object_id', placeholder: '-- select column --' },
    { role: 'source', key: 'date', defaultName: 'create_date', placeholder: '-- select column --' },
    { role: 'source', key: 'content-size', defaultName: 'content_size', placeholder: '-- select column --' },
    { role: 'source', key: 'mime-type', defaultName: 'mime_type', placeholder: '-- select column --' },
    { role: 'source', key: 'class-id-col', defaultName: 'object_class_id', placeholder: '-- select column --' },
    { role: 'source', key: 'status', defaultName: 'migration_status', placeholder: '-- select column --' },
    { role: 'classdef', key: 'symbolic-name-col', defaultName: 'symbolic_name', placeholder: '-- select column --' },
    { role: 'annotation', key: 'annotated-id-col', defaultName: 'annotated_id', placeholder: '-- select column --' },
    { role: 'content', key: 'content-doc-id-col', defaultName: 'doc_id', placeholder: '-- select column --' }
  ];

  // Filter out system columns for roles that haven't been assigned a table yet
  const rows = systemColumnsByRole.filter(col => ct[col.role] && ct[col.role].length > 0);

  if (rows.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', background: 'white', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
        <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Assign tables to Source, Class Definition, or Annotation roles above to map their system columns.</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead style={{ background: '#f8fafc' }}>
          <tr>
            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#475569', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', width: '30%' }}>Table Name</th>
            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#475569', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', width: '30%' }}>System Property</th>
            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#475569', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', width: '40%' }}>Mapped Column</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((col, index) => {
            const tableName = ct[col.role][0];
            const availableCols = dbMetadata[activeApp.schema]?.[tableName] || [];
            const sortedCols = [...availableCols].sort();
            const assignedVal = activeApp.systemColumns?.[col.key] || '';
            const isLast = index === rows.length - 1;
            
            return (
              <tr key={col.key} style={{ borderBottom: isLast ? 'none' : '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 12px', color: '#334155', fontWeight: '500' }}>
                  {tableName}
                </td>
                <td style={{ padding: '6px 12px', color: '#0f172a', fontFamily: 'monospace', fontSize: '12px' }}>
                  {col.defaultName}
                </td>
                <td style={{ padding: '6px 12px' }}>
                  <select 
                    value={assignedVal}
                    onChange={(e) => {
                      const newApps = [...config.applications];
                      if (!newApps[selectedAppIndex].systemColumns) newApps[selectedAppIndex].systemColumns = {};
                      newApps[selectedAppIndex].systemColumns[col.key] = e.target.value;
                      setConfig({ ...config, applications: newApps });
                    }}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none', background: assignedVal ? '#eff6ff' : 'white', color: assignedVal ? '#1d4ed8' : '#94a3b8', fontWeight: assignedVal ? '600' : 'normal', fontStyle: assignedVal ? 'normal' : 'italic', cursor: 'pointer' }}
                  >
                    <option value="" style={{ color: '#94a3b8', fontStyle: 'italic' }}>{col.placeholder}</option>
                    {sortedCols.map(c => <option key={c} value={c} style={{ color: '#334155', fontStyle: 'normal', fontWeight: '500' }}>{c}</option>)}
                    {assignedVal && !sortedCols.includes(assignedVal) && (
                      <option value={assignedVal} style={{ color: '#334155', fontStyle: 'normal', fontWeight: '500' }}>{assignedVal} (Current)</option>
                    )}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const TableMappingList = ({ activeApp, dbMetadata, updateTableClassification, selectedAppIndex }) => {
  const allTables = Object.keys(dbMetadata[activeApp.schema] || {})
    .filter(t => t.toLowerCase() !== 'versionseries')
    .sort((a, b) => a.localeCompare(b));
  const ct = activeApp.classifiedTables || { source: [], staging: [], target: [], classdef: [], annotation: [], content: [], customobject: [], checksum: [], columndefinition: [], propertydefinition: [], globalpropertydef: [] };
  
  const roles = [
    { id: 'source', label: 'Source Table' },
    { id: 'staging', label: 'Staging Table' },
    { id: 'target', label: 'Target Table' },
    { id: 'classdef', label: 'Class Definition' },
    { id: 'columndefinition', label: 'Column Definition' },
    { id: 'propertydefinition', label: 'Property Definition' },
    { id: 'globalpropertydef', label: 'Global Property Def' },
    { id: 'annotation', label: 'Annotation' },
    { id: 'content', label: 'Content' },
    { id: 'customobject', label: 'Custom Object' },
    { id: 'checksum', label: 'Checksum' }
  ];
  
  const getRoleTable = (roleId) => {
    return ct[roleId] && ct[roleId].length > 0 ? ct[roleId][0] : '';
  };

  const handleTableSelect = (roleId, table) => {
    if (!table) {
      const existingTable = getRoleTable(roleId);
      if (existingTable) {
        updateTableClassification(selectedAppIndex, existingTable, 'unassigned');
      }
    } else {
      updateTableClassification(selectedAppIndex, table, roleId);
    }
  };

  const isTableAssignedToOtherRole = (table, currentRoleId) => {
    return roles.some(r => r.id !== currentRoleId && getRoleTable(r.id) === table);
  };

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ margin: 0, color: '#1e293b', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Database size={16} color="#4f46e5" /> Table Mappings
        </h4>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
        {roles.map(role => {
          const assignedTable = getRoleTable(role.id);
          return (
            <div key={role.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                {role.label}
              </label>
              <select
                value={assignedTable}
                onChange={(e) => handleTableSelect(role.id, e.target.value)}
                style={{ width: '100%', padding: '6px 8px', fontSize: assignedTable ? '12px' : '11px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none', background: assignedTable ? '#eff6ff' : 'white', color: assignedTable ? '#1d4ed8' : '#94a3b8', fontWeight: assignedTable ? '600' : 'normal', fontStyle: assignedTable ? 'normal' : 'italic', cursor: 'pointer' }}
              >
                <option value="" style={{ color: '#94a3b8', fontStyle: 'italic' }}>-- select table --</option>
                {allTables.map(t => {
                  const isAssignedElsewhere = isTableAssignedToOtherRole(t, role.id);
                  if (isAssignedElsewhere) return null;
                  return (
                    <option key={t} value={t} style={{ color: '#334155', fontStyle: 'normal', fontWeight: '500' }}>
                      {t}
                    </option>
                  );
                })}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DatabaseToggleSwitch = ({ db, dbConfigWrapper, handleSetActiveDb }) => {
  const isActive = dbConfigWrapper.activeDatabaseType === db.databaseType;
  const onlyOne = dbConfigWrapper.databases.length === 1;
  let titleText = "Activate this database";
  if (onlyOne) {
    titleText = "Cannot deactivate when only one database is configured";
  } else if (isActive) {
    titleText = "Deactivate and switch to the other database";
  }
  
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
      title={titleText}
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
};

export default function Configuration() { // NOSONAR
  const [config, setConfig] = useState({ applications: [] });
  const [uiSettings, setUiSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [dbMetadata, setDbMetadata] = useState({}); // Cache for schema -> {table: [columns]}
  const [originalAppSnapshot, setOriginalAppSnapshot] = useState(null); // Snapshot to revert app changes
  const [schemaDiscovered, setSchemaDiscovered] = useState(false);

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
        const settings = await apiGetUISettings();
        setUiSettings(settings || {});
      } catch(e) { console.warn('Failed to fetch UI settings'); }
      
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
      
      let configToSave = { ...config };
      if (uiSettings.fixedFilenetMapping) {
        configToSave.applications = configToSave.applications.map(app => ({
          ...app,
          systemColumns: {
            "status": "migration_status",
            "date": "create_date",
            "content-size": "content_size",
            "mime-type": "mime_type",
            "doc-id": "object_id",
            "class-id-col": "object_class_id",
            "symbolic-name-col": "symbolic_name",
            "annotated-id-col": "annotated_id",
            "content-doc-id-col": "doc_id",
            "target-guid-col": "p8_doc_id"
          }
        }));
      }

      await apiSaveTenantConfig(configToSave);
      setSuccess('Configuration saved successfully!');
      
      // Update local state with enforced rules
      setConfig(configToSave);
      
      // Return to main app listing
      setSelectedAppIndex(null);
      setOriginalAppSnapshot(null);
      
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
        classdef: [],
        annotation: [],
        content: [],
        customobject: [],
        checksum: [],
        columndefinition: [],
        propertydefinition: [],
        globalpropertydef: []
      },
      systemColumns: {
        status: "migration_status",
        date: "create_date",
        "content-size": "content_size",
        "mime-type": "mime_type",
        "doc-id": "object_id",
        "class-id-col": "object_class_id",
        "symbolic-name-col": "symbolic_name",
        "annotated-id-col": "annotated_id",
        "content-doc-id-col": "doc_id",
        "target-guid-col": "p8_doc_id"
      }
    };
    setOriginalAppSnapshot(null); // null indicates a brand new app
    setSchemaDiscovered(false);
    setConfig({ ...config, applications: [...config.applications, newApp] });
    setSelectedAppIndex(config.applications.length); // Open detail view immediately
  };

  const handleRemoveApp = async (index, e) => {
    if (e) e.stopPropagation();
    const newApps = [...config.applications];
    newApps.splice(index, 1);
    const newConfig = { ...config, applications: newApps };
    setConfig(newConfig);
    if (selectedAppIndex === index) {
      setSelectedAppIndex(null);
    } else if (selectedAppIndex > index) {
      setSelectedAppIndex(selectedAppIndex - 1);
    }
    try {
      setSaving(true);
      await apiSaveTenantConfig(newConfig);
      setSuccess('Application deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete application');
    } finally {
      setSaving(false);
    }
  };

  const updateAppField = (appIndex, field, value) => {
    const newApps = [...config.applications];
    newApps[appIndex][field] = value;
    setConfig({ ...config, applications: newApps });
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
    if (newRole && newRole !== 'unassigned' && ct[newRole] !== undefined) {
      ct[newRole] = [tableName]; // All roles are 1-to-1 mappings now
    }
  };

  const updateTableClassification = (appIndex, tableName, newRole) => {
    const newApps = [...config.applications];
    if (!newApps[appIndex].classifiedTables) {
      newApps[appIndex].classifiedTables = { source: [], staging: [], target: [], classdef: [], annotation: [], content: [], customobject: [], checksum: [], columndefinition: [], propertydefinition: [], globalpropertydef: [] };
    }
    const ct = newApps[appIndex].classifiedTables;
    
    const oldRole = findOldRole(ct, tableName);
    removeTableFromAllRoles(ct, tableName);
    assignNewRole(ct, tableName, newRole, oldRole);
    
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
                            <DatabaseToggleSwitch 
                              db={db} 
                              dbConfigWrapper={dbConfigWrapper} 
                              handleSetActiveDb={handleSetActiveDb} 
                            />
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
                        onClick={() => { 
                          setOriginalAppSnapshot(JSON.parse(JSON.stringify(app)));
                          setSelectedAppIndex(appIdx); 
                          setSchemaDiscovered(true);
                          fetchMetadataForSchema(app.schema); 
                        }}
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
                        const newApps = [...config.applications];
                        if (originalAppSnapshot === null) {
                          // Brand new app not yet saved, remove it
                          newApps.splice(selectedAppIndex, 1);
                        } else {
                          // Existing app, revert to original state
                          newApps[selectedAppIndex] = originalAppSnapshot;
                        }
                        setConfig({ ...config, applications: newApps });
                        setSelectedAppIndex(null);
                        setOriginalAppSnapshot(null);
                      }}
                      style={{ background: '#f1f5f9', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontWeight: 'bold', fontSize: '12px' }}
                    >
                      <ArrowLeft size={14} /> Cancel & Go Back
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
                        onChange={e => {
                          updateAppField(selectedAppIndex, 'schema', e.target.value);
                          setSchemaDiscovered(false);
                        }} 
                        onKeyDown={e => {
                          if (e.key === 'Enter' && activeApp.appId && activeApp.appName && activeApp.objectStore && activeApp.schema) {
                            setSchemaDiscovered(true);
                            fetchMetadataForSchema(activeApp.schema);
                          }
                        }} 
                        style={{ flex: 1, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }} 
                        placeholder="Enter Database Schema" 
                      />
                      <button 
                        onClick={() => {
                          setSchemaDiscovered(true);
                          fetchMetadataForSchema(activeApp.schema);
                        }} 
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

                {schemaDiscovered && dbMetadata[activeApp.schema] && Object.keys(dbMetadata[activeApp.schema]).length > 0 ? (
                  <>
                    {/* Table-Centric Mapping View */}
                    <TableMappingList 
                      activeApp={activeApp}
                      dbMetadata={dbMetadata}
                      updateTableClassification={updateTableClassification}
                      selectedAppIndex={selectedAppIndex}
                    />

                    {/* System Columns Mapping */}
                    {!uiSettings.fixedFilenetMapping && (
                      <div style={{ marginTop: '12px' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '13px' }}>System Columns Mapping</h4>
                        <SystemColumnMappingSection 
                          config={config} 
                          setConfig={setConfig} 
                          activeApp={activeApp} 
                          selectedAppIndex={selectedAppIndex} 
                          dbMetadata={dbMetadata} 
                        />
                      </div>
                    )}
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
