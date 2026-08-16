import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AlertProvider } from './context/AlertContext'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Layout from './components/Layout'
import Monitor from './monitor/Monitor'
import Discovery from './components/Discovery'
import Exceptions from './components/Exceptions'
import JobsConfiguration from './components/JobsConfiguration'
import Configuration from './components/Configuration'
import PropertyMapping from './components/PropertyMapping'
import Reconciliation from './components/Reconciliation'
import DashboardOverview from './components/DashboardOverview'
import Folders from './components/Folders'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user } = useAuth()
  return user ? <Navigate to="/" replace /> : children
}

export default function App() {
  return (
    <AlertProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<DashboardOverview />} />
            <Route path="dashboard" element={<DashboardOverview />} />
            <Route path="search" element={<Dashboard />} />
            <Route path="reconciliation" element={<Navigate to="reconciliation/case" replace />} />
            <Route path="reconciliation/case" element={<Reconciliation activeTab="case_metadata" />} />
            <Route path="reconciliation/is" element={<Reconciliation activeTab="is" />} />
            
            <Route path="jobs-configuration" element={<JobsConfiguration />} />
            <Route path="folders" element={<Folders />} />
            <Route path="configuration" element={<Configuration />} />
            <Route path="property-mapping" element={<PropertyMapping />} />

            {/* Hidden routes for Demo:
            <Route path="reports" element={<Dashboard />} />
            <Route path="monitor" element={<Monitor />} />
            <Route path="discovery" element={<Discovery />} />
            <Route path="exceptions" element={<Exceptions />} />
            */}
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </AuthProvider>
    </AlertProvider>
  )
}
