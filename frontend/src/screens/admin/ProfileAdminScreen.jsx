import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icons.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { useToast } from '../../components/Toast.jsx';
import { api } from '../../lib/api.js';
import Modal from '../../components/Modal.jsx';

export default function ProfileAdminScreen() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState(user?.name || '');
  const [login, setLogin] = useState(user?.login || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingInfo, setSavingInfo] = useState(false);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const [confirmLogout, setConfirmLogout] = useState(false);

  async function saveInfo(e) {
    e.preventDefault();
    if (!name.trim() || !login.trim()) return;
    setSavingInfo(true);
    try {
      const res = await api.updateProfile({
        name: name.trim(),
        login: login.trim(),
        phone: phone.trim(),
      });
      updateUser(res.user);
      toast.success('Профиль обновлён');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingInfo(false);
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

  function doLogout() {
    setConfirmLogout(false);
    logout();
    navigate('/login', { replace: true });
  }

  const infoChanged =
    name.trim() !== (user?.name || '') ||
    login.trim().toLowerCase() !== (user?.login || '') ||
    (phone.trim() || '') !== (user?.phone || '');

  return (
    <div className="stack" style={{ gap: 16, maxWidth: 640 }}>
      <div className="page-head">
        <h1>Профиль администратора</h1>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 14 }}>Основные данные</h3>
        <form onSubmit={saveInfo} className="stack" style={{ gap: 12 }}>
          <div className="field">
            <label>Имя</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ваше имя"
              required
            />
          </div>
          <div className="field">
            <label>Логин</label>
            <input
              className="input mono"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="admin"
              required
              autoCapitalize="off"
              autoCorrect="off"
            />
            <div className="hint text-muted" style={{ fontSize: 12, marginTop: 4 }}>
              3–32 символа, латиница/цифры/._- · Используется для входа в систему
            </div>
          </div>
          <div className="field">
            <label>Телефон</label>
            <input
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 ..."
            />
          </div>
          <button type="submit" className="btn btn--primary" disabled={savingInfo || !infoChanged}>
            {savingInfo ? <span className="spinner" /> : 'Сохранить'}
          </button>
        </form>
      </div>

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
          <button type="submit" className="btn btn--primary" disabled={savingPwd || !currentPwd || !newPwd}>
            {savingPwd ? <span className="spinner" /> : 'Сменить пароль'}
          </button>
        </form>
      </div>

      <button className="btn btn--secondary btn--full" onClick={() => setConfirmLogout(true)}>
        <Icon name="logout" size={18} />
        Выйти из аккаунта
      </button>

      <Modal
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title="Выйти из аккаунта?"
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setConfirmLogout(false)}>Отмена</button>
            <button className="btn btn--danger" onClick={doLogout}>Выйти</button>
          </>
        }
      >
        <div className="text-muted" style={{ fontSize: 14 }}>
          Вы действительно хотите выйти из аккаунта? Для возврата нужно будет ввести логин и пароль.
        </div>
      </Modal>
    </div>
  );
}
