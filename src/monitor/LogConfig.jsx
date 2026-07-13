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
    <div style={{ width: '100%' }}>
      <label style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        <span>Log Path</span>
        {!isEditing && <span style={{ color: '#10b981', textTransform: 'none', letterSpacing: 'normal' }}>✓ OK</span>}
      </label>
      <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
        <input
          type="text"
          placeholder="e.g. C:\logs"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          disabled={!isEditing || loading}
          style={{ padding: '5px 8px', width: '100%', borderRadius: '8px', border: error ? '1px solid #ef4444' : '1px solid #cbd5e1', background: (!isEditing || loading) ? '#f1f5f9' : '#f8fafc', color: '#0f172a', fontSize: '9px', outline: 'none', transition: 'border-color 0.2s', height: '28px', boxSizing: 'border-box' }}
          onFocus={(e) => { if(isEditing) e.target.style.borderColor = '#4f46e5' }} onBlur={(e) => { if(isEditing) e.target.style.borderColor = '#cbd5e1' }}
        />
        {isEditing ? (
          <button 
            onClick={handleSave} disabled={loading}
            style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', padding: '0 8px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {loading ? '...' : 'Save'}
          </button>
        ) : (
          <button 
            onClick={() => setIsEditing(true)}
            style={{ background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', padding: '0 8px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Edit
          </button>
        )}
      </div>
      {error && (
        <div style={{ color: '#ef4444', fontSize: '9px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
          <AlertCircle size={10} /> {error}
        </div>
      )}
    </div>
  )
}
