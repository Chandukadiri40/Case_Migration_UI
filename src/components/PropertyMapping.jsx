import React, { useState, useEffect } from 'react';
import { apiGetTenantConfig, apiGetPropertyMappings, apiSavePropertyMapping, apiDeletePropertyMapping, apiGetDocumentClasses, apiGetClassProperties } from '../utils/api';
import { Plus, Trash2, Save, FileText, LayoutList, CheckCircle, Search, Edit2, Download, ArrowLeft } from 'lucide-react';

export default function PropertyMapping() {
  const [activeTab, setActiveTab] = useState('view'); // 'view' or 'create'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Data State
  const [applications, setApplications] = useState([]);
  const [templates, setTemplates] = useState([]);

  // Editor State
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [selectedAppId, setSelectedAppId] = useState('');
  
  const [sourceClasses, setSourceClasses] = useState([]);
  const [targetClasses, setTargetClasses] = useState([]);
  const [selectedSourceClass, setSelectedSourceClass] = useState('');
  const [selectedTargetClass, setSelectedTargetClass] = useState('');
  
  const [sourceProperties, setSourceProperties] = useState([]);
  const [targetProperties, setTargetProperties] = useState([]);
  
  const [mappings, setMappings] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [configRes, mappingsRes] = await Promise.all([
        apiGetTenantConfig(),
        apiGetPropertyMappings().catch(() => [])
      ]);
      setApplications(configRes?.applications || []);
      setTemplates(mappingsRes || []);
    } catch (err) {
      setError('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const handleAppChange = async (appId) => {
    setSelectedAppId(appId);
    setSelectedSourceClass('');
    setSelectedTargetClass('');
    setSourceClasses([]);
    setTargetClasses([]);
    setSourceProperties([]);
    setTargetProperties([]);
    setMappings([]);
    
    if (appId) {
      try {
        const [source, target] = await Promise.all([
          apiGetDocumentClasses(appId, 'source'),
          apiGetDocumentClasses(appId, 'target')
        ]);
        setSourceClasses(source);
        setTargetClasses(target);
      } catch (err) {
        console.error('Failed to load document classes', err);
      }
    }
  };

  const handleSourceClassChange = async (docClass) => {
    setSelectedSourceClass(docClass);
    if (!docClass) {
      setSourceProperties([]);
      setMappings([]);
      return;
    }
    try {
      const props = await apiGetClassProperties(selectedAppId, docClass);
      setSourceProperties(props);
      // Auto-populate grid with all source properties
      setMappings(props.map(p => ({
        sourceProperty: p.propertyName,
        sourceDataType: p.dataType,
        targetProperty: '',
        targetDataType: ''
      })));
    } catch (err) {
      console.error('Failed to fetch source properties', err);
    }
  };

  const handleTargetClassChange = async (docClass) => {
    setSelectedTargetClass(docClass);
    if (!docClass) {
      setTargetProperties([]);
      return;
    }
    try {
      const props = await apiGetClassProperties(selectedAppId, docClass);
      setTargetProperties(props);
    } catch (err) {
      console.error('Failed to fetch target properties', err);
    }
  };

  const updateMappingRowTarget = (index, targetPropName) => {
    const newMappings = [...mappings];
    const targetProp = targetProperties.find(p => p.propertyName === targetPropName);
    
    newMappings[index].targetProperty = targetPropName;
    newMappings[index].targetDataType = targetProp ? targetProp.dataType : '';
    setMappings(newMappings);
  };

  const removeMappingRow = (index) => {
    const newMappings = [...mappings];
    newMappings.splice(index, 1);
    setMappings(newMappings);
  };

  const handleExportCSV = (template) => {
    if (!template || !template.mappings || template.mappings.length === 0) {
      alert("No mappings to export.");
      return;
    }
    const headers = ["Source Property", "Source Type", "Target Property", "Target Type"];
    const rows = template.mappings.map(m => [m.sourceProperty, m.sourceDataType, m.targetProperty, m.targetDataType]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mapping_${template.templateName || template.templateId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = async () => {
    if (!templateName || !selectedAppId || !selectedSourceClass || !selectedTargetClass) {
      setError('Template Name, Application, Source Class, and Target Class are required');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        templateId: editingTemplateId,
        templateName: templateName,
        applicationId: selectedAppId,
        sourceDocumentClass: selectedSourceClass,
        targetDocumentClass: selectedTargetClass,
        mappings: mappings.filter(m => m.targetProperty), // Only save mapped properties
        lastModifiedBy: 'Admin',
        lastModifiedDate: new Date().toISOString()
      };
      await apiSavePropertyMapping(payload);
      setSuccess('Property mapping template saved successfully!');
      
      const refreshRes = await apiGetPropertyMappings();
      setTemplates(refreshRes || []);
      
      setTimeout(() => {
        setSuccess('');
        setActiveTab('view');
        resetEditor();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to save mapping template');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this mapping template?')) return;
    try {
      setLoading(true);
      await apiDeletePropertyMapping(templateId);
      setTemplates(templates.filter(t => t.templateId !== templateId));
      setSuccess('Template deleted successfully');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.message || 'Failed to delete template');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (template) => {
    setEditingTemplateId(template.templateId);
    setTemplateName(template.templateName || template.templateId);
    setSelectedAppId(template.applicationId);
    
    // Load Classes
    try {
      const [source, target] = await Promise.all([
        apiGetDocumentClasses(template.applicationId, 'source'),
        apiGetDocumentClasses(template.applicationId, 'target')
      ]);
      setSourceClasses(source);
      setTargetClasses(target);
      
      setSelectedSourceClass(template.sourceDocumentClass);
      setSelectedTargetClass(template.targetDocumentClass);
      
      // Load properties concurrently
      const [srcProps, tgtProps] = await Promise.all([
        apiGetClassProperties(template.applicationId, template.sourceDocumentClass),
        apiGetClassProperties(template.applicationId, template.targetDocumentClass)
      ]);
      
      setSourceProperties(srcProps);
      setTargetProperties(tgtProps);
      
      // Reconstruct mapping grid (showing all source props, overlaying mapped targets)
      const reconstructedMappings = srcProps.map(sp => {
        const mapped = template.mappings?.find(m => m.sourceProperty === sp.propertyName);
        return {
          sourceProperty: sp.propertyName,
          sourceDataType: sp.dataType,
          targetProperty: mapped ? mapped.targetProperty : '',
          targetDataType: mapped ? mapped.targetDataType : ''
        };
      });
      
      setMappings(reconstructedMappings);
    } catch(err) {
      console.error(err);
    }
    
    setActiveTab('create');
  };

  const resetEditor = () => {
    setEditingTemplateId(null);
    setViewingTemplate(null);
    setTemplateName('');
    setSelectedAppId('');
    setSelectedSourceClass('');
    setSelectedTargetClass('');
    setSourceClasses([]);
    setTargetClasses([]);
    setSourceProperties([]);
    setTargetProperties([]);
    setMappings([]);
  };

  return (
    <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '20px', fontWeight: 'bold' }}>
            <FileText size={20} color="#8b5cf6" /> Property Mapping
          </h2>
          <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '12px' }}>Define how custom properties map from source to target document classes.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '4px', background: 'white', padding: '4px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <button
            onClick={() => { setActiveTab('view'); resetEditor(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer', background: activeTab === 'view' ? '#f1f5f9' : 'transparent', color: activeTab === 'view' ? '#8b5cf6' : '#64748b' }}
          >
            <LayoutList size={14} /> View Mappings
          </button>
          <button
            onClick={() => setActiveTab('create')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer', background: activeTab === 'create' ? '#f1f5f9' : 'transparent', color: activeTab === 'create' ? '#8b5cf6' : '#64748b' }}
          >
            <Plus size={14} /> {editingTemplateId ? 'Edit Mapping' : 'Create Mapping'}
          </button>
        </div>
      </div>

      {error && <div style={{ padding: '12px', background: '#fef2f2', color: '#ef4444', borderLeft: '4px solid #ef4444', borderRadius: '4px', marginBottom: '16px', fontSize: '12px', fontWeight: '500' }}>{error}</div>}
      {success && <div style={{ padding: '12px', background: '#f0fdf4', color: '#10b981', borderLeft: '4px solid #10b981', borderRadius: '4px', marginBottom: '16px', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16}/> {success}</div>}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'transparent' }}>
        
        {activeTab === 'view' && !viewingTemplate && (
          <div style={{ flex: 1, overflow: 'auto', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Template Name</th>
                  <th style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>App ID</th>
                  <th style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Source Class</th>
                  <th style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target Class</th>
                  <th style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '50%' }}>
                          <Search size={32} color="#cbd5e1" />
                        </div>
                      </div>
                      <span style={{ fontSize: '15px', fontWeight: '500' }}>No mapping templates found</span>
                      <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>Switch to the Create tab to configure a new mapping.</p>
                    </td>
                  </tr>
                ) : (
                  templates.map(t => (
                    <tr 
                      key={t.templateId}
                      onClick={() => setViewingTemplate(t)}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s', cursor: 'pointer' }} 
                      onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} 
                      onMouseOut={e => e.currentTarget.style.background = 'white'}
                      title="Click to view mappings details"
                    >
                      <td style={{ padding: '6px 12px', fontSize: '13px', color: '#0f172a', fontWeight: '600' }}>{t.templateName || t.templateId}</td>
                      <td style={{ padding: '6px 12px', fontSize: '13px', color: '#64748b' }}>{t.applicationId}</td>
                      <td style={{ padding: '6px 12px', fontSize: '13px', color: '#8b5cf6', fontWeight: '500' }}>{t.sourceDocumentClass}</td>
                      <td style={{ padding: '6px 12px', fontSize: '13px', color: '#10b981', fontWeight: '500' }}>{t.targetDocumentClass}</td>
                      <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                        <button onClick={(e) => { e.stopPropagation(); handleExportCSV(t); }} style={{ padding: '4px 8px', background: '#ecfdf5', border: 'none', borderRadius: '4px', color: '#10b981', cursor: 'pointer', transition: 'background 0.2s', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '600' }} title="Export CSV">
                          <Download size={12} /> CSV
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'view' && viewingTemplate && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={() => setViewingTemplate(null)} style={{ padding: '6px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <ArrowLeft size={16} />
                </button>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a', fontWeight: 'bold' }}>{viewingTemplate.templateName || viewingTemplate.templateId} Details</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={() => handleExportCSV(viewingTemplate)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)' }}>
                  <Download size={14} /> Export CSV
                </button>
                <button onClick={() => { handleEdit(viewingTemplate); setViewingTemplate(null); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f8fafc', color: '#8b5cf6', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                  <Edit2 size={14} /> Edit
                </button>
                <button onClick={() => { handleDelete(viewingTemplate.templateId); setViewingTemplate(null); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ background: 'white', padding: '10px', borderRadius: '8px', flex: 1, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Application</div>
                <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: '600' }}>{viewingTemplate.applicationId}</div>
              </div>
              <div style={{ background: 'white', padding: '10px', borderRadius: '8px', flex: 1, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Source Class</div>
                <div style={{ fontSize: '13px', color: '#8b5cf6', fontWeight: '600' }}>{viewingTemplate.sourceDocumentClass}</div>
              </div>
              <div style={{ background: 'white', padding: '10px', borderRadius: '8px', flex: 1, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Target Class</div>
                <div style={{ fontSize: '13px', color: '#10b981', fontWeight: '600' }}>{viewingTemplate.targetDocumentClass}</div>
              </div>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto', background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Source Property</th>
                    <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Source Type</th>
                    <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target Property</th>
                    <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target Type</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingTemplate.mappings && viewingTemplate.mappings.length > 0 ? (
                    viewingTemplate.mappings.map((m, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'white'}>
                        <td style={{ padding: '8px 12px', fontSize: '12px', color: '#334155', fontWeight: '500' }}>{m.sourceProperty}</td>
                        <td style={{ padding: '8px 12px', fontSize: '11px', color: '#64748b' }}>{m.sourceDataType}</td>
                        <td style={{ padding: '8px 12px', fontSize: '12px', color: '#059669', fontWeight: '600' }}>{m.targetProperty}</td>
                        <td style={{ padding: '8px 12px', fontSize: '11px', color: '#64748b' }}>{m.targetDataType}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>No properties mapped.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Header Configuration Panel */}
            <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Template Name</label>
                <input 
                  type="text"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="e.g., Invoice Migration v2"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', color: '#0f172a', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = '#8b5cf6'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Application</label>
                <select 
                  value={selectedAppId}
                  onChange={e => handleAppChange(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', color: '#0f172a', background: 'white' }}
                >
                  <option value="">-- Select Application --</option>
                  {applications.map(a => <option key={a.appId} value={a.appId}>{a.appName || a.appId}</option>)}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Source Document Class</label>
                <select 
                  value={selectedSourceClass}
                  onChange={e => handleSourceClassChange(e.target.value)}
                  disabled={!selectedAppId}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', color: '#8b5cf6', fontWeight: '500', background: !selectedAppId ? '#f8fafc' : 'white' }}
                >
                  <option value="">-- Select Source Class --</option>
                  {sourceClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Target Document Class</label>
                <select 
                  value={selectedTargetClass}
                  onChange={e => handleTargetTargetClassChange(e.target.value)}
                  disabled={!selectedAppId}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', color: '#10b981', fontWeight: '500', background: !selectedAppId ? '#f8fafc' : 'white' }}
                >
                  <option value="">-- Select Target Class --</option>
                  {targetClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Mapping Grid */}
            <div style={{ flex: 1, background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              
              <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                <div>
                  <h3 style={{ margin: '0 0 2px 0', fontSize: '14px', color: '#0f172a', fontWeight: '600' }}>Property Mapping Grid</h3>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                    {mappings.length > 0 
                      ? `Found ${mappings.length} custom properties in source class.` 
                      : 'Select a Source Document Class to load properties.'}
                  </p>
                </div>
                <button 
                  onClick={handleSave}
                  disabled={loading || mappings.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: (loading || mappings.length===0) ? 'not-allowed' : 'pointer', boxShadow: '0 2px 4px rgba(139, 92, 246, 0.2)', transition: 'transform 0.1s' }}
                  onMouseDown={e => { if(!loading && mappings.length>0) e.currentTarget.style.transform = 'scale(0.98)' }}
                  onMouseUp={e => { if(!loading && mappings.length>0) e.currentTarget.style.transform = 'scale(1)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  <Save size={14} /> {loading ? 'Saving...' : 'Save Mapping'}
                </button>
              </div>

              <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: 'white', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 0 #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '8px 16px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Source Property Name</th>
                      <th style={{ padding: '8px 16px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Source Data Type</th>
                      <th style={{ padding: '8px 16px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f0fdf4' }}>Target Property Name</th>
                      <th style={{ padding: '8px 16px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f0fdf4' }}>Target Data Type</th>
                      <th style={{ padding: '8px 16px', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                          <LayoutList size={32} color="#cbd5e1" style={{ marginBottom: '12px', opacity: 0.5 }} />
                          <p style={{ margin: 0, fontSize: '13px' }}>Grid is empty.</p>
                        </td>
                      </tr>
                    ) : (
                      mappings.map((m, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#fafaf9' }}>
                          <td style={{ padding: '6px 16px' }}>
                            <span style={{ display: 'inline-block', padding: '2px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '12px', color: '#334155', fontWeight: '500', border: '1px solid #e2e8f0' }}>
                              {m.sourceProperty}
                            </span>
                          </td>
                          <td style={{ padding: '6px 16px', fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                            {m.sourceDataType || 'UNKNOWN'}
                          </td>
                          
                          <td style={{ padding: '6px 16px', background: '#f0fdf4' }}>
                            <select 
                              value={m.targetProperty || ''}
                              onChange={e => updateMappingRowTarget(idx, e.target.value)}
                              disabled={!selectedTargetClass}
                              style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #86efac', fontSize: '12px', outline: 'none', color: '#065f46', fontWeight: '500', background: 'white', cursor: selectedTargetClass ? 'pointer' : 'not-allowed' }}
                            >
                              <option value="">-- Do Not Map --</option>
                              {targetProperties.map(tp => (
                                <option key={tp.propertyName} value={tp.propertyName}>{tp.propertyName}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '6px 16px', fontSize: '11px', color: '#059669', fontWeight: '600', background: '#f0fdf4' }}>
                            {m.targetDataType || '-'}
                          </td>
                          <td style={{ padding: '6px 16px', textAlign: 'right' }}>
                            <button 
                              onClick={() => removeMappingRow(idx)} 
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.6, transition: 'opacity 0.2s', padding: '4px' }}
                              onMouseOver={e => e.currentTarget.style.opacity = 1}
                              onMouseOut={e => e.currentTarget.style.opacity = 0.6}
                              title="Remove mapping"
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
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
