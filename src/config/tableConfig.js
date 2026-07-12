/**
 * Frontend table configuration.
 *
 * SYSTEM_FIELDS keys match exactly what SearchService.getSystemDbColumn() accepts:
 *   "doc-id" | "created-date" | "content-size" | "mime-type"
 *
 * TABLE_METADATA keys match the actual DB column names in application.properties:
 *   source:  U1708_DOCUMENTTITLE, UA8C8_USER_NAME, UD5E8_ADDRESS, UC7A6_ORDER_NO
 *   staging: U1708_DOCUMENTTITLE, UA8C8_USER_NAME, FILEFULLPATH, UD5E8_ADDRESS
 *   target:  U1708_DOCUMENTTITLE, UA8C8_USER_NAME, UD5E8_ADDRESS, UC7A6_ORDER_NO
 *
 * Note: all column names are lowercased for the filter payload
 * because MSSQL column matching is case-insensitive.
 */

export const TABLES = [
  { id: 'source',  label: 'Source Data',  description: 'Original document metadata from FileNet' },
  { id: 'staging', label: 'Staging Data', description: 'Migration tracking and status data' },
  { id: 'target',  label: 'Target Data',  description: 'Final transformed and migrated data' },
]

/**
 * System fields — keys sent inside systemFilters map.
 * These keys are resolved to physical column names by the backend.
 */
export const SYSTEM_FIELDS = [
  { key: 'doc-id',        label: 'Document ID',   type: 'text', placeholder: 'Exact document ID' },
  { key: 'created-date',  label: 'Create Date',   type: 'date', placeholder: 'e.g. 2024-01-15' },
  { key: 'content-size',  label: 'Content Size',  type: 'text', placeholder: 'e.g. 1024' },
  { key: 'mime-type',     label: 'MIME Type',     type: 'text', placeholder: 'e.g. application/pdf' },
]

/**
 * Per-table metadata fields — keys sent inside customFilters map.
 * Keys must exactly match the whitelisted column names in application.properties
 * (case-insensitive; backend lowercases them before matching).
 */
export const TABLE_METADATA = {
  source: [
    { key: 'u1708_documenttitle', label: 'Document Title', type: 'text', placeholder: 'Search in title' },
    { key: 'ua8c8_user_name',     label: 'User Name',      type: 'text', placeholder: 'Creator username' },
    { key: 'ud5e8_address',       label: 'Address',        type: 'text', placeholder: 'Address field' },
    { key: 'uc7a6_order_no',      label: 'Order No',       type: 'text', placeholder: 'Order number' },
  ],
  staging: [
    { key: 'u1708_documenttitle', label: 'Document Title', type: 'text', placeholder: 'Search in title' },
    { key: 'ua8c8_user_name',     label: 'User Name',      type: 'text', placeholder: 'Creator username' },
    { key: 'filefullpath',        label: 'File Path',      type: 'text', placeholder: 'Search in file path' },
    { key: 'ud5e8_address',       label: 'Address',        type: 'text', placeholder: 'Address field' },
  ],
  target: [
    { key: 'u1708_documenttitle', label: 'Document Title', type: 'text', placeholder: 'Search in title' },
    { key: 'ua8c8_user_name',     label: 'User Name',      type: 'text', placeholder: 'Creator username' },
    { key: 'ud5e8_address',       label: 'Address',        type: 'text', placeholder: 'Address field' },
    { key: 'uc7a6_order_no',      label: 'Order No',       type: 'text', placeholder: 'Order number' },
  ],
}

/** Status values — "total" skips the status filter in the backend */
export const STATUS_OPTIONS = ['Total', 'Success', 'Failed']

export const DATE_PRESETS = [
  { label: 'Today',        value: 'today' },
  { label: 'Yesterday',    value: 'yesterday' },
  { label: 'This Week',    value: 'this_week' },
  { label: 'This Month',   value: 'this_month' },
  { label: 'Last Month',   value: 'last_month' },
  { label: 'This Quarter', value: 'this_quarter' },
  { label: 'Overall',      value: 'overall' },
  { label: 'Custom',       value: 'custom' },
]

export function resolveDatePreset(preset) {
  const today = new Date()
  const fmt = d => d.toISOString().split('T')[0]

  switch (preset) {
    case 'today':
      return { startDate: fmt(today), endDate: fmt(today) }
    case 'yesterday': {
      const y = new Date(today); y.setDate(y.getDate() - 1)
      return { startDate: fmt(y), endDate: fmt(y) }
    }
    case 'this_week': {
      const mon = new Date(today)
      mon.setDate(today.getDate() - ((today.getDay() + 6) % 7))
      return { startDate: fmt(mon), endDate: fmt(today) }
    }
    case 'this_month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      return { startDate: fmt(start), endDate: fmt(today) }
    }
    case 'last_month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const end   = new Date(today.getFullYear(), today.getMonth(), 0)
      return { startDate: fmt(start), endDate: fmt(end) }
    }
    case 'this_quarter': {
      const q = Math.floor(today.getMonth() / 3)
      const start = new Date(today.getFullYear(), q * 3, 1)
      return { startDate: fmt(start), endDate: fmt(today) }
    }
    default:
      return { startDate: '', endDate: '' }
  }
}
