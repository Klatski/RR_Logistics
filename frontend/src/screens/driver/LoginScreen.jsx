import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '../../components/Icons.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { useToast } from '../../components/Toast.jsx';

export default function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading } = useAuth();
  const toast = useToast();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const user = await login(loginValue.trim(), password);
      if ('vibrate' in navigator) navigator.vibrate(20);
      const from = location.state && location.state.from && location.state.from.pathname;
      const target = user.role === 'admin' ? '/admin' : '/';
      navigate(from || target, { replace: true });
    } catch (e) {
      setError(e.message || 'Ошибка входа');
      if ('vibrate' in navigator) navigator.vibrate([60, 30, 60]);
      toast.error(e.message || 'Ошибка входа');
    }
  }

  return (
    <div className="app-shell" style={{ justifyContent: 'center' }}>
      <div className="page" style={{ padding: '24px 20px', justifyContent: 'center', minHeight: '100dvh' }}>
        <div className="text-center" style={{ marginTop: 'auto', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, margin: '0 auto 16px',
            borderRadius: 18, background: 'var(--accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)'
          }}>
            <Icon name="car" size={36} />
          </div>
          <h1 style={{ marginBottom: 4 }}>RR Logistics</h1>
          <div className="text-muted">Система учёта поездок</div>
        </div>

        <form onSubmit={onSubmit} className="stack">
          <div className="field">
            <div className="input-row">
              <span className="icon-left"><Icon name="user" size={18} /></span>
              <input
                type="text"
                className={`input ${error ? 'input--error' : ''}`}
                placeholder="Введите логин"
                value={loginValue}
                onChange={(e) => setLoginValue(e.target.value)}
                autoComplete="username"
                autoCapitalize="off"
                autoCorrect="off"
                required
              />
            </div>
          </div>

          <div className="field">
            <div className="input-row">
              <span className="icon-left"><Icon name="lock" size={18} /></span>
              <input
                type={showPwd ? 'text' : 'password'}
                className={`input ${error ? 'input--error' : ''}`}
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                className="icon-right btn btn--ghost"
                onClick={() => setShowPwd((s) => !s)}
                aria-label="Показать или скрыть пароль"
                style={{ minHeight: 40, width: 40, padding: 0 }}
              >
                <Icon name={showPwd ? 'eye-off' : 'eye'} size={18} />
              </button>
            </div>
            {error && <div className="error">{error}</div>}
          </div>

          <button type="submit" className="btn btn--full btn--lg" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Войти'}
          </button>
        </form>

        <div className="text-muted text-center" style={{ fontSize: 12, marginTop: 'auto', paddingTop: 32 }}>
          Если нет аккаунта — обратитесь к администратору
        </div>
      </div>
    </div>
  );
}
