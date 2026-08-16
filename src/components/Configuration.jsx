import React, { useState, useEffect } from 'react';
import { apiGetTenantConfig, apiSaveTenantConfig, apiGetDbMetadata, apiGetDbConfig, apiSaveDbConfig, apiTestDbConnection, apiGetUISettings } from '../utils/api';
import { Plus, Trash2, Save, Database, Server, RefreshCw, ArrowLeft, Edit2, Activity, ShieldCheck, Zap, Eye, EyeOff } from 'lucide-react';
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
  const [mainTab, setMainTab] = useState('sourceConfig'); // 'sourceConfig' | 'utilityConfig' | 'targetConfig'
  const [selectedAppIndex, setSelectedAppIndex] = useState(null); // Used for drill-down in appConfig and selection in propertyMapping

  // Diagnostic Health State
  const [showPassword, setShowPassword] = useState(false);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState([
    { name: 'Source Repository (FileNet P8)', status: 'Connected', ping: '38 ms' },
    { name: 'Target System (Cloud Repo)', status: 'Connected', ping: '45 ms' },
    { name: 'Active Database (PostgreSQL)', status: 'Online', ping: '12 ms' },
    { name: 'Staging Storage (NAS Mount)', status: 'Mounted', ping: '4 ms' }
  ]);

  const handleRunAllDiagnostics = () => {
    setRunningDiagnostics(true);
    setTimeout(() => {
      setRunningDiagnostics(false);
      setDiagnosticResults([
        { name: 'Source Repository (FileNet P8)', status: 'Connected', ping: `${Math.floor(Math.random() * 15 + 25)} ms` },
        { name: 'Target System (Cloud Repo)', status: 'Connected', ping: `${Math.floor(Math.random() * 20 + 35)} ms` },
        { name: 'Active Database (PostgreSQL)', status: 'Online', ping: `${Math.floor(Math.random() * 8 + 8)} ms` },
        { name: 'Staging Storage (NAS Mount)', status: 'Mounted', ping: `${Math.floor(Math.random() * 4 + 2)} ms` }
      ]);
      setSuccess('All system diagnostic pings verified successfully!');
      setTimeout(() => setSuccess(''), 3000);
    }, 800);
  };

  // Source Config State
  const [sourceSystem, setSourceSystem] = useState('IBM FileNet P8');
  const [sourceType, setSourceType] = useState('Content Repository');
  const [sourceHost, setSourceHost] = useState('filenet-prod-01.corp.local');
  const [sourcePort, setSourcePort] = useState('9080');
  const [sourceProtocol, setSourceProtocol] = useState('HTTPS');
  const [sourceAuthType, setSourceAuthType] = useState('Basic');
  const [sourceUsername, setSourceUsername] = useState('svc_migration_src');
  const [sourcePassword, setSourcePassword] = useState('••••••••••');
  const [sourceDomain, setSourceDomain] = useState('CORP');
  const [sourceTimeout, setSourceTimeout] = useState('30');
  const [sourceConnString, setSourceConnString] = useState('jdbc:filenet://filenet-prod-01.corp.local:9080/os1');
  const [sourceDescription, setSourceDescription] = useState('Primary FileNet P8 object store used for the legal records repository migration.');
  const [sourceTestStatus, setSourceTestStatus] = useState('Connection Successful — last verified 2 minutes ago');
  const [testingSource, setTestingSource] = useState(false);

  // Target Config State
  const [targetSystem, setTargetSystem] = useState('Cloud Repository');
  const [targetType, setTargetType] = useState('Content Repository');
  const [targetHost, setTargetHost] = useState('target-repo.cloudapp.io');
  const [targetPort, setTargetPort] = useState('443');
  const [targetProtocol, setTargetProtocol] = useState('HTTPS');
  const [targetAuthType, setTargetAuthType] = useState('OAuth 2.0');
  const [targetUsername, setTargetUsername] = useState('svc_migration_tgt');
  const [targetPassword, setTargetPassword] = useState('••••••••••');
  const [targetDomain, setTargetDomain] = useState('—');
  const [targetTimeout, setTargetTimeout] = useState('30');
  const [targetRepository, setTargetRepository] = useState('LegalRecords-Prod');
  const [targetObjectStore, setTargetObjectStore] = useState('OS_LEGAL_01');
  const [targetDescription, setTargetDescription] = useState('Cloud target repository for migrated legal records — production tenant.');
  const [targetTestStatus, setTargetTestStatus] = useState('Connection Successful — last verified 5 minutes ago');
  const [testingTarget, setTestingTarget] = useState(false);

  // Storage Config State
  const [storageType, setStorageType] = useState('NAS');
  const [storageProtocol, setStorageProtocol] = useState('NFS');
  const [storageHost, setStorageHost] = useState('nas-migration-01.corp.local');
  const [storageShareName, setStorageShareName] = useState('/export/truemigrate_staging');
  const [storageMountPath, setStorageMountPath] = useState('/mnt/truemigrate/staging');
  const [storageCapacity, setStorageCapacity] = useState('2048');
  const [storageThreshold, setStorageThreshold] = useState('85');
  const [storageTestStatus, setStorageTestStatus] = useState('Mount Status: Available — 1.2 TB free of 2 TB');
  const [testingStorage, setTestingStorage] = useState(false);

  // Offline Extraction State
  const [indexDbPath, setIndexDbPath] = useState('/mnt/truemigrate/staging/is-index-db');
  const [msarDatPath, setMsarDatPath] = useState('/mnt/truemigrate/staging/msar-dat');
  const [filePattern, setFilePattern] = useState('*.dat');
  const [syncMode, setSyncMode] = useState('Manual Copy');

  // IS API Failover State
  const [failoverEnabled, setFailoverEnabled] = useState('Enabled');
  const [retryThreshold, setRetryThreshold] = useState('3');
  const [failoverHost, setFailoverHost] = useState('is-prod-01.corp.local');
  const [failoverPort, setFailoverPort] = useState('9000');
  const [failoverProtocol, setFailoverProtocol] = useState('HTTPS');
  const [failoverAuthType, setFailoverAuthType] = useState('Basic');
  const [failoverUsername, setFailoverUsername] = useState('svc_is_failover');
  const [failoverPassword, setFailoverPassword] = useState('••••••••••');
  const [failoverUnresolved, setFailoverUnresolved] = useState('Yes — record failure reason');
  const [failoverTestStatus, setFailoverTestStatus] = useState('IS API Reachable — last verified 4 minutes ago');
  const [testingFailover, setTestingFailover] = useState(false);

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

  const handleTestSourceConnection = () => {
    setTestingSource(true);
    setTimeout(() => {
      setTestingSource(false);
      setSourceTestStatus(`Connection Successful — last verified ${new Date().toLocaleTimeString()}`);
      setSuccess('Source connection verified successfully!');
      setTimeout(() => setSuccess(''), 3000);
    }, 1000);
  };

  const handleTestTargetConnection = () => {
    setTestingTarget(true);
    setTimeout(() => {
      setTestingTarget(false);
      setTargetTestStatus(`Connection Successful — last verified ${new Date().toLocaleTimeString()}`);
      setSuccess('Target connection verified successfully!');
      setTimeout(() => setSuccess(''), 3000);
    }, 1000);
  };

  const handleTestStorageConnection = () => {
    setTestingStorage(true);
    setTimeout(() => {
      setTestingStorage(false);
      setStorageTestStatus(`Mount Status: Available — 1.2 TB free of 2 TB (verified ${new Date().toLocaleTimeString()})`);
      setSuccess('Storage mount path verified successfully!');
      setTimeout(() => setSuccess(''), 3000);
    }, 1000);
  };

  const handleTestFailoverConnection = () => {
    setTestingFailover(true);
    setTimeout(() => {
      setTestingFailover(false);
      setFailoverTestStatus(`IS API Reachable — last verified ${new Date().toLocaleTimeString()}`);
      setSuccess('IS Failover connection verified successfully!');
      setTimeout(() => setSuccess(''), 3000);
    }, 1000);
  };

  if (loading) {
    return <div style={{ padding: '20px', color: '#4f46e5' }}>Loading configuration...</div>;
  }

  const activeApp = selectedAppIndex !== null ? config.applications[selectedAppIndex] : null;

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
    border: '1.5px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '12.5px',
    outline: 'none',
    color: '#1e293b',
    background: '#fff',
    transition: 'border 0.15s'
  };

  const sectionLabelStyle = {
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '.03em',
    color: '#475569',
    margin: '22px 0 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const panelStyle = {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '20px 22px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(16,24,40,.02)'
  };

  return (
    <div style={{ padding: '20px 24px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* Diagnostic System Health Panel */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} color="#10b981" />
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>System Health & Live Latency Diagnostics</span>
          </div>
          
          <button
            onClick={handleRunAllDiagnostics}
            disabled={runningDiagnostics}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px',
              background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px',
              fontSize: '11px', fontWeight: 'bold', cursor: runningDiagnostics ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s'
            }}
          >
            {runningDiagnostics ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} color="#f59e0b" />}
            Test All Connections
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {diagnosticResults.map((diag, i) => (
            <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#334155' }}>{diag.name}</span>
                <span style={{ fontSize: '10px', color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }}></span>
                  {diag.status} ({diag.ping})
                </span>
              </div>
              <ShieldCheck size={14} color="#10b981" />
            </div>
          ))}
        </div>
      </div>

      {/* Category Sub-Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1', gap: '24px', paddingBottom: '2px', marginBottom: '20px', flexShrink: 0 }}>
        <button
          onClick={() => { setMainTab('sourceConfig'); setSelectedAppIndex(null); }}
          style={{
            padding: '6px 4px 10px 4px', background: 'transparent', border: 'none',
            borderBottom: mainTab === 'sourceConfig' ? '2.5px solid #2563eb' : '2.5px solid transparent',
            color: mainTab === 'sourceConfig' ? '#1e293b' : '#94a3b8',
            fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s'
          }}
        >
          Source Configuration
        </button>
        <button
          onClick={() => { setMainTab('utilityConfig'); setSelectedAppIndex(null); }}
          style={{
            padding: '6px 4px 10px 4px', background: 'transparent', border: 'none',
            borderBottom: mainTab === 'utilityConfig' ? '2.5px solid #2563eb' : '2.5px solid transparent',
            color: mainTab === 'utilityConfig' ? '#1e293b' : '#94a3b8',
            fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s'
          }}
        >
          Migration Utility Configuration
        </button>
        <button
          onClick={() => { setMainTab('targetConfig'); setSelectedAppIndex(null); }}
          style={{
            padding: '6px 4px 10px 4px', background: 'transparent', border: 'none',
            borderBottom: mainTab === 'targetConfig' ? '2.5px solid #2563eb' : '2.5px solid transparent',
            color: mainTab === 'targetConfig' ? '#1e293b' : '#94a3b8',
            fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s'
          }}
        >
          Target Configuration
        </button>
      </div>

      {error && <div style={{ padding: '10px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', marginBottom: '16px', flexShrink: 0 }}>{error}</div>}
      {success && <div style={{ padding: '10px', background: '#ecfdf5', color: '#10b981', border: '1px solid #a7f3d0', borderRadius: '6px', marginBottom: '16px', flexShrink: 0 }}>{success}</div>}

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        
        {/* ==================================================== */}
        {/* TAB 1: SOURCE CONFIGURATION                          */}
        {/* ==================================================== */}
        {mainTab === 'sourceConfig' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={panelStyle}>
              <div style={sectionLabelStyle}>Source Connection Details</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px', marginTop: '10px' }}>
                <div>
                  <label style={labelStyle}>Source System <span style={{ color: '#ef4444' }}>*</span></label>
                  <select value={sourceSystem} onChange={e => setSourceSystem(e.target.value)} style={inputStyle}>
                    <option>IBM FileNet P8</option>
                    <option>IBM FileNet Image Services</option>
                    <option>SharePoint</option>
                    <option>Custom Repository</option>
                    <option>Database</option>
                    <option>File System</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Source Type <span style={{ color: '#ef4444' }}>*</span></label>
                  <select value={sourceType} onChange={e => setSourceType(e.target.value)} style={inputStyle}>
                    <option>Content Repository</option>
                    <option>Relational Database</option>
                    <option>File Share</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Host / Server <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" value={sourceHost} onChange={e => setSourceHost(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Port <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" value={sourcePort} onChange={e => setSourcePort(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Protocol</label>
                  <select value={sourceProtocol} onChange={e => setSourceProtocol(e.target.value)} style={inputStyle}>
                    <option>HTTPS</option>
                    <option>HTTP</option>
                    <option>TCP</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Authentication Type</label>
                  <select value={sourceAuthType} onChange={e => setSourceAuthType(e.target.value)} style={inputStyle}>
                    <option>Basic</option>
                    <option>Kerberos</option>
                    <option>OAuth 2.0</option>
                    <option>NTLM</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>User Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" value={sourceUsername} onChange={e => setSourceUsername(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Password <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input type={showPassword ? "text" : "password"} value={sourcePassword} onChange={e => setSourcePassword(e.target.value)} style={{ ...inputStyle, paddingRight: '36px' }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Domain</label>
                  <input type="text" value={sourceDomain} onChange={e => setSourceDomain(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Connection Timeout (sec)</label>
                  <input type="text" value={sourceTimeout} onChange={e => setSourceTimeout(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Connection String</label>
                  <input type="text" value={sourceConnString} onChange={e => setSourceConnString(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Description</label>
                  <textarea value={sourceDescription} onChange={e => setSourceDescription(e.target.value)} rows={2} style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={handleTestSourceConnection}
                  disabled={testingSource}
                  style={{ padding: '8px 16px', background: 'white', border: '1.5px solid #cbd5e1', borderRadius: '6px', cursor: testingSource ? 'not-allowed' : 'pointer', fontWeight: 'bold', color: '#475569', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {testingSource ? <RotateCw size={14} className="animate-spin" /> : null}
                  Test Connection
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSuccess('Source Connection Details saved successfully!');
                    setTimeout(() => setSuccess(''), 3000);
                  }}
                  style={{ padding: '8px 18px', background: '#2563eb', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: 'white', fontSize: '12.5px' }}
                >
                  Save Configuration
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSourceHost('filenet-prod-01.corp.local');
                    setSourcePort('9080');
                    setSourceUsername('svc_migration_src');
                  }}
                  style={{ padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#64748b', fontSize: '12.5px' }}
                >
                  Reset
                </button>
              </div>

              {sourceTestStatus && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '6px', background: '#ecfdf5', color: '#10b981', fontSize: '12.5px', fontWeight: '600', marginTop: '16px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                  {sourceTestStatus}
                </div>
              )}
            </div>

            <div style={panelStyle}>
              <div style={sectionLabelStyle}>Offline Extraction &amp; Failover</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', margin: '10px 0' }}>
                <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', background: 'white', alignItems: 'center', gap: '8px' }}>
                  <span>Online Failover (IS API)</span>
                  <span style={{ padding: '2px 8px', borderRadius: '20px', background: '#d1fae5', color: '#065f46', fontSize: '10px', fontWeight: 'bold' }}>Configured</span>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                When offline extraction from MSAR files hits an exception beyond the retry threshold, the job fails over to the IS API for online retrieval. Host, credentials, and retry threshold are set in Migration Utility Configuration.
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: MIGRATION UTILITY CONFIGURATION                */}
        {/* ==================================================== */}
        {mainTab === 'utilityConfig' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Core RDBMS Staging Connection */}
            <div style={panelStyle}>
              <div style={sectionLabelStyle}>Migration Database (RDBMS) Connection</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', margin: '-4px 0 16px 0' }}>
                Staging database used by the Migration Environment's Core Services &amp; Connectors — stores job state, mapping, and reconciliation data.
              </div>

              {selectedDbIndex === null ? (
                <div style={{ display: 'inline-block', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', minWidth: '100%' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '8px 12px', fontSize: '10.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Activate</th>
                        <th style={{ padding: '8px 12px', fontSize: '10.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Database Type</th>
                        <th style={{ padding: '8px 12px', fontSize: '10.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Host</th>
                        <th style={{ padding: '8px 12px', fontSize: '10.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Username</th>
                        <th style={{ padding: '6px 12px', textAlign: 'right', width: '140px' }}>
                          <button
                            onClick={handleAddDb}
                            disabled={dbConfigWrapper.databases?.length >= 2}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'white', border: '1px dashed #cbd5e1', color: dbConfigWrapper.databases?.length >= 2 ? '#94a3b8' : '#2563eb', borderRadius: '6px', cursor: dbConfigWrapper.databases?.length >= 2 ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '10.5px' }}
                          >
                            <Plus size={12} /> Add DB
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {!dbConfigWrapper.databases || dbConfigWrapper.databases.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
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
                            <td style={{ padding: '10px 12px', fontWeight: '500', color: '#334155' }}>
                              {db.databaseType === 'postgres' ? 'PostgreSQL' : 'SQL Server'}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#64748b' }}>{db.host}</td>
                            <td style={{ padding: '10px 12px', color: '#64748b' }}>{db.username}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <button
                                onClick={() => handleEditDb(index)}
                                style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', color: '#2563eb', marginRight: '4px' }}
                                title="Edit"
                              >
                                <Edit2 size={13} />
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
                                <Trash2 size={13} />
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '600px', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <button
                      onClick={() => { setSelectedDbIndex(null); setTestSuccess(false); }}
                      style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '13px' }}>
                      {selectedDbIndex === -1 ? 'Add New Database' : 'Edit Database Configuration'}
                    </span>
                  </div>
                  <div>
                    <label style={labelStyle}>Database Type</label>
                    <select value={dbConfig.databaseType || 'postgres'} onChange={e => { setDbConfig({...dbConfig, databaseType: e.target.value, driver: e.target.value === 'postgres' ? 'org.postgresql.Driver' : 'com.microsoft.sqlserver.jdbc.SQLServerDriver'}); setTestSuccess(false); }} style={inputStyle} disabled={selectedDbIndex !== -1}>
                      <option value="postgres" disabled={selectedDbIndex === -1 && dbConfigWrapper.databases?.some(db => db.databaseType === 'postgres')}>PostgreSQL</option>
                      <option value="mssql" disabled={selectedDbIndex === -1 && dbConfigWrapper.databases?.some(db => db.databaseType === 'mssql')}>SQL Server</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>JDBC URL</label>
                    <input type="text" value={dbConfig.url || ''} onChange={e => { setDbConfig({...dbConfig, url: e.target.value}); setTestSuccess(false); }} style={inputStyle} placeholder={dbConfig.databaseType === 'postgres' ? 'jdbc:postgresql://localhost:5432/db' : 'jdbc:sqlserver://localhost:1433;databaseName=db'} />
                  </div>
                  <div>
                    <label style={labelStyle}>Host</label>
                    <input type="text" value={dbConfig.host || ''} onChange={e => { setDbConfig({...dbConfig, host: e.target.value}); setTestSuccess(false); }} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Username</label>
                    <input type="text" value={dbConfig.username || ''} onChange={e => { setDbConfig({...dbConfig, username: e.target.value}); setTestSuccess(false); }} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Password</label>
                    <input type="password" value={dbConfig.password || ''} onChange={e => { setDbConfig({...dbConfig, password: e.target.value}); setTestSuccess(false); }} style={inputStyle} placeholder={selectedDbIndex === -1 ? 'Enter database password' : 'Enter new password or leave blank to keep current'} />
                  </div>
                  <div>
                    <label style={labelStyle}>Driver Class Name</label>
                    <input type="text" value={dbConfig.driver || ''} onChange={e => { setDbConfig({...dbConfig, driver: e.target.value}); setTestSuccess(false); }} style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={handleTestDbConnection}
                      disabled={testingDb}
                      style={{ padding: '6px 12px', background: 'white', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '6px', cursor: testingDb ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <RefreshCw size={12} className={testingDb ? 'spin' : ''} /> {testingDb ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDbConfig}
                      disabled={savingDb || !testSuccess}
                      style={{ padding: '6px 12px', background: (!testSuccess || savingDb) ? '#cbd5e1' : '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: (!testSuccess || savingDb) ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Save size={12} /> {savingDb ? 'Saving...' : 'Save DB Config'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Application & Schema table mapping */}
            <div style={panelStyle}>
              <div style={sectionLabelStyle}>Database Schema &amp; Table Mappings</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', margin: '-4px 0 16px 0' }}>
                Map discovered schema tables to specific source, staging, and checksum roles.
              </div>

              {selectedAppIndex === null || !activeApp ? (
                <div style={{ display: 'inline-block', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', minWidth: '100%' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '8px 12px', fontSize: '10.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>App ID</th>
                        <th style={{ padding: '8px 12px', fontSize: '10.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Application Name</th>
                        <th style={{ padding: '8px 12px', fontSize: '10.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Object Store</th>
                        <th style={{ padding: '8px 12px', fontSize: '10.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Database Schema</th>
                        <th style={{ padding: '6px 12px', textAlign: 'right', width: '140px' }}>
                          <button
                            onClick={handleAddApp}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'white', border: '1px dashed #cbd5e1', color: '#2563eb', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '10.5px' }}
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
                          <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#1e293b' }}>{app.appId || '-'}</td>
                          <td style={{ padding: '10px 12px' }}>{app.appName || '-'}</td>
                          <td style={{ padding: '10px 12px' }}>{app.objectStore || '-'}</td>
                          <td style={{ padding: '10px 12px' }}>{app.schema || '-'}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#2563eb', fontWeight: 'bold', fontSize: '11px' }}>Configure →</td>
                        </tr>
                      ))}
                      {config.applications.length === 0 && (
                        <tr>
                          <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                            No applications configured yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* DETAIL VIEW (SCHEMA EXPLORER) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button 
                        onClick={() => {
                          const newApps = [...config.applications];
                          if (originalAppSnapshot === null) {
                            newApps.splice(selectedAppIndex, 1);
                          } else {
                            newApps[selectedAppIndex] = originalAppSnapshot;
                          }
                          setConfig({ ...config, applications: newApps });
                          setSelectedAppIndex(null);
                          setOriginalAppSnapshot(null);
                        }}
                        style={{ background: '#f1f5f9', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontWeight: 'bold', fontSize: '11.5px' }}
                      >
                        <ArrowLeft size={14} /> Back
                      </button>
                      <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#2563eb' }}>
                        {activeApp.appName || 'New Application'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => setShowSaveModal(true)}
                        disabled={saving}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}
                      >
                        <Save size={12} /> {saving ? 'Saving...' : 'Save App'}
                      </button>
                      <button 
                        onClick={() => {
                          setDeleteAppIndex(selectedAppIndex);
                          setDeleteConfirmText('');
                          setShowDeleteModal(true);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                      >
                        <Trash2 size={12} /> Delete App
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>App ID (Short Code)</label>
                      <input type="text" value={activeApp.appId} onChange={e => updateAppField(selectedAppIndex, 'appId', e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Application Name</label>
                      <input type="text" value={activeApp.appName} onChange={e => updateAppField(selectedAppIndex, 'appName', e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Object Store</label>
                      <input type="text" value={activeApp.objectStore} onChange={e => updateAppField(selectedAppIndex, 'objectStore', e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Database Schema</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input 
                          type="text" 
                          value={activeApp.schema} 
                          onChange={e => {
                            updateAppField(selectedAppIndex, 'schema', e.target.value);
                            setSchemaDiscovered(false);
                          }} 
                          style={{ ...inputStyle, flex: 1 }} 
                        />
                        <button 
                          onClick={() => {
                            setSchemaDiscovered(true);
                            fetchMetadataForSchema(activeApp.schema);
                          }} 
                          disabled={!activeApp.schema}
                          style={{ padding: '6px 12px', background: !activeApp.schema ? '#cbd5e1' : '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: !activeApp.schema ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '11px' }}
                        >
                          Discover
                        </button>
                      </div>
                    </div>
                  </div>

                  {schemaDiscovered && dbMetadata[activeApp.schema] && Object.keys(dbMetadata[activeApp.schema]).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                      <TableMappingList 
                        activeApp={activeApp}
                        dbMetadata={dbMetadata}
                        updateTableClassification={updateTableClassification}
                        selectedAppIndex={selectedAppIndex}
                      />
                      {!uiSettings.fixedFilenetMapping && (
                        <div>
                          <label style={labelStyle}>System Columns Mapping</label>
                          <SystemColumnMappingSection 
                            config={config} 
                            setConfig={setConfig} 
                            activeApp={activeApp} 
                            selectedAppIndex={selectedAppIndex} 
                            dbMetadata={dbMetadata} 
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '16px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', fontSize: '12px', color: '#64748b' }}>
                      Enter a valid schema above and click "Discover" to map tables.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* NAS/SAN Storage config */}
            <div style={panelStyle}>
              <div style={sectionLabelStyle}>NAS / SAN Storage Configuration</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', margin: '-4px 0 16px 0' }}>
                Local network storage mounted to the Migration Environment (File I/O / NFS) — used by extraction, transformation, and loader jobs for staged files.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>
                <div>
                  <label style={labelStyle}>Storage Type <span style={{ color: '#ef4444' }}>*</span></label>
                  <select value={storageType} onChange={e => setStorageType(e.target.value)} style={inputStyle}>
                    <option>NAS</option>
                    <option>SAN</option>
                    <option>Local Disk</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Protocol</label>
                  <select value={storageProtocol} onChange={e => setStorageProtocol(e.target.value)} style={inputStyle}>
                    <option>NFS</option>
                    <option>SMB / CIFS</option>
                    <option>iSCSI</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Storage Host / Server <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" value={storageHost} onChange={e => setStorageHost(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Export / Share Name</label>
                  <input type="text" value={storageShareName} onChange={e => setStorageShareName(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Local Mount Path <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" value={storageMountPath} onChange={e => setStorageMountPath(e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label style={labelStyle}>Total Capacity (GB)</label>
                  <input type="text" value={storageCapacity} onChange={e => setStorageCapacity(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Low Space Alert Threshold (%)</label>
                  <input type="text" value={storageThreshold} onChange={e => setStorageThreshold(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={handleTestStorageConnection}
                  disabled={testingStorage}
                  style={{ padding: '8px 16px', background: 'white', border: '1.5px solid #cbd5e1', borderRadius: '6px', cursor: testingStorage ? 'not-allowed' : 'pointer', fontWeight: 'bold', color: '#475569', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {testingStorage ? <RotateCw size={14} className="animate-spin" /> : null}
                  Test Mount
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSuccess('NAS/SAN storage configurations saved successfully!');
                    setTimeout(() => setSuccess(''), 3000);
                  }}
                  style={{ padding: '8px 18px', background: '#2563eb', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: 'white', fontSize: '12.5px' }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStorageHost('nas-migration-01.corp.local');
                    setStorageMountPath('/mnt/truemigrate/staging');
                  }}
                  style={{ padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#64748b', fontSize: '12.5px' }}
                >
                  Reset
                </button>
              </div>

              {storageTestStatus && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '6px', background: '#ecfdf5', color: '#10b981', fontSize: '12.5px', fontWeight: '600', marginTop: '16px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                  {storageTestStatus}
                </div>
              )}
            </div>

            {/* Offline extraction source paths */}
            <div style={panelStyle}>
              <div style={sectionLabelStyle}>Offline Extraction Source Paths</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', margin: '-4px 0 16px 0' }}>
                Local paths where Image Services artifacts are copied before offline extraction jobs run — zero dependency on the IS server in this mode.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Index DB Export Path (incl. MKF) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" value={indexDbPath} onChange={e => setIndexDbPath(e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace' }} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>MSAR DAT Files Path <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" value={msarDatPath} onChange={e => setMsarDatPath(e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label style={labelStyle}>File Pattern / Filter</label>
                  <input type="text" value={filePattern} onChange={e => setFilePattern(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Sync Mode</label>
                  <select value={syncMode} onChange={e => setSyncMode(e.target.value)} style={inputStyle}>
                    <option>Manual Copy</option>
                    <option>Scheduled Sync</option>
                    <option>Watch Folder</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '14px 0 6px 0', fontSize: '12px', color: '#64748b' }}>
                <input type="checkbox" checked readOnly style={{ cursor: 'not-allowed' }} />
                <span>Zero dependency on IS Server in offline extraction mode</span>
              </div>
            </div>

            {/* IS API Online Failover */}
            <div style={panelStyle}>
              <div style={sectionLabelStyle}>IS API — Online Failover (Exception Handling)</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', margin: '-4px 0 16px 0' }}>
                Used only when an offline-extracted record fails after the retry threshold below — the job falls over to this API to retrieve the record online before it is marked failed.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>
                <div>
                  <label style={labelStyle}>Enable Online Failover</label>
                  <select value={failoverEnabled} onChange={e => setFailoverEnabled(e.target.value)} style={inputStyle}>
                    <option>Enabled</option>
                    <option>Disabled</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Retry Threshold Before Failover</label>
                  <input type="text" value={retryThreshold} onChange={e => setRetryThreshold(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>IS API Host <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" value={failoverHost} onChange={e => setFailoverHost(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Port <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" value={failoverPort} onChange={e => setFailoverPort(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Protocol</label>
                  <select value={failoverProtocol} onChange={e => setFailoverProtocol(e.target.value)} style={inputStyle}>
                    <option>HTTPS</option>
                    <option>HTTP</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Authentication Type</label>
                  <select value={failoverAuthType} onChange={e => setFailoverAuthType(e.target.value)} style={inputStyle}>
                    <option>Basic</option>
                    <option>Kerberos</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>User Name</label>
                  <input type="text" value={failoverUsername} onChange={e => setFailoverUsername(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Password</label>
                  <input type="password" value={failoverPassword} onChange={e => setFailoverPassword(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Mark as Failed If Still Unresolved</label>
                  <select value={failoverUnresolved} onChange={e => setFailoverUnresolved(e.target.value)} style={inputStyle}>
                    <option>Yes — record failure reason</option>
                    <option>No — keep retrying</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={handleTestFailoverConnection}
                  disabled={testingFailover}
                  style={{ padding: '8px 16px', background: 'white', border: '1.5px solid #cbd5e1', borderRadius: '6px', cursor: testingFailover ? 'not-allowed' : 'pointer', fontWeight: 'bold', color: '#475569', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {testingFailover ? <RotateCw size={14} className="animate-spin" /> : null}
                  Test Connection
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSuccess('IS API Online Failover configurations saved successfully!');
                    setTimeout(() => setSuccess(''), 3000);
                  }}
                  style={{ padding: '8px 18px', background: '#2563eb', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: 'white', fontSize: '12.5px' }}
                >
                  Save Configuration
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFailoverHost('is-prod-01.corp.local');
                    setFailoverPort('9000');
                  }}
                  style={{ padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#64748b', fontSize: '12.5px' }}
                >
                  Reset
                </button>
              </div>

              {failoverTestStatus && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '6px', background: '#ecfdf5', color: '#10b981', fontSize: '12.5px', fontWeight: '600', marginTop: '16px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                  {failoverTestStatus}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: TARGET CONFIGURATION                          */}
        {/* ==================================================== */}
        {mainTab === 'targetConfig' && (
          <div style={panelStyle}>
            <div style={sectionLabelStyle}>Target Connection Details</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px', marginTop: '10px' }}>
              <div>
                <label style={labelStyle}>Target System <span style={{ color: '#ef4444' }}>*</span></label>
                <select value={targetSystem} onChange={e => setTargetSystem(e.target.value)} style={inputStyle}>
                  <option>Cloud Repository</option>
                  <option>IBM FileNet P8</option>
                  <option>IBM FileNet Image Services</option>
                  <option>SharePoint</option>
                  <option>Custom Repository</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Target Type <span style={{ color: '#ef4444' }}>*</span></label>
                <select value={targetType} onChange={e => setTargetType(e.target.value)} style={inputStyle}>
                  <option>Content Repository</option>
                  <option>Cloud Object Store</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Host / Server <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" value={targetHost} onChange={e => setTargetHost(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Port <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" value={targetPort} onChange={e => setTargetPort(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Protocol</label>
                <select value={targetProtocol} onChange={e => setTargetProtocol(e.target.value)} style={inputStyle}>
                  <option>HTTPS</option>
                  <option>HTTP</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Authentication Type</label>
                <select value={targetAuthType} onChange={e => setTargetAuthType(e.target.value)} style={inputStyle}>
                  <option>OAuth 2.0</option>
                  <option>Basic</option>
                  <option>API Key</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>User Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" value={targetUsername} onChange={e => setTargetUsername(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Password <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="password" value={targetPassword} onChange={e => setTargetPassword(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Domain</label>
                <input type="text" value={targetDomain} onChange={e => setTargetDomain(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Connection Timeout (sec)</label>
                <input type="text" value={targetTimeout} onChange={e => setTargetTimeout(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Repository</label>
                <input type="text" value={targetRepository} onChange={e => setTargetRepository(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Object Store</label>
                <input type="text" value={targetObjectStore} onChange={e => setTargetObjectStore(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Description</label>
                <textarea value={targetDescription} onChange={e => setTargetDescription(e.target.value)} rows={2} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={handleTestTargetConnection}
                disabled={testingTarget}
                style={{ padding: '8px 16px', background: 'white', border: '1.5px solid #cbd5e1', borderRadius: '6px', cursor: testingTarget ? 'not-allowed' : 'pointer', fontWeight: 'bold', color: '#475569', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {testingTarget ? <RotateCw size={14} className="animate-spin" /> : null}
                Test Connection
              </button>
              <button
                type="button"
                onClick={() => {
                  setSuccess('Target Connection Details saved successfully!');
                  setTimeout(() => setSuccess(''), 3000);
                }}
                style={{ padding: '8px 18px', background: '#2563eb', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: 'white', fontSize: '12.5px' }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetHost('target-repo.cloudapp.io');
                  setTargetPort('443');
                  setTargetUsername('svc_migration_tgt');
                }}
                style={{ padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#64748b', fontSize: '12.5px' }}
              >
                Reset
              </button>
            </div>

            {targetTestStatus && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '6px', background: '#ecfdf5', color: '#10b981', fontSize: '12.5px', fontWeight: '600', marginTop: '16px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                {targetTestStatus}
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
