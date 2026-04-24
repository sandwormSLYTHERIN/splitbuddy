export default function BalanceTable({ balances, participants }) {
  if (!participants || participants.length === 0) return null;

  const names = participants.map(p => p.name);
  const directional = balances?.directional || {};

  // Build a matrix of who owes whom
  const getAmount = (from, to) => {
    const key = `${from}->${to}`;
    return directional[key] || 0;
  };

  return (
    <div className="balance-table-wrapper">
      <table className="balance-table">
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Owes ↓ / Gets →</th>
            {names.map(name => (
              <th key={name}>{name}</th>
            ))}
            <th>Net</th>
          </tr>
        </thead>
        <tbody>
          {names.map(from => {
            const net = balances?.net?.[from] || 0;
            return (
              <tr key={from}>
                <td style={{
                  textAlign: 'left',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <div
                    className="participant-color-dot"
                    style={{ background: participants.find(p => p.name === from)?.color || '#7c3aed' }}
                  />
                  {from}
                </td>
                {names.map(to => {
                  if (from === to) {
                    return <td key={to} className="balance-self">—</td>;
                  }
                  const amount = getAmount(from, to);
                  return (
                    <td
                      key={to}
                      className={amount > 0 ? 'balance-negative' : 'balance-neutral'}
                    >
                      {amount > 0 ? `₹${amount.toFixed(0)}` : '—'}
                    </td>
                  );
                })}
                <td className={net > 0.01 ? 'balance-positive' : net < -0.01 ? 'balance-negative' : 'balance-neutral'}>
                  <strong>
                    {net > 0.01
                      ? `+₹${net.toFixed(0)}`
                      : net < -0.01
                        ? `-₹${Math.abs(net).toFixed(0)}`
                        : '✓ Settled'}
                  </strong>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
