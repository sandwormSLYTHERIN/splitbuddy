import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import SummaryCards from '../components/SummaryCards';
import GroupCard from '../components/GroupCard';
import GroupForm from '../components/GroupForm';

export default function Dashboard() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups');
      setGroups(res.data.data);
    } catch (err) {
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async (data) => {
    try {
      const res = await api.post('/groups', data);
      toast.success(res.data.message);
      fetchGroups();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create group');
      throw err;
    }
  };

  // Greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '☀️ Good morning';
    if (hour < 17) return '🌤️ Good afternoon';
    if (hour < 21) return '🌆 Good evening';
    return '🌙 Good night';
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-loading">
          <div className="spinner" style={{ width: 36, height: 36 }} />
          <p className="page-loading-text">Loading your groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {getGreeting()}, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="page-subtitle">
            {groups.length === 0
              ? "Create your first group to start splitting expenses"
              : `You have ${groups.length} group${groups.length !== 1 ? 's' : ''} active`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateGroup(true)}>
          <Plus size={18} /> New Group
        </button>
      </div>

      {/* Summary Cards */}
      <SummaryCards groups={groups} />

      {/* Groups */}
      {groups.length === 0 ? (
        <div className="empty-state glass-card-static" style={{ padding: '3rem' }}>
          <div className="empty-state-icon">💰</div>
          <div className="empty-state-title">No groups yet</div>
          <div className="empty-state-text">
            Create a group to start tracking shared expenses with friends, roommates, or travel buddies.
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreateGroup(true)}>
            <Plus size={18} /> Create Your First Group
          </button>
        </div>
      ) : (
        <div className="groups-grid">
          {groups.map((group, i) => (
            <div key={group._id} className="animate-in" style={{ animationDelay: `${i * 0.08}s` }}>
              <GroupCard group={group} />
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      <GroupForm
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onSubmit={handleCreateGroup}
      />
    </div>
  );
}
