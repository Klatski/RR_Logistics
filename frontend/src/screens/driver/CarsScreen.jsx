import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icons.jsx';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useToast } from '../../components/Toast.jsx';
import { formatKm, statusLabel } from '../../lib/format.js';
import NetworkBar from '../../components/NetworkBar.jsx';

const STATUS_ORDER = { available: 0, in_trip: 1, maintenance: 2 };
const STATUS_COLOR = { available: 'var(--success)', in_trip: 'var(--danger)', maintenance: 'var(--warning)' };

function CarCard({ car }) {
  const disabled = car.status !== 'available';
  const borderColor = STATUS_COLOR[car.status] || 'var(--border)';

  const inner = (
    <div
      style={{
        background: 'var(--bg-card)',
        border: `2px solid ${borderColor}`,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: `0 0 0 1px ${borderColor}22`,
        opacity: disabled ? 0.6 : 1,
        transition: 'transform 0.1s',
      }}
    >
      {/* Фото или заглушка */}
      <div style={{
        width: '100%',
        aspectRatio: '16/9',
        background: 'var(--bg)',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {car.photo_url ? (
          <img
            src={car.photo_url}
            alt={car.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            color: 'var(--text-muted)',
          }}>
            <Icon name="car" size={48} />
          </div>
        )}

        {/* Статус-бейдж поверх фото — тёмный фон чтобы был виден на любой картинке */}
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 999,
            lineHeight: 1,
            background: 'rgba(13,17,23,0.75)',
            backdropFilter: 'blur(6px)',
            color: STATUS_COLOR[car.status],
            border: `1px solid ${STATUS_COLOR[car.status]}55`,
          }}>
            {statusLabel(car.status)}
          </span>
        </div>
      </div>

      {/* Информация под фото */}
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{car.name}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>{car.plate_number}</div>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
        }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Пробег</span>
          <span className="mono" style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 18 }}>
            {formatKm(car.current_odometer)}
          </span>
        </div>
      </div>
    </div>
  );

  if (disabled) {
    return <div style={{ cursor: 'not-allowed' }}>{inner}</div>;
  }
  return (
    <Link
      to={`/trip/start/${car.id}`}
      style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
      onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = ''; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
    >
      {inner}
    </Link>
  );
}

export default function CarsScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.cars.list();
      // Доступные — первые, потом in_trip, потом maintenance
      const sorted = [...res.cars].sort(
        (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
      );
      setCars(sorted);
    } catch (e) {
      if (e.status !== 0) toast.error(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    api.trips.active()
      .then((r) => {
        if (cancelled) return;
        if (r.trip) navigate('/active', { replace: true });
        else load();
      })
      .catch(() => load());
    return () => { cancelled = true; };
  }, [navigate, load]);

  function handleRefresh() {
    setRefreshing(true);
    load();
  }

  return (
    <>
      <NetworkBar />
      <div className="page">
        <div className="row row--between" style={{ alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--accent-soft)', color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon name="car" size={20} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.3px' }}>RR Logistics</div>
          </div>
          <button className="btn btn--ghost" onClick={handleRefresh} aria-label="Обновить">
            <Icon name={refreshing ? 'sync' : 'refresh'} size={20} />
          </button>
        </div>

        <h2>Автомобили</h2>

        {loading ? (
          <div className="stack">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 220, borderRadius: 16 }} />
            ))}
          </div>
        ) : cars.length === 0 ? (
          <div className="empty-state">
            <Icon name="car" size={48} />
            <div>Машин пока нет</div>
          </div>
        ) : (
          <div className="stack">
            {cars.map((car) => <CarCard key={car.id} car={car} />)}
          </div>
        )}
      </div>
    </>
  );
}
