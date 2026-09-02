import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useNavigate } from 'react-router-dom';
import * as authService from '../services/authService';
import { useAppDispatch } from '../store/hooks';
import { setCredentials } from '../store/authSlice';
import { palette } from '../theme';
import Seal from '../components/Seal';
import type { Role } from '../types';

export default function LoginPage() {
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [role, setRole] = useState<Role>('IO');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.login(email || 'demo@sentineldms.gov', password || 'demo');
      setStep('mfa');
    } catch {
      setError('Could not sign in. Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await authService.verifyMfa('mock-temp-token', code, role);
      dispatch(setCredentials({ token, user }));
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
      {/* Hero panel — the registry ledger */}
      <Box
        sx={{
          flex: { md: '0 0 46%' },
          minHeight: { xs: 220, md: '100vh' },
          bgcolor: palette.ink,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          px: { xs: 4, md: 7 },
          py: { xs: 4, md: 7 },
        }}
      >
        {/* Ledger-line texture */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(to bottom, transparent, transparent 35px, rgba(242,239,227,0.045) 35px, rgba(242,239,227,0.045) 36px)',
            pointerEvents: 'none',
          }}
        />
        <Box sx={{ position: 'relative' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.3, mb: { xs: 2, md: 0 } }}>
            <Seal size={26} color={palette.sealLight} />
            <Typography className="font-display" sx={{ color: '#F2EFE3', fontWeight: 600, fontSize: '1.25rem', letterSpacing: 0.2 }}>
              Sentinel<span style={{ color: palette.sealLight }}>DMS</span>
            </Typography>
          </Box>
        </Box>

        <Box sx={{ position: 'relative', display: { xs: 'none', md: 'block' } }}>
          <Seal size={120} color="rgba(242,239,227,0.09)" />
        </Box>

        <Box sx={{ position: 'relative' }}>
          <Typography className="font-display" sx={{ color: '#F2EFE3', fontSize: { xs: '1.5rem', md: '1.9rem' }, fontWeight: 600, lineHeight: 1.3, mb: 1.5 }}>
            A single record of custody, from first upload to final verdict.
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(242,239,227,0.65)', maxWidth: 380 }}>
            Every document, signature, and verification is timestamped and sealed — so nothing entered into the record can be quietly altered.
          </Typography>
        </Box>
      </Box>

      {/* Form panel */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: palette.paper,
          px: 3,
          py: { xs: 5, md: 3 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 380 }}>
          {step === 'credentials' ? (
            <Box component="form" onSubmit={handleLogin}>
              <Typography variant="h5" sx={{ mb: 0.5 }}>Sign in</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5 }}>
                Frontend demo build — no backend connected yet. Any email/password works.
              </Typography>
              <TextField label="Email" fullWidth margin="normal" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@sentineldms.gov" />
              <TextField label="Password" type="password" fullWidth margin="normal" value={password} onChange={(e) => setPassword(e.target.value)} />

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2.5, mb: 1 }}>
                Demo role (drives which dashboard/sidebar you see)
              </Typography>
              <ToggleButtonGroup value={role} exclusive size="small" onChange={(_, v) => v && setRole(v)} sx={{ flexWrap: 'wrap' }}>
                <ToggleButton value="IO">Officer</ToggleButton>
                <ToggleButton value="JUDGE">Judge</ToggleButton>
                <ToggleButton value="FORENSIC">Forensic</ToggleButton>
                <ToggleButton value="ADMIN">Admin</ToggleButton>
              </ToggleButtonGroup>

              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

              <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 3.5, bgcolor: palette.registry, '&:hover': { bgcolor: palette.registryDark } }} disabled={loading}>
                {loading ? 'Signing in…' : 'Login'}
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleVerify}>
              <Typography variant="h5" sx={{ mb: 0.5 }}>Two-factor verification</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5 }}>
                Enter the 6-digit code from your authenticator app. (Demo: type any 6 digits.)
              </Typography>
              <TextField
                label="Authentication code"
                fullWidth
                margin="normal"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                slotProps={{ htmlInput: { style: { letterSpacing: 6, fontSize: '1.2rem', textAlign: 'center' }, maxLength: 6 } }}
                autoFocus
              />
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 3.5, bgcolor: palette.registry, '&:hover': { bgcolor: palette.registryDark } }} disabled={loading}>
                {loading ? 'Verifying…' : 'Verify & continue'}
              </Button>
              <Button fullWidth sx={{ mt: 1 }} onClick={() => setStep('credentials')}>
                Back
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
