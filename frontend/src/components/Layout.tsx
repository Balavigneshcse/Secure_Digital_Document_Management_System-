import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { LogOut, FileText, Activity, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Layout() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [user, setUser] = useState<{ full_name: string; role: string } | null>(null);

  useEffect(() => {
    if (token) {
      api.get('/users/me')
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('token');
          navigate('/login');
        });
    }
  }, [token, navigate]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="flex" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div className="glass-panel" style={{ width: '260px', padding: '1.5rem', display: 'flex', flexDirection: 'column', borderRadius: 0, borderRight: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-2" style={{ marginBottom: '2rem' }}>
          <Shield color="var(--accent-primary)" size={28} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>SentinelDMS</h2>
        </div>
        
        <nav className="flex flex-col gap-2" style={{ flexGrow: 1 }}>
          <a href="#" className="flex items-center gap-2" style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--accent-primary)', color: 'white' }}>
            <Activity size={20} />
            Dashboard
          </a>
          <a href="#" className="flex items-center gap-2" style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
            <FileText size={20} />
            Documents
          </a>
        </nav>

        <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{user?.full_name || 'Loading...'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.role}</div>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}>
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flexGrow: 1, padding: '2rem', overflowY: 'auto' }}>
        <div className="container animate-fade-in">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
