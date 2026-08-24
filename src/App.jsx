import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AlertProvider } from './context/AlertContext'
import Login from './components/Login'
import Layout from './components/Layout'

const DashboardOverview = lazy(() => import('./components/DashboardOverview'))
const SearchDocs = lazy(() => import('./components/SearchDocs'))
const Reconciliation = lazy(() => import('./components/Reconciliation'))
const JobsConfiguration = lazy(() => import('./components/JobsConfiguration'))
const Folders = lazy(() => import('./components/Folders'))
const Configuration = lazy(() => import('./components/Configuration'))
const PropertyMapping = lazy(() => import('./components/PropertyMapping'))
const MigrationDiscovery = lazy(() => import('./components/MigrationDiscovery'))

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
    <div style={{
      width: '32px',
      height: '32px',
      border: '3px solid #e2e8f0',
      borderTopColor: '#3b82f6',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
  </div>
)

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
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<DashboardOverview />} />
                <Route path="dashboard" element={<DashboardOverview />} />
                <Route path="search" element={<SearchDocs />} />
                <Route path="reconciliation" element={<Navigate to="reconciliation/is" replace />} />
                <Route path="reconciliation/is" element={<Reconciliation activeTab="is" />} />
                <Route path="reconciliation/case" element={<Reconciliation activeTab="case_metadata" />} />
                
                <Route path="jobs-configuration" element={<JobsConfiguration />} />
                <Route path="folders" element={<Folders />} />
                <Route path="configuration" element={<Configuration />} />
                <Route path="property-mapping" element={<PropertyMapping />} />
                <Route path="migration-discovery" element={<MigrationDiscovery />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </AlertProvider>
  )
}
