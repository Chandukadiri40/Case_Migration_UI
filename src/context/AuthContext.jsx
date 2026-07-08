import { createContext, useContext, useState } from 'react'
import { apiLogin } from '../utils/api'

const AuthContext = createContext(null)

function loadSession() {
  try {
    const raw = sessionStorage.getItem('mrd_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadSession)

  async function login(username, password) {
    try {
      // Expected response: { token, name, role, username }
      const data = await apiLogin(username, password)
      const session = {
        username: data.username ?? username,
        name: data.name ?? username,
        role: data.role ?? 'User',
      }
      sessionStorage.setItem('mrd_token', data.token)
      sessionStorage.setItem('mrd_user', JSON.stringify(session))
      setUser(session)
      return { success: true }
    } catch (err) {
      return { success: false, message: err.message || 'Login failed. Please try again.' }
    }
  }

  function logout() {
    sessionStorage.removeItem('mrd_token')
    sessionStorage.removeItem('mrd_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
