import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Layout from './components/Layout'
import Monitor from './monitor/Monitor'
import Discovery from './components/Discovery'
import Exceptions from './components/Exceptions'
import Deliverables from './components/Deliverables'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user } = useAuth()
  return user ? <Navigate to="/reports" replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="reports" replace />} />
            <Route path="reports" element={<Dashboard />} />
            <Route path="monitor" element={<Monitor />} />
            <Route path="discovery" element={<Discovery />} />
            <Route path="exceptions" element={<Exceptions />} />
            <Route path="deliverables" element={<Deliverables />} />
            <Route path="*" element={<Navigate to="reports" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
