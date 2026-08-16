import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  FileText, LogOut, Package, Settings, Link, FileSpreadsheet, 
  LayoutDashboard, Bell, HelpCircle, Search, FolderTree 
} from 'lucide-react'

export default function Layout() {
  const { logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const path = location.pathname

  let crumb = 'Dashboard'
  let pageTitle = 'Migration Dashboard'

  if (path.startsWith('/configuration')) {
    crumb = 'Configurations'
    pageTitle = 'Configurations'
  } else if (path.startsWith('/property-mapping')) {
    crumb = 'Mapping'
    pageTitle = 'Metadata Mapping'
  } else if (path.startsWith('/jobs-configuration')) {
    crumb = 'Jobs Configuration'
    pageTitle = 'Jobs Configuration'
  } else if (path.startsWith('/search')) {
    crumb = 'Search Docs'
    pageTitle = 'Search Migrated Documents'
  } else if (path.startsWith('/reconciliation')) {
    crumb = 'Reconciliation'
    pageTitle = 'Reconciliation'
  } else if (path.startsWith('/folders')) {
    crumb = 'Folders'
    pageTitle = 'Linux Document Explorer'
  }

  const isDashboardActive = path === '/' || path === '/dashboard'
  const isConfigurationActive = path.startsWith('/configuration')
  const isMappingActive = path.startsWith('/property-mapping')
  const isJobsActive = path.startsWith('/jobs-configuration')
  const isSearchActive = path.startsWith('/search')
  const isReconciliationActive = path.startsWith('/reconciliation')
  const isFoldersActive = path.startsWith('/folders')

  return (
    <div className="app" style={{ display: 'flex', minHeight: '100vh', width: '100vw', background: '#F4F6F9', overflow: 'hidden' }}>
      
      {/* ============ SIDEBAR ============ */}
      <aside className="sidebar" style={{
        width: '240px', background: '#0F1B2D', flexShrink: 0,
        display: 'flex', flexDirection: 'column', padding: '16px 0',
        height: '100vh', position: 'sticky', top: 0
      }}>
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 20px 20px 20px', borderBottom: '1px solid #1B2A42' }}>
          <div className="brand-mark" style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #2563EB, #60A5FA)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '13px', flexShrink: 0 }}>TM</div>
          <div>
            <div className="brand-name" style={{ color: '#fff', fontWeight: '600', fontSize: '14.5px', lineHeight: '1.2' }}>TrueMigrate Center</div>
            <div className="brand-sub" style={{ color: '#93A4BD', fontSize: '10.5px', letterSpacing: '.04em' }}>MIGRATION MANAGEMENT</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          <div className="nav-section-label" style={{ color: '#5C6B85', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.08em', padding: '14px 20px 6px' }}>Phase 1</div>
          
          <NavLink 
            to="/" 
            className={`nav-item ${isDashboardActive ? 'active' : ''}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '11px', padding: '9px 20px', margin: '1px 8px', borderRadius: '6px',
              color: isDashboardActive ? '#FFFFFF' : '#93A4BD',
              fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              background: isDashboardActive ? '#2563EB' : 'transparent',
              textDecoration: 'none'
            }}
          >
            <LayoutDashboard size={16} style={{ opacity: isDashboardActive ? 1 : 0.85 }} />
            Dashboard
          </NavLink>

          <NavLink 
            to="/configuration" 
            className={`nav-item ${isConfigurationActive ? 'active' : ''}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '11px', padding: '9px 20px', margin: '1px 8px', borderRadius: '6px',
              color: isConfigurationActive ? '#FFFFFF' : '#93A4BD',
              fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              background: isConfigurationActive ? '#2563EB' : 'transparent',
              textDecoration: 'none'
            }}
          >
            <Settings size={16} style={{ opacity: isConfigurationActive ? 1 : 0.85 }} />
            Configurations
          </NavLink>

          <NavLink 
            to="/property-mapping" 
            className={`nav-item ${isMappingActive ? 'active' : ''}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '11px', padding: '9px 20px', margin: '1px 8px', borderRadius: '6px',
              color: isMappingActive ? '#FFFFFF' : '#93A4BD',
              fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              background: isMappingActive ? '#2563EB' : 'transparent',
              textDecoration: 'none'
            }}
          >
            <Link size={16} style={{ opacity: isMappingActive ? 1 : 0.85 }} />
            Mapping
          </NavLink>

          <NavLink 
            to="/jobs-configuration" 
            className={`nav-item ${isJobsActive ? 'active' : ''}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '11px', padding: '9px 20px', margin: '1px 8px', borderRadius: '6px',
              color: isJobsActive ? '#FFFFFF' : '#93A4BD',
              fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              background: isJobsActive ? '#2563EB' : 'transparent',
              textDecoration: 'none'
            }}
          >
            <Package size={16} style={{ opacity: isJobsActive ? 1 : 0.85 }} />
            Jobs Configuration
          </NavLink>

          <NavLink 
            to="/folders" 
            className={`nav-item ${isFoldersActive ? 'active' : ''}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '11px', padding: '9px 20px', margin: '1px 8px', borderRadius: '6px',
              color: isFoldersActive ? '#FFFFFF' : '#93A4BD',
              fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              background: isFoldersActive ? '#2563EB' : 'transparent',
              textDecoration: 'none'
            }}
          >
            <FolderTree size={16} style={{ opacity: isFoldersActive ? 1 : 0.85 }} />
            Folders
          </NavLink>

          <NavLink 
            to="/search" 
            className={`nav-item ${isSearchActive ? 'active' : ''}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '11px', padding: '9px 20px', margin: '1px 8px', borderRadius: '6px',
              color: isSearchActive ? '#FFFFFF' : '#93A4BD',
              fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              background: isSearchActive ? '#2563EB' : 'transparent',
              textDecoration: 'none'
            }}
          >
            <Search size={16} style={{ opacity: isSearchActive ? 1 : 0.85 }} />
            Search Docs
          </NavLink>

          <NavLink 
            to="/reconciliation/case" 
            className={`nav-item ${isReconciliationActive ? 'active' : ''}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '11px', padding: '9px 20px', margin: '1px 8px', borderRadius: '6px',
              color: isReconciliationActive ? '#FFFFFF' : '#93A4BD',
              fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              background: isReconciliationActive ? '#2563EB' : 'transparent',
              textDecoration: 'none'
            }}
          >
            <FileSpreadsheet size={16} style={{ opacity: isReconciliationActive ? 1 : 0.85 }} />
            Reconciliation
          </NavLink>

          <div className="nav-section-label" style={{ color: '#5C6B85', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.08em', padding: '14px 20px 6px' }}>Phase 2</div>
          
          <div className="nav-item disabled" style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '9px 20px', margin: '1px 8px', opacity: 0.45, cursor: 'not-allowed', color: '#93A4BD' }}>
            <FileText size={16} />
            Reports
            <span className="phase-tag" style={{ marginLeft: 'auto', fontSize: '9px', background: '#2A3B57', color: '#9FB1CC', padding: '1px 6px', borderRadius: '10px', fontWeight: '600' }}>Later</span>
          </div>

          <div className="nav-item disabled" style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '9px 20px', margin: '1px 8px', opacity: 0.45, cursor: 'not-allowed', color: '#93A4BD' }}>
            <FileText size={16} />
            Audit Logs
            <span className="phase-tag" style={{ marginLeft: 'auto', fontSize: '9px', background: '#2A3B57', color: '#9FB1CC', padding: '1px 6px', borderRadius: '10px', fontWeight: '600' }}>Later</span>
          </div>

          <div className="nav-item disabled" style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '9px 20px', margin: '1px 8px', opacity: 0.45, cursor: 'not-allowed', color: '#93A4BD' }}>
            <FileText size={16} />
            Users
            <span className="phase-tag" style={{ marginLeft: 'auto', fontSize: '9px', background: '#2A3B57', color: '#9FB1CC', padding: '1px 6px', borderRadius: '10px', fontWeight: '600' }}>Later</span>
          </div>

          <div className="nav-item disabled" style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '9px 20px', margin: '1px 8px', opacity: 0.45, cursor: 'not-allowed', color: '#93A4BD' }}>
            <Settings size={16} />
            Settings
            <span className="phase-tag" style={{ marginLeft: 'auto', fontSize: '9px', background: '#2A3B57', color: '#9FB1CC', padding: '1px 6px', borderRadius: '10px', fontWeight: '600' }}>Later</span>
          </div>
        </div>

        <div className="sidebar-footer" style={{ padding: '8px 14px', borderTop: '1px solid #1B2A42' }}>
          <button 
            onClick={logout} 
            style={{
              display: 'flex', alignItems: 'center', gap: '11px', padding: '9px 20px', width: '100%', borderRadius: '6px',
              color: '#93A4BD', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              background: 'transparent', border: 'none', textAlign: 'left'
            }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ============ MAIN CONTENT AREA ============ */}
      <div className="main" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        
        {/* Top Header */}
        <header className="topheader" style={{
          height: '64px', background: '#fff', borderBottom: '1px solid #E3E7EE',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0,
          position: 'sticky', top: 0, zIndex: 20
        }}>
          <div className="header-left" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div className="breadcrumb" style={{ fontSize: '11.5px', color: '#98A2B3' }}>
              TrueMigrate Center &nbsp;›&nbsp; <b style={{ color: '#6B7280', fontWeight: '600' }}>{crumb}</b>
            </div>
            <div className="page-title" style={{ fontSize: '16.5px', fontWeight: '700', color: '#1F2937' }}>{pageTitle}</div>
          </div>
          
          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="search-box" style={{
              display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #E3E7EE', borderRadius: '7px', padding: '0 10px',
              height: '34px', width: '250px', color: '#98A2B3', background: '#F4F6F9'
            }}>
              <Search size={14} />
              <span style={{ fontSize: '11.5px' }}>Search Job ID, Doc ID, Record ID…</span>
            </div>
            
            <div className="icon-btn" style={{
              width: '34px', height: '34px', borderRadius: '7px', border: '1px solid #E3E7EE', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', position: 'relative', cursor: 'pointer'
            }}>
              <Bell size={16} />
              <span className="badge-dot" style={{ position: 'absolute', top: '5px', right: '6px', width: '7px', height: '7px', borderRadius: '50%', background: '#D92D20', border: '1.5px solid #fff' }}></span>
            </div>
            
            <div className="icon-btn" style={{
              width: '34px', height: '34px', borderRadius: '7px', border: '1px solid #E3E7EE', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', cursor: 'pointer'
            }}>
              <HelpCircle size={16} />
            </div>

            <div className="user-chip" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px 4px 4px', borderRadius: '7px', border: '1px solid #E3E7EE', marginLeft: '6px' }}>
              <div className="avatar" style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#EFF4FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700' }}>AU</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="uname" style={{ fontSize: '11.5px', fontWeight: '600', color: '#1F2937', lineHeight: 1.25 }}>Admin User</span>
                <span className="urole" style={{ fontSize: '9.5px', color: '#98A2B3' }}>Migration Manager</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body Viewport */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
