import { Wallet, TrendingUp, TrendingDown, Receipt } from 'lucide-react';

export default function SummaryCards({ groups, groupData }) {
  // Calculate totals from group data or from all groups
  let totalSpent = 0;
  let totalOwed = 0; // money you owe others
  let totalOwedToYou = 0; // money others owe you
  let totalExpenses = 0;

  if (groupData) {
    // Single group view
    const { balances, expenses } = groupData;
    totalSpent = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
    totalExpenses = expenses?.length || 0;

    if (balances?.participantStats) {
      balances.participantStats.forEach(stat => {
        if (stat.netBalance > 0) totalOwedToYou += stat.netBalance;
        else totalOwed += Math.abs(stat.netBalance);
      });
    }
  } else if (groups) {
    // Dashboard view — aggregate across all groups
    groups.forEach(g => {
      totalSpent += g.quickStats?.totalExpenses || 0;
      totalExpenses += g.quickStats?.expenseCount || 0;

      const balances = g.quickStats?.netBalances || {};
      Object.values(balances).forEach(val => {
        if (val > 0) totalOwedToYou += val;
        else totalOwed += Math.abs(val);
      });
    });
  }

  const cards = [
    {
      label: 'Total Spent',
      value: `₹${totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      sub: `${totalExpenses} expense${totalExpenses !== 1 ? 's' : ''}`,
      icon: <Wallet size={20} />,
      colorClass: 'violet',
    },
    {
      label: 'You Owe',
      value: `₹${totalOwed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      sub: totalOwed > 0 ? 'Time to settle up!' : 'All clear!',
      icon: <TrendingDown size={20} />,
      colorClass: 'rose',
    },
    {
      label: 'Owed to You',
      value: `₹${totalOwedToYou.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      sub: totalOwedToYou > 0 ? 'Collect your dues!' : 'Nothing pending',
      icon: <TrendingUp size={20} />,
      colorClass: 'emerald',
    },
    {
      label: 'Groups',
      value: groups ? groups.length : '—',
      sub: groups ? `${groups.filter(g => (g.quickStats?.pendingSettlements || 0) > 0).length} need settling` : '',
      icon: <Receipt size={20} />,
      colorClass: 'amber',
    },
  ];

  return (
    <div className="summary-grid">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className={`summary-card glass-card-static summary-card-${card.colorClass} animate-in animate-in-delay-${i + 1}`}
        >
          <div className={`summary-card-icon summary-card-icon-${card.colorClass}`}>
            {card.icon}
          </div>
          <div className="summary-card-label">{card.label}</div>
          <div className="summary-card-value">{card.value}</div>
          <div className="summary-card-sub">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}
