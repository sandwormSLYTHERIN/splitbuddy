import { useState } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import api from '../utils/api';

export default function MintSense({ groupId, participants, onExpenseParsed }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(null);

  // Check AI status on first render
  useState(() => {
    api.get('/ai/status').then(res => {
      setAiAvailable(res.data.data.available);
    }).catch(() => setAiAvailable(false));
  });

  const parseExpense = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    try {
      const res = await api.post('/ai/parse-expense', { text: input, groupId });
      if (res.data.success && res.data.data && onExpenseParsed) {
        onExpenseParsed(res.data.data);
        setInput('');
      }
    } catch (err) {
      console.error('AI parse error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await api.post('/ai/group-summary', { groupId });
      setSummary(res.data.data.summary);
    } catch (err) {
      console.error('AI summary error:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  if (aiAvailable === false) {
    return (
      <div className="ai-chat-box" style={{ opacity: 0.6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="ai-badge"><Sparkles size={10} /> MintSense</span>
          <span className="text-xs text-muted">AI Features Unavailable</span>
        </div>
        <p className="text-sm text-muted">
          Add your Gemini API key to <code style={{ color: 'var(--violet-400)' }}>backend/.env</code> to unlock AI features like natural language expense parsing, smart summaries, and settlement suggestions.
        </p>
      </div>
    );
  }

  return (
    <div className="ai-chat-box">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span className="ai-badge"><Sparkles size={10} /> MintSense</span>
        <span className="text-xs text-muted">Powered by Google Gemini</span>
      </div>

      {/* Natural Language Input */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          className="form-input"
          type="text"
          placeholder='Try: "Rahul paid 500 for dinner, split equally"'
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && parseExpense()}
          style={{ flex: 1 }}
        />
        <button
          className="btn btn-primary"
          onClick={parseExpense}
          disabled={loading || !input.trim()}
        >
          {loading ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
        </button>
      </div>

      {/* Generate Summary Button */}
      <button
        className="btn btn-secondary btn-sm"
        onClick={generateSummary}
        disabled={summaryLoading}
        style={{ marginBottom: summary ? '1rem' : 0 }}
      >
        {summaryLoading ? (
          <><Loader2 size={14} className="spinner" /> Generating...</>
        ) : (
          <><Sparkles size={14} /> Generate Group Summary</>
        )}
      </button>

      {/* AI Summary Output */}
      {summary && (
        <div className="ai-response">{summary}</div>
      )}
    </div>
  );
}
