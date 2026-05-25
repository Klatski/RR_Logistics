import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import { ToastProvider } from './components/Toast.jsx';
import Protected from './components/Protected.jsx';
import DriverLayout from './components/DriverLayout.jsx';
import AdminLayout from './components/AdminLayout.jsx';

import LoginScreen from './screens/driver/LoginScreen.jsx';
import CarsScreen from './screens/driver/CarsScreen.jsx';
import StartTripScreen from './screens/driver/StartTripScreen.jsx';
import ActiveTripScreen from './screens/driver/ActiveTripScreen.jsx';
import EndTripScreen from './screens/driver/EndTripScreen.jsx';
import TripResultScreen from './screens/driver/TripResultScreen.jsx';
import HistoryScreen from './screens/driver/HistoryScreen.jsx';
import TripDetailsScreen from './screens/driver/TripDetailsScreen.jsx';
import ProfileScreen from './screens/driver/ProfileScreen.jsx';

import DashboardScreen from './screens/admin/DashboardScreen.jsx';
import CarsAdminScreen from './screens/admin/CarsAdminScreen.jsx';
import DriversAdminScreen from './screens/admin/DriversAdminScreen.jsx';
import TripsAdminScreen from './screens/admin/TripsAdminScreen.jsx';
import RefuelsAdminScreen from './screens/admin/RefuelsAdminScreen.jsx';
import CarwashesAdminScreen from './screens/admin/CarwashesAdminScreen.jsx';
import ProfileAdminScreen from './screens/admin/ProfileAdminScreen.jsx';

import { syncPendingActions } from './lib/offline.js';

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/cars'} replace />;
}

function SyncOnFocus() {
  useEffect(() => {
    function trigger() {
      if (navigator.onLine) syncPendingActions().catch(() => {});
    }
    function onVisibility() {
      if (!document.hidden) trigger();
    }
    trigger();
    window.addEventListener('online', trigger);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('online', trigger);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <SyncOnFocus />
        <Routes>
          <Route path="/login" element={<LoginScreen />} />

          <Route
            element={
              <Protected role="driver">
                <DriverLayout />
              </Protected>
            }
          >
            <Route path="/" element={<CarsScreen />} />
            <Route path="/cars" element={<CarsScreen />} />
            <Route path="/active" element={<ActiveTripScreen />} />
            <Route path="/trip/start/:carId" element={<StartTripScreen />} />
            <Route path="/trip/finish/:tripId" element={<EndTripScreen />} />
            <Route path="/trip/result/:tripId" element={<TripResultScreen />} />
            <Route path="/trip/:tripId" element={<TripDetailsScreen />} />
            <Route path="/history" element={<HistoryScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
          </Route>

          <Route
            element={
              <Protected role="admin">
                <AdminLayout />
              </Protected>
            }
          >
            <Route path="/admin" element={<DashboardScreen />} />
            <Route path="/admin/cars" element={<CarsAdminScreen />} />
            <Route path="/admin/drivers" element={<DriversAdminScreen />} />
            <Route path="/admin/trips" element={<TripsAdminScreen />} />
            <Route path="/admin/refuels" element={<RefuelsAdminScreen />} />
            <Route path="/admin/carwashes" element={<CarwashesAdminScreen />} />
            <Route path="/admin/profile" element={<ProfileAdminScreen />} />
          </Route>

          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
