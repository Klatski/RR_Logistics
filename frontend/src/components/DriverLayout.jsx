import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav.jsx';

export default function DriverLayout() {
  return (
    <div className="app-shell">
      <Outlet />
      <BottomNav />
    </div>
  );
}
