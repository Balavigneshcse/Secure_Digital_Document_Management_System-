import { FileText, ShieldAlert, Activity, Search } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>Dashboard Overview</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back to SentinelDMS.</p>
        </div>
        <button className="btn btn-primary">
          <FileText size={18} />
          Upload Document
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
            <h3 style={{ color: 'var(--text-secondary)' }}>Total Documents</h3>
            <FileText size={24} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>128</div>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
            <h3 style={{ color: 'var(--text-secondary)' }}>Active Cases</h3>
            <ShieldAlert size={24} color="var(--warning)" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>14</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
            <h3 style={{ color: 'var(--text-secondary)' }}>Audit Events (24h)</h3>
            <Activity size={24} color="var(--accent-secondary)" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>892</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Recent Audit Trail</h2>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '0.75rem', color: 'var(--text-muted)' }} size={16} />
            <input type="text" placeholder="Search events..." style={{ paddingLeft: '2.25rem', paddingRight: '1rem', paddingBottom: '0.5rem', paddingTop: '0.5rem', fontSize: '0.9rem' }} />
          </div>
        </div>
        
        <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              <tr>
                <th style={{ padding: '1rem' }}>Event</th>
                <th style={{ padding: '1rem' }}>Resource ID</th>
                <th style={{ padding: '1rem' }}>IP Address</th>
                <th style={{ padding: '1rem' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>UPLOAD_DOCUMENT</td>
                <td style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}><span style={{ fontFamily: 'monospace', color: 'var(--accent-primary)' }}>d3b07384...</span></td>
                <td style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>192.168.1.5</td>
                <td style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Just now</td>
              </tr>
              <tr>
                <td style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>VIEW_CASE</td>
                <td style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}><span style={{ fontFamily: 'monospace', color: 'var(--accent-primary)' }}>a1f498c2...</span></td>
                <td style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>192.168.1.12</td>
                <td style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>5 mins ago</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
