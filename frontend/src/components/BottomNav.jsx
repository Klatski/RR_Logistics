import { NavLink } from 'react-router-dom';
import { Icon } from './Icons.jsx';
import { useAuth } from '../lib/auth.jsx';

function AvatarThumb({ url, name }) {
  const initials = name ? name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() : '?';
  if (url) {
    return <img src={url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid currentColor' }} />;
  }
  return (
    <div style={{
      width: 24, height: 24, borderRadius: '50%',
      background: 'var(--accent-soft)', color: 'var(--accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 700, border: '1.5px solid currentColor',
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export default function BottomNav() {
  const { user } = useAuth();
  return (
    <nav className="bottom-nav" aria-label="Главная навигация">
      <NavLink to="/" end>
        <Icon name="car" size={22} />
        <span>Авто</span>
      </NavLink>
      <NavLink to="/history">
        <Icon name="clock" size={22} />
        <span>История</span>
      </NavLink>
      <NavLink to="/profile">
        <AvatarThumb url={user?.avatar_url} name={user?.name} />
        <span>Профиль</span>
      </NavLink>
    </nav>
  );
}
