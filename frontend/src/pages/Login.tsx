import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Key, Eye, EyeOff } from 'lucide-react';
import { api } from '../api';

export default function Login() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/login/step1', { email, password });
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    }
    setLoading(false);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login/step2', { email, otp_code: otp });
      localStorage.setItem('token', res.data.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid or expired OTP');
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center animate-fade-in" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', textAlign: 'center', backgroundColor: '#ffffff', boxShadow: 'var(--shadow-md)' }}>
        
        <div className="flex justify-center" style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%' }}>
            <Shield color="var(--accent-primary)" size={32} />
          </div>
        </div>
        
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>SentinelDMS</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          {step === 1 ? 'Sign in to access secure documents' : 'Enter the OTP sent to your email'}
        </p>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleStep1} className="flex flex-col gap-4">
            <div style={{ position: 'relative' }}>
              <Mail style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem', color: 'var(--text-muted)' }} size={18} />
              <input 
                type="email" 
                placeholder="Email Address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.75rem' }}
                required 
              />
            </div>
            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem', color: 'var(--text-muted)' }} size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                required 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleStep2} className="flex flex-col gap-4">
            <div style={{ position: 'relative' }}>
              <Key style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem', color: 'var(--text-muted)' }} size={18} />
              <input 
                type="text" 
                placeholder="6-digit OTP Code" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.75rem', letterSpacing: '4px', textAlign: 'center' }}
                maxLength={6}
                required 
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP & Proceed'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
