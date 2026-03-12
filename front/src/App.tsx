import { type FormEvent, useEffect, useState } from 'react';
import './App.css';

const AUTH_API_BASE =
  (import.meta as any).env?.VITE_AUTH_API_URL || 'http://localhost:3001';

type AuthUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  status: string;
};

type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

function App() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('user1@example.com');
  const [password, setPassword] = useState('password123');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem('auth_access_token');
    if (stored) {
      setAccessToken(stored);
    }
  }, []);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(`${AUTH_API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Register failed');
        return;
      }

      setMessage('Registered successfully. You can now log in.');
      setMode('login');
    } catch (err) {
      console.error(err);
      setError('Network error while registering');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(`${AUTH_API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data: LoginResponse | { error?: string } = await res.json();
      if (!res.ok || !('accessToken' in data)) {
        setError((data as any)?.error || 'Login failed');
        return;
      }

      setAccessToken(data.accessToken);
      window.localStorage.setItem('auth_access_token', data.accessToken);
      setCurrentUser(data.user);
      setMessage('Logged in successfully');
    } catch (err) {
      console.error(err);
      setError('Network error while logging in');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`${AUTH_API_BASE}/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data?.accessToken) {
        setError(data?.error || 'Refresh failed');
        return;
      }
      setAccessToken(data.accessToken);
      window.localStorage.setItem('auth_access_token', data.accessToken);
      setMessage('Access token refreshed');
    } catch (err) {
      console.error(err);
      setError('Network error while refreshing token');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setAccessToken(null);
    setCurrentUser(null);
    window.localStorage.removeItem('auth_access_token');
    setMessage('Logged out locally (refresh token cookie still exists)');
  };

  return (
    <div className="auth-page">
      <header className="auth-header">
        <h1>Auth Service Demo</h1>
        <p>Testing register / login / refresh against your auth-service API</p>
        <p className="auth-api-url">
          API base: <code>{AUTH_API_BASE}</code>
        </p>
      </header>

      <main className="auth-main">
        <section className="auth-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => setMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'active' : ''}
              onClick={() => setMode('register')}
            >
              Register
            </button>
          </div>

          <form
            onSubmit={mode === 'login' ? handleLogin : handleRegister}
            className="auth-form"
          >
            <label>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>

            <button type="submit" disabled={loading}>
              {loading
                ? 'Working...'
                : mode === 'login'
                  ? 'Login'
                  : 'Register'}
            </button>
          </form>

          <div className="auth-actions">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
            >
              Refresh access token (using cookie)
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
            >
              Logout (clear access token)
            </button>
          </div>

          {message && <div className="auth-message success">{message}</div>}
          {error && <div className="auth-message error">{error}</div>}
        </section>

        <section className="auth-status">
          <h2>Current session</h2>
          <div className="auth-status-block">
            <h3>Access token</h3>
            {accessToken ? (
              <code className="token-preview">
                {accessToken.substring(0, 40)}...
              </code>
            ) : (
              <p>No access token stored</p>
            )}
          </div>

          <div className="auth-status-block">
            <h3>User</h3>
            {currentUser ? (
              <pre className="user-json">
{JSON.stringify(currentUser, null, 2)}
              </pre>
            ) : (
              <p>No user loaded (login to see basic profile)</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
