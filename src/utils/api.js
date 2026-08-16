/**
 * Central API client.
 * VITE_API_BASE_URL in .env → set to backend IP, e.g. http://192.168.10.31:8081/api
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
    cache: 'no-store',
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

  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch (err) {
    return text
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export function apiLogin(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function apiRegister(username, password) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

// ── Config ────────────────────────────────────────────────────────────────────
export function apiGetTables() {
  return request('/config/tables')
}

export function apiGetDbConfig() {
  return request('/config/db')
}

export function apiSaveDbConfig(config) {
  return request('/config/db', {
    method: 'POST',
    body: JSON.stringify(config),
  })
}

export function apiGetUISettings() {
  return request('/config/ui-settings')
}

export function apiTestDbConnection(config) {
  return request('/config/db/test', {
    method: 'POST',
    body: JSON.stringify(config),
  })
}

export function apiGetCustomColumns(tableKey) {
  return request(`/config/custom-columns?table=${tableKey}&_t=${Date.now()}`)
}

export function apiGetSystemColumns() {
  return request('/config/system-columns')
}

// ── Search (filter panel) ─────────────────────────────────────────────────────
export function apiSearch(payload) {
  return request('/search', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ── Query executor ────────────────────────────────────────────────────────────
export function apiExecuteQuery(sql) {
  return request('/search/execute-query', {
    method: 'POST',
    body: JSON.stringify({ sql }),
  })
}

// ── Column config (legacy hook) ───────────────────────────────────────────────
export function apiGetColumnConfig() {
  return request('/config/columns')
}

export function apiGetChecksumReport(payload) {
  return request('/checksum/report', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function apiGetAvailableFields() {
  return request(`/config/available-fields?_t=${Date.now()}`)
}

// -- Deliverables - Migration Report
export function apiGetDeliverableMigrationReport(payload) {
  return request('/deliverables/migration-report', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// -- Tenant Configuration
let tenantConfigPromise = null;

export function apiGetTenantConfig(forceRefresh = false) {
  if (!tenantConfigPromise || forceRefresh) {
    tenantConfigPromise = request('/config').catch(err => {
      tenantConfigPromise = null; // Clear on error so it retries next time
      throw err;
    });
  }
  return tenantConfigPromise;
}

export function apiSaveTenantConfig(payload) {
  tenantConfigPromise = null; // Invalidate cache on save
  return request('/config', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function apiGetDbMetadata(schema) {
  return request(`/config/db-metadata?schema=${schema}`)
}

// ── Property Mapping ──────────────────────────────────────────────────────────
export function apiGetPropertyMappings() {
  return request('/property-mappings')
}

export function apiGetPropertyMappingsByApp(appId) {
  return request(`/property-mappings/app/${appId}`)
}

export function apiSavePropertyMapping(template) {
  return request('/property-mappings', {
    method: 'POST',
    body: JSON.stringify(template),
  })
}

export function apiDeletePropertyMapping(templateId) {
  return request(`/property-mappings/${templateId}`, {
    method: 'DELETE',
  })
}

export function apiGetDocumentClasses(appId, type = 'source') {
  return request(`/discovery/doc-classes?appId=${appId}&type=${type}`)
}

export function apiGetClassProperties(appId, docClass, type = 'source') {
  return request(`/discovery/class-properties?appId=${appId}&docClass=${docClass}&type=${type}`)
}

export function apiGetFolderConfig() {
  return request('/folders/config')
}

export function apiBrowseFolder(path) {
  return request(`/folders/browse?path=${encodeURIComponent(path || '')}&_t=${Date.now()}`)
}

export function apiGetDocumentViewUrl(filePath) {
  return `${BASE}/folders/view?path=${encodeURIComponent(filePath)}`
}

export function apiGetDocumentDownloadUrl(filePath) {
  return `${BASE}/folders/view?path=${encodeURIComponent(filePath)}&download=true`
}

export function apiGetDocIdViewUrl(docId) {
  return `${BASE}/folders/resolve-by-docid?docId=${encodeURIComponent(docId)}`
}

export function apiGetDocIdDownloadUrl(docId) {
  return `${BASE}/folders/resolve-by-docid?docId=${encodeURIComponent(docId)}&download=true`
}
