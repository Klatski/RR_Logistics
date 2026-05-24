import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { Icon } from '../../components/Icons.jsx';
import { useToast } from '../../components/Toast.jsx';
import NetworkBar from '../../components/NetworkBar.jsx';
import { formatKm } from '../../lib/format.js';

function formatHMS(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function ActiveTripScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const [trip, setTrip] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    api.trips.active().then((r) => {
      if (!r.trip) {
        navigate('/', { replace: true });
        return;
      }
      setTrip(r.trip);
    }).catch((e) => toast.error(e.message));
  }, [navigate, toast]);

  useEffect(() => {
    if (!trip) return;
    const start = new Date(
      trip.start_time.includes('T') ? trip.start_time : trip.start_time.replace(' ', 'T') + 'Z'
    ).getTime();
    function tick() { setElapsed(Date.now() - start); }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [trip]);

  if (!trip) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 120 }} />
      </div>
    );
  }

  return (
    <>
      <NetworkBar />
      {/* Полноэкранный layout без скролла */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100dvh - var(--bottom-nav-h))',
        padding: '16px 16px calc(16px)',
        gap: 12,
        overflow: 'hidden',
      }}>
        {/* Заголовок */}
        <div>
          <div className="text-muted" style={{ fontSize: 12, marginBottom: 2 }}>Активная поездка</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{trip.car?.name}</div>
          <div className="text-muted" style={{ fontSize: 13 }}>{trip.car?.plate_number}</div>
        </div>

        {/* Блок с таймером — растягивается на всё свободное место */}
        <div style={{
          flex: 1,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          minHeight: 0,
        }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Длительность</div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: 'var(--accent)',
            fontSize: 'clamp(36px, 12vw, 64px)',
            letterSpacing: 3,
          }}>
            {formatHMS(elapsed)}
          </div>
        </div>

        {/* Одометр — компактная строка */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span className="text-muted" style={{ fontSize: 13 }}>Одометр на старте</span>
          <span className="mono" style={{ fontWeight: 700, fontSize: 16 }}>
            {formatKm(trip.odometer_start)}
          </span>
        </div>

        {/* Кнопка завершить */}
        <button
          className="btn btn--full btn--lg btn--danger"
          onClick={() => navigate(`/trip/finish/${trip.id}`)}
        >
          Завершить поездку
        </button>
      </div>
    </>
  );
}
