import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Search, ShieldAlert, Database, ArrowDown, ArrowUp, Download, Plus, Trash2 } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import appsData from '../apps.json'

export default function Exceptions() {
    const [apps, setApps] = useState([])
    const [selectedApp, setSelectedApp] = useState('')

    // New Filters
    const [docClasses, setDocClasses] = useState([])
    const [selectedDocClass, setSelectedDocClass] = useState('')
    const [objectId, setObjectId] = useState('')
    const [createdFrom, setCreatedFrom] = useState('')
    const [createdTo, setCreatedTo] = useState('')
    const [customMetadata, setCustomMetadata] = useState([])
    const [metadataFields, setMetadataFields] = useState([])

    // Data is now an object holding arrays for source, staging, target
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [sortConfigs, setSortConfigs] = useState({})

    useEffect(() => {
        setApps(appsData)
    }, [])

    // Fetch Doc Classes when App changes
    useEffect(() => {
        if (!selectedApp) return;
        axios.get(`http://localhost:8080/api/discovery/doc-classes?appId=${selectedApp}`)
            .then(res => {
                setDocClasses(res.data);
                setSelectedDocClass('');
            })
            .catch(console.error);
            
        axios.get(`http://localhost:8080/api/exceptions/metadata-fields?appId=${selectedApp}`)
            .then(res => setMetadataFields(res.data))
            .catch(console.error);
    }, [selectedApp]);

    const addCustomField = () => {
        setCustomMetadata([...customMetadata, { field: '', operator: 'EQUALS', value: '' }]);
    };

    const updateCustomMetadata = (index, key, value) => {
        const updated = [...customMetadata];
        updated[index][key] = value;
        setCustomMetadata(updated);
    };

    const removeCustomMetadata = (index) => {
        setCustomMetadata(customMetadata.filter((_, i) => i !== index));
    };

    const searchExceptions = (e) => {
        e.preventDefault()
        if (!selectedApp) {
            alert("Please select a Target Object Store before searching.")
            return
        }
        if (!selectedDocClass) {
            alert("Please select a Document Class (or 'All').")
            return
        }
        setLoading(true)

        const criteria = { appId: selectedApp };
        if (objectId) criteria.objectId = objectId;
        if (selectedDocClass !== 'All') criteria.documentClasses = [selectedDocClass];
        if (createdFrom) criteria.createdFrom = createdFrom;
        if (createdTo) criteria.createdTo = createdTo;
        if (customMetadata.length > 0) {
            criteria.customMetadata = customMetadata.filter(m => m.field && m.value);
        }

        axios.post('http://localhost:8080/api/exceptions/check', criteria)
            .then(res => setData(res.data))
            .catch(console.error)
            .finally(() => setLoading(false))
    }

    const handleSort = (title, key) => {
        setSortConfigs(prev => {
            const current = prev[title] || { key: null, direction: 'ascending' };
            let direction = 'ascending';
            if (current.key === key && current.direction === 'ascending') {
                direction = 'descending';
            }
            return { ...prev, [title]: { key, direction } };
        });
    };

    const exportTableToCSV = (title, sortedData) => {
        const csv = Papa.unparse(sortedData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${title}_export.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportTableToExcel = (title, sortedData) => {
        const worksheet = XLSX.utils.json_to_sheet(sortedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, `${title}_export.xlsx`);
    };

    const renderTable = (title, tableData) => {
        if (!tableData || tableData.length === 0) return null;
        
        const sortConfig = sortConfigs[title] || { key: null, direction: 'ascending' };
        
        let sortedData = [...tableData];
        if (sortConfig.key !== null) {
            sortedData.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        
        const columns = Object.keys(tableData[0]);

        return (
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, color: '#1976d2', borderBottom: '2px solid #1976d2', paddingBottom: '4px', display: 'inline-block', fontSize: '14px' }}>{title} Table ({tableData.length} records)</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => exportTableToCSV(title, sortedData)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', color: '#374151' }}>
                            <Download size={12} /> CSV
                        </button>
                        <button onClick={() => exportTableToExcel(title, sortedData)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#10b981', color: 'white', cursor: 'pointer' }}>
                            <Download size={12} /> Excel
                        </button>
                    </div>
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
                        <thead>
                            <tr style={{ background: '#f5f5f5' }}>
                                {columns.map(col => (
                                    <th key={col} onClick={() => handleSort(title, col)} style={{ padding: '8px', borderBottom: '2px solid #ddd', borderRight: '1px solid #e0e0e0', borderLeft: '1px solid #e0e0e0', fontWeight: '600', color: '#333', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            {col.toUpperCase()}
                                            {sortConfig.key === col ? (
                                                sortConfig.direction === 'ascending' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                            ) : null}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedData.map((row, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? 'white' : '#fafafa' }} onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'} onMouseOut={(e) => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#fafafa'}>
                                    {columns.map(col => (
                                        <td key={col} style={{ padding: '6px 8px', color: '#555', borderRight: '1px solid #e0e0e0', borderLeft: '1px solid #e0e0e0', whiteSpace: 'nowrap' }}>
                                            {row[col] !== null ? String(row[col]) : <em style={{ color: '#aaa' }}>NULL</em>}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="exceptions-container" style={{ padding: '14px', background: '#f8f9fa', minHeight: '100%' }}>
            
            <div className="filters-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '14px', background: 'white', padding: '12px 16px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                <h2 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '16px', fontWeight: 'bold' }}>
                    <ShieldAlert size={20} color="#4f46e5" /> Exceptions and evidence
                </h2>
                
                <form onSubmit={searchExceptions}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', alignItems: 'end', width: '100%' }}>
                        <div>
                            <label style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>App / Object Store</label>
                            <select value={selectedApp} onChange={e => setSelectedApp(e.target.value)} style={{ padding: '5px 8px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#4f46e5'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}>
                                <option value="">-- Select Object Store --</option>
                                {apps.map(a => <option key={a.appId} value={a.appId}>{a.appName}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <label style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Document Class</label>
                            <select value={selectedDocClass} onChange={e => setSelectedDocClass(e.target.value)} style={{ padding: '5px 8px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#4f46e5'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}>
                                <option value="">-- Select Document Class --</option>
                                <option value="All">All Classes</option>
                                {docClasses.map(dc => <option key={dc} value={dc}>{dc}</option>)}
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Object ID (GUID)</label>
                            <input type="text" value={objectId} onChange={e => setObjectId(e.target.value)} placeholder="Enter GUID..." style={{ padding: '5px 8px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#4f46e5'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'} />
                        </div>

                        <div>
                            <label style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Start Date</label>
                            <input type="date" value={createdFrom} onChange={e => setCreatedFrom(e.target.value)} style={{ padding: '5px 8px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#4f46e5'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'} />
                        </div>
                        
                        <div>
                            <label style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>End Date</label>
                            <input type="date" value={createdTo} onChange={e => setCreatedTo(e.target.value)} style={{ padding: '5px 8px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#4f46e5'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'} />
                        </div>
                    </div>

                    <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: customMetadata.length > 0 ? '12px' : '0' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e293b' }}>Custom Metadata Filters</span>
                            <button type="button" onClick={addCustomField} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '10px', background: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background='#c7d2fe'} onMouseOut={(e) => e.target.style.background='#e0e7ff'}>
                                <Plus size={12} /> Add Field
                            </button>
                        </div>
                        
                        {customMetadata.map((cm, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                <select value={cm.field} onChange={(e) => updateCustomMetadata(idx, 'field', e.target.value)} style={{ padding: '5px 8px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none' }}>
                                    <option value="">-- Select Field --</option>
                                    {metadataFields.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                                <select value={cm.operator} onChange={(e) => updateCustomMetadata(idx, 'operator', e.target.value)} style={{ padding: '5px 8px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none' }}>
                                    <option value="EQUALS">Equals</option>
                                    <option value="CONTAINS">Contains</option>
                                    <option value="STARTS_WITH">Starts With</option>
                                    <option value="ENDS_WITH">Ends With</option>
                                </select>
                                <input type="text" value={cm.value} onChange={(e) => updateCustomMetadata(idx, 'value', e.target.value)} placeholder="Value..." style={{ padding: '5px 8px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none', boxSizing: 'border-box' }} />
                                <button type="button" onClick={() => removeCustomMetadata(idx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                        <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '6px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }} onMouseOver={(e) => { e.target.style.background = '#4338ca'; e.target.style.transform = 'translateY(-1px)'; }} onMouseOut={(e) => { e.target.style.background = '#4f46e5'; e.target.style.transform = 'translateY(0)'; }}>
                            <Search size={14} /> Search Exceptions
                        </button>
                    </div>
                </form>
            </div>

            <div className="grid-container" style={{ background: 'white', padding: '14px', borderRadius: '16px', minHeight: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', color: '#4f46e5', gap: '10px' }}>
                        <Database size={40} className="animate-pulse" />
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>Running Evidence Query...</span>
                    </div>
                ) : data ? (
                    <>
                        {(!data.source?.length && !data.staging?.length && !data.target?.length) && (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No records found for the given criteria.</div>
                        )}
                        {renderTable('Source', data.source)}
                        {renderTable('Staging', data.staging)}
                        {renderTable('Target', data.target)}
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        Enter criteria and click Search to view source, staging, and target evidence.
                    </div>
                )}
            </div>
        </div>
    )
}
