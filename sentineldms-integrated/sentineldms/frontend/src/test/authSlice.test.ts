import { describe, it, expect, beforeEach } from 'vitest';
import authReducer, { setCredentials, logout } from '../store/authSlice';
import type { AuthUser } from '../types';

const mockUser: AuthUser = {
  id: 'u1',
  name: 'Test Officer',
  email: 'test@sentineldms.gov',
  role: 'IO',
  avatarInitials: 'TO',
};

describe('authSlice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with no user when nothing is stored', () => {
    const state = authReducer(undefined, { type: '@@INIT' });
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it('sets credentials on login', () => {
    const state = authReducer(undefined, setCredentials({ user: mockUser, token: 'abc123' }));
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe('abc123');
    expect(localStorage.getItem('sentineldms_token')).toBe('abc123');
  });

  it('clears credentials on logout', () => {
    const loggedIn = authReducer(undefined, setCredentials({ user: mockUser, token: 'abc123' }));
    const loggedOut = authReducer(loggedIn, logout());
    expect(loggedOut.user).toBeNull();
    expect(loggedOut.token).toBeNull();
    expect(localStorage.getItem('sentineldms_token')).toBeNull();
  });
});
