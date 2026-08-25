import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { BASE, apiGetTenantConfig } from '../utils/api';
import { Search, Database, HardDrive, Cpu, Archive, Star, Loader2 } from 'lucide-react';
import SystemDiscovery from './SystemDiscovery';
import DrillDownView from './DrillDownView';
import DataExplorer from './DataExplorer';
import MigrationWaves from './MigrationWaves';

export default function MigrationDiscovery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'sql';
  const setActiveTab = (tab) => setSearchParams({ tab });

  const tabs = [
    { id: 'sql', label: 'SQL Query' },
    { id: 'summary', label: 'Discovery Summary' },
    { id: 'explorer', label: 'Data Explorer' },
    { id: 'drilldown', label: 'Drill Down' },
    { id: 'quality', label: 'Data Quality' },
    { id: 'strategy', label: 'Migration Strategy' },
    { id: 'groups', label: 'Migration Groups' },
    { id: 'waves', label: 'Migration Waves' },
    { id: 'saved', label: 'Saved Discoveries' }
  ];

  // SQL Query state
  const [selectedQuery, setSelectedQuery] = useState('');
  const [queryData, setQueryData] = useState(null);
  const [loadingQuery, setLoadingQuery] = useState(false);

  const libraryQueries = {
    'doc-count': { name: 'Document Count (Volume)', sql: "SELECT class_name, COUNT(*) as doc_count, SUM(content_size) as total_size FROM docversion GROUP BY class_name;" },
    'doc-year-wise': { name: 'Year-Wise Trend (Volume)', sql: "SELECT class_name, EXTRACT(YEAR FROM created_date), COUNT(*) FROM docversion GROUP BY class_name, EXTRACT(YEAR FROM created_date);" },
    'doc-mime': { name: 'MIME Type Distribution (Format)', sql: "SELECT mime_type, COUNT(*) as doc_count FROM docversion GROUP BY mime_type;" },
    'size-bucket': { name: 'Size Buckets (Size)', sql: "SELECT CASE WHEN content_size = 0 THEN '0. No Content' WHEN content_size < 1048576 THEN '1. < 1MB' ELSE '2. > 1MB' END as size_bucket, COUNT(*) FROM docversion GROUP BY size_bucket;" },
    'size-total': { name: 'Total Size (Size)', sql: "SELECT class_name, SUM(content_size) as total_size_bytes FROM docversion GROUP BY class_name;" },
    'no-content': { name: 'No Content Elements (Size)', sql: "SELECT class_name, COUNT(*) as docs_without_content FROM docversion dv LEFT JOIN content c ON dv.id = c.doc_id WHERE c.id IS NULL GROUP BY class_name;" },
    'annotation-total': { name: 'Total Annotations (Components)', sql: "SELECT class_name, COUNT(a.id) as total_annotations FROM docversion dv JOIN annotation a ON a.doc_id = dv.id GROUP BY class_name;" },
    'annotation-mime': { name: 'Annotations by MIME (Components)', sql: "SELECT a.mime_type, COUNT(*) as total_annotations FROM annotation a GROUP BY a.mime_type;" },
    'custom-object-trend': { name: 'Custom Object Trend (Components)', sql: "SELECT class_name, COUNT(*) as object_count FROM customobject GROUP BY class_name;" },
    'version-summary': { name: 'Version Summary (Versions)', sql: "SELECT class_name, COUNT(DISTINCT series_id) as unique_docs, COUNT(*) as total_versions FROM docversion GROUP BY class_name;" },
    'version-distribution': { name: 'Version Distribution (Versions)', sql: "SELECT class_name, version_status, COUNT(*) as doc_count FROM docversion GROUP BY class_name, version_status;" },
    'element-total': { name: 'Total Content Elements (Elements)', sql: "SELECT COUNT(*) as total_content_elements FROM content;" },
    'element-class': { name: 'Elements per Document Class (Elements)', sql: "SELECT class_name, COUNT(c.id) as element_count FROM docversion dv JOIN content c ON dv.id = c.doc_id GROUP BY class_name;" },
    'property-defs': { name: 'Property Definitions (Properties)', sql: "SELECT class_name, property_name, data_type FROM propertydefinition;" },
    'retrieval-hex-blob': { name: 'Retrieval Names Hex/Blob (Hex/Blob)', sql: "SELECT retrieval_name, COUNT(*) as cnt FROM content WHERE content_blob IS NOT NULL GROUP BY retrieval_name;" },
    'component-hex-blob': { name: 'Component Types Hex/Blob (Hex/Blob)', sql: "SELECT component_type, COUNT(*) as cnt FROM content WHERE content_blob IS NOT NULL GROUP BY component_type;" },
    'content-hex-blob': { name: 'Content Info Hex/Blob (Hex/Blob)', sql: "SELECT content_info, COUNT(*) as cnt FROM content WHERE content_blob IS NOT NULL GROUP BY content_info;" }
  };

  const handleRunQuery = async () => {
    if (!selectedQuery) return;
    setLoadingQuery(true);
    try {
      const configRes = await apiGetTenantConfig();
      const firstAppId = configRes?.applications?.[0]?.appId || 'default';
      const res = await axios.post(`${BASE}/discovery/${selectedQuery}`, { appId: firstAppId });
      setQueryData(res.data);
    } catch (err) {
      console.error(err);
      setQueryData([{ error: 'Failed to execute query' }]);
    }
    setLoadingQuery(false);
  };

  return (
    <div style={{ padding: '14px 20px', background: '#f8fafc', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid #E3E7EE', marginBottom: '20px', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ 
              padding: '11px 18px', fontSize: '13px', fontWeight: '600', 
              color: activeTab === tab.id ? '#2563EB' : '#6B7280', 
              borderBottom: `2px solid ${activeTab === tab.id ? '#2563EB' : 'transparent'}`, 
              background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Areas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'sql' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(16,24,40,.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>SQL Editor (Read-Only)</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6B7280' }}>Query the source repository directly to discover content population</p>
                </div>
                <select 
                  value={selectedQuery} 
                  onChange={e => { setSelectedQuery(e.target.value); setQueryData(null); }}
                  style={{ border: '1px solid #E3E7EE', borderRadius: '6px', padding: '8px 12px', fontSize: '12.5px', outline: 'none' }}
                >
                  <option value="">Load from Query Library...</option>
                  {Object.entries(libraryQueries).map(([key, q]) => (
                    <option key={key} value={key}>{q.name}</option>
                  ))}
                </select>
              </div>
              
              <textarea 
                readOnly
                value={selectedQuery ? libraryQueries[selectedQuery].sql : ''}
                style={{ width: '100%', height: '140px', background: '#F8FAFC', border: '1px solid #E3E7EE', borderRadius: '6px', padding: '12px', fontFamily: 'monospace', fontSize: '12.5px', color: '#475569', resize: 'vertical' }}
              />

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button 
                  onClick={handleRunQuery}
                  disabled={!selectedQuery || loadingQuery}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', fontSize: '12.5px', fontWeight: '600', background: (!selectedQuery || loadingQuery) ? '#93C5FD' : '#2563EB', color: '#fff', border: 'none', cursor: (!selectedQuery || loadingQuery) ? 'not-allowed' : 'pointer' }}
                >
                  {loadingQuery ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  Run Query
                </button>
              </div>
            </div>

            {queryData && (
              <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(16,24,40,.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>Query Results Preview <span style={{ fontSize: '11px', color: '#98A2B3', fontWeight: 'normal', marginLeft: '6px' }}>{queryData.length} rows</span></h3>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                    <thead>
                      <tr>
                        {queryData.length > 0 && Object.keys(queryData[0]).map(key => (
                          <th key={key} style={{ textAlign: 'left', padding: '9px 12px', borderBottom: '1px solid #E3E7EE', background: '#FAFBFC', color: '#98A2B3', fontSize: '10.5px', textTransform: 'uppercase' }}>{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryData.slice(0, 10).map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map((val, j) => (
                            <td key={j} style={{ padding: '10px 12px', borderBottom: '1px solid #E3E7EE', color: '#111827' }}>{String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {queryData.length > 10 && (
                    <div style={{ padding: '12px', textAlign: 'center', color: '#98A2B3', fontSize: '12px' }}>Showing first 10 rows. Export to view all.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'summary' && (
          <div style={{ flex: 1, minHeight: 0 }}>
            <SystemDiscovery />
          </div>
        )}

        {activeTab === 'drilldown' && (
          <div style={{ flex: 1, minHeight: 0 }}>
            <DrillDownView />
          </div>
        )}

        {activeTab === 'explorer' && (
          <div style={{ flex: 1, minHeight: 0 }}>
            <DataExplorer />
          </div>
        )}

        {activeTab === 'waves' && (
          <div style={{ flex: 1, minHeight: 0 }}>
            <MigrationWaves />
          </div>
        )}

        {activeTab !== 'sql' && activeTab !== 'summary' && activeTab !== 'drilldown' && activeTab !== 'explorer' && activeTab !== 'waves' && (
          <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '18px 20px' }}>
            <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>{tabs.find(t => t.id === activeTab)?.label} Content Area</div>
          </div>
        )}
      </div>

    </div>
  );
}
