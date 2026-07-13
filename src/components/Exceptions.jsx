import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Search, ShieldAlert, Database, ArrowDown, ArrowUp, Download, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react'
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
    const [selectedObjectId, setSelectedObjectId] = useState(null)
    const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false)
    const [showExportModal, setShowExportModal] = useState(false)
    const [exportOptions, setExportOptions] = useState({ format: 'excel', source: true, staging: true, target: true })

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
            alert("Please select an Application before searching.")
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
            .then(res => {
                setData(res.data);
                setIsFiltersCollapsed(true);
                let singleRec = null;
                if (res.data.source && res.data.source.length === 1) singleRec = res.data.source[0];
                else if (res.data.staging && res.data.staging.length === 1) singleRec = res.data.staging[0];
                else if (res.data.target && res.data.target.length === 1) singleRec = res.data.target[0];

                if (singleRec) {
                    const objIdKey = Object.keys(singleRec).find(k => k.toUpperCase() === 'OBJECT_ID');
                    setSelectedObjectId(singleRec[objIdKey]);
                } else {
                    setSelectedObjectId(null);
                }
            })
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

    const handleBulkExport = () => {
        const { format, source, staging, target } = exportOptions;
        
        if (format === 'excel') {
            const workbook = XLSX.utils.book_new();
            if (source && data?.source?.length > 0) {
                XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.source), "Source - Data");
            }
            if (staging && data?.staging?.length > 0) {
                XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.staging), "Staging - Data");
            }
            if (target && data?.target?.length > 0) {
                XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.target), "Target - Data");
            }
            
            if (workbook.SheetNames.length === 0) {
                alert("No data available to export for selected options.");
                return;
            }
            XLSX.writeFile(workbook, "Data_Comparison_Export.xlsx");
        } else if (format === 'csv') {
            let combinedCSV = "";
            const appendToCSV = (title, tableData) => {
                if (!tableData || tableData.length === 0) return;
                combinedCSV += `--- ${title} Data ---\n`;
                combinedCSV += Papa.unparse(tableData) + "\n\n";
            };
            if (source) appendToCSV("Source", data?.source);
            if (staging) appendToCSV("Staging", data?.staging);
            if (target) appendToCSV("Target", data?.target);
            
            if (!combinedCSV) {
                alert("No data available to export for selected options.");
                return;
            }
            
            const blob = new Blob([combinedCSV], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', `Data_Comparison_Export.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        setShowExportModal(false);
    };

    const cleanColumnName = (col) => {
        return col.replace(/^(U[0-9A-Fa-f]+_)/i, '');
    };

    const getMismatchedKeysForSelected = () => {
        if (!data || !selectedObjectId) return [];
        const findRow = (rows) => {
            if (!rows) return null;
            return rows.find(r => {
                const key = Object.keys(r).find(k => k.toUpperCase() === 'OBJECT_ID');
                return r[key] === selectedObjectId;
            });
        };
        const sourceRow = findRow(data.source);
        const stagingRow = findRow(data.staging);
        const targetRow = findRow(data.target);
        if (!sourceRow) return [];
        let mismatched = [];
        const sourceColumns = Object.keys(sourceRow);
        const keysToCompare = sourceColumns.filter(k => 
            !['OBJECT_ID', 'MIGRATION_STATUS', 'MIGRATED_DATE', 'ERROR_MESSAGE', 'EXTRACTED_STATUS', 'EXTRACTED_DATE'].includes(k.toUpperCase())
        );
        keysToCompare.forEach(key => {
            const srcVal = String(sourceRow[key] || '');
            const tgtVal = targetRow ? String(targetRow[key] || '') : null;
            const stgVal = stagingRow ? String(stagingRow[key] || '') : null;
            if (tgtVal !== srcVal || (stagingRow && stgVal !== srcVal)) {
                mismatched.push(key);
            }
        });
        return mismatched;
    };
    
    const activeMismatchedKeys = getMismatchedKeysForSelected();

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
            <div style={{ marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, color: '#1976d2', borderBottom: '2px solid #1976d2', paddingBottom: '2px', display: 'inline-block', fontSize: '12px' }}>{title} Data ({tableData.length} records)</h3>
                    <div></div>
                </div>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                {columns.map(col => (
                                    <th key={col} onClick={() => handleSort(title, col)}>
                                        <div className="th-inner">
                                            {cleanColumnName(col)}
                                            {sortConfig.key === col ? (
                                                sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="sort-icon" /> : <ArrowDown size={12} className="sort-icon" />
                                            ) : null}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedData.map((row, i) => {
                                const objIdKey = Object.keys(row).find(k => k.toUpperCase() === 'OBJECT_ID');
                                const rowObjId = row[objIdKey];
                                const isSelected = selectedObjectId && rowObjId === selectedObjectId;
                                return (
                                <tr 
                                    key={i} 
                                    onClick={() => rowObjId ? setSelectedObjectId(rowObjId) : null}
                                    style={{ 
                                        background: isSelected ? '#e0e7ff' : undefined,
                                        cursor: 'pointer'
                                    }} 
                                >
                                    {columns.map(col => {
                                        const isMismatched = isSelected && activeMismatchedKeys.includes(col);
                                        return (
                                        <td key={col} style={{ 
                                            color: isMismatched ? '#b91c1c' : undefined, 
                                            background: isMismatched ? '#fee2e2' : undefined,
                                            borderRight: '1px solid #f1f5f9', 
                                            borderLeft: '1px solid #f1f5f9', 
                                            whiteSpace: 'nowrap',
                                            fontWeight: isMismatched ? '700' : 'normal',
                                            maxWidth: 250,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : <em className="cell-empty">NULL</em>}
                                        </td>
                                        )
                                    })}
                                </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    const renderInsights = () => {
        if (!data || (!data.source?.length && !data.staging?.length && !data.target?.length)) return null;

        if (data.source?.length > 1 && !selectedObjectId) {
            return (
                <div style={{ padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', color: '#1d4ed8', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={16} /> Multiple records found. Please click a row below to view its insights.
                </div>
            );
        }

        if (!selectedObjectId) return null;

        const findRowByObjectId = (rows) => {
            if (!rows) return null;
            return rows.find(r => {
                const key = Object.keys(r).find(k => k.toUpperCase() === 'OBJECT_ID');
                return r[key] === selectedObjectId;
            });
        };

        const sourceRow = findRowByObjectId(data.source);
        const stagingRow = findRowByObjectId(data.staging);
        const targetRow = findRowByObjectId(data.target);

        if (!sourceRow) return null;

        let matchStatus = "Matches";
        let mismatchedKeys = [];
        
        const sourceColumns = Object.keys(sourceRow);
        const keysToCompare = sourceColumns.filter(k => 
            k.toUpperCase() !== 'OBJECT_ID' && 
            k.toUpperCase() !== 'MIGRATION_STATUS' && 
            k.toUpperCase() !== 'MIGRATED_DATE' && 
            k.toUpperCase() !== 'ERROR_MESSAGE' &&
            k.toUpperCase() !== 'EXTRACTED_STATUS' &&
            k.toUpperCase() !== 'EXTRACTED_DATE'
        );
        
        keysToCompare.forEach(key => {
            const srcVal = String(sourceRow[key] || '');
            const tgtVal = targetRow ? String(targetRow[key] || '') : null;
            const stgVal = stagingRow ? String(stagingRow[key] || '') : null;
            
            if (tgtVal !== srcVal || (stagingRow && stgVal !== srcVal)) {
                mismatchedKeys.push(key);
            }
        });

        if (!targetRow || !stagingRow) {
            matchStatus = "Incomplete Lifecycle";
        } else if (mismatchedKeys.length > 0) {
            matchStatus = "Mismatch Found";
        }

        const isSuccess = matchStatus === "Matches";

        const formatDate = (val) => {
            if (!val || typeof val !== 'string') return val;
            return val.includes('T') ? val.replace('T', ' ').split('.')[0] : val;
        };

        return (
            <div style={{ padding: '8px 12px', background: isSuccess ? '#f0fdf4' : '#fef2f2', border: `1px solid ${isSuccess ? '#bbf7d0' : '#fecaca'}`, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'white', borderRadius: '6px', border: `1px solid ${isSuccess ? '#bbf7d0' : '#fecaca'}`, minWidth: 'max-content', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    {isSuccess ? <CheckCircle size={16} color="#16a34a" /> : <XCircle size={16} color="#dc2626" />}
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: isSuccess ? '#166534' : '#991b1b' }}>
                        {isSuccess ? 'Metadata Matches' : (matchStatus === 'Incomplete Lifecycle' ? 'Incomplete Lifecycle' : 'Metadata Mismatch')}
                    </span>
                </div>

                <div style={{ display: 'flex', gap: '16px', flex: 1, alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '9px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Object ID</span>
                        <span style={{ fontSize: '11px', color: '#0f172a', fontWeight: '600', fontFamily: 'monospace' }}>{selectedObjectId}</span>
                    </div>

                    <div style={{ width: '1px', height: '24px', background: '#cbd5e1' }}></div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'max-content max-content max-content max-content', columnGap: '8px', rowGap: '6px', fontSize: '10px' }}>
                        <span style={{ color: '#64748b', fontWeight: '700' }}>EXTRACTED STATUS:</span>
                        <span style={{ color: '#0f172a', fontWeight: '600', marginRight: '12px' }}>{stagingRow ? stagingRow[Object.keys(stagingRow).find(k => k.toUpperCase() === 'EXTRACTED_STATUS')] || 'N/A' : 'N/A'}</span>
                        
                        <span style={{ color: '#64748b', fontWeight: '700' }}>EXTRACTED DATE:</span>
                        <span style={{ color: '#0f172a', fontWeight: '600' }}>{stagingRow ? formatDate(stagingRow[Object.keys(stagingRow).find(k => k.toUpperCase() === 'EXTRACTED_DATE')]) || 'N/A' : 'N/A'}</span>
                        
                        <span style={{ color: '#64748b', fontWeight: '700' }}>MIGRATION STATUS:</span>
                        <span style={{ color: '#0f172a', fontWeight: '600', marginRight: '12px' }}>{stagingRow ? stagingRow[Object.keys(stagingRow).find(k => k.toUpperCase() === 'MIGRATION_STATUS')] || 'N/A' : 'N/A'}</span>
                        
                        <span style={{ color: '#64748b', fontWeight: '700' }}>MIGRATED DATE:</span>
                        <span style={{ color: '#0f172a', fontWeight: '600' }}>{stagingRow ? formatDate(stagingRow[Object.keys(stagingRow).find(k => k.toUpperCase() === 'MIGRATED_DATE')]) || 'N/A' : 'N/A'}</span>
                    </div>
                </div>


            </div>
        );
    };

    return (
        <>
        <div className="exceptions-container" style={{ padding: '14px', background: '#f8f9fa', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            <div className="filters-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', background: 'white', padding: '10px 14px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '15px', fontWeight: 'bold' }}>
                        <ShieldAlert size={18} color="#4f46e5" /> Exceptions and evidence
                    </h2>
                </div>
                
                <form onSubmit={searchExceptions}>
                    <div style={{ display: 'grid', gridTemplateColumns: '0.65fr 0.85fr 1.15fr 0.75fr 0.75fr max-content', gap: '12px', alignItems: 'end', width: '100%' }}>
                        <div>
                            <label style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Application</label>
                            <select value={selectedApp} onChange={e => setSelectedApp(e.target.value)} style={{ padding: '5px 8px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }} onFocus={(e) => e.target.style.borderColor = '#4f46e5'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}>
                                <option value="">-- Select Application --</option>
                                {apps.map(a => <option key={a.appId} value={a.appId}>{a.appName}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <label style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Document Class</label>
                            <select value={selectedDocClass} onChange={e => setSelectedDocClass(e.target.value)} style={{ padding: '5px 8px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }} onFocus={(e) => e.target.style.borderColor = '#4f46e5'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}>
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

                        <div>
                            <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '5.5px 16px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }} onMouseOver={(e) => { e.target.style.background = '#4338ca'; e.target.style.transform = 'translateY(-1px)'; }} onMouseOut={(e) => { e.target.style.background = '#4f46e5'; e.target.style.transform = 'translateY(0)'; }}>
                                <Search size={14} /> Search
                            </button>
                        </div>
                    </div>

                    <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '8px', marginBottom: (!isFiltersCollapsed && customMetadata.length > 0) ? '12px' : '0' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e293b' }}>Custom Metadata Filters</span>
                            <button type="button" onClick={() => { addCustomField(); setIsFiltersCollapsed(false); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '10px', background: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background='#c7d2fe'} onMouseOut={(e) => e.target.style.background='#e0e7ff'}>
                                <Plus size={12} /> Add Field
                            </button>
                        </div>
                        
                        {!isFiltersCollapsed && customMetadata.length > 0 && (
                            <div>
                                {customMetadata.map((cm, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                        <select value={cm.field} onChange={(e) => updateCustomMetadata(idx, 'field', e.target.value)} style={{ padding: '5px 8px', width: '200px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none' }}>
                                            <option value="">-- Select Field --</option>
                                            {metadataFields.map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                        <select value={cm.operator} onChange={(e) => updateCustomMetadata(idx, 'operator', e.target.value)} style={{ padding: '5px 8px', width: '120px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none' }}>
                                            <option value="EQUALS">Equals</option>
                                            <option value="CONTAINS">Contains</option>
                                            <option value="STARTS_WITH">Starts With</option>
                                            <option value="ENDS_WITH">Ends With</option>
                                        </select>
                                        <input type="text" value={cm.value} onChange={(e) => updateCustomMetadata(idx, 'value', e.target.value)} placeholder="Value..." style={{ padding: '5px 8px', width: '200px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none', boxSizing: 'border-box' }} />
                                        <button type="button" onClick={() => removeCustomMetadata(idx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </form>

                {customMetadata.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: isFiltersCollapsed ? '0' : '-10px', marginBottom: '-20px', zIndex: 10 }}>
                        <button 
                            onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
                            style={{ background: 'white', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '2px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                        >
                            {isFiltersCollapsed ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                        </button>
                    </div>
                )}
            </div>

            <div className="grid-container" style={{ background: 'white', padding: '8px', borderRadius: '12px', flex: 1, minHeight: 0, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                        {(data.source?.length > 0 || data.staging?.length > 0 || data.target?.length > 0) && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px', marginTop: '2px' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {renderInsights()}
                                </div>
                                <button onClick={() => setShowExportModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', boxShadow: '0 1px 4px rgba(16, 185, 129, 0.2)', flexShrink: 0 }}>
                                    <Download size={12} /> Export Results
                                </button>
                            </div>
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

        {showExportModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ background: 'white', padding: '14px', borderRadius: '10px', width: '260px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#1e293b' }}>Export Options</h3>
                    
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Format</label>
                        <select value={exportOptions.format} onChange={e => setExportOptions({...exportOptions, format: e.target.value})} style={{ padding: '4px 8px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '12px' }}>
                            <option value="excel">Excel</option>
                            <option value="csv">CSV</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Include Tables</label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '12px' }}>
                            <input type="checkbox" checked={exportOptions.source} onChange={e => setExportOptions({...exportOptions, source: e.target.checked})} /> Source Data
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '12px' }}>
                            <input type="checkbox" checked={exportOptions.staging} onChange={e => setExportOptions({...exportOptions, staging: e.target.checked})} /> Staging Data
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                            <input type="checkbox" checked={exportOptions.target} onChange={e => setExportOptions({...exportOptions, target: e.target.checked})} /> Target Data
                        </label>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setShowExportModal(false)} style={{ padding: '4px 10px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>Cancel</button>
                        <button onClick={handleBulkExport} style={{ padding: '4px 14px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}><Download size={12} /> Export</button>
                    </div>
                </div>
            </div>
        )}
    </>
    )
}
