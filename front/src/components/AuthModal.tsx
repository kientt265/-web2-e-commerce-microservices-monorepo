import { type FormEvent, useState } from 'react';

export function AuthModal({
  open,
  mode,
  setMode,
  onClose,
  onLogin,
  onRegister,
  loading,
  error,
}: {
  open: boolean;
  mode: 'login' | 'register';
  setMode: (m: 'login' | 'register') => void;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<boolean>;
  onRegister: (email: string, password: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}) {
  const [email, setEmail] = useState('user1@example.com');
  const [password, setPassword] = useState('password123');

  if (!open) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = mode === 'login' ? await onLogin(email, password) : await onRegister(email, password);
    if (ok && mode === 'login') onClose();
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}</div>
          <button type="button" className="x" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Login
          </button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
            Register
          </button>
        </div>

        <form onSubmit={submit} className="auth-form">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {error ? <div className="notice error">{error}</div> : null}

          <button type="submit" className="primary" disabled={loading}>
            {loading ? 'Working...' : mode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
}

