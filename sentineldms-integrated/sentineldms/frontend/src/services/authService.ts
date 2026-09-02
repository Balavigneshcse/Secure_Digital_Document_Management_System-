import { api } from './axiosInstance';
import { delay, USE_MOCKS } from './delay';
import { mockUsers } from '../mocks/data';
import type { AuthUser, Role } from '../types';

export async function login(email: string, _password: string): Promise<{ mfaRequired: boolean; tempToken: string }> {
  if (USE_MOCKS) {
    return delay({ mfaRequired: true, tempToken: 'mock-temp-token' }, 500);
  }
  const res = await api.post('/auth/login', { email, password: _password });
  return res.data;
}

export async function verifyMfa(_tempToken: string, code: string, roleForDemo: Role): Promise<{ token: string; user: AuthUser }> {
  if (USE_MOCKS) {
    if (code.length !== 6) throw new Error('Enter the 6-digit code from your authenticator app');
    return delay({ token: 'mock-jwt-token', user: mockUsers[roleForDemo] }, 500);
  }
  const res = await api.post('/auth/mfa/verify', { tempToken: _tempToken, code });
  return res.data;
}

export async function fetchMe(): Promise<AuthUser> {
  if (USE_MOCKS) {
    const raw = localStorage.getItem('sentineldms_user');
    if (!raw) throw new Error('Not authenticated');
    return delay(JSON.parse(raw), 200);
  }
  const res = await api.get('/auth/me');
  return res.data;
}
