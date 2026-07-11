import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FileText, Monitor, LogOut, Menu, Search, Database, Package } from 'lucide-react'

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
          <NavLink to="/reports" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="Reports">
            <FileText size={18} />
            {!isCollapsed && <span>Reports</span>}
          </NavLink>
          <NavLink to="/monitor" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="Logs">
            <Monitor size={18} />
            {!isCollapsed && <span>Logs</span>}
          </NavLink>
          <NavLink to="/discovery" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="System study">
            <Search size={18} />
            {!isCollapsed && <span>System study</span>}
          </NavLink>
          <NavLink to="/exceptions" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="Exceptions and evidence">
            <Database size={18} />
            {!isCollapsed && <span>Exceptions and Evidence</span>}
          </NavLink>
          <NavLink to="/deliverables" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="Deliverables">
            <Package size={18} />
            {!isCollapsed && <span>Deliverables</span>}
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
