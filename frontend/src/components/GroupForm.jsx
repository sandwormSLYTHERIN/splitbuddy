import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from './Modal';

const EMOJI_OPTIONS = ['💰', '🍕', '🏠', '✈️', '🎉', '🛒', '☕', '🎬', '🏋️', '📚', '🎮', '💊'];
const COLOR_OPTIONS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function GroupForm({ isOpen, onClose, onSubmit, initialData }) {
  const isEdit = !!initialData;

  const [name, setName] = useState(initialData?.name || '');
  const [emoji, setEmoji] = useState(initialData?.emoji || '💰');
  const [participants, setParticipants] = useState(
    initialData?.participants?.filter(p => !p.isOwner).map(p => ({
      name: p.name,
      color: p.color || COLOR_OPTIONS[0],
    })) || [{ name: '', color: COLOR_OPTIONS[1] }]
  );
  const [loading, setLoading] = useState(false);

  const addParticipant = () => {
    if (participants.length >= 3) return;
    const nextColor = COLOR_OPTIONS[(participants.length + 1) % COLOR_OPTIONS.length];
    setParticipants([...participants, { name: '', color: nextColor }]);
  };

  const removeParticipant = (index) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const updateParticipant = (index, field, value) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const validParticipants = participants.filter(p => p.name.trim());
    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        emoji,
        participants: validParticipants,
      });
      onClose();
    } catch (err) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? '✏️ Edit Group' : '✨ Create New Group'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Emoji Picker */}
        <div className="form-group">
          <label className="form-label">Group Icon</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {EMOJI_OPTIONS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                style={{
                  width: 40, height: 40, fontSize: '1.3rem',
                  border: emoji === e ? '2px solid var(--violet-500)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  background: emoji === e ? 'rgba(124, 58, 237, 0.1)' : 'var(--bg-glass)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Group Name */}
        <div className="form-group">
          <label className="form-label">Group Name</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g., Goa Trip 2024"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={60}
            autoFocus
          />
        </div>

        {/* Participants */}
        <div className="form-group">
          <label className="form-label">
            Participants ({participants.length}/3 additional)
          </label>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            You're automatically included as the group owner.
          </p>

          {participants.map((p, i) => (
            <div key={i} className="participant-row">
              <div
                className="participant-color-dot"
                style={{ background: p.color, cursor: 'pointer' }}
                onClick={() => {
                  const nextIdx = (COLOR_OPTIONS.indexOf(p.color) + 1) % COLOR_OPTIONS.length;
                  updateParticipant(i, 'color', COLOR_OPTIONS[nextIdx]);
                }}
                title="Click to change color"
              />
              <input
                className="participant-name-input"
                type="text"
                placeholder={`Participant ${i + 1}`}
                value={p.name}
                onChange={(e) => updateParticipant(i, 'name', e.target.value)}
              />
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => removeParticipant(i)}
                title="Remove"
              >
                <Trash2 size={14} style={{ color: 'var(--rose-400)' }} />
              </button>
            </div>
          ))}

          {participants.length < 3 && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={addParticipant} style={{ marginTop: '0.5rem' }}>
              <Plus size={14} /> Add Participant
            </button>
          )}
        </div>

        <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
          {loading ? (
            <><span className="spinner" /> {isEdit ? 'Updating...' : 'Creating...'}</>
          ) : (
            isEdit ? 'Update Group' : 'Create Group'
          )}
        </button>
      </form>
    </Modal>
  );
}
