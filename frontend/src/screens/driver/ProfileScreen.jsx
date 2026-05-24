import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icons.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { useToast } from '../../components/Toast.jsx';
import { api } from '../../lib/api.js';
import { compressImage } from '../../lib/photo.js';
import NetworkBar from '../../components/NetworkBar.jsx';

function Avatar({ url, name, size = 88 }) {
  const initials = name
    ? name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', display: 'block',
          border: '3px solid var(--accent)',
        }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--accent-soft)', color: 'var(--accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700,
      border: '3px solid var(--accent)',
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const avatarRef = useRef(null);

  const [name, setName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function handleAvatarFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const blob = await compressImage(file, { maxDim: 400, quality: 0.85 });
      const { url } = await api.uploads.upload(blob || file, 'avatar.jpg');
      const res = await api.updateProfile({ avatar_url: url });
      updateUser(res.user);
      toast.success('Аватарка обновлена');
    } catch (err) {
      toast.error(err.message || 'Ошибка загрузки');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function saveName(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingName(true);
    try {
      const res = await api.updateProfile({ name: name.trim() });
      updateUser(res.user);
      toast.success('Имя обновлено');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    if (!currentPwd || !newPwd) return;
    setSavingPwd(true);
    try {
      await api.updateProfile({ current_password: currentPwd, new_password: newPwd });
      setCurrentPwd('');
      setNewPwd('');
      toast.success('Пароль изменён');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingPwd(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <NetworkBar />
      <div className="page">
        <h2>Профиль</h2>

        {/* Аватарка */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 24, paddingBottom: 24 }}>
          <div style={{ position: 'relative' }}>
            <Avatar url={user?.avatar_url} name={user?.name} size={96} />
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              disabled={uploadingAvatar}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--accent)', border: '2px solid var(--bg-card)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
              aria-label="Изменить фото"
            >
              {uploadingAvatar ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> : <Icon name="camera" size={13} />}
            </button>
          </div>
          <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} />

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{user?.name}</div>
            <div className="text-muted" style={{ fontSize: 13 }}>@{user?.login}</div>
          </div>

          <div style={{
            background: 'var(--bg)', borderRadius: 'var(--radius)',
            padding: '8px 16px', fontSize: 13, color: 'var(--text-muted)',
          }}>
            Роль: <span style={{ color: 'var(--text)', fontWeight: 600 }}>Водитель</span>
          </div>
        </div>

        {/* Изменить имя */}
        <div className="card">
          <h3 style={{ marginBottom: 14 }}>Изменить имя</h3>
          <form onSubmit={saveName} className="stack" style={{ gap: 10 }}>
            <div className="field">
              <label>Отображаемое имя</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя"
                required
              />
            </div>
            <button type="submit" className="btn" disabled={savingName || name.trim() === user?.name}>
              {savingName ? <span className="spinner" /> : 'Сохранить имя'}
            </button>
          </form>
        </div>

        {/* Информация об аккаунте */}
        <div className="card">
          <h3 style={{ marginBottom: 14 }}>Аккаунт</h3>
          <div className="summary-row">
            <span className="summary-row__label">Логин</span>
            <span className="summary-row__value mono">{user?.login}</span>
          </div>
          {user?.phone && (
            <div className="summary-row">
              <span className="summary-row__label">Телефон</span>
              <span className="summary-row__value">{user.phone}</span>
            </div>
          )}
          <div className="summary-row" style={{ border: 'none' }}>
            <span className="summary-row__label">Пароль</span>
            <span className="summary-row__value text-muted">••••••••</span>
          </div>
        </div>

        {/* Сменить пароль */}
        <div className="card">
          <h3 style={{ marginBottom: 14 }}>Сменить пароль</h3>
          <form onSubmit={savePassword} className="stack" style={{ gap: 10 }}>
            <div className="field">
              <label>Текущий пароль</label>
              <div className="input-row">
                <input
                  type={showCur ? 'text' : 'password'}
                  className="input"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="Текущий пароль"
                  autoComplete="current-password"
                  style={{ paddingRight: 48 }}
                  required
                />
                <button type="button" className="icon-right btn btn--ghost"
                  onClick={() => setShowCur((s) => !s)}
                  style={{ minHeight: 40, width: 40, padding: 0 }}>
                  <Icon name={showCur ? 'eye-off' : 'eye'} size={17} />
                </button>
              </div>
            </div>
            <div className="field">
              <label>Новый пароль</label>
              <div className="input-row">
                <input
                  type={showNew ? 'text' : 'password'}
                  className="input"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Минимум 4 символа"
                  autoComplete="new-password"
                  style={{ paddingRight: 48 }}
                  required
                  minLength={4}
                />
                <button type="button" className="icon-right btn btn--ghost"
                  onClick={() => setShowNew((s) => !s)}
                  style={{ minHeight: 40, width: 40, padding: 0 }}>
                  <Icon name={showNew ? 'eye-off' : 'eye'} size={17} />
                </button>
              </div>
            </div>
            <button type="submit" className="btn" disabled={savingPwd || !currentPwd || !newPwd}>
              {savingPwd ? <span className="spinner" /> : 'Сменить пароль'}
            </button>
          </form>
        </div>

        {/* Выход */}
        <button className="btn btn--secondary btn--full" onClick={handleLogout} style={{ marginTop: 4 }}>
          <Icon name="logout" size={18} />
          Выйти из аккаунта
        </button>
      </div>
    </>
  );
}
