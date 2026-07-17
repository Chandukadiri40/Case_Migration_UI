/**
 * Central API client.
 * VITE_API_BASE_URL in .env → set to backend IP, e.g. http://192.168.10.31:8080/api
 */
export const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

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
    if (path === '/auth/login') {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message || 'Invalid username or password')
    }
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
export async function apiLogin(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

// ── Config ────────────────────────────────────────────────────────────────────
export async function apiGetTables() {
  return request('/config/tables')
}

export async function apiGetCustomColumns(tableKey) {
  return request(`/config/custom-columns?table=${tableKey}&_t=${Date.now()}`)
}

export async function apiGetSystemColumns() {
  return request('/config/system-columns')
}

// ── Search (filter panel) ─────────────────────────────────────────────────────
export async function apiSearch(payload) {
  return request('/search', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ── Query executor ────────────────────────────────────────────────────────────
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

export async function apiGetChecksumReport(payload) {
  return request('/checksum/report', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function apiGetAvailableFields() {
  return request(`/config/available-fields?_t=${Date.now()}`)
}

// -- Deliverables - Migration Report
export async function apiGetDeliverableMigrationReport(payload) {
  return request('/deliverables/migration-report', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function apiGetReconciliationProperties() {
  return request('/config/reconciliation-properties')
}

// -- Tenant Configuration
export async function apiGetTenantConfig() {
  return request('/config')
}

export async function apiSaveTenantConfig(payload) {
  return request('/config', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function apiGetDbMetadata(schema) {
  return request(`/config/db-metadata?schema=${schema}`)
}
