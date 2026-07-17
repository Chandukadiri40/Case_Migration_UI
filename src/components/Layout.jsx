import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FileText, Monitor, LogOut, Menu, Search, Database, Package, Settings, Link } from 'lucide-react'

export default function Layout() {
  const { logout } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className={`app-layout-with-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <button className="sidebar-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>
            <Menu size={20} />
          </button>
          {!isCollapsed && <span className="sidebar-title">Reporting Dashboard</span>}
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/discovery" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="Migration Insights (AS-IS)">
            <Search size={18} />
            {!isCollapsed && <span>Migration Insights (AS-IS)</span>}
          </NavLink>
          <NavLink to="/exceptions" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="Exception Governance">
            <Database size={18} />
            {!isCollapsed && <span>Exception Governance</span>}
          </NavLink>
          <NavLink to="/deliverables" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="Deliverables Workspace">
            <Package size={18} />
            {!isCollapsed && <span>Deliverables Workspace</span>}
          </NavLink>
          <NavLink to="/property-mapping" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="Property Mapping">
            <Link size={18} />
            {!isCollapsed && <span>Property Mapping</span>}
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="Reports">
            <FileText size={18} />
            {!isCollapsed && <span>Reports</span>}
          </NavLink>
          <NavLink to="/monitor" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="Logs">
            <Monitor size={18} />
            {!isCollapsed && <span>Logs</span>}
          </NavLink>
          <NavLink to="/configuration" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="Configuration">
            <Settings size={18} />
            {!isCollapsed && <span>Configuration</span>}
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-link btn-logout" onClick={logout} title="Sign Out">
            <LogOut size={18} />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="app-main-area">
        <Outlet />
      </div>
    </div>
  )
}
