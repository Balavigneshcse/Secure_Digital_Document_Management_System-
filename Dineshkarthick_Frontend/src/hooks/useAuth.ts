import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logout as logoutAction } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const user = useAppSelector((s) => s.auth.user);
  const token = useAppSelector((s) => s.auth.token);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const logout = () => {
    dispatch(logoutAction());
    navigate('/login');
  };

  return { user, token, isAuthenticated: Boolean(token && user), logout };
}
