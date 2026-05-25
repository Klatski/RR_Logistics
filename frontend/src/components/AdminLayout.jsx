import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Icon } from './Icons.jsx';
import { useAuth } from '../lib/auth.jsx';
import Modal from './Modal.jsx';

const NAV = [
  { to: '/admin', icon: 'chart', label: 'Дашборд', end: true },
  { to: '/admin/cars', icon: 'car', label: 'Автомобили' },
  { to: '/admin/drivers', icon: 'users', label: 'Водители' },
  { to: '/admin/trips', icon: 'route', label: 'Поездки' },
  { to: '/admin/refuels', icon: 'fuel', label: 'Заправки' },
  { to: '/admin/carwashes', icon: 'wash', label: 'Автомойки' },
  { to: '/admin/profile', icon: 'user', label: 'Профиль' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  function requestLogout() {
    setDrawer(false);
    setConfirmLogout(true);
  }

  function doLogout() {
    setConfirmLogout(false);
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar__logo">
          <Icon name="car" size={20} /> RR Logistics
        </div>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar__item ${isActive ? 'active' : ''}`}
          >
            <Icon name={item.icon} size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <div className="sidebar__footer">
          <div style={{ padding: '8px 12px', fontSize: 13 }}>
            <div style={{ fontWeight: 600 }}>{user?.name}</div>
            <div className="text-muted" style={{ fontSize: 12 }}>{user?.login}</div>
          </div>
          <button type="button" className="sidebar__item" onClick={requestLogout}>
            <Icon name="logout" size={18} />
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      <div className={`drawer-backdrop ${drawer ? 'open' : ''}`} onClick={() => setDrawer(false)} />
      <aside className={`drawer ${drawer ? 'open' : ''}`}>
        <div className="sidebar__logo">
          <Icon name="car" size={20} /> RR Logistics
        </div>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setDrawer(false)}
            className={({ isActive }) => `sidebar__item ${isActive ? 'active' : ''}`}
          >
            <Icon name={item.icon} size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <div className="sidebar__footer">
          <div style={{ padding: '8px 12px', fontSize: 13 }}>
            <div style={{ fontWeight: 600 }}>{user?.name}</div>
            <div className="text-muted" style={{ fontSize: 12 }}>{user?.login}</div>
          </div>
          <button type="button" className="sidebar__item" onClick={requestLogout}>
            <Icon name="logout" size={18} />
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="mobile-header">
          <button className="btn btn--ghost" onClick={() => setDrawer(true)} aria-label="Меню">
            <Icon name="menu" size={20} />
          </button>
          <div className="mobile-header__title">RR Logistics</div>
          <button className="btn btn--ghost" onClick={requestLogout} aria-label="Выйти">
            <Icon name="logout" size={18} />
          </button>
        </header>
        <div className="page page--admin">
          <Outlet />
        </div>
      </main>

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
