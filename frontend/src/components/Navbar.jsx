import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Sparkles } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('/')}>
        <div className="navbar-brand-icon">S</div>
        SplitBuddy
      </div>

      <div className="navbar-actions">
        <div className="navbar-user">
          <div
            className="navbar-avatar"
            style={{ background: user?.avatar || '#7c3aed' }}
          >
            {user?.initials || user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <span>{user?.name}</span>
          {user?.badges?.length > 0 && (
            <span title={user.badges.map(b => `${b.icon} ${b.name}`).join(', ')}>
              <Sparkles size={14} style={{ color: '#fbbf24' }} />
            </span>
          )}
        </div>

        <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Logout">
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  );
}
