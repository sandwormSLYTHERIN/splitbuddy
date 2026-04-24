import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit3, Trash2, Receipt, Scale, ArrowRightLeft, BarChart3, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import SummaryCards from '../components/SummaryCards';
import ExpenseList from '../components/ExpenseList';
import ExpenseForm from '../components/ExpenseForm';
import BalanceTable from '../components/BalanceTable';
import SettlementList from '../components/SettlementList';
import ContributionChart from '../components/ContributionChart';
import SearchFilters from '../components/SearchFilters';
import GroupForm from '../components/GroupForm';
import MintSense from '../components/MintSense';

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [groupData, setGroupData] = useState(null);
  const [filteredExpenses, setFilteredExpenses] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expenses');

  // Modals
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showEditGroup, setShowEditGroup] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    search: '', participant: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '',
  });

  const fetchGroupData = useCallback(async () => {
    try {
      const res = await api.get(`/groups/${id}`);
      setGroupData(res.data.data);
    } catch (err) {
      toast.error('Failed to load group');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  // Apply filters
  useEffect(() => {
    const hasFilters = filters.search || filters.participant || filters.dateFrom || filters.dateTo;
    if (!hasFilters || !groupData) {
      setFilteredExpenses(null);
      return;
    }

    const fetchFiltered = async () => {
      try {
        const params = new URLSearchParams();
        if (filters.search) params.append('search', filters.search);
        if (filters.participant) params.append('participant', filters.participant);
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);

        const res = await api.get(`/expenses/group/${id}?${params.toString()}`);
        setFilteredExpenses(res.data.data);
      } catch (err) {
        // Fall back to client-side filtering
        let result = [...(groupData.expenses || [])];

        if (filters.search) {
          const q = filters.search.toLowerCase();
          result = result.filter(e => e.description.toLowerCase().includes(q));
        }
        if (filters.participant) {
          result = result.filter(e => e.payer === filters.participant);
        }
        if (filters.dateFrom) {
          result = result.filter(e => new Date(e.date) >= new Date(filters.dateFrom));
        }
        if (filters.dateTo) {
          result = result.filter(e => new Date(e.date) <= new Date(filters.dateTo));
        }
        setFilteredExpenses(result);
      }
    };

    const debounce = setTimeout(fetchFiltered, 300);
    return () => clearTimeout(debounce);
  }, [filters, groupData, id]);

  const handleAddExpense = async (data) => {
    try {
      const res = await api.post(`/expenses/group/${id}`, data);
      toast.success(res.data.message);
      fetchGroupData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add expense');
      throw err;
    }
  };

  const handleEditExpense = async (data) => {
    try {
      const res = await api.put(`/expenses/${editingExpense._id}`, data);
      toast.success(res.data.message);
      setEditingExpense(null);
      fetchGroupData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update expense');
      throw err;
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Delete this expense? Balances will be recalculated.')) return;
    try {
      const res = await api.delete(`/expenses/${expenseId}`);
      toast.success(res.data.message);
      fetchGroupData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete expense');
    }
  };

  const handleEditGroup = async (data) => {
    try {
      const res = await api.put(`/groups/${id}`, data);
      toast.success(res.data.message);
      fetchGroupData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update group');
      throw err;
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('Delete this group and all its expenses? This cannot be undone.')) return;
    try {
      const res = await api.delete(`/groups/${id}`);
      toast.success(res.data.message);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete group');
    }
  };

  const handleAiParsed = (parsed) => {
    // Pre-fill expense form with AI-parsed data
    setEditingExpense(parsed);
    setShowExpenseForm(true);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-loading">
          <div className="spinner" style={{ width: 36, height: 36 }} />
          <p className="page-loading-text">Loading group data...</p>
        </div>
      </div>
    );
  }

  if (!groupData) return null;

  const { group, expenses, balances, insights } = groupData;
  const displayExpenses = filteredExpenses || expenses;

  const tabs = [
    { id: 'expenses', label: 'Expenses', icon: <Receipt size={15} /> },
    { id: 'balances', label: 'Balances', icon: <Scale size={15} /> },
    { id: 'settlements', label: 'Settlements', icon: <ArrowRightLeft size={15} /> },
    { id: 'charts', label: 'Charts', icon: <BarChart3 size={15} /> },
    { id: 'ai', label: 'MintSense', icon: <Sparkles size={15} /> },
  ];

  return (
    <div className="page-container">
      {/* Back button */}
      <button className="back-btn" onClick={() => navigate('/')}>
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span style={{ fontSize: '1.5rem' }}>{group.emoji}</span>
            {group.name}
            <span className={`group-card-mood mood-${group.mood || 'chill'}`} style={{ fontSize: '0.65rem', marginLeft: '0.5rem' }}>
              {group.mood || 'chill'}
            </span>
          </h1>
          <div className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            {group.participants?.map((p, i) => (
              <span key={p._id || i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div
                  className="participant-color-dot"
                  style={{ background: p.color || '#7c3aed', width: 8, height: 8 }}
                />
                <span>{p.name}{p.isOwner ? ' (You)' : ''}</span>
                {i < group.participants.length - 1 && <span style={{ color: 'var(--text-muted)' }}>·</span>}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowEditGroup(true)}>
            <Edit3 size={14} /> Edit
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleDeleteGroup}>
            <Trash2 size={14} /> Delete
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingExpense(null); setShowExpenseForm(true); }}>
            <Plus size={14} /> Add Expense
          </button>
        </div>
      </div>

      {/* Summary */}
      <SummaryCards groupData={groupData} />

      {/* Insights */}
      {insights && insights.length > 0 && (
        <div className="insights-grid mb-lg">
          {insights.map((insight, i) => (
            <div key={i} className="insight-card animate-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <span className="insight-icon">{insight.icon}</span>
              <span className="insight-text">{insight.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'expenses' && (
        <div className="animate-in">
          <SearchFilters
            filters={filters}
            onChange={setFilters}
            participants={group.participants}
          />
          <ExpenseList
            expenses={displayExpenses}
            onEdit={(expense) => { setEditingExpense(expense); setShowExpenseForm(true); }}
            onDelete={handleDeleteExpense}
          />
        </div>
      )}

      {activeTab === 'balances' && (
        <div className="animate-in">
          <BalanceTable balances={balances} participants={group.participants} />
        </div>
      )}

      {activeTab === 'settlements' && (
        <div className="animate-in">
          <SettlementList settlements={balances?.settlements} />
        </div>
      )}

      {activeTab === 'charts' && (
        <div className="animate-in">
          <ContributionChart
            participantStats={balances?.participantStats}
            participants={group.participants}
          />
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="animate-in">
          <MintSense
            groupId={id}
            participants={group.participants}
            onExpenseParsed={handleAiParsed}
          />
        </div>
      )}

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <ExpenseForm
          isOpen={showExpenseForm}
          onClose={() => { setShowExpenseForm(false); setEditingExpense(null); }}
          onSubmit={editingExpense?._id ? handleEditExpense : handleAddExpense}
          participants={group.participants}
          initialData={editingExpense}
        />
      )}

      {/* Edit Group Modal */}
      <GroupForm
        isOpen={showEditGroup}
        onClose={() => setShowEditGroup(false)}
        onSubmit={handleEditGroup}
        initialData={group}
      />
    </div>
  );
}
