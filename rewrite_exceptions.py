import re

file_path = 'D:/MigrationReportTool/UI/MigrationReport/src/components/Exceptions.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { Search, ShieldAlert, Database, ArrowDown, ArrowUp, Download } from 'lucide-react'",
    "import { Search, ShieldAlert, Database, ArrowDown, ArrowUp, Download, Plus, Trash2 } from 'lucide-react'"
)

# 2. State definition replacements
state_old = """    const [createdAt, setCreatedAt] = useState('')
    const [createdAtOperator, setCreatedAtOperator] = useState('EQUALS')"""

state_new = """    const [createdFrom, setCreatedFrom] = useState('')
    const [createdTo, setCreatedTo] = useState('')
    const [customMetadata, setCustomMetadata] = useState([])
    const [metadataFields, setMetadataFields] = useState([])"""

content = content.replace(state_old, state_new)

# 3. UseEffect fetch
effect_old = """    // Fetch Doc Classes when App changes
    useEffect(() => {
        if (!selectedApp) return;
        axios.get(`http://localhost:8080/api/discovery/doc-classes?appId=${selectedApp}`)
            .then(res => {
                setDocClasses(res.data);
                setSelectedDocClass('');
            })
            .catch(console.error);
    }, [selectedApp]);"""

effect_new = """    // Fetch Doc Classes when App changes
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
    };"""

content = content.replace(effect_old, effect_new)

# 4. Search function mapping
search_old = """        if (createdAt) {
            criteria.createdAt = createdAt;
            criteria.createdAtOperator = createdAtOperator;
        }"""

search_new = """        if (createdFrom) criteria.createdFrom = createdFrom;
        if (createdTo) criteria.createdTo = createdTo;
        if (customMetadata.length > 0) {
            criteria.customMetadata = customMetadata.filter(m => m.field && m.value);
        }"""

content = content.replace(search_old, search_new)

# 5. Form layout
form_old = """                <form onSubmit={searchExceptions} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', alignItems: 'end', width: '100%' }}>
                    
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
                        <label style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Created At</label>
                        <input type="date" value={createdAt} onChange={e => setCreatedAt(e.target.value)} style={{ padding: '5px 8px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#4f46e5'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'} />
                    </div>
                    
                    <div>
                        <label style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Created Operator</label>
                        <select value={createdAtOperator} onChange={e => setCreatedAtOperator(e.target.value)} style={{ padding: '5px 8px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#4f46e5'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}>
                            <option value="EQUALS">Equals (=)</option>
                            <option value="LESS_THAN">Less Than (&lt;)</option>
                            <option value="GREATER_THAN">Greater Than (&gt;)</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '5px 14px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', height: '28px', fontSize: '9px', transition: 'all 0.2s', width: '100%', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }} onMouseOver={(e) => { e.target.style.background = '#4338ca'; e.target.style.transform = 'translateY(-1px)'; }} onMouseOut={(e) => { e.target.style.background = '#4f46e5'; e.target.style.transform = 'translateY(0)'; }}>
                            <Search size={12} /> Search
                        </button>
                    </div>
                </form>"""

form_new = """                <form onSubmit={searchExceptions}>
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
                </form>"""

content = content.replace(form_old, form_new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Rewrote Exceptions.jsx successfully")
