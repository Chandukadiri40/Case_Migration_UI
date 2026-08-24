import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { BASE, apiGetTenantConfig } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList } from 'recharts';

// Global frontend cache to prevent re-fetching on tab/page navigation
let globalDiscoveryCache = null;

export default function SystemDiscovery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('category') || 'all';
  const setActiveTab = (category) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('category', category);
    setSearchParams(newParams);
  };
  const [loading, setLoading] = useState(false);

  // Define the tabs based on wireframe
  const tabs = [
    { id: 'all', label: 'All Categories' },
    { id: 'Volume & Trend', label: 'Volume & Trend' },
    { id: 'Format & Size', label: 'Format & Size' },
    { id: 'Annotation & Components', label: 'Annotation & Components' },
    { id: 'Versions', label: 'Versions' },
    { id: 'Elements', label: 'Elements' },
    { id: 'Properties', label: 'Properties' },
    { id: 'Hex/Blob', label: 'Hex/Blob' }
  ];

  // State for data
  const [docCountData, setDocCountData] = useState([]);
  const [yearTrendData, setYearTrendData] = useState([]);
  const [mimeData, setMimeData] = useState([]);
  const [sizeBucketData, setSizeBucketData] = useState([]);
  const [sizeTotalData, setSizeTotalData] = useState([]);
  const [noContentData, setNoContentData] = useState([]);
  const [annotationTotalData, setAnnotationTotalData] = useState([]);
  const [annotationMimeData, setAnnotationMimeData] = useState([]);
  const [customObjectTrendData, setCustomObjectTrendData] = useState([]);
  
  const [versionSummaryData, setVersionSummaryData] = useState([]);
  const [versionDistributionData, setVersionDistributionData] = useState([]);
  const [elementTotalData, setElementTotalData] = useState([]);
  const [elementClassData, setElementClassData] = useState([]);

  const [propertyDefsData, setPropertyDefsData] = useState([]);
  const [retrievalHexData, setRetrievalHexData] = useState([]);
  const [componentHexData, setComponentHexData] = useState([]);
  const [contentHexData, setContentHexData] = useState([]);

  const [propertyClassFilter, setPropertyClassFilter] = useState('All');

  // Fetch data
  const loadData = async () => {
    if (globalDiscoveryCache) {
      setDocCountData(globalDiscoveryCache.docCountData);
      setYearTrendData(globalDiscoveryCache.yearTrendData);
      setMimeData(globalDiscoveryCache.mimeData);
      setSizeBucketData(globalDiscoveryCache.sizeBucketData);
      setSizeTotalData(globalDiscoveryCache.sizeTotalData);
      setNoContentData(globalDiscoveryCache.noContentData);
      setAnnotationTotalData(globalDiscoveryCache.annotationTotalData);
      setAnnotationMimeData(globalDiscoveryCache.annotationMimeData);
      setCustomObjectTrendData(globalDiscoveryCache.customObjectTrendData);
      setVersionSummaryData(globalDiscoveryCache.versionSummaryData);
      setVersionDistributionData(globalDiscoveryCache.versionDistributionData);
      setElementTotalData(globalDiscoveryCache.elementTotalData);
      setElementClassData(globalDiscoveryCache.elementClassData);
      setPropertyDefsData(globalDiscoveryCache.propertyDefsData);
      setRetrievalHexData(globalDiscoveryCache.retrievalHexData);
      setComponentHexData(globalDiscoveryCache.componentHexData);
      setContentHexData(globalDiscoveryCache.contentHexData);
      return;
    }

    setLoading(true);
    try {
      const configRes = await apiGetTenantConfig();
      const firstAppId = configRes?.applications?.[0]?.appId || 'default';
      const criteria = { appId: firstAppId };
      const [countRes, yearRes, mimeRes, sizeRes, sizeTotRes, noContentRes, annTotRes, annMimeRes, coTrendRes, 
             vSumRes, vDistRes, eTotRes, eClassRes, pDefRes, rHexRes, cHexRes, coHexRes] = await Promise.allSettled([
        axios.post(`${BASE}/discovery/doc-count`, criteria),
        axios.post(`${BASE}/discovery/doc-year-wise`, criteria),
        axios.post(`${BASE}/discovery/doc-mime`, criteria),
        axios.post(`${BASE}/discovery/size-bucket`, criteria),
        axios.post(`${BASE}/discovery/size-total`, criteria),
        axios.post(`${BASE}/discovery/no-content`, criteria),
        axios.post(`${BASE}/discovery/annotation-total`, criteria),
        axios.post(`${BASE}/discovery/annotation-mime`, criteria),
        axios.post(`${BASE}/discovery/custom-object-trend`, criteria),
        axios.post(`${BASE}/discovery/version-summary`, criteria),
        axios.post(`${BASE}/discovery/version-distribution`, criteria),
        axios.post(`${BASE}/discovery/element-total`, criteria),
        axios.post(`${BASE}/discovery/element-class`, criteria),

        axios.post(`${BASE}/discovery/property-defs`, criteria),
        axios.post(`${BASE}/discovery/retrieval-hex-blob`, criteria),
        axios.post(`${BASE}/discovery/component-hex-blob`, criteria),
        axios.post(`${BASE}/discovery/content-hex-blob`, criteria)
      ]);

      if (countRes.status === 'fulfilled') setDocCountData(countRes.value.data);
      if (yearRes.status === 'fulfilled') setYearTrendData(yearRes.value.data);
      if (mimeRes.status === 'fulfilled') setMimeData(mimeRes.value.data);
      if (sizeRes.status === 'fulfilled') setSizeBucketData(sizeRes.value.data);
      if (sizeTotRes.status === 'fulfilled') setSizeTotalData(sizeTotRes.value.data);
      if (noContentRes.status === 'fulfilled') setNoContentData(noContentRes.value.data);
      if (annTotRes.status === 'fulfilled') setAnnotationTotalData(annTotRes.value.data);
      if (annMimeRes.status === 'fulfilled') setAnnotationMimeData(annMimeRes.value.data);
      if (coTrendRes.status === 'fulfilled') setCustomObjectTrendData(coTrendRes.value.data);
      
      if (vSumRes.status === 'fulfilled') setVersionSummaryData(vSumRes.value.data);
      if (vDistRes.status === 'fulfilled') setVersionDistributionData(vDistRes.value.data);
      if (eTotRes.status === 'fulfilled') setElementTotalData(eTotRes.value.data);
      if (eClassRes.status === 'fulfilled') setElementClassData(eClassRes.value.data);

      if (pDefRes.status === 'fulfilled') setPropertyDefsData(pDefRes.value.data);
      if (rHexRes.status === 'fulfilled') setRetrievalHexData(rHexRes.value.data);
      if (cHexRes.status === 'fulfilled') setComponentHexData(cHexRes.value.data);
      if (coHexRes.status === 'fulfilled') setContentHexData(coHexRes.value.data);

      globalDiscoveryCache = {
        docCountData: countRes.status === 'fulfilled' ? countRes.value.data : [],
        yearTrendData: yearRes.status === 'fulfilled' ? yearRes.value.data : [],
        mimeData: mimeRes.status === 'fulfilled' ? mimeRes.value.data : [],
        sizeBucketData: sizeRes.status === 'fulfilled' ? sizeRes.value.data : [],
        sizeTotalData: sizeTotRes.status === 'fulfilled' ? sizeTotRes.value.data : [],
        noContentData: noContentRes.status === 'fulfilled' ? noContentRes.value.data : [],
        annotationTotalData: annTotRes.status === 'fulfilled' ? annTotRes.value.data : [],
        annotationMimeData: annMimeRes.status === 'fulfilled' ? annMimeRes.value.data : [],
        customObjectTrendData: coTrendRes.status === 'fulfilled' ? coTrendRes.value.data : [],
        versionSummaryData: vSumRes.status === 'fulfilled' ? vSumRes.value.data : [],
        versionDistributionData: vDistRes.status === 'fulfilled' ? vDistRes.value.data : [],
        elementTotalData: eTotRes.status === 'fulfilled' ? eTotRes.value.data : [],
        elementClassData: eClassRes.status === 'fulfilled' ? eClassRes.value.data : [],
        propertyDefsData: pDefRes.status === 'fulfilled' ? pDefRes.value.data : [],
        retrievalHexData: rHexRes.status === 'fulfilled' ? rHexRes.value.data : [],
        componentHexData: cHexRes.status === 'fulfilled' ? cHexRes.value.data : [],
        contentHexData: coHexRes.status === 'fulfilled' ? coHexRes.value.data : []
      };

    } catch (err) {
      console.error("Failed to load discovery data", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const shouldShow = (cat) => activeTab === 'all' || activeTab === cat;

  const renderTable = (title, endpoint, dataset, dropdown = null) => {
    if (!dataset) return null;
    return (
      <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(16,24,40,.04)' }}>
        <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>{title}</h3>
          {dropdown}
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E3E7EE', borderTop: '1px solid #E3E7EE', fontSize: '11.5px', color: '#4B5563', textTransform: 'uppercase' }}>
                {dataset.length > 0 && Object.keys(dataset[0]).map(key => (
                  <th key={key} style={{ padding: '10px 12px', fontWeight: '700', verticalAlign: 'middle' }}>{key.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataset.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {Object.values(row).map((val, j) => (
                    <td key={j} style={{ padding: '6px 12px', fontSize: '12px', color: '#374151', fontWeight: j === 0 ? '500' : 'normal', verticalAlign: 'middle' }}>
                      {val !== null && val !== undefined ? String(val) : ''}
                    </td>
                  ))}
                </tr>
              ))}
              {dataset.length === 0 && !loading && (
                <tr><td colSpan="100%" style={{ padding: '20px 0', textAlign: 'center', fontSize: '12.5px', color: '#98A2B3' }}>No data found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Calculate Real KPIs
  const RADIAN = Math.PI / 180;
  const renderInsideLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '12px', fontWeight: 'bold' }}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const renderCustomTooltip = (unit, formatter = (val) => val.toLocaleString()) => ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: '#111827', borderRadius: '6px', color: '#fff', fontSize: '12px', padding: '10px 14px', zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 6px 0', fontWeight: 'bold', color: '#fff' }}>{data.name}</p>
          <p style={{ margin: 0, color: '#E5E7EB' }}>{formatter(data.value)} {unit}</p>
          {data.subItems && data.subItems.length > 0 && (
            <div style={{ marginTop: '10px', borderTop: '1px solid #374151', paddingTop: '10px', maxHeight: '150px', overflowY: 'auto' }}>
              <p style={{ margin: '0 0 6px 0', color: '#9CA3AF', fontSize: '11px', textTransform: 'uppercase', fontWeight: '600' }}>Included items:</p>
              <ul style={{ margin: 0, paddingLeft: '14px', color: '#D1D5DB' }}>
                {data.subItems.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{item.name}: <span style={{ color: '#fff', fontWeight: '500' }}>{formatter(item.value)} {unit}</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const totalDocs = docCountData.reduce((acc, row) => acc + Number(row.total_documents || row.TOTAL_DOCUMENTS || 0), 0);
  const totalClasses = docCountData.length;
  
  const totalSizeBytes = docCountData.reduce((acc, row) => acc + Number(row.total_size_bytes || row.TOTAL_SIZE_BYTES || 0), 0);
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };
  const totalStorageStr = formatBytes(totalSizeBytes);
  const avgDocSizeStr = totalDocs > 0 ? formatBytes(totalSizeBytes / totalDocs) + ' / doc' : '0 B / doc';

  const formatCount = mimeData.length;
  const topFormats = mimeData.slice(0, 3).map(r => {
    let mt = String(r.mime_type || r.MIME_TYPE || '');
    return mt.includes('/') ? mt.split('/')[1].toUpperCase() : mt;
  }).join(', ');

  const validYears = yearTrendData.map(r => Number(r.creation_year || r.CREATION_YEAR)).filter(y => !isNaN(y) && y > 0);
  const minYear = validYears.length > 0 ? Math.min(...validYears) : new Date().getFullYear();
  const maxYear = validYears.length > 0 ? Math.max(...validYears) : new Date().getFullYear();
  const dateRangeStr = validYears.length > 0 ? `${minYear}–${maxYear}` : 'N/A';
  const yearsOfContent = validYears.length > 0 ? maxYear - minYear + 1 : 0;

  const incompleteRecords = noContentData.reduce((acc, row) => acc + Number(row.docs_without_content || row.DOCS_WITHOUT_CONTENT || 0), 0);
  const completionPct = totalDocs > 0 ? (((totalDocs - incompleteRecords) / totalDocs) * 100).toFixed(1) : 0;

  const docsWithAnnotations = annotationTotalData.reduce((acc, row) => acc + Number(row.total_documents_with_annotations || row.TOTAL_DOCUMENTS_WITH_ANNOTATIONS || 0), 0);
  const annotationPct = totalDocs > 0 ? ((docsWithAnnotations / totalDocs) * 100).toFixed(1) : 0;

  const processPieData = (data, valueKey, nameKey, threshold = 0.01, maxItems = 5) => {
    if (!data || data.length === 0) return [];
    const total = data.reduce((sum, row) => sum + Number(row[valueKey] || row[valueKey.toUpperCase()]), 0);
    let processed = [];
    
    data.forEach(row => {
      const val = Number(row[valueKey] || row[valueKey.toUpperCase()]);
      let name = row[nameKey] || row[nameKey.toUpperCase()];
      if (nameKey === 'mime_type') {
         name = String(name).split('/').pop() || String(name);
      }
      processed.push({ name, value: val });
    });

    processed.sort((a, b) => b.value - a.value);

    let othersValue = 0;
    const othersItems = [];
    const finalProcessed = [];

    processed.forEach((item, index) => {
      // Group into others if it's below threshold, OR if it's beyond the maxItems limit (leaving room for 'Others')
      if ((total > 0 && item.value / total <= threshold) || index >= maxItems - 1) {
        othersValue += item.value;
        othersItems.push(item);
      } else {
        finalProcessed.push(item);
      }
    });
    
    if (othersValue > 0) {
      // Keep the label short so it doesn't overlap the pie chart in the legend
      let othersLabel = `Others (${othersItems.length} items)`;
      finalProcessed.push({ name: 'Others', value: othersValue, subItems: othersItems, displayLabel: othersLabel });
    }
    
    return finalProcessed;
  };

  const processedMimeData = processPieData(mimeData, 'doc_count', 'mime_type', 0.01, 12);
  const processedSizeTotalData = processPieData(sizeTotalData, 'total_size_mb', 'class_name', 0.01, 12);
  const processedAnnotationMimeData = processPieData(annotationMimeData, 'total_annotations', 'mime_type', 0.01, 12);

  const processedVersionBuckets = React.useMemo(() => {
    const buckets = [
      { name: '1 version', count: 0 },
      { name: '2 versions', count: 0 },
      { name: '3 versions', count: 0 },
      { name: '4 / 5+ versions', count: 0 }
    ];
    if (versionDistributionData && Array.isArray(versionDistributionData)) {
      versionDistributionData.forEach(row => {
        const bucket = String(row.version_bucket || row.VERSION_BUCKET);
        const count = Number(row.doc_count || row.DOC_COUNT || 0);
        if (bucket === '1.0' || bucket === '1') buckets[0].count += count;
        else if (bucket === '2.0' || bucket === '2') buckets[1].count += count;
        else if (bucket === '3.0' || bucket === '3') buckets[2].count += count;
        else buckets[3].count += count;
      });
    }
    return buckets;
  }, [versionDistributionData]);

  const CHART_COLORS = ['#2563EB', '#0F9D58', '#B45309', '#7C3AED', '#0891B2', '#8B5CF6', '#D97706', '#4F46E5', '#EC4899', '#10B981', '#F59E0B', '#14B8A6', '#F43F5E', '#84CC16', '#6366F1', '#A855F7'];

  const mimeLegendPayload = processedMimeData.map((entry, index) => {
    const origIndex = mimeData.findIndex(row => {
      const name = String(row.mime_type || row.MIME_TYPE).split('/').pop() || String(row.mime_type || row.MIME_TYPE);
      return name === entry.name;
    });
    const color = entry.name === 'Others' ? '#9CA3AF' : CHART_COLORS[index % CHART_COLORS.length];
    return {
      value: entry.name === 'Others' && entry.displayLabel ? entry.displayLabel : entry.name,
      id: entry.name,
      type: 'square',
      color: color,
      count: entry.value,
      subItems: entry.subItems
    };
  });

  const sizeLegendPayload = processedSizeTotalData.map((entry, index) => {
    const origIndex = sizeTotalData.findIndex(row => {
      const name = row.class_name || row.CLASS_NAME;
      return name === entry.name;
    });
    const color = entry.name === 'Others' ? '#9CA3AF' : CHART_COLORS[index % CHART_COLORS.length];
    return {
      value: entry.name === 'Others' && entry.displayLabel ? entry.displayLabel : entry.name,
      id: entry.name,
      type: 'square',
      color: color,
      count: entry.value,
      subItems: entry.subItems
    };
  });

  const renderMimeLegend = () => (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '11px', color: '#6B7280', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {mimeLegendPayload.map((entry, index) => (
        <li key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
          <span style={{ display: 'inline-block', minWidth: '10px', width: '10px', height: '10px', background: entry.color, marginRight: '6px' }}></span>
          <span title={entry.value} style={{ color: '#1F2937', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', verticalAlign: 'middle' }}>{entry.value}</span>
          <span style={{ color: '#98A2B3', marginLeft: '6px' }}>{entry.count.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );

  const renderSizeLegend = () => (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '11px', color: '#6B7280', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {sizeLegendPayload.map((entry, index) => (
        <li key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
          <span style={{ display: 'inline-block', minWidth: '10px', width: '10px', height: '10px', background: entry.color, marginRight: '6px' }}></span>
          <span title={entry.value} style={{ color: '#1F2937', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', verticalAlign: 'middle' }}>{entry.value}</span>
          <span style={{ color: '#98A2B3', marginLeft: '6px' }}>{(entry.count / 1024).toFixed(2)} GB</span>
        </li>
      ))}
    </ul>
  );

  const annotationMimeLegendPayload = processedAnnotationMimeData.map((entry, index) => {
    const origIndex = annotationMimeData.findIndex(row => {
      const name = String(row.mime_type || row.MIME_TYPE).split('/').pop() || String(row.mime_type || row.MIME_TYPE);
      return name === entry.name;
    });
    const color = entry.name === 'Others' ? '#9CA3AF' : CHART_COLORS[index % CHART_COLORS.length];
    return {
      value: entry.name === 'Others' && entry.displayLabel ? entry.displayLabel : entry.name,
      id: entry.name,
      type: 'square',
      color: color,
      count: entry.value,
      subItems: entry.subItems
    };
  });

  const renderAnnotationMimeLegend = () => (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '11px', color: '#6B7280', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {annotationMimeLegendPayload.map((entry, index) => (
        <li key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
          <span style={{ display: 'inline-block', minWidth: '10px', width: '10px', height: '10px', background: entry.color, marginRight: '6px' }}></span>
          <span title={entry.value} style={{ color: '#1F2937', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', verticalAlign: 'middle' }}>{entry.value}</span>
          <span style={{ color: '#98A2B3', marginLeft: '6px' }}>{entry.count.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* KPIs */}
      <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '14px 16px', boxShadow: '0 1px 2px rgba(16,24,40,.04)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
          <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '6px', padding: '10px 12px' }}>
            <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB' }}></span>Total Documents</div>
            <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px', color: '#111827', whiteSpace: 'nowrap' }}>{totalDocs.toLocaleString()}</div>
            <div style={{ fontSize: '9.5px', color: '#98A2B3', marginTop: '3px', whiteSpace: 'nowrap' }}>across {totalClasses} classes</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '6px', padding: '10px 12px' }}>
            <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0F9D58' }}></span>Total Storage</div>
            <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px', color: '#111827', whiteSpace: 'nowrap' }}>{totalStorageStr}</div>
            <div style={{ fontSize: '9.5px', color: '#98A2B3', marginTop: '3px', whiteSpace: 'nowrap' }}>avg {avgDocSizeStr}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '6px', padding: '10px 12px' }}>
            <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#B45309' }}></span>Formats</div>
            <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px', color: '#111827', whiteSpace: 'nowrap' }}>{formatCount}</div>
            <div style={{ fontSize: '9.5px', color: '#98A2B3', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topFormats || 'No data'}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '6px', padding: '10px 12px' }}>
            <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6B7280' }}></span>Date Range</div>
            <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px', color: '#111827', whiteSpace: 'nowrap' }}>{dateRangeStr}</div>
            <div style={{ fontSize: '9.5px', color: '#98A2B3', marginTop: '3px', whiteSpace: 'nowrap' }}>{yearsOfContent} yrs of content</div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '6px', padding: '10px 12px' }}>
            <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7C3AED' }}></span>Annotations</div>
            <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px', color: '#111827', whiteSpace: 'nowrap' }}>{annotationPct}%</div>
            <div style={{ fontSize: '9.5px', color: '#98A2B3', marginTop: '3px', whiteSpace: 'nowrap' }}>~{docsWithAnnotations.toLocaleString()} docs</div>
          </div>
        </div>
      </div>

      {/* Filter Pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ 
              padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', 
              border: `1px solid ${activeTab === tab.id ? '#C7D9FC' : '#E3E7EE'}`, 
              background: activeTab === tab.id ? '#EFF4FF' : '#fff', 
              color: activeTab === tab.id ? '#1D4ED8' : '#6B7280',
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Volume & Trend */}
      {shouldShow('Volume & Trend') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB' }}></span> Volume & Trend
            <div style={{ flex: 1, height: '1px', background: '#E3E7EE', marginLeft: '8px' }}></div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(16,24,40,.04)' }}>
            <div style={{ marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>Document Count</h3>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '9px 12px', borderBottom: '1px solid #E3E7EE', background: '#FAFBFC', color: '#98A2B3', fontSize: '10.5px', textTransform: 'uppercase' }}>Document Class</th>
                  <th style={{ textAlign: 'left', padding: '9px 12px', borderBottom: '1px solid #E3E7EE', background: '#FAFBFC', color: '#98A2B3', fontSize: '10.5px', textTransform: 'uppercase' }}>Document Count</th>
                  <th style={{ textAlign: 'left', padding: '9px 12px', borderBottom: '1px solid #E3E7EE', background: '#FAFBFC', color: '#98A2B3', fontSize: '10.5px', textTransform: 'uppercase' }}>Total Size</th>
                </tr>
              </thead>
              <tbody>
                {docCountData.map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #E3E7EE' }}>{row.class_name || row.CLASS_NAME}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #E3E7EE' }}>{Number(row.total_documents || row.TOTAL_DOCUMENTS).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #E3E7EE' }}>{(Number(row.total_size_bytes || row.TOTAL_SIZE_BYTES) / 1073741824).toFixed(2)} GB</td>
                  </tr>
                ))}
                {docCountData.length === 0 && !loading && (
                  <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#98A2B3' }}>No data available</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(16,24,40,.04)' }}>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ margin: '0', fontSize: '14px', fontWeight: '700', color: '#111827' }}>Year-Wise Trend</h3>
            </div>

            <div style={{ height: '280px', width: '100%', marginBottom: '16px', display: 'flex', justifyContent: 'flex-start' }}>
              {(() => {
                const yearMap = {};
                yearTrendData.forEach(row => {
                  const year = String(row.creation_year || row.CREATION_YEAR || row.yr || row.YR || '').trim();
                  if (year && year !== 'null' && year !== 'undefined' && year.length === 4) {
                    const count = Number(row.total_documents || row.TOTAL_DOCUMENTS) || 0;
                    if (!yearMap[year]) yearMap[year] = 0;
                    yearMap[year] += count;
                  }
                });
                const processed = Object.keys(yearMap).sort().map(year => ({
                  name: `'${year.slice(-2)}${year === '2025' ? '*' : ''}`,
                  fullYear: year,
                  documents: yearMap[year]
                }));

                if (processed.length === 0 && !loading) {
                  return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>No trend data available</div>;
                }

                return (
                  <ResponsiveContainer width={600} height="100%">
                    <BarChart data={processed} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} barCategoryGap="20%">
                      <XAxis dataKey="name" axisLine={{ stroke: '#E3E7EE', strokeWidth: 1 }} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} dy={10} />
                      <YAxis axisLine={{ stroke: '#E3E7EE', strokeWidth: 1 }} tickLine={false} tick={false} width={10} />
                      <RechartsTooltip
                        cursor={{ fill: '#F3F4F6' }}
                        contentStyle={{ background: '#111827', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', padding: '8px 12px' }}
                        itemStyle={{ color: '#E5E7EB' }}
                        formatter={(value) => [value.toLocaleString(), 'Documents']}
                        labelFormatter={(label) => `Year 20${String(label).replace(/['*]/g, '')}`}
                      />
                      <Bar dataKey="documents" fill="#2563EB" radius={0} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Format & Size */}
      {shouldShow('Format & Size') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0F9D58' }}></span> Format & Size
            <div style={{ flex: 1, height: '1px', background: '#E3E7EE', marginLeft: '8px' }}></div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1, background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(16,24,40,.04)', position: 'relative' }}>
              <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>MIME Type Distribution</h3>
                <span style={{ fontSize: '10.5px', color: '#9CA3AF', marginLeft: '10px', fontWeight: '500' }}>(Hover over "Others" to see all formats)</span>
              </div>
              
              <div style={{ height: '250px', width: '100%' }}>
                {processedMimeData.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={processedMimeData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={50}
                        paddingAngle={2}
                        minAngle={15}
                        isAnimationActive={false}
                        label={renderInsideLabel}
                        labelLine={false}
                      >
                        {processedMimeData.map((entry, index) => {
                          const origIndex = mimeData.findIndex(row => {
                            const name = String(row.mime_type || row.MIME_TYPE).split('/').pop() || String(row.mime_type || row.MIME_TYPE);
                            return name === entry.name;
                          });
                          const color = entry.name === 'Others' ? '#9CA3AF' : CHART_COLORS[index % CHART_COLORS.length];
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Pie>
                      <RechartsTooltip content={renderCustomTooltip("Documents")} />
                      <Legend 
                        layout="vertical" verticalAlign="middle" align="right" 
                        content={renderMimeLegend}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  !loading && <div style={{ color: '#98A2B3', fontSize: '12px', textAlign: 'center', padding: '10px', marginTop: '100px' }}>No MIME data</div>
                )}
              </div>
            </div>

            {/* Total Size by Class */}
            <div style={{ flex: 1, background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(16,24,40,.04)', position: 'relative' }}>
              <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>Total Size by Class</h3>
                <span style={{ fontSize: '10.5px', color: '#9CA3AF', marginLeft: '10px', fontWeight: '500' }}>(Hover over "Others" to see all classes)</span>
              </div>
              
              <div style={{ height: '250px', width: '100%' }}>
                {processedSizeTotalData.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={processedSizeTotalData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={50}
                        paddingAngle={2}
                        minAngle={15}
                        isAnimationActive={false}
                        label={renderInsideLabel}
                        labelLine={false}
                      >
                        {processedSizeTotalData.map((entry, index) => {
                          const origIndex = sizeTotalData.findIndex(row => (row.class_name || row.CLASS_NAME) === entry.name);
                          const color = entry.name === 'Others' ? '#9CA3AF' : CHART_COLORS[index % CHART_COLORS.length];
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Pie>
                      <RechartsTooltip content={renderCustomTooltip("GB", (val) => (val / 1024).toFixed(2))} />
                      <Legend 
                        layout="vertical" verticalAlign="middle" align="right" 
                        content={renderSizeLegend}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  !loading && <div style={{ color: '#98A2B3', fontSize: '12px', textAlign: 'center', padding: '10px', marginTop: '100px' }}>No size data</div>
                )}
              </div>
            </div>
          </div>
            
            <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(16,24,40,.04)' }}>
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>Size Buckets</h3>
              </div>
              
              <div style={{ height: '250px', width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
                <ResponsiveContainer width={600} height="100%">
                  <BarChart data={sizeBucketData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3E7EE" />
                    <XAxis dataKey={row => String(row.size_range || row.SIZE_RANGE).split('.')[1]?.trim().replace('Under', '<') || row.size_range} axisLine={{ stroke: '#E3E7EE' }} tickLine={false} tick={{ fontSize: 10, fill: '#98A2B3' }} interval={0} angle={-45} textAnchor="end" height={60} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#98A2B3' }} />
                    <RechartsTooltip cursor={{ fill: '#F4F6F9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E3E7EE', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', fontSize: '12px' }} />
                    <Bar dataKey={row => Number(row.total_documents || row.TOTAL_DOCUMENTS)} fill="#0F9D58" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(16,24,40,.04)' }}>
            <div style={{ marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>No Content Elements</h3>
            </div>
            {noContentData.some(r => (r.docs_without_content || r.DOCS_WITHOUT_CONTENT) > 0) && (
              <div style={{ background: '#FEF2F2', border: '1px dashed #FCA5A5', borderRadius: '6px', padding: '12px 14px', marginBottom: '16px', fontSize: '12px', color: '#B91C1C' }}>
                Warning: Found documents missing content elements. Review before migration.
              </div>
            )}
            
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E3E7EE', fontSize: '10px', color: '#98A2B3', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0 0 8px 0', fontWeight: '700' }}>DOCUMENT CLASS</th>
                  <th style={{ padding: '0 0 8px 0', fontWeight: '700' }}>DOCUMENTS WITHOUT CONTENT</th>
                </tr>
              </thead>
              <tbody>
                {noContentData.filter(r => (r.docs_without_content || r.DOCS_WITHOUT_CONTENT) > 0).map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F2F4' }}>
                    <td style={{ padding: '12px 0', fontSize: '12.5px', color: '#1F2937' }}>{row.class_name || row.CLASS_NAME}</td>
                    <td style={{ padding: '12px 0', fontSize: '12.5px', color: '#B91C1C', fontWeight: '600' }}>{Number(row.docs_without_content || row.DOCS_WITHOUT_CONTENT).toLocaleString()}</td>
                  </tr>
                ))}
                {noContentData.filter(r => (r.docs_without_content || r.DOCS_WITHOUT_CONTENT) > 0).length === 0 && (
                  <tr><td colSpan={2} style={{ padding: '20px 0', textAlign: 'center', fontSize: '12.5px', color: '#98A2B3' }}>No empty content documents found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Annotation & Components */}
      {shouldShow('Annotation & Components') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7C3AED' }}></span> Annotation & Components
            <div style={{ flex: 1, height: '1px', background: '#E3E7EE', marginLeft: '8px' }}></div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(16,24,40,.04)' }}>
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>Annotations by Document Class</h3>
              </div>
              
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E3E7EE', fontSize: '10px', color: '#98A2B3', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0 0 8px 0', fontWeight: '700' }}>DOCUMENT CLASS</th>
                    <th style={{ padding: '0 0 8px 0', fontWeight: '700' }}>ANNOTATION COUNT</th>
                    <th style={{ padding: '0 0 8px 0', fontWeight: '700' }}>DISTINCT DOCS</th>
                  </tr>
                </thead>
                <tbody>
                  {annotationTotalData.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F1F2F4' }}>
                      <td style={{ padding: '12px 0', fontSize: '12.5px', color: '#111827', fontWeight: '500' }}>{row.class_name || row.CLASS_NAME}</td>
                      <td style={{ padding: '12px 0', fontSize: '12.5px', color: '#111827' }}>{Number(row.total_annotations || row.TOTAL_ANNOTATIONS).toLocaleString()}</td>
                      <td style={{ padding: '12px 0', fontSize: '12.5px', color: '#111827' }}>{Number(row.total_documents_with_annotations || row.TOTAL_DOCUMENTS_WITH_ANNOTATIONS).toLocaleString()}</td>
                    </tr>
                  ))}
                  {annotationTotalData.length === 0 && !loading && (
                    <tr><td colSpan="3" style={{ padding: '20px 0', textAlign: 'center', fontSize: '12.5px', color: '#98A2B3' }}>No annotations found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(16,24,40,.04)', position: 'relative' }}>
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>Annotations by MIME Type</h3>
              </div>
              <div style={{ height: '250px', width: '100%' }}>
                {processedAnnotationMimeData.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={processedAnnotationMimeData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={50}
                        paddingAngle={2}
                        minAngle={15}
                        isAnimationActive={false}
                        label={renderInsideLabel}
                        labelLine={false}
                      >
                        {processedAnnotationMimeData.map((entry, index) => {
                          const origIndex = annotationMimeData.findIndex(row => {
                            const name = String(row.mime_type || row.MIME_TYPE).split('/').pop() || String(row.mime_type || row.MIME_TYPE);
                            return name === entry.name;
                          });
                          const color = entry.name === 'Others' ? '#9CA3AF' : CHART_COLORS[index % CHART_COLORS.length];
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ background: '#111827', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', padding: '8px 12px' }}
                        itemStyle={{ color: '#E5E7EB' }}
                        formatter={(value) => [value.toLocaleString(), 'Annotations']}
                      />
                      <Legend 
                        layout="vertical" verticalAlign="middle" align="right" 
                        content={renderAnnotationMimeLegend}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  !loading && <div style={{ color: '#98A2B3', fontSize: '12px', textAlign: 'center', padding: '10px', marginTop: '100px' }}>No MIME annotations found</div>
                )}
              </div>
            </div>
          </div>
          
          {renderTable('Custom Object Trend', '/discovery/custom-object-trend', customObjectTrendData)}
        </div>
      )}

      {/* Versions */}
      {shouldShow('Versions') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }}></span> Versions
            <div style={{ flex: 1, height: '1px', background: '#E3E7EE', marginLeft: '8px' }}></div>
          </div>
          {renderTable('Version Summary by Class', '/discovery/version-summary', versionSummaryData)}
          
          <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(16,24,40,.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#111827' }}>Version Distribution</h3>
              </div>
            </div>

            <div style={{ height: '300px', width: '100%', maxWidth: '450px', marginTop: '20px' }}>
              <ResponsiveContainer>
                <BarChart data={processedVersionBuckets} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="name" axisLine={{ stroke: '#E5E7EB' }} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis hide />
                  <RechartsTooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                  <Bar 
                    dataKey="count" 
                    fill="#C25906" 
                    maxBarSize={42} 
                    radius={[2, 2, 0, 0]} 
                    isAnimationActive={false}
                    label={(props) => {
                      const { x, y, width, value } = props;
                      if (!value) return null;
                      return (
                        <text x={x + width / 2} y={y - 10} fill="#1F2937" fontSize={12} fontWeight={600} textAnchor="middle">
                          {value.toLocaleString()}
                        </text>
                      );
                    }} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Elements */}
      {shouldShow('Elements') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6' }}></span> Elements
            <div style={{ flex: 1, height: '1px', background: '#E3E7EE', marginLeft: '8px' }}></div>
          </div>
          {renderTable('Total Content Elements', '/discovery/element-total', elementTotalData)}
          {renderTable('Elements per Document Class', '/discovery/element-class', elementClassData)}

        </div>
      )}

      {/* Properties */}
      {shouldShow('Properties') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></span> Properties
            <div style={{ flex: 1, height: '1px', background: '#E3E7EE', marginLeft: '8px' }}></div>
          </div>
          {(() => {
            const propertyClasses = ['All', ...new Set(propertyDefsData.map(r => r.class_name || r.CLASS_NAME).filter(Boolean))];
            const filteredData = propertyClassFilter === 'All' 
              ? propertyDefsData 
              : propertyDefsData.filter(r => (r.class_name || r.CLASS_NAME) === propertyClassFilter);
            
            const dropdown = (
              <select 
                value={propertyClassFilter} 
                onChange={(e) => setPropertyClassFilter(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '1px solid #E3E7EE', background: '#fff', color: '#374151', cursor: 'pointer', outline: 'none' }}
              >
                {propertyClasses.map(cls => (
                  <option key={cls} value={cls}>{cls === 'All' ? 'All Classes' : cls}</option>
                ))}
              </select>
            );
            return renderTable('Property Definitions', '/discovery/property-defs', filteredData, dropdown);
          })()}
        </div>
      )}

      {/* Hex/Blob */}
      {shouldShow('Hex/Blob') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8B5CF6' }}></span> Hex/Blob
            <div style={{ flex: 1, height: '1px', background: '#E3E7EE', marginLeft: '8px' }}></div>
          </div>
          {renderTable('Retrieval Names Hex/Blob', '/discovery/retrieval-hex-blob', retrievalHexData)}
          {renderTable('Component Types Hex/Blob', '/discovery/component-hex-blob', componentHexData)}
          {renderTable('Content Info Hex/Blob', '/discovery/content-hex-blob', contentHexData)}
        </div>
      )}

    </div>
  );
}
