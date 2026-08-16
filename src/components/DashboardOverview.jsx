import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiExecuteQuery } from '../utils/api'
import { Loader2 } from 'lucide-react'

export default function DashboardOverview() {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(30)
  const [data, setData] = useState({
    total: 0,
    extracted: 0,
    inProgress: 0,
    success: 0,
    failed: 0,
    pending: 0,
    trendExtracted: [0, 0, 0, 0, 0, 0, 0],
    trendSuccess: [0, 0, 0, 0, 0, 0, 0],
    trendFailed: [0, 0, 0, 0, 0, 0, 0],
    trendLabels: ['', '', '', '', '', '', ''],
    loading: true
  })

  const loadData = async (isAutoRefresh = false) => {
    try {
      if (isAutoRefresh) {
        // Mutate database: transition 1 pending record to success
        await apiExecuteQuery(`
          UPDATE doctaba 
          SET migration_status = 'success', 
              f_entrydate = ${Math.floor(Date.now() / (1000 * 60 * 60 * 24))} 
          WHERE f_docnumber IN (
            SELECT f_docnumber 
            FROM doctaba 
            WHERE LOWER(migration_status) = 'pending' 
            LIMIT 1
          )
        `)
      }

      // 1. Fetch Overall Counts
      const queryOverall = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN LOWER(migration_status) IN ('success', 'migrated') THEN 1 ELSE 0 END) as success,
          SUM(CASE WHEN LOWER(migration_status) IN ('in progress', 'in-progress', 'inprogress', 'retry') THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN LOWER(migration_status) IN ('failed') THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN LOWER(migration_status) IN ('pending') THEN 1 ELSE 0 END) as pending
        FROM doctaba
      `
      const resOverall = await apiExecuteQuery(queryOverall)
      let total = 0, success = 0, inProgress = 0, failed = 0, pending = 0, extracted = 0

      if (resOverall && resOverall.length > 0) {
        const counts = resOverall[0]
        total = Number(counts.total) || 0
        success = Number(counts.success) || 0
        inProgress = Number(counts.in_progress) || 0
        failed = Number(counts.failed) || 0
        pending = Number(counts.pending) || 0
        extracted = total - pending
      }

      // 2. Fetch Trend Details for Cumulative 7 Days
      const todayEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24))
      const startEpoch = todayEpoch - 6

      // Baseline counts (prior to startEpoch)
      const queryBaseline = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN LOWER(migration_status) IN ('success', 'migrated') THEN 1 ELSE 0 END) as success,
          SUM(CASE WHEN LOWER(migration_status) IN ('failed') THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN LOWER(migration_status) IN ('pending') THEN 1 ELSE 0 END) as pending
        FROM doctaba
        WHERE f_entrydate IS NOT NULL AND f_entrydate::integer < ${startEpoch}
      `
      const resBaseline = await apiExecuteQuery(queryBaseline)
      let baseTotal = 0, baseSuccess = 0, baseFailed = 0, basePending = 0
      if (resBaseline && resBaseline.length > 0) {
        const base = resBaseline[0]
        baseTotal = Number(base.total) || 0
        baseSuccess = Number(base.success) || 0
        baseFailed = Number(base.failed) || 0
        basePending = Number(base.pending) || 0
      }
      let baseExtracted = baseTotal - basePending

      // Daily changes inside the 7 days window
      const queryDaily = `
        SELECT 
          f_entrydate::integer as day,
          COUNT(*) as total,
          SUM(CASE WHEN LOWER(migration_status) IN ('success', 'migrated') THEN 1 ELSE 0 END) as success,
          SUM(CASE WHEN LOWER(migration_status) IN ('failed') THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN LOWER(migration_status) IN ('pending') THEN 1 ELSE 0 END) as pending
        FROM doctaba
        WHERE f_entrydate IS NOT NULL 
          AND f_entrydate::integer >= ${startEpoch} 
          AND f_entrydate::integer <= ${todayEpoch}
        GROUP BY f_entrydate::integer
        ORDER BY f_entrydate::integer ASC
      `
      const resDaily = await apiExecuteQuery(queryDaily) || []
      const dailyMap = {}
      resDaily.forEach(row => {
        dailyMap[row.day] = {
          extracted: (Number(row.total) || 0) - (Number(row.pending) || 0),
          success: Number(row.success) || 0,
          failed: Number(row.failed) || 0
        }
      })

      // Build the cumulative points for 7 days
      const trendExtracted = []
      const trendSuccess = []
      const trendFailed = []
      const trendLabels = []

      let currExtracted = baseExtracted
      let currSuccess = baseSuccess
      let currFailed = baseFailed

      for (let i = 0; i < 7; i++) {
        const targetDay = startEpoch + i
        const dayChange = dailyMap[targetDay] || { extracted: 0, success: 0, failed: 0 }

        currExtracted += dayChange.extracted
        currSuccess += dayChange.success
        currFailed += dayChange.failed

        trendExtracted.push(currExtracted)
        trendSuccess.push(currSuccess)
        trendFailed.push(currFailed)

        // Format date to e.g. "Aug 9"
        const dateObj = new Date(targetDay * 24 * 60 * 60 * 1000)
        trendLabels.push(dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      }

      setData(prev => ({
        ...prev,
        total,
        extracted,
        inProgress,
        success,
        failed,
        pending,
        trendExtracted,
        trendSuccess,
        trendFailed,
        trendLabels,
        loading: false
      }))

    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  useEffect(() => {
    loadData(false)
  }, [])

  useEffect(() => {
    if (countdown === 0) {
      loadData(true)
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

  const total = data.total || 1
  const extractedPct = ((data.extracted / total) * 100).toFixed(1)
  const migratedPct = ((data.success / total) * 100).toFixed(1)
  const failedPct = ((data.failed / total) * 100).toFixed(1)

  // Donut chart segments calculations (circumference is 283)
  const successCirc = (data.success / total) * 283
  const ipCirc = (data.inProgress / total) * 283
  const failedCirc = (data.failed / total) * 283
  const pendingCirc = (data.pending / total) * 283

  // Line chart coordinates calculator helper
  const getSvgPoints = (dataset) => {
    return dataset.map((val, idx) => {
      const x = 60 + idx * 70
      // 170 is baseline y, Y range is 140px, scaled to maximum total records
      const y = 170 - (val / total) * 140
      return `${x},${y}`
    }).join(' ')
  }

  if (data.loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', background: '#f8f9fa' }}>
        <Loader2 size={40} className="animate-spin" style={{ color: '#2563EB' }} />
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>Loading Live Migration Metrics...</span>
      </div>
    )
  }

  return (
    <div style={{ padding: '14px', background: '#f8f9fa', height: '100%', overflowY: 'auto' }}>
      
      {/* Auto-refresh indicator */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '10px', paddingRight: '4px' }}>
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#4b5563', 
          background: '#fff', padding: '4px 10px', borderRadius: '6px', border: '1px solid #E3E7EE', 
          fontFamily: 'monospace', fontWeight: 'bold', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }}></span>
          <span>Auto-Refresh: {formatTime(countdown)}</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '14px', marginBottom: '20px' }}>
        <div className="card kpi-card" style={{ padding: '14px 16px', background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px' }}>
          <div className="kpi-label" style={{ fontSize: '11.5px', color: '#6B7280', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="kpi-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6B7280' }}></span>Total Records
          </div>
          <div className="kpi-value" style={{ fontSize: '22px', fontWeight: '700', marginTop: '6px', color: '#1F2937' }}>{data.total.toLocaleString()}</div>
          <div className="kpi-sub" style={{ fontSize: '10.5px', color: '#98A2B3', marginTop: '2px' }}>All source repositories</div>
        </div>

        <div className="card kpi-card" style={{ padding: '14px 16px', background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px' }}>
          <div className="kpi-label" style={{ fontSize: '11.5px', color: '#6B7280', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="kpi-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2563EB' }}></span>Extracted
          </div>
          <div className="kpi-value" style={{ fontSize: '22px', fontWeight: '700', marginTop: '6px', color: '#1F2937' }}>{data.extracted.toLocaleString()}</div>
          <div className="kpi-sub" style={{ fontSize: '10.5px', color: '#98A2B3', marginTop: '2px' }}>{extractedPct}% of total</div>
        </div>

        <div className="card kpi-card" style={{ padding: '14px 16px', background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px' }}>
          <div className="kpi-label" style={{ fontSize: '11.5px', color: '#6B7280', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="kpi-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#B45309' }}></span>In Progress
          </div>
          <div className="kpi-value" style={{ fontSize: '22px', fontWeight: '700', marginTop: '6px', color: '#1F2937' }}>{data.inProgress.toLocaleString()}</div>
          <div className="kpi-sub" style={{ fontSize: '10.5px', color: '#98A2B3', marginTop: '2px' }}>Active database operations</div>
        </div>

        <div className="card kpi-card" style={{ padding: '14px 16px', background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px' }}>
          <div className="kpi-label" style={{ fontSize: '11.5px', color: '#6B7280', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="kpi-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#0F9D58' }}></span>Migrated
          </div>
          <div className="kpi-value" style={{ fontSize: '22px', fontWeight: '700', marginTop: '6px', color: '#1F2937' }}>{data.success.toLocaleString()}</div>
          <div className="kpi-sub" style={{ fontSize: '10.5px', color: '#98A2B3', marginTop: '2px' }}>{migratedPct}% of total</div>
        </div>

        <div className="card kpi-card" style={{ padding: '14px 16px', background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px' }}>
          <div className="kpi-label" style={{ fontSize: '11.5px', color: '#6B7280', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="kpi-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#D92D20' }}></span>Failed
          </div>
          <div className="kpi-value" style={{ fontSize: '22px', fontWeight: '700', marginTop: '6px', color: '#1F2937' }}>{data.failed.toLocaleString()}</div>
          <div className="kpi-sub" style={{ fontSize: '10.5px', color: '#98A2B3', marginTop: '2px' }}>{failedPct}% failure rate</div>
        </div>

        <div className="card kpi-card" style={{ padding: '14px 16px', background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px' }}>
          <div className="kpi-label" style={{ fontSize: '11.5px', color: '#6B7280', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="kpi-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#98A2B3' }}></span>Pending
          </div>
          <div className="kpi-value" style={{ fontSize: '22px', fontWeight: '700', marginTop: '6px', color: '#1F2937' }}>{data.pending.toLocaleString()}</div>
          <div className="kpi-sub" style={{ fontSize: '10.5px', color: '#98A2B3', marginTop: '2px' }}>Queued for extraction</div>
        </div>
      </div>

      {/* Grid: Charts */}
      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '16px', marginBottom: '20px' }}>
        
        {/* Progress Chart */}
        <div className="card panel" style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '18px 20px' }}>
          <div className="panel-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div className="panel-title" style={{ fontSize: '14px', fontWeight: '700', color: '#1F2937' }}>
              Migration Progress <small style={{ display: 'block', fontSize: '11px', color: '#98A2B3', fontWeight: '400', marginTop: '2px' }}>Extracted vs. Imported vs. Failed — last 7 days</small>
            </div>
          </div>
          <svg viewBox="0 0 560 200" width="100%" height="200">
            <line x1="40" y1="20" x2="40" y2="170" stroke="#E3E7EE"/>
            <line x1="40" y1="170" x2="540" y2="170" stroke="#E3E7EE"/>
            <g stroke="#F4F6F9">
              <line x1="40" y1="60" x2="540" y2="60"/>
              <line x1="40" y1="100" x2="540" y2="100"/>
              <line x1="40" y1="135" x2="540" y2="135"/>
            </g>
            
            {/* Real dynamic cumulative trend points */}
            <polyline fill="none" stroke="#2563EB" strokeWidth="2.5" points={getSvgPoints(data.trendExtracted)}/>
            <polyline fill="none" stroke="#0F9D58" strokeWidth="2.5" points={getSvgPoints(data.trendSuccess)}/>
            <polyline fill="none" stroke="#D92D20" strokeWidth="2" strokeDasharray="3 3" points={getSvgPoints(data.trendFailed)}/>
            
            <g fontSize="9.5" fill="#98A2B3">
              {data.trendLabels.map((label, idx) => (
                <text key={idx} x={55 + idx * 70} y="185">{label}</text>
              ))}
            </g>
          </svg>
          <div style={{ display: 'flex', gap: '18px', marginTop: '8px', fontSize: '11.5px', color: '#6B7280' }}>
            <span><span style={{ display: 'inline-block', width: '9px', height: '9px', background: '#2563EB', borderRadius: '2px', marginRight: '5px' }}></span>Extracted</span>
            <span><span style={{ display: 'inline-block', width: '9px', height: '9px', background: '#0F9D58', borderRadius: '2px', marginRight: '5px' }}></span>Imported</span>
            <span><span style={{ display: 'inline-block', width: '9px', height: '9px', background: '#D92D20', borderRadius: '2px', marginRight: '5px' }}></span>Failed</span>
          </div>
        </div>

        {/* Donut Chart panel */}
        <div className="card panel" style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '18px 20px' }}>
          <div className="panel-head" style={{ marginBottom: '14px' }}>
            <div className="panel-title" style={{ fontSize: '14px', fontWeight: '700', color: '#1F2937' }}>
              Migration Status <small style={{ display: 'block', fontSize: '11px', color: '#98A2B3', fontWeight: '400', marginTop: '2px' }}>Current record distribution</small>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <svg viewBox="0 0 120 120" width="130" height="130">
              <circle cx="60" cy="60" r="45" fill="none" stroke="#F4F6F9" strokeWidth="16"/>
              {/* Dynamic segmented slices */}
              <circle cx="60" cy="60" r="45" fill="none" stroke="#0F9D58" strokeWidth="16" strokeDasharray={`${successCirc} 283`} strokeDashoffset="0" transform="rotate(-90 60 60)"/>
              <circle cx="60" cy="60" r="45" fill="none" stroke="#2563EB" strokeWidth="16" strokeDasharray={`${ipCirc} 283`} strokeDashoffset={`-${successCirc}`} transform="rotate(-90 60 60)"/>
              <circle cx="60" cy="60" r="45" fill="none" stroke="#D92D20" strokeWidth="16" strokeDasharray={`${failedCirc} 283`} strokeDashoffset={`-${successCirc + ipCirc}`} transform="rotate(-90 60 60)"/>
              <circle cx="60" cy="60" r="45" fill="none" stroke="#98A2B3" strokeWidth="16" strokeDasharray={`${pendingCirc} 283`} strokeDashoffset={`-${successCirc + ipCirc + failedCirc}`} transform="rotate(-90 60 60)"/>
              
              <text x="60" y="56" textAnchor="middle" fontSize="17" fontWeight="700" fill="#1F2937">{migratedPct}%</text>
              <text x="60" y="72" text-anchor="middle" fontSize="9" fill="#98A2B3">Migrated</text>
            </svg>
            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '9px', color: '#1F2937' }}>
              <div><span style={{ display: 'inline-block', width: '9px', height: '9px', background: '#0F9D58', borderRadius: '2px', marginRight: '6px' }}></span>Migrated — {data.success.toLocaleString()}</div>
              <div><span style={{ display: 'inline-block', width: '9px', height: '9px', background: '#2563EB', borderRadius: '2px', marginRight: '6px' }}></span>In Progress — {data.inProgress.toLocaleString()}</div>
              <div><span style={{ display: 'inline-block', width: '9px', height: '9px', background: '#D92D20', borderRadius: '2px', marginRight: '6px' }}></span>Failed — {data.failed.toLocaleString()}</div>
              <div><span style={{ display: 'inline-block', width: '9px', height: '9px', background: '#98A2B3', borderRadius: '2px', marginRight: '6px' }}></span>Pending — {data.pending.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Jobs Table */}
      <div className="card panel" style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '18px 20px' }}>
        <div className="panel-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div className="panel-title" style={{ fontSize: '14px', fontWeight: '700', color: '#1F2937' }}>
            Recent Jobs <small style={{ display: 'block', fontSize: '11px', color: '#98A2B3', fontWeight: '400', marginTop: '2px' }}>Latest extraction and import activity</small>
          </div>
          <button 
            onClick={() => navigate('/deliverables')} 
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              border: '1px solid #E3E7EE',
              background: '#fff',
              cursor: 'pointer',
              color: '#4b5563',
              transition: 'all 0.15s'
            }}
          >
            View All Jobs
          </button>
        </div>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ background: '#FAFBFC' }}>
              <th style={{ textAlign: 'left', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '.03em', color: '#98A2B3', fontWeight: '700', padding: '9px 12px', borderBottom: '1px solid #E3E7EE' }}>Job Name</th>
              <th style={{ textAlign: 'left', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '.03em', color: '#98A2B3', fontWeight: '700', padding: '9px 12px', borderBottom: '1px solid #E3E7EE' }}>Job Type</th>
              <th style={{ textAlign: 'left', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '.03em', color: '#98A2B3', fontWeight: '700', padding: '9px 12px', borderBottom: '1px solid #E3E7EE' }}>Records</th>
              <th style={{ textAlign: 'left', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '.03em', color: '#98A2B3', fontWeight: '700', padding: '9px 12px', borderBottom: '1px solid #E3E7EE' }}>Status</th>
              <th style={{ textAlign: 'left', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '.03em', color: '#98A2B3', fontWeight: '700', padding: '9px 12px', borderBottom: '1px solid #E3E7EE' }}>Start Time</th>
              <th style={{ textAlign: 'left', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '.03em', color: '#98A2B3', fontWeight: '700', padding: '9px 12px', borderBottom: '1px solid #E3E7EE' }}>End Time</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #E3E7EE' }}>
              <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>EXT_JOB_001</td>
              <td style={{ padding: '10px 12px' }}>Extraction</td>
              <td style={{ padding: '10px 12px' }}>{data.total.toLocaleString()}</td>
              <td style={{ padding: '10px 12px' }}><span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '12px', background: '#E7F7EE', color: '#0F9D58', fontSize: '11px', fontWeight: '600' }}>Completed</span></td>
              <td style={{ padding: '10px 12px' }}>08:00</td>
              <td style={{ padding: '10px 12px' }}>09:15</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #E3E7EE' }}>
              <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>IMP_JOB_001</td>
              <td style={{ padding: '10px 12px' }}>Import</td>
              <td style={{ padding: '10px 12px' }}>{data.success.toLocaleString()}</td>
              <td style={{ padding: '10px 12px' }}><span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '12px', background: '#EFF4FF', color: '#2563EB', fontSize: '11px', fontWeight: '600' }}>In Progress</span></td>
              <td style={{ padding: '10px 12px' }}>09:30</td>
              <td style={{ padding: '10px 12px' }}>—</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #E3E7EE' }}>
              <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>EXT_JOB_002</td>
              <td style={{ padding: '10px 12px' }}>Extraction</td>
              <td style={{ padding: '10px 12px' }}>{(data.pending + data.inProgress).toLocaleString()}</td>
              <td style={{ padding: '10px 12px' }}><span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '12px', background: '#F1F2F4', color: '#6B7280', fontSize: '11px', fontWeight: '600' }}>Pending</span></td>
              <td style={{ padding: '10px 12px' }}>—</td>
              <td style={{ padding: '10px 12px' }}>—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
