import { useEffect, useMemo, useState } from 'react';
import type { AuthUser } from '../api/auth';
import * as authApi from '../api/auth';
import { getOrCreateUuid, getString, removeKey, setString } from '../utils/storage';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const GUEST_ID_KEY = 'guest_user_id';

export function useAuth(authBaseUrl: string, onLog: (line: string) => void) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getString(ACCESS_TOKEN_KEY);
    if (stored) setAccessToken(stored);
  }, []);

  const guestUserId = useMemo(() => getOrCreateUuid(GUEST_ID_KEY), []);

  const cartUserId = currentUser?.id ?? guestUserId;

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    const res = await authApi.login(authBaseUrl, email, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    setAccessToken(res.data.accessToken);
    setString(ACCESS_TOKEN_KEY, res.data.accessToken);
    setCurrentUser(res.data.user);
    onLog(`[auth] Logged in as ${res.data.user.email}`);
    onLog(`[cart] merge guest->user: chưa chuẩn bị xong API`);
    return true;
  };

  const register = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    const res = await authApi.register(authBaseUrl, email, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    onLog('[auth] Registered successfully, please login');
    return true;
  };

  const logout = () => {
    setAccessToken(null);
    setCurrentUser(null);
    removeKey(ACCESS_TOKEN_KEY);
    onLog('[auth] Logged out (local token cleared)');
  };

  return {
    currentUser,
    accessToken,
    loading,
    error,
    cartUserId,
    login,
    register,
    logout,
    setError,
  };
}

