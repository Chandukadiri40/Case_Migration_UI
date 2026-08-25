import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BASE, apiGetTenantConfig } from '../utils/api';
import { Download } from 'lucide-react';
import appMapping from '../config/appMapping.json';

const APP_MAPPING = appMapping;

export default function DataExplorer() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [appFilter, setAppFilter] = useState('All Departments');
  const [classFilter, setClassFilter] = useState('All Document Classes');
  const [yearFilter, setYearFilter] = useState('All Years');
  const [searchFilter, setSearchFilter] = useState('');

  // Selected Rows
  const [selectedRows, setSelectedRows] = useState(new Set());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const configRes = await apiGetTenantConfig();
        const appId = configRes?.applications?.[0]?.appId || 'default';
        const res = await axios.post(`${BASE}/discovery/doc-year-wise`, { appId });
        
        const formatted = res.data.map((row, i) => ({
          id: `row-${i}`,
          className: row.class_name || row.CLASS_NAME || 'Unknown',
          year: row.creation_year || row.CREATION_YEAR || 'Unknown',
          documents: Number(row.total_documents || row.TOTAL_DOCUMENTS || 0),
          sizeBytes: Number(row.total_size_bytes || row.TOTAL_SIZE_BYTES || 0),
          sizeGb: Number(row.total_size_gb || row.TOTAL_SIZE_GB || 0)
        }));
        
        setData(formatted);
      } catch (err) {
        console.error("Failed to load Data Explorer data", err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Filter Data
  let filteredData = data.filter(row => {
    if (appFilter !== 'All Departments') {
      const allowedClasses = APP_MAPPING[appFilter] || [];
      if (!allowedClasses.some(c => c.toLowerCase() === row.className.toLowerCase())) return false;
    }
    if (classFilter !== 'All Document Classes' && row.className !== classFilter) return false;
    if (yearFilter !== 'All Years' && String(row.year) !== yearFilter) return false;
    if (searchFilter && !row.className.toLowerCase().includes(searchFilter.toLowerCase()) && !String(row.year).includes(searchFilter)) return false;
    return true;
  });

  // Aggregate by class if "All Years" is selected
  if (yearFilter === 'All Years') {
    const aggregated = {};
    filteredData.forEach(row => {
      if (!aggregated[row.className]) {
        aggregated[row.className] = { ...row, id: `agg-${row.className}`, year: 'All Years', documents: 0, sizeBytes: 0, sizeGb: 0 };
      }
      aggregated[row.className].documents += row.documents;
      aggregated[row.className].sizeBytes += row.sizeBytes;
      aggregated[row.className].sizeGb += row.sizeGb;
    });
    // Sort aggregated by class name alphabetically to keep it clean
    filteredData = Object.values(aggregated).sort((a, b) => a.className.localeCompare(b.className));
  }

  // Extract unique filter options
  const availableDataForClasses = data.filter(row => {
    if (appFilter !== 'All Departments') {
      const allowedClasses = APP_MAPPING[appFilter] || [];
      if (!allowedClasses.some(c => c.toLowerCase() === row.className.toLowerCase())) return false;
    }
    return true;
  });
  const classes = ['All Document Classes', ...new Set(availableDataForClasses.map(d => d.className))].sort();
  const years = ['All Years', ...new Set(data.map(d => String(d.year)))].sort((a,b) => b.localeCompare(a)); // Newest first
  const apps = ['All Departments', ...Object.keys(APP_MAPPING)];

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(new Set(filteredData.map(d => d.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (id) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedRows(newSet);
  };

  const exportCSV = () => {
    const headers = ['DOCUMENT CLASS', 'YEAR', 'DOCUMENTS', 'SIZE (MB)', 'SIZE (GB)'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => {
        return `"${row.className}","${row.year}",${row.documents},${(row.sizeBytes / (1024 * 1024)).toFixed(2)},${(row.sizeBytes / (1024 * 1024 * 1024)).toFixed(2)}`;
      })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'data_explorer_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 2px rgba(16,24,40,.04)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#111827' }}>Discovery Data Table</h2>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}>
          Candidate populations identified from the discovery query — use filters to isolate subsets of documents.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
          <input 
            type="text" 
            placeholder="Search classes or years..." 
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #E3E7EE', fontSize: '13px', outline: 'none', minWidth: '180px' }}
          />
          
          <select 
            value={appFilter} 
            onChange={(e) => {
              setAppFilter(e.target.value);
              setClassFilter('All Document Classes'); // Reset class when department changes
            }}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #E3E7EE', fontSize: '13px', outline: 'none', background: '#fff', cursor: 'pointer' }}
          >
            {apps.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          
          <select 
            value={yearFilter} 
            onChange={(e) => setYearFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #E3E7EE', fontSize: '13px', outline: 'none', background: '#fff', cursor: 'pointer' }}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <select 
            value={classFilter} 
            onChange={(e) => setClassFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #E3E7EE', fontSize: '13px', outline: 'none', background: '#fff', cursor: 'pointer' }}
          >
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <button 
          onClick={exportCSV}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid #E3E7EE', borderRadius: '6px', padding: '8px 14px', color: '#111827', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      <div style={{ flex: 1, border: '1px solid #E3E7EE', borderRadius: '8px', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#FAFBFC', zIndex: 1 }}>
            <tr style={{ borderBottom: '1px solid #E3E7EE' }}>
              <th style={{ padding: '12px', width: '40px' }}>
                <input 
                  type="checkbox" 
                  checked={filteredData.length > 0 && selectedRows.size === filteredData.length}
                  onChange={handleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '12px', fontSize: '11px', color: '#6B7280', fontWeight: '700', textTransform: 'uppercase' }}>DOCUMENT CLASS</th>
              <th style={{ padding: '12px', fontSize: '11px', color: '#6B7280', fontWeight: '700', textTransform: 'uppercase' }}>YEAR</th>
              <th style={{ padding: '12px', fontSize: '11px', color: '#6B7280', fontWeight: '700', textTransform: 'uppercase' }}>DOCUMENTS</th>
              <th style={{ padding: '12px', fontSize: '11px', color: '#6B7280', fontWeight: '700', textTransform: 'uppercase' }}>SIZE (GB)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#6B7280' }}>Loading explorer data...</td></tr>
            ) : filteredData.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#6B7280' }}>No matching data found.</td></tr>
            ) : (
              filteredData.map(row => (
                <tr 
                  key={row.id} 
                  style={{ borderBottom: '1px solid #F1F2F4', background: selectedRows.has(row.id) ? '#F3F6FD' : '#fff' }}
                >
                  <td style={{ padding: '12px' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedRows.has(row.id)}
                      onChange={() => handleSelectRow(row.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#111827', fontWeight: '500' }}>{row.className}</td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#4B5563' }}>{row.year}</td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#4B5563' }}>{row.documents.toLocaleString()}</td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#4B5563' }}>
                    {(row.sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div style={{ marginTop: '12px', fontSize: '12px', color: '#6B7280', display: 'flex', justifyContent: 'space-between' }}>
        <span>Showing {filteredData.length} rows</span>
        {selectedRows.size > 0 && <span>{selectedRows.size} rows selected</span>}
      </div>
      
    </div>
  );
}
