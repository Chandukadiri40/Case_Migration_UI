import { useState } from 'react'
import { saveLogConfig } from './api'
import { Check, Edit2, Save, AlertCircle } from 'lucide-react'

export default function LogConfig({ config, onConfigSaved }) {
  const [path, setPath] = useState(config?.logPath || '')
  const [isEditing, setIsEditing] = useState(!config)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!path.trim()) {
      setError('Path cannot be empty')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await saveLogConfig(path.trim())
      onConfigSaved(res.data)
      setIsEditing(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save configuration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="log-config-container" style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, maxWidth: '600px' }}>
        <label className="auth-label" style={{ marginBottom: '4px' }}>Windows Log Directory Path</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className={`auth-input ${error ? 'auth-input--error' : ''}`}
            placeholder="e.g. C:\logs\application"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            disabled={!isEditing || loading}
          />
          {isEditing ? (
            <button className="btn" style={{ background: 'var(--primary)', color: 'white' }} onClick={handleSave} disabled={loading}>
              {loading ? <span className="spinner" style={{ width: '14px', height: '14px', borderBottomColor: 'transparent', margin: 0 }} /> : <Save size={16} />}
              Save
            </button>
          ) : (
            <button className="btn" style={{ background: 'var(--gray-200)', color: 'var(--gray-700)' }} onClick={() => setIsEditing(true)}>
              <Edit2 size={16} />
              Edit
            </button>
          )}
        </div>
        {error && (
          <div style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>
      {!isEditing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontSize: '13px', fontWeight: 500 }}>
          <Check size={16} /> Configured
        </div>
      )}
    </div>
  )
}
