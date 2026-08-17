import React, { useState, useEffect } from 'react'
import { apiExecuteQuery } from '../utils/api'
import { Loader2, RefreshCw } from 'lucide-react'

export default function DashboardOverview() {
  const [countdown, setCountdown] = useState(30)
  const [loading, setLoading] = useState(true)

  // ── Source Discovery: Static Configuration as Specified ──
  // Document Migration: Total 978 documents count, metadata fields: 18, image formats: 17, document class: 1 (Policy doc)
  const docDiscovery = {
    total: 978,
    breakdown: [
      { name: 'Policy doc', count: 978, color: '#2563EB' }
    ],
    classCount: 1,
    fieldCount: 18,
    imageFormatCount: 17
  }

  // Case Migration: Total 1000 documents count, metadata fields: 9, case class: 1 (CLAIM only), image formats: 17
  const caseDiscovery = {
    total: 1000,
    breakdown: [
      { name: 'CLAIM', count: 1000, color: '#2563EB' }
    ],
    classCount: 1,
    fieldCount: 9,
    imageFormatCount: 17
  }

  // ── Migration Status: Dynamic Live Data from Database ──
  const [docStatus, setDocStatus] = useState({
    total: 1000,
    extracted: 1000,
    success: 0,
    pending: 0,
    inProgress: 0,
    failed: 0
  })

  const [caseStatus, setCaseStatus] = useState({
    total: 1000,
    extracted: 1000,
    success: 0,
    pending: 0,
    inProgress: 0,
    failed: 0
  })

  const loadData = async () => {
    try {
      // ── 1. REAL LIVE DATA: DOCTABA (IS / Document Migration) ──
      try {
        const queryDocCounts = `
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN LOWER(COALESCE(migration_status, '')) IN ('success', 'migrated') THEN 1 ELSE 0 END) as success,
            SUM(CASE WHEN LOWER(COALESCE(migration_status, '')) IN ('in progress', 'in-progress', 'inprogress', 'retry') THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN LOWER(COALESCE(migration_status, '')) = 'failed' THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN LOWER(COALESCE(migration_status, '')) = 'pending' THEN 1 ELSE 0 END) as pending
          FROM doctaba_staging_table
        `
        const resDoc = await apiExecuteQuery(queryDocCounts)
        if (resDoc && resDoc.length > 0 && Number(resDoc[0].total) > 0) {
          const c = resDoc[0]
          const total = Number(c.total) || 0
          const success = Number(c.success) || 0
          const inProgress = Number(c.in_progress) || 0
          const failed = Number(c.failed) || 0
          const pending = Number(c.pending) || 0
          let extracted = total - pending
          if (extracted <= 0 && (success > 0 || inProgress > 0 || failed > 0)) {
            extracted = success + inProgress + failed
          }

          setDocStatus({
            total,
            extracted,
            success,
            pending,
            inProgress,
            failed
          })
        }
      } catch (err) {
        console.warn('Live doctaba status query error:', err)
      }

      // ── 2. REAL LIVE DATA: CASE_METADATA (Case Migration) ──
      try {
        const queryCaseCounts = `
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN LOWER(COALESCE(migration_status, '')) IN ('success', 'migrated') THEN 1 ELSE 0 END) as success,
            SUM(CASE WHEN LOWER(COALESCE(migration_status, '')) IN ('in progress', 'in-progress', 'inprogress', 'retry') THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN LOWER(COALESCE(migration_status, '')) = 'failed' THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN LOWER(COALESCE(migration_status, '')) = 'pending' THEN 1 ELSE 0 END) as pending
          FROM case_metadata
        `
        const resCase = await apiExecuteQuery(queryCaseCounts)
        if (resCase && resCase.length > 0 && Number(resCase[0].total) > 0) {
          const c = resCase[0]
          const total = Number(c.total) || 0
          const success = Number(c.success) || 0
          const inProgress = Number(c.in_progress) || 0
          const failed = Number(c.failed) || 0
          const pending = Number(c.pending) || 0
          let extracted = total - pending
          if (extracted <= 0 && (success > 0 || inProgress > 0 || failed > 0)) {
            extracted = success + inProgress + failed
          }

          setCaseStatus({
            total,
            extracted,
            success,
            pending,
            inProgress,
            failed
          })
        }
      } catch (err) {
        console.warn('Live case_metadata status query error:', err)
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (countdown === 0) {
      loadData()
      setCountdown(30)
    }
  }, [countdown])

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // Calculate SVG Donut slice segments
  const getDonutSlices = (items, total) => {
    const circum = 282.74
    let accumulated = 0
    return items.map((item) => {
      const pct = total > 0 ? item.count / total : 0
      const strokeLength = Math.max(pct * circum, 0)
      const strokeOffset = -accumulated
      accumulated += strokeLength
      return {
        ...item,
        strokeDasharray: `${strokeLength} ${circum}`,
        strokeDashoffset: strokeOffset
      }
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', background: '#f8fafc' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: '#2563EB' }} />
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>Loading Live Migration Metrics...</span>
      </div>
    )
  }

  return (
    <div style={{ padding: '14px 20px', background: '#f8fafc', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* ════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: SOURCE DISCOVERY (Header & Auto-Refresh inline)       */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            SOURCE DISCOVERY
          </div>
          
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#64748b', 
            background: '#ffffff', padding: '3px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', 
            fontWeight: '600', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }}></span>
            <span>Auto-Refresh: {formatTime(countdown)}</span>
            <button 
              type="button"
              onClick={() => loadData()}
              style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
              title="Refresh now"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          
          {/* Card 1: Document Migration (Static Data) */}
          <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>Document Migration</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#94a3b8' }}>Breakdown by document class, scanned from source</p>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 9px', background: '#eff6ff', color: '#2563eb', borderRadius: '12px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#2563eb' }}></span>
                  {docDiscovery.total.toLocaleString()} documents
                </span>
              </div>

              {/* Donut Chart & Legend */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '20px', padding: '6px 0 14px 0' }}>
                {/* Donut SVG */}
                <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
                  <svg viewBox="0 0 120 120" width="130" height="130">
                    <circle cx="60" cy="60" r="45" fill="none" stroke="#f1f5f9" strokeWidth="13" />
                    {getDonutSlices(docDiscovery.breakdown, docDiscovery.total).map((slice, idx) => (
                      <circle
                        key={idx}
                        cx="60"
                        cy="60"
                        r="45"
                        fill="none"
                        stroke={slice.color}
                        strokeWidth="13"
                        strokeDasharray={slice.strokeDasharray}
                        strokeDashoffset={slice.strokeDashoffset}
                        transform="rotate(-90 60 60)"
                        style={{ transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease' }}
                      />
                    ))}
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>{docDiscovery.total.toLocaleString()}</span>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>Documents</span>
                  </div>
                </div>

                {/* Legend List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px' }}>
                  {docDiscovery.breakdown.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontWeight: '500', whiteSpace: 'nowrap' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: item.color, flexShrink: 0 }}></span>
                        {item.name}
                      </span>
                      <span style={{ fontWeight: '700', color: '#1e293b', marginLeft: '12px' }}>{item.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Row (Document Class: 1, Metadata Fields: 18, Image Formats: 17) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '1px solid #f1f5f9', paddingTop: '10px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap' }}>Document Classes</div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#1e293b', marginTop: '2px' }}>{docDiscovery.classCount}</div>
              </div>
              <div style={{ borderLeft: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap' }}>Metadata Fields</div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#1e293b', marginTop: '2px' }}>{docDiscovery.fieldCount}</div>
              </div>
              <div style={{ borderLeft: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap' }}>Image Formats</div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#1e293b', marginTop: '2px' }}>{docDiscovery.imageFormatCount}</div>
              </div>
            </div>
          </div>

          {/* Card 2: Case Migration (Static Data) */}
          <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>Case Migration</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#94a3b8' }}>Breakdown by case type, scanned from source</p>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 9px', background: '#eff6ff', color: '#2563eb', borderRadius: '12px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#2563eb' }}></span>
                  {caseDiscovery.total.toLocaleString()} cases
                </span>
              </div>

              {/* Donut Chart & Legend */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '20px', padding: '6px 0 14px 0' }}>
                {/* Donut SVG */}
                <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
                  <svg viewBox="0 0 120 120" width="130" height="130">
                    <circle cx="60" cy="60" r="45" fill="none" stroke="#f1f5f9" strokeWidth="13" />
                    {getDonutSlices(caseDiscovery.breakdown, caseDiscovery.total).map((slice, idx) => (
                      <circle
                        key={idx}
                        cx="60"
                        cy="60"
                        r="45"
                        fill="none"
                        stroke={slice.color}
                        strokeWidth="13"
                        strokeDasharray={slice.strokeDasharray}
                        strokeDashoffset={slice.strokeDashoffset}
                        transform="rotate(-90 60 60)"
                        style={{ transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease' }}
                      />
                    ))}
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>{caseDiscovery.total.toLocaleString()}</span>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>Cases</span>
                  </div>
                </div>

                {/* Legend List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px' }}>
                  {caseDiscovery.breakdown.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontWeight: '500', whiteSpace: 'nowrap' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: item.color, flexShrink: 0 }}></span>
                        {item.name}
                      </span>
                      <span style={{ fontWeight: '700', color: '#1e293b', marginLeft: '12px' }}>{item.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Row (Case Classes: 1, Metadata Fields: 9, Image Formats: 17) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid #f1f5f9', paddingTop: '10px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap' }}>Case Classes</div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#1e293b', marginTop: '2px' }}>{caseDiscovery.classCount}</div>
              </div>
              <div style={{ borderLeft: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap' }}>Metadata Fields</div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#1e293b', marginTop: '2px' }}>{caseDiscovery.fieldCount}</div>
              </div>
              <div style={{ borderLeft: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap' }}>Image Formats</div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#1e293b', marginTop: '2px' }}>{caseDiscovery.imageFormatCount}</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: MIGRATION STATUS (Live Migration Real Data)          */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div>
        <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
          MIGRATION STATUS
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          
          {/* Card 1: Document Migration (DocTaba Real Live Data) */}
          <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>Document Migration</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#94a3b8' }}>Document migration status</p>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 9px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#64748b' }}></span>
                {docStatus.extracted.toLocaleString()} total extracted scope
              </span>
            </div>

            {/* 4 KPI Grid Cards (Non-wrapping clean layout) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {/* Total Extracted */}
              <div style={{ padding: '10px 8px', background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '8px', minWidth: 0 }}>
                <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563eb', flexShrink: 0 }}></span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Total Extracted</span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginTop: '4px', whiteSpace: 'nowrap' }}>
                  {docStatus.extracted.toLocaleString()}
                </div>
              </div>

              {/* Total Migrated */}
              <div style={{ padding: '10px 8px', background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '8px', minWidth: 0 }}>
                <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }}></span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Total Migrated</span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginTop: '4px', whiteSpace: 'nowrap' }}>
                  {docStatus.success.toLocaleString()}
                </div>
              </div>

              {/* Pending */}
              <div style={{ padding: '10px 8px', background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '8px', minWidth: 0 }}>
                <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8', flexShrink: 0 }}></span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Pending</span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginTop: '4px', whiteSpace: 'nowrap' }}>
                  {docStatus.pending.toLocaleString()}
                </div>
              </div>

              {/* In Progress */}
              <div style={{ padding: '10px 8px', background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '8px', minWidth: 0 }}>
                <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706', flexShrink: 0 }}></span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>In Progress</span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginTop: '4px', whiteSpace: 'nowrap' }}>
                  {docStatus.inProgress.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Case Migration (Case Metadata Real Live Data) */}
          <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>Case Migration</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#94a3b8' }}>Case data migration status</p>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 9px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#64748b' }}></span>
                {caseStatus.extracted.toLocaleString()} total extracted scope
              </span>
            </div>

            {/* 4 KPI Grid Cards (Non-wrapping clean layout) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {/* Total Extracted */}
              <div style={{ padding: '10px 8px', background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '8px', minWidth: 0 }}>
                <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563eb', flexShrink: 0 }}></span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Total Extracted</span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginTop: '4px', whiteSpace: 'nowrap' }}>
                  {caseStatus.extracted.toLocaleString()}
                </div>
              </div>

              {/* Total Migrated */}
              <div style={{ padding: '10px 8px', background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '8px', minWidth: 0 }}>
                <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }}></span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Total Migrated</span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginTop: '4px', whiteSpace: 'nowrap' }}>
                  {caseStatus.success.toLocaleString()}
                </div>
              </div>

              {/* Pending */}
              <div style={{ padding: '10px 8px', background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '8px', minWidth: 0 }}>
                <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8', flexShrink: 0 }}></span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Pending</span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginTop: '4px', whiteSpace: 'nowrap' }}>
                  {caseStatus.pending.toLocaleString()}
                </div>
              </div>

              {/* In Progress */}
              <div style={{ padding: '10px 8px', background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '8px', minWidth: 0 }}>
                <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706', flexShrink: 0 }}></span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>In Progress</span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginTop: '4px', whiteSpace: 'nowrap' }}>
                  {caseStatus.inProgress.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
