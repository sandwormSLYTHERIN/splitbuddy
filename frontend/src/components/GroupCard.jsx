import { useNavigate } from 'react-router-dom';

export default function GroupCard({ group }) {
  const navigate = useNavigate();
  const { quickStats } = group;

  const moodLabels = {
    chill: '😌 Chill',
    active: '⚡ Active',
    'on-fire': '🔥 On Fire',
    'settling-up': '🤝 Settling',
  };

  return (
    <div className="group-card glass-card" onClick={() => navigate(`/groups/${group._id}`)}>
      <div className="group-card-header">
        <div className="group-card-title">
          <span className="group-card-emoji">{group.emoji}</span>
          <div>
            <div className="group-card-name">{group.name}</div>
            <div className="text-xs text-muted" style={{ marginTop: 2 }}>
              {group.participants?.length || 0} participant{group.participants?.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <span className={`group-card-mood mood-${group.mood || 'chill'}`}>
          {moodLabels[group.mood] || moodLabels.chill}
        </span>
      </div>

      <div className="group-card-participants">
        {group.participants?.map((p, i) => (
          <div
            key={p._id || i}
            className="participant-avatar"
            style={{ background: p.color || '#7c3aed', zIndex: group.participants.length - i }}
            title={p.name}
          >
            {p.name?.charAt(0)?.toUpperCase()}
          </div>
        ))}
      </div>

      <div className="group-card-stats">
        <div className="group-card-stat">
          <div className="group-card-stat-value">
            ₹{(quickStats?.totalExpenses || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="group-card-stat-label">Total</div>
        </div>
        <div className="group-card-stat">
          <div className="group-card-stat-value">{quickStats?.expenseCount || 0}</div>
          <div className="group-card-stat-label">Expenses</div>
        </div>
        <div className="group-card-stat">
          <div className={`group-card-stat-value ${(quickStats?.pendingSettlements || 0) > 0 ? 'group-card-stat-negative' : 'group-card-stat-positive'}`}>
            {quickStats?.pendingSettlements || 0}
          </div>
          <div className="group-card-stat-label">Settlements</div>
        </div>
      </div>
    </div>
  );
}
