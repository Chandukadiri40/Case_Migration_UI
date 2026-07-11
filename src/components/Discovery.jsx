import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { Search, Database, Layers, CheckCircle, FolderOpen, Calendar, HardDrive, FileText, FileSearch, Hash, ArrowDown, ArrowUp, Download } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import appsData from '../apps.json'

export default function Discovery() {
    const [apps, setApps] = useState([])
    const [selectedApp, setSelectedApp] = useState('')

    // 2-Level State
    const [activeCategory, setActiveCategory] = useState('')
    const [activeSubReport, setActiveSubReport] = useState('')

    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)
    const [docClasses, setDocClasses] = useState([])
    const [selectedDocClass, setSelectedDocClass] = useState('')

    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' })

    // Main Categories Definition
    const categories = [
        { id: 'doc_classes', label: 'Document Classes', icon: <FolderOpen size={18} /> },
        { id: 'custom_objects', label: 'Custom Objects', icon: <Layers size={18} /> },
        { id: 'case_classes', label: 'Case Classes', icon: <Database size={18} /> },
        { id: 'doc_count', label: 'Document Counts', icon: <FileText size={18} /> },
        { id: 'annotations', label: 'Annotations', icon: <CheckCircle size={18} /> },
        { id: 'content_size', label: 'Content Sizes', icon: <HardDrive size={18} /> },
        { id: 'content_elements', label: 'Content Elements', icon: <Layers size={18} /> },
        { id: 'versions', label: 'Versions', icon: <Hash size={18} /> },
        { id: 'properties', label: 'Properties', icon: <FileSearch size={18} /> }
    ];

    // Sub Reports Definition
    const subReports = {
        'doc_classes': [
            { id: 'list', label: 'Document Class List', endpoint: 'doc-class-list' }
        ],
        'custom_objects': [
            { id: 'trend', label: 'Count & Trend Analysis', endpoint: 'custom-object-trend' }
        ],
        'case_classes': [
            { id: 'breakdown', label: 'Year × Month Breakdown', endpoint: 'case-class-breakdown' }
        ],
        'doc_count': [
            { id: 'by_class', label: 'Overall Class Summary', endpoint: 'doc-count' },
            { id: 'by_mime', label: 'By MIME Type', endpoint: 'doc-mime' },
            { id: 'by_size', label: 'By Size Bucket', endpoint: 'size-bucket' },
            { id: 'year_wise', label: 'By Year', endpoint: 'doc-year-wise' },
            { id: 'year_month', label: 'Year × Month', endpoint: 'doc-year-month' }
        ],
        'annotations': [
            { id: 'total', label: 'Total Annotations', endpoint: 'annotation-total' },
            { id: 'mime_class', label: 'By MIME Type', endpoint: 'annotation-mime' }
        ],
        'content_size': [
            { id: 'total', label: 'Total Size', endpoint: 'size-total' },
            { id: 'no_content', label: 'Docs Without Content', endpoint: 'no-content' }
        ],
        'content_elements': [
            { id: 'total', label: 'Total Content Elements', endpoint: 'element-total' },
            { id: 'per_class', label: 'Elements per Document Class', endpoint: 'element-class' },
            { id: 'properties', label: 'List Property Counts', endpoint: 'element-properties' }
        ],
        'versions': [
            { id: 'summary', label: 'Version Summary by Class', endpoint: 'version-summary' },
            { id: 'distribution', label: 'Version Distribution', endpoint: 'version-distribution' }
        ],
        'properties': [
            { id: 'definitions', label: 'Property Definitions', endpoint: 'property-defs' },
            { id: 'summary', label: 'Property Count Summary', endpoint: 'property-summary' }
        ]
    };

    useEffect(() => {
        setApps(appsData);
    }, []);

    useEffect(() => {
        if (selectedDocClass !== 'All' && activeCategory === 'doc_classes') {
            setActiveCategory('');
        }
        if (selectedDocClass !== 'All' && activeCategory === 'versions' && activeSubReport === 'summary') {
            setActiveSubReport('');
        }
    }, [selectedDocClass, activeCategory, activeSubReport]);

    useEffect(() => {
        // Reset subreport when category changes
        setActiveSubReport('')
    }, [activeCategory])

    // Fetch Document Classes when App changes
    useEffect(() => {
        if (!selectedApp) return;
        axios.get(`http://localhost:8080/api/discovery/doc-classes?appId=${selectedApp}`)
            .then(res => {
                setDocClasses(res.data);
                setSelectedDocClass('');
            })
            .catch(err => console.error("Error fetching document classes", err));
    }, [selectedApp]);

    // Note: removed auto-selection of first subreport when category changes

    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = useMemo(() => {
        if (!sortConfig.key) return data;
        return [...data].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];
            if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }, [data, sortConfig]);

    const exportToCSV = () => {
        if (!sortedData || sortedData.length === 0) return;
        const csv = Papa.unparse(sortedData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'discovery_export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToExcel = () => {
        if (!sortedData || sortedData.length === 0) return;
        const worksheet = XLSX.utils.json_to_sheet(sortedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, "discovery_export.xlsx");
    };

    const runReport = () => {
        setLoading(true)
        setData([])
        const currentSubReports = subReports[activeCategory]
        if (!currentSubReports) {
            setLoading(false)
            return;
        }

        const endpoint = currentSubReports.find(s => s.id === activeSubReport)?.endpoint
        if (!endpoint) {
            setLoading(false)
            return;
        }

        if (!selectedApp) {
            alert("Please select an Application before running the report.")
            return;
        }

        if (!selectedDocClass) {
            alert("Please select a Document Class (or 'All').")
            return;
        }

        if (!activeCategory) {
            alert("Please select a Report Category.")
            return;
        }

        if (!activeSubReport) {
            alert("Please select a Report Type.")
            return;
        }

        const criteria = { appId: selectedApp };
        if (selectedDocClass !== 'All') {
            criteria.documentClasses = [selectedDocClass];
        }

        axios.post(`http://localhost:8080/api/discovery/${endpoint}`, criteria)
            .then(res => setData(res.data))
            .catch(err => {
                console.error("Endpoint error:", err)
                const errorMsg = err.response?.data?.message || err.message || "Unknown error";
                setData([{ Message: `Error calling /api/discovery/${endpoint}: ${errorMsg}` }])
            })
            .finally(() => setLoading(false))
    }

    return (
        <div style={{ padding: '14px', height: '100%', display: 'flex', flexDirection: 'column', gap: '14px', background: '#f3f4f6' }}>

            {/* Top Filter Bar */}
            <div className="filters-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'white', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', marginBottom: '0' }}>
                <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>System study</h1>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', alignItems: 'end' }}>

                    <div>
                        <label style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Application</label>
                        <select
                            value={selectedApp}
                            onChange={(e) => setSelectedApp(e.target.value)}
                            style={{ padding: '5px 8px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none', transition: 'border-color 0.2s' }}
                            onFocus={(e) => e.target.style.borderColor = '#4f46e5'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                        >
                            <option value="">-- Select Application --</option>
                            {apps.map(app => (
                                <option key={app.appId} value={app.appId}>{app.appName}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Document Class</label>
                        <select
                            value={selectedDocClass}
                            onChange={(e) => setSelectedDocClass(e.target.value)}
                            style={{ padding: '5px 8px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none', transition: 'border-color 0.2s' }}
                            onFocus={(e) => e.target.style.borderColor = '#4f46e5'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                        >
                            <option value="">-- Select Document Class --</option>
                            <option value="All">All Classes</option>
                            {docClasses.map(dc => (
                                <option key={dc} value={dc}>{dc}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Report Category</label>
                        <select
                            value={activeCategory}
                            onChange={(e) => setActiveCategory(e.target.value)}
                            style={{ padding: '5px 8px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none', transition: 'border-color 0.2s' }}
                            onFocus={(e) => e.target.style.borderColor = '#4f46e5'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                        >
                            <option value="">-- Select Category --</option>
                            {categories.filter(cat => cat.id !== 'doc_classes' || selectedDocClass === 'All').map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Report Type</label>
                        <select
                            value={activeSubReport}
                            onChange={(e) => setActiveSubReport(e.target.value)}
                            style={{ padding: '5px 8px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none', transition: 'border-color 0.2s' }}
                            onFocus={(e) => e.target.style.borderColor = '#4f46e5'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                        >
                            <option value="">-- Select Report Type --</option>
                            {subReports[activeCategory]?.filter(sub => !(activeCategory === 'versions' && sub.id === 'summary' && selectedDocClass !== 'All')).map(sub => (
                                <option key={sub.id} value={sub.id}>{sub.label}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <button
                            onClick={runReport}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '5px 14px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', height: '28px', fontSize: '9px', transition: 'all 0.2s', width: '100%', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}
                            onMouseOver={(e) => { e.target.style.background = '#4338ca'; e.target.style.transform = 'translateY(-1px)'; }}
                            onMouseOut={(e) => { e.target.style.background = '#4f46e5'; e.target.style.transform = 'translateY(0)'; }}
                        >
                            <Search size={12} /> Run Report
                        </button>
                    </div>
                </div>
            </div>

            {/* Data Grid */}
            <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                {/* Header showing active report */}
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '13px', color: '#111827', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {activeCategory && categories.find(c => c.id === activeCategory)?.icon}
                        {(activeCategory && activeSubReport) ? (subReports[activeCategory]?.find(s => s.id === activeSubReport)?.label || 'Report') : 'Select a Report'}
                    </h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={exportToCSV} disabled={!data || data.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: data && data.length > 0 ? 'pointer' : 'not-allowed', color: '#374151' }}>
                            <Download size={12} /> CSV
                        </button>
                        <button onClick={exportToExcel} disabled={!data || data.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#10b981', color: 'white', cursor: data && data.length > 0 ? 'pointer' : 'not-allowed' }}>
                            <Download size={12} /> Excel
                        </button>
                    </div>
                </div>

                {/* Table Area */}
                <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
                    {loading ? <div style={{ padding: '14px', color: '#4f46e5', fontWeight: '500' }}>Running query...</div> : (
                        <table className="discovery-grid" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #d0d7de', background: '#f6f8fa' }}>
                                    {data.length > 0 && Object.keys(data[0]).map(key => (
                                        <th key={key} onClick={() => handleSort(key)} style={{ padding: '8px', color: '#24292f', border: '1px solid #d0d7de', cursor: 'pointer', userSelect: 'none' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                {key}
                                                {sortConfig.key === key ? (
                                                    sortConfig.direction === 'ascending' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                                ) : null}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedData.length > 0 ? sortedData.map((row, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #d0d7de', background: i % 2 === 0 ? 'white' : '#fafafa' }} onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'} onMouseOut={(e) => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#fafafa'}>
                                        {Object.values(row).map((val, j) => (
                                            <td key={j} style={{ padding: '8px', color: '#24292f', border: '1px solid #d0d7de' }}>{val?.toString()}</td>
                                        ))}
                                    </tr>
                                )) : (
                                    <tr><td colSpan="100%" style={{ padding: '14px', color: '#6e7781', textAlign: 'center', border: '1px solid #d0d7de' }}>No data available. Click "Run Report" to load.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )
}
