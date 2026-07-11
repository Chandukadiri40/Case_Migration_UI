import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080/api/monitor', // Assuming default spring boot port
  withCredentials: true
})

// Attach token or session if necessary, assuming cookie-based or just stateless for now since it's an internal tool

export const getLogConfig = () => api.get('/config')
export const saveLogConfig = (path) => api.post('/config', { logPath: path })
export const getLogDates = () => api.get('/logs/dates')
export const getLogs = (date) => api.get('/logs', { params: { date } })
