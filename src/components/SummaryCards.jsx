export default function SummaryCards({ summary }) {
  const pct = (n) => summary.total ? ((n / summary.total) * 100).toFixed(1) + '%' : '—'

  const cards = [
    {
      key: 'total',
      label: 'Total Records',
      value: summary.total,
      sub: 'records retrieved',
      accent: 'var(--primary)',
      bg: 'var(--primary-light)',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
      ),
    },
    {
      key: 'success',
      label: 'Successful',
      value: summary.success,
      sub: pct(summary.success) + ' success rate',
      accent: 'var(--success)',
      bg: 'var(--success-light)',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
    },
    {
      key: 'failed',
      label: 'Failed',
      value: summary.failed,
      sub: pct(summary.failed) + ' failure rate',
      accent: 'var(--danger)',
      bg: 'var(--danger-light)',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      ),
    },
    {
      key: 'pending',
      label: 'Pending',
      value: summary.pending,
      sub: 'awaiting processing',
      accent: 'var(--warning)',
      bg: 'var(--warning-light)',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
    },
    {
      key: 'inProgress',
      label: 'In Progress',
      value: summary.inProgress,
      sub: 'currently migrating',
      accent: '#7c3aed',
      bg: '#ede9fe',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-.08-8.49"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="summary-cards">
      {cards.map(card => (
        <div key={card.key} className="summary-card" style={{ '--card-accent': card.accent, '--card-bg': card.bg }}>
          <div className="summary-card-inner">
            <div>
              <div className="summary-card-label">{card.label}</div>
              <div className="summary-card-value">{card.value.toLocaleString()}</div>
              <div className="summary-card-sub">{card.sub}</div>
            </div>
            <div className="summary-card-icon" style={{ color: card.accent, background: card.bg }}>
              {card.icon}
            </div>
          </div>
          <div className="summary-card-bar">
            <div
              className="summary-card-bar-fill"
              style={{
                width: summary.total ? Math.round((card.value / summary.total) * 100) + '%' : '0%',
                background: card.accent,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
