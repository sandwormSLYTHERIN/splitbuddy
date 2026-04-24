import { useState } from 'react';
import Modal from './Modal';

export default function ExpenseForm({ isOpen, onClose, onSubmit, participants, initialData }) {
  const isEdit = !!initialData;

  const [description, setDescription] = useState(initialData?.description || '');
  const [amount, setAmount] = useState(initialData?.amount || '');
  const [date, setDate] = useState(
    initialData?.date
      ? new Date(initialData.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [payer, setPayer] = useState(initialData?.payer || (participants?.[0]?.name || ''));
  const [splitMode, setSplitMode] = useState(initialData?.splitMode || 'equal');
  const [customSplits, setCustomSplits] = useState(() => {
    if (initialData?.splits && initialData.splitMode !== 'equal') {
      const splitMap = {};
      initialData.splits.forEach(s => { splitMap[s.participant] = s; });
      return participants.map(p => ({
        participant: p.name,
        amount: splitMap[p.name]?.amount || 0,
        percentage: splitMap[p.name]?.percentage || 0,
      }));
    }
    return participants.map(p => ({
      participant: p.name,
      amount: 0,
      percentage: Math.round(10000 / participants.length) / 100,
    }));
  });
  const [loading, setLoading] = useState(false);

  const handleAmountChange = (value) => {
    setAmount(value);
    if (splitMode === 'equal' && value) {
      const perPerson = Math.round((parseFloat(value) / participants.length) * 100) / 100;
      setCustomSplits(participants.map(p => ({
        participant: p.name,
        amount: perPerson,
        percentage: Math.round((100 / participants.length) * 100) / 100,
      })));
    }
  };

  const handleSplitChange = (index, field, value) => {
    const updated = [...customSplits];
    updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
    setCustomSplits(updated);
  };

  const splitTotal = customSplits.reduce((sum, s) => sum + (s.amount || 0), 0);
  const pctTotal = customSplits.reduce((sum, s) => sum + (s.percentage || 0), 0);

  const isValid = () => {
    if (!description.trim() || !amount || parseFloat(amount) <= 0 || !payer) return false;
    if (splitMode === 'custom') {
      return Math.abs(splitTotal - parseFloat(amount)) < 0.02;
    }
    if (splitMode === 'percentage') {
      return Math.abs(pctTotal - 100) < 0.02;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid()) return;

    let splits;
    if (splitMode === 'equal') {
      splits = participants.map(p => ({ participant: p.name, amount: 0 }));
    } else if (splitMode === 'percentage') {
      splits = customSplits.map(s => ({
        participant: s.participant,
        amount: Math.round((parseFloat(amount) * (s.percentage / 100)) * 100) / 100,
        percentage: s.percentage,
      }));
    } else {
      splits = customSplits.map(s => ({
        participant: s.participant,
        amount: s.amount,
      }));
    }

    setLoading(true);
    try {
      await onSubmit({
        description: description.trim(),
        amount: parseFloat(amount),
        date,
        payer,
        splitMode,
        splits,
      });
      onClose();
    } catch (err) {
      // handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? '✏️ Edit Expense' : '➕ Add Expense'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Description */}
        <div className="form-group">
          <label className="form-label">Description</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g., Dinner at Olive Garden"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
            maxLength={200}
            autoFocus
          />
        </div>

        {/* Amount + Date */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => handleAmountChange(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              className="form-input"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
        </div>

        {/* Payer */}
        <div className="form-group">
          <label className="form-label">Paid by</label>
          <select className="form-input" value={payer} onChange={e => setPayer(e.target.value)}>
            {participants.map(p => (
              <option key={p.name} value={p.name}>{p.name}{p.isOwner ? ' (You)' : ''}</option>
            ))}
          </select>
        </div>

        {/* Split Mode */}
        <div className="form-group">
          <label className="form-label">Split Mode</label>
          <div className="split-mode-selector">
            {['equal', 'custom', 'percentage'].map(mode => (
              <button
                key={mode}
                type="button"
                className={`split-mode-btn ${splitMode === mode ? 'split-mode-btn-active' : ''}`}
                onClick={() => setSplitMode(mode)}
              >
                {mode === 'equal' ? '⚖️ Equal' : mode === 'custom' ? '✏️ Custom' : '📊 Percent'}
              </button>
            ))}
          </div>
        </div>

        {/* Split Details */}
        {splitMode !== 'equal' && (
          <div className="form-group">
            <label className="form-label">
              Split Details
              {splitMode === 'custom' && amount && (
                <span style={{
                  marginLeft: '0.5rem',
                  color: Math.abs(splitTotal - parseFloat(amount)) < 0.02 ? 'var(--emerald-400)' : 'var(--rose-400)',
                  fontWeight: 700, textTransform: 'none',
                }}>
                  (₹{splitTotal.toFixed(2)} / ₹{parseFloat(amount).toFixed(2)})
                </span>
              )}
              {splitMode === 'percentage' && (
                <span style={{
                  marginLeft: '0.5rem',
                  color: Math.abs(pctTotal - 100) < 0.02 ? 'var(--emerald-400)' : 'var(--rose-400)',
                  fontWeight: 700, textTransform: 'none',
                }}>
                  ({pctTotal.toFixed(1)}% / 100%)
                </span>
              )}
            </label>

            {customSplits.map((split, i) => (
              <div key={split.participant} className="split-input-row">
                <div
                  className="participant-color-dot"
                  style={{ background: participants.find(p => p.name === split.participant)?.color || '#7c3aed' }}
                />
                <span className="split-input-name">{split.participant}</span>
                {splitMode === 'custom' ? (
                  <div className="split-input-field">
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={split.amount || ''}
                      onChange={e => handleSplitChange(i, 'amount', e.target.value)}
                      style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                    />
                  </div>
                ) : (
                  <div className="split-input-field" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={split.percentage || ''}
                      onChange={e => handleSplitChange(i, 'percentage', e.target.value)}
                      style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                    />
                    <span className="text-muted text-sm">%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {splitMode === 'equal' && amount && participants.length > 0 && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(124, 58, 237, 0.06)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}>
            ⚖️ Split equally: <strong>₹{(parseFloat(amount) / participants.length).toFixed(2)}</strong> per person
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-lg btn-full"
          disabled={loading || !isValid()}
        >
          {loading ? (
            <><span className="spinner" /> {isEdit ? 'Updating...' : 'Adding...'}</>
          ) : (
            isEdit ? 'Update Expense' : 'Add Expense'
          )}
        </button>
      </form>
    </Modal>
  );
}
