import { Edit3, Trash2 } from 'lucide-react';

export default function ExpenseList({ expenses, onEdit, onDelete }) {
  if (!expenses || expenses.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📝</div>
        <div className="empty-state-title">No expenses yet</div>
        <div className="empty-state-text">
          Add your first expense to start tracking who owes what!
        </div>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const splitModeLabel = (mode) => {
    const labels = { equal: '⚖️ Equal', custom: '✏️ Custom', percentage: '📊 Percent' };
    return labels[mode] || mode;
  };

  return (
    <div className="expense-list">
      {expenses.map((expense, i) => (
        <div
          key={expense._id}
          className="expense-item animate-in"
          style={{ animationDelay: `${Math.min(i * 0.05, 0.5)}s` }}
        >
          <div className="expense-emoji">{expense.categoryEmoji || '💳'}</div>

          <div className="expense-info">
            <div className="expense-desc">{expense.description}</div>
            <div className="expense-meta">
              <span>Paid by <strong>{expense.payer}</strong></span>
              <span>•</span>
              <span>{formatDate(expense.date)}</span>
              <span>•</span>
              <span>{splitModeLabel(expense.splitMode)}</span>
            </div>
          </div>

          <div className="expense-amount">
            ₹{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>

          <div className="expense-actions">
            <button
              className="btn btn-ghost btn-icon"
              onClick={(e) => { e.stopPropagation(); onEdit(expense); }}
              title="Edit"
            >
              <Edit3 size={14} />
            </button>
            <button
              className="btn btn-ghost btn-icon"
              onClick={(e) => { e.stopPropagation(); onDelete(expense._id); }}
              title="Delete"
              style={{ color: 'var(--rose-400)' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
