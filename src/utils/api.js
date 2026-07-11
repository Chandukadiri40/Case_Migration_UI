/**
 * Central API client.
 * VITE_API_BASE_URL in .env → set to backend IP, e.g. http://192.168.10.31:8080/api
 */
const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

function getToken() {
  return sessionStorage.getItem('mrd_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })

  if (res.status === 401) {
    sessionStorage.clear()
    window.location.href = '/login'
    return
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Request failed: ${res.status}`)
  }

  return res.json()
}

// ── Auth ──────────────────────────────────────────────────────────────────────
// POST /api/auth/login  { username, password }
// Response: { status, message, username, name, role, token }
export async function apiLogin(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

// ── Config ────────────────────────────────────────────────────────────────────
// GET /api/config/tables  → [{ key, label }, ...]
export async function apiGetTables() {
  return request('/config/tables')
}

// GET /api/config/custom-columns?table=source|staging|target  → string[]
export async function apiGetCustomColumns(tableKey) {
  return request(`/config/custom-columns?table=${tableKey}&_t=${Date.now()}`)
}

// GET /api/config/system-columns  → string[]
export async function apiGetSystemColumns() {
  return request('/config/system-columns')
}

// ── Search (filter panel) ─────────────────────────────────────────────────────
// POST /api/search
// Body: SearchRequest {
//   table, status, fromDate, toDate,
//   docIds: string[],
//   systemFilters: { [key]: value },
//   customFilters: { [col]: value }
// }
// Response: List<Map<String, Object>>
export async function apiSearch(payload) {
  return request('/search', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ── Query executor ────────────────────────────────────────────────────────────
// POST /api/search/execute-query  { sql: string }
// Response: List<Map<String, Object>>
export async function apiExecuteQuery(sql) {
  return request('/search/execute-query', {
    method: 'POST',
    body: JSON.stringify({ sql }),
  })
}

// ── Column config (legacy hook) ───────────────────────────────────────────────
export async function apiGetColumnConfig() {
  return request('/config/columns')
}

// GET /api/checksum/report
// Body: { fromDate?: string, toDate?: string }
// Response: {
//   summary: { total, completed, pending, migratedInStaging },
//   records: [{
//     documentId, fileName, checksumBefore, checksumAfter,
//     checksumStatus, migrationStatus, migratedDate
//   }]
// }
export async function apiGetChecksumReport({ fromDate, toDate } = {}) {
  return request('/checksum/report', {
    method: 'POST',
    body: JSON.stringify({ fromDate: fromDate || null, toDate: toDate || null }),
  })
}

// ── Available dynamic metadata fields ───────────────────────────────────────
// GET /api/config/available-fields  → [{ columnName, symbolicName, displayName }]
export async function apiGetAvailableFields() {
  return request(`/config/available-fields?_t=${Date.now()}`)
}

// -- Deliverables - Migration Report
// POST /api/deliverables/migration-report
export async function apiGetDeliverableMigrationReport(payload) {
  return request('/deliverables/migration-report', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
