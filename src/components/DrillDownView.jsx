import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BASE, apiGetTenantConfig } from '../utils/api';
import { ChevronRight, RefreshCw, Download } from 'lucide-react';
import appMapping from '../config/appMapping.json';

const APP_MAPPING = appMapping;

export default function DrillDownView() {
  const [drillLevel, setDrillLevel] = useState(0); // 0: Class, 1: Year, 2: Month
  const [drillPath, setDrillPath] = useState([{ level: 0, label: 'All Documents', value: null }]);
  const [drillData, setDrillData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalDocs, setTotalDocs] = useState(0);

  const [appFilter, setAppFilter] = useState('All Departments');
  const apps = ['All Departments', ...Object.keys(APP_MAPPING)];

  const [drillCache, setDrillCache] = useState({});

  const fetchDrillData = async (level, path) => {
    const cacheKey = JSON.stringify({ level, path });
    if (drillCache[cacheKey]) {
      const cachedData = drillCache[cacheKey];
      setTotalDocs(cachedData.total);
      setDrillData(cachedData.drillData);
      return;
    }

    setLoading(true);
    try {
      const configRes = await apiGetTenantConfig();
      const appId = configRes?.applications?.[0]?.appId || 'default';
      let endpoint = '';
      let payload = { appId };

      if (level === 0) {
        endpoint = 'doc-count';
      } else if (level === 1) {
        endpoint = 'doc-year-wise';
        payload.documentClasses = [path.find(p => p.level === 1).value];
      } else if (level === 2) {
        endpoint = 'doc-year-month';
        const docClass = path.find(p => p.level === 1).value;
        const year = path.find(p => p.level === 2).value;
        payload.documentClasses = [docClass];
        payload.createdFrom = `${year}-01-01`;
        payload.createdTo = `${year}-12-31`;
      }

      const res = await axios.post(`${BASE}/discovery/${endpoint}`, payload);
      let data = res.data;
      
      // Calculate total docs for %
      const total = data.reduce((acc, row) => acc + Number(row.total_documents || row.TOTAL_DOCUMENTS || 0), 0);
      setTotalDocs(total);

      // Format data based on level
      let newDrillData = [];
      if (level === 0) {
        newDrillData = data.map(row => ({
          name: row.class_name || row.CLASS_NAME,
          documents: Number(row.total_documents || row.TOTAL_DOCUMENTS || 0),
          sizeBytes: Number(row.total_size_bytes || row.TOTAL_SIZE_BYTES || 0),
          sizeGb: Number(row.total_size_gb || row.TOTAL_SIZE_GB || 0),
        }));
      } else if (level === 1) {
        newDrillData = data.map(row => ({
          name: row.creation_year || row.CREATION_YEAR,
          documents: Number(row.total_documents || row.TOTAL_DOCUMENTS || 0),
          sizeBytes: Number(row.total_size_bytes || row.TOTAL_SIZE_BYTES || 0),
          sizeGb: Number(row.total_size_gb || row.TOTAL_SIZE_GB || 0),
        }));
      } else if (level === 2) {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        newDrillData = data.map(row => {
          const m = Number(row.creation_month || row.CREATION_MONTH || 1);
          return {
            name: monthNames[m - 1],
            documents: Number(row.total_documents || row.TOTAL_DOCUMENTS || 0),
            sizeBytes: Number(row.total_size_bytes || row.TOTAL_SIZE_BYTES || 0),
            sizeGb: Number(row.total_size_gb || row.TOTAL_SIZE_GB || 0),
          };
        });
      }

      setDrillData(newDrillData);
      setDrillCache(prev => ({ ...prev, [cacheKey]: { total, drillData: newDrillData } }));

    } catch (err) {
      console.error(err);
      setDrillData([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDrillData(0, drillPath);
  }, []);

  const handleRowClick = (row) => {
    if (drillLevel === 0) {
      const newPath = [...drillPath, { level: 1, label: `Document Class: ${row.name}`, value: row.name }];
      setDrillPath(newPath);
      setDrillLevel(1);
      fetchDrillData(1, newPath);
    } else if (drillLevel === 1) {
      const newPath = [...drillPath, { level: 2, label: `Year: ${row.name}`, value: row.name }];
      setDrillPath(newPath);
      setDrillLevel(2);
      fetchDrillData(2, newPath);
    }
  };

  const handleBreadcrumbClick = (idx) => {
    const newPath = drillPath.slice(0, idx + 1);
    const newLevel = newPath[newPath.length - 1].level;
    setDrillPath(newPath);
    setDrillLevel(newLevel);
    fetchDrillData(newLevel, newPath);
  };

  const formatSize = (bytes, gb) => {
    if (gb && gb > 0) return `${gb.toFixed(2)} GB`;
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDrillData = drillLevel === 0 && appFilter !== 'All Departments' 
    ? drillData.filter(row => {
        const allowedClasses = APP_MAPPING[appFilter] || [];
        return allowedClasses.some(c => c.toLowerCase() === row.name.toLowerCase());
      })
    : drillData;

  const currentTotalDocs = drillLevel === 0 && appFilter !== 'All Departments'
    ? filteredDrillData.reduce((sum, row) => sum + row.documents, 0)
    : totalDocs;

  const exportCSV = () => {
    const headers = ['DOCUMENT TYPE', 'Total Documents', 'Total Size in MB', 'Total Size in GB'];
    const csvContent = [
      headers.join(','),
      ...filteredDrillData.map(row => {
        return `"${row.name}",${row.documents},${(row.sizeBytes / (1024 * 1024)).toFixed(2)},${(row.sizeBytes / (1024 * 1024 * 1024)).toFixed(2)}`;
      })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `drilldown_level${drillLevel}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '12px', boxShadow: '0 1px 2px rgba(16,24,40,.04)' }}>
      {/* Header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {drillLevel === 0 && (
            <>
              <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Department:</span>
              <select 
                value={appFilter}
                onChange={(e) => setAppFilter(e.target.value)}
                style={{ padding: '4px 10px', border: '1px solid #E3E7EE', borderRadius: '6px', fontSize: '13px', color: '#111827', outline: 'none' }}>
                {apps.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </>
          )}

          <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500', marginLeft: drillLevel === 0 ? '12px' : '0' }}>Grouping:</span>
          <select disabled style={{ padding: '4px 10px', border: '1px solid #E3E7EE', borderRadius: '6px', fontSize: '13px', color: '#111827', outline: 'none', background: '#F9FAFB' }}>
            <option>{drillLevel === 0 ? 'By Document Class' : drillLevel === 1 ? 'By Year' : 'By Month'}</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={() => handleBreadcrumbClick(0)}
            style={{ background: 'transparent', border: 'none', color: '#6B7280', fontSize: '13px', fontWeight: '500', cursor: 'pointer', padding: '4px' }}
          >
            Reset Analysis
          </button>
          <button 
            onClick={exportCSV}
            style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '6px', padding: '4px 10px', color: '#111827', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
          >
            Export Results
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div style={{ border: '1px solid #E3E7EE', borderRadius: '6px', padding: '8px 10px', marginBottom: '12px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
        {drillPath.map((crumb, idx) => (
          <React.Fragment key={idx}>
            <span 
              onClick={() => handleBreadcrumbClick(idx)}
              style={{ 
                fontSize: '13px', 
                color: idx === drillPath.length - 1 ? '#111827' : '#2563EB', 
                fontWeight: idx === drillPath.length - 1 ? '700' : '500',
                cursor: idx === drillPath.length - 1 ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center'
              }}
            >
              {crumb.label}
              {idx === 0 && idx === drillPath.length - 1 && ` (${currentTotalDocs.toLocaleString()})`}
            </span>
            {idx < drillPath.length - 1 && <ChevronRight size={14} color="#9CA3AF" />}
          </React.Fragment>
        ))}
      </div>

      {/* Data Table */}
      <div style={{ border: '1px solid #E3E7EE', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#FAFBFC', borderBottom: '1px solid #E3E7EE' }}>
              <th style={{ padding: '8px 12px', fontSize: '11px', color: '#98A2B3', fontWeight: '700', textTransform: 'uppercase' }}>
                {drillLevel === 0 ? 'DOCUMENT CLASS' : drillLevel === 1 ? 'YEAR' : 'MONTH'}
              </th>
              <th style={{ padding: '8px 12px', fontSize: '11px', color: '#98A2B3', fontWeight: '700', textTransform: 'uppercase' }}>TOTAL DOCUMENTS</th>
              <th style={{ padding: '8px 12px', fontSize: '11px', color: '#98A2B3', fontWeight: '700', textTransform: 'uppercase' }}>TOTAL SIZE IN MB</th>
              <th style={{ padding: '8px 12px', fontSize: '11px', color: '#98A2B3', fontWeight: '700', textTransform: 'uppercase' }}>TOTAL SIZE IN GB</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>Loading data...</td>
              </tr>
            ) : filteredDrillData.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>No data available for this selection.</td>
              </tr>
            ) : (
              filteredDrillData.map((row, i) => {
                const pct = currentTotalDocs > 0 ? (row.documents / currentTotalDocs) * 100 : 0;
                const isClickable = drillLevel < 2;
                return (
                  <tr 
                    key={i} 
                    onClick={() => isClickable && handleRowClick(row)}
                    style={{ 
                      borderBottom: '1px solid #F1F2F4', 
                      cursor: isClickable ? 'pointer' : 'default',
                      transition: 'background 0.2s',
                    }}
                    onMouseOver={(e) => { if(isClickable) e.currentTarget.style.background = '#F3F6FD'; }}
                    onMouseOut={(e) => { if(isClickable) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '9px 12px', fontSize: '13px', color: '#111827', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isClickable ? <ChevronRight size={14} color="#6B7280" /> : <div style={{ width: '14px' }}></div>}
                      {row.name}
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: '13px', color: '#475569' }}>
                      {row.documents.toLocaleString()}
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: '13px', color: '#475569' }}>
                      {(row.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: '13px', color: '#475569' }}>
                      {(row.sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
