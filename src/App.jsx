import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AlertProvider } from './context/AlertContext'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Layout from './components/Layout'
import Monitor from './monitor/Monitor'
import Discovery from './components/Discovery'
import Exceptions from './components/Exceptions'
import Deliverables from './components/Deliverables'
import Configuration from './components/Configuration'
import PropertyMapping from './components/PropertyMapping'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user } = useAuth()
  return user ? <Navigate to="/discovery" replace /> : children
}

export default function App() {
  return (
    <AlertProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="discovery" replace />} />
            <Route path="reports" element={<Dashboard />} />
            <Route path="monitor" element={<Monitor />} />
            <Route path="discovery" element={<Discovery />} />
            <Route path="exceptions" element={<Exceptions />} />
            <Route path="deliverables" element={<Deliverables />} />
            <Route path="configuration" element={<Configuration />} />
            <Route path="property-mapping" element={<PropertyMapping />} />
            <Route path="*" element={<Navigate to="discovery" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </AuthProvider>
    </AlertProvider>
  )
}
