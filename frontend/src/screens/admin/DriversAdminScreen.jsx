import { useEffect, useState, useCallback } from 'react';
import { Icon } from '../../components/Icons.jsx';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../components/Toast.jsx';
import { formatDateTime } from '../../lib/format.js';

function randomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function DriversAdminScreen() {
  const toast = useToast();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', login: '', password: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.drivers.list()
      .then((r) => setDrivers(r.drivers))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing('new');
    setForm({ name: '', login: '', password: '', phone: '' });
  }
  function openEdit(driver) {
    setEditing(driver.id);
    setForm({ name: driver.name, login: driver.login, password: '', phone: driver.phone || '' });
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        login: form.login.trim().toLowerCase(),
        phone: form.phone.trim() || null,
      };
      if (editing === 'new') {
        await api.drivers.create({ ...payload, password: form.password });
        toast.success('Водитель добавлен');
      } else {
        const body = { ...payload };
        if (form.password) body.password = form.password;
        await api.drivers.update(editing, body);
        toast.success('Водитель обновлён');
      }
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    try {
      const newPwd = randomPassword();
      await api.drivers.resetPassword(resetting.id, newPwd);
      toast.success('Новый пароль: ' + newPwd, 8000);
      setResetting(null);
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function remove(id) {
    try {
      await api.drivers.remove(id);
      toast.success('Водитель удалён');
      setConfirmDelete(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head">
        <h1>Водители</h1>
        <button className="btn" onClick={openCreate}><Icon name="plus" size={18} />Добавить</button>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 120 }} />
      ) : drivers.length === 0 ? (
        <div className="empty-state">
          <Icon name="users" size={48} /><div>Водителей пока нет</div>
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Имя</th>
                  <th>Логин</th>
                  <th>Поездок</th>
                  <th>Активность</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id}>
                    <td>{d.name}</td>
                    <td className="text-muted">{d.login}</td>
                    <td className="mono">{d.trips_count}</td>
                    <td className="text-muted">{d.last_activity ? formatDateTime(d.last_activity) : '—'}</td>
                    <td className="actions">
                      <button className="icon-btn" onClick={() => openEdit(d)} aria-label="Редактировать">
                        <Icon name="pencil" size={16} />
                      </button>
                      <button className="icon-btn" onClick={() => setResetting(d)} aria-label="Сбросить пароль">
                        <Icon name="key" size={16} />
                      </button>
                      <button className="icon-btn icon-btn--danger" onClick={() => setConfirmDelete(d)} aria-label="Удалить">
                        <Icon name="trash" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => !saving && setEditing(null)}
        title={editing === 'new' ? 'Новый водитель' : 'Редактировать водителя'}
      >
        <form onSubmit={save} className="stack">
          <div className="field">
            <label>Имя</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="field">
            <label>Логин</label>
            <input className="input" value={form.login} autoCapitalize="off" autoCorrect="off" onChange={(e) => setForm({ ...form, login: e.target.value })} required />
          </div>
          <div className="field">
            <label>{editing === 'new' ? 'Пароль' : 'Новый пароль (не обязательно)'}</label>
            <div className="row" style={{ gap: 8 }}>
              <input
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={editing === 'new'}
              />
              <button type="button" className="btn btn--secondary btn--small" onClick={() => setForm({ ...form, password: randomPassword() })}>
                Сгенерировать
              </button>
            </div>
          </div>
          <div className="field">
            <label>Телефон (необязательно)</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn--secondary" onClick={() => setEditing(null)} disabled={saving}>Отмена</button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Сохранить'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!resetting}
        onClose={() => setResetting(null)}
        title="Сбросить пароль?"
        footer={
          <>
            <button className="btn btn--secondary" onClick={() => setResetting(null)}>Отмена</button>
            <button className="btn" onClick={resetPassword}>Сбросить</button>
          </>
        }
      >
        {resetting && <p>Новый случайный пароль будет показан в уведомлении. Сообщите его водителю {resetting.name} лично.</p>}
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Удалить водителя?"
        footer={
          <>
            <button className="btn btn--secondary" onClick={() => setConfirmDelete(null)}>Отмена</button>
            <button className="btn btn--danger" onClick={() => remove(confirmDelete.id)}>Удалить</button>
          </>
        }
      >
        {confirmDelete && <p>Точно удалить водителя {confirmDelete.name} ({confirmDelete.login})?</p>}
      </Modal>
    </div>
  );
}
