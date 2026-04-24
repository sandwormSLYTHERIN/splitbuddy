import { Search, Calendar, User, X } from 'lucide-react';

export default function SearchFilters({ filters, onChange, participants }) {
  const handleChange = (field, value) => {
    onChange({ ...filters, [field]: value });
  };

  const clearFilters = () => {
    onChange({ search: '', participant: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '' });
  };

  const hasActiveFilters = filters.search || filters.participant || filters.dateFrom || filters.dateTo || filters.amountMin || filters.amountMax;

  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <Search size={16} className="search-input-icon" />
        <input
          className="search-input"
          type="text"
          placeholder="Search expenses..."
          value={filters.search || ''}
          onChange={e => handleChange('search', e.target.value)}
        />
      </div>

      <div className="filter-chip" style={{ padding: 0 }}>
        <select
          style={{
            background: 'transparent', border: 'none', color: 'inherit',
            fontFamily: 'inherit', fontSize: 'inherit', padding: '8px 14px',
            cursor: 'pointer', outline: 'none', appearance: 'none',
            minWidth: '140px',
          }}
          value={filters.participant || ''}
          onChange={e => handleChange('participant', e.target.value)}
        >
          <option value="">👤 All Payers</option>
          {participants?.map(p => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="filter-chip" style={{ padding: 0 }}>
        <input
          type="date"
          style={{
            background: 'transparent', border: 'none', color: 'inherit',
            fontFamily: 'inherit', fontSize: 'inherit', padding: '8px 14px',
            cursor: 'pointer', outline: 'none',
            colorScheme: 'dark',
          }}
          placeholder="From"
          value={filters.dateFrom || ''}
          onChange={e => handleChange('dateFrom', e.target.value)}
          title="From date"
        />
      </div>

      <div className="filter-chip" style={{ padding: 0 }}>
        <input
          type="date"
          style={{
            background: 'transparent', border: 'none', color: 'inherit',
            fontFamily: 'inherit', fontSize: 'inherit', padding: '8px 14px',
            cursor: 'pointer', outline: 'none',
            colorScheme: 'dark',
          }}
          placeholder="To"
          value={filters.dateTo || ''}
          onChange={e => handleChange('dateTo', e.target.value)}
          title="To date"
        />
      </div>

      {hasActiveFilters && (
        <button className="filter-chip" onClick={clearFilters} style={{ color: 'var(--rose-400)' }}>
          <X size={12} /> Clear
        </button>
      )}
    </div>
  );
}
