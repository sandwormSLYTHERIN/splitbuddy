import { ArrowRight, CheckCircle } from 'lucide-react';

export default function SettlementList({ settlements }) {
  if (!settlements || settlements.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '2rem 1rem' }}>
        <div className="empty-state-icon">🎉</div>
        <div className="empty-state-title">All settled up!</div>
        <div className="empty-state-text">
          No pending settlements. Everyone's square!
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        marginBottom: '0.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <CheckCircle size={14} style={{ color: 'var(--violet-400)' }} />
        {settlements.length} settlement{settlements.length !== 1 ? 's' : ''} needed to clear all debts
      </div>

      {settlements.map((s, i) => (
        <div key={i} className="settlement-item">
          <div style={{
            width: 32, height: 32,
            borderRadius: '50%',
            background: 'rgba(244, 63, 94, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem', fontWeight: 700, color: 'var(--rose-400)',
          }}>
            {s.from.charAt(0).toUpperCase()}
          </div>
          <span className="settlement-from">{s.from}</span>

          <div className="settlement-arrow">
            <ArrowRight size={18} />
          </div>

          <div style={{
            width: 32, height: 32,
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem', fontWeight: 700, color: 'var(--emerald-400)',
          }}>
            {s.to.charAt(0).toUpperCase()}
          </div>
          <span className="settlement-to">{s.to}</span>

          <span className="settlement-amount">
            ₹{s.amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </span>
        </div>
      ))}

      <div style={{
        marginTop: '0.5rem',
        padding: '0.75rem 1rem',
        background: 'rgba(124, 58, 237, 0.05)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        borderLeft: '3px solid var(--violet-500)',
      }}>
        💡 <strong>Tip:</strong> These are the minimum number of transactions needed to settle all debts. Powered by SplitBuddy's greedy settlement algorithm.
      </div>
    </div>
  );
}
