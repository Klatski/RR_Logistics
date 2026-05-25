import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icons.jsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../components/Toast.jsx';
import {
  formatKm, formatDateTime, formatDuration, formatMoney, formatLiters,
} from '../../lib/format.js';

export default function TripDetailsScreen() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [trip, setTrip] = useState(null);

  useEffect(() => {
    api.trips.get(tripId)
      .then((r) => setTrip(r.trip))
      .catch((e) => toast.error(e.message));
  }, [tripId, toast]);

  if (!trip) {
    return <div className="page"><div className="skeleton" style={{ height: 80 }} /></div>;
  }

  return (
    <div className="page">
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn--ghost" onClick={() => navigate(-1)} aria-label="Назад">
          <Icon name="back" size={22} />
        </button>
        <h2 style={{ margin: 0 }}>Детали поездки</h2>
      </div>

      <div className="card">
        <div style={{ fontWeight: 600 }}>{trip.car?.name} · {trip.car?.plate_number}</div>
        <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
          {formatDateTime(trip.start_time)} → {formatDateTime(trip.end_time)}
        </div>
        <div className="summary-row" style={{ marginTop: 12 }}>
          <span className="summary-row__label">Проехано</span>
          <span className="summary-row__value mono text-accent">{formatKm(trip.distance)}</span>
        </div>
        <div className="summary-row">
          <span className="summary-row__label">Длительность</span>
          <span className="summary-row__value">{formatDuration(trip.start_time, trip.end_time)}</span>
        </div>
        <div className="summary-row">
          <span className="summary-row__label">Одометр старт</span>
          <span className="summary-row__value mono">{formatKm(trip.odometer_start)}</span>
        </div>
        <div className="summary-row">
          <span className="summary-row__label">Одометр финиш</span>
          <span className="summary-row__value mono">{formatKm(trip.odometer_end)}</span>
        </div>
        {trip.comment && (
          <div style={{ marginTop: 10 }}>
            <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>Комментарий</div>
            <div>{trip.comment}</div>
          </div>
        )}
      </div>

      <div className="row" style={{ gap: 10, alignItems: 'stretch' }}>
        {trip.start_photo_url && !trip.start_photo_url.startsWith('local:') && (
          <a href={trip.start_photo_url} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
            <div className="card" style={{ padding: 8 }}>
              <div className="text-muted" style={{ fontSize: 12, marginBottom: 6 }}>Одометр старт</div>
              <img src={trip.start_photo_url} alt="" style={{ width: '100%', borderRadius: 8 }} />
            </div>
          </a>
        )}
        {trip.end_photo_url && !trip.end_photo_url.startsWith('local:') && (
          <a href={trip.end_photo_url} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
            <div className="card" style={{ padding: 8 }}>
              <div className="text-muted" style={{ fontSize: 12, marginBottom: 6 }}>Одометр финиш</div>
              <img src={trip.end_photo_url} alt="" style={{ width: '100%', borderRadius: 8 }} />
            </div>
          </a>
        )}
      </div>

      {trip.refuel && (
        <div className="card">
          <h3>Заправка</h3>
          {trip.refuel.amount != null && (
            <div className="summary-row"><span className="summary-row__label">Сумма</span><span className="summary-row__value">{formatMoney(trip.refuel.amount)}</span></div>
          )}
          {trip.refuel.liters != null && (
            <div className="summary-row"><span className="summary-row__label">Литры</span><span className="summary-row__value">{formatLiters(trip.refuel.liters)}</span></div>
          )}
          <div className="row" style={{ marginTop: 12, gap: 10 }}>
            {trip.refuel.fuel_photo_url && !trip.refuel.fuel_photo_url.startsWith('local:') && (
              <a href={trip.refuel.fuel_photo_url} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                <img src={trip.refuel.fuel_photo_url} alt="Бак" style={{ width: '100%', borderRadius: 8 }} />
              </a>
            )}
            {trip.refuel.receipt_photo_url && !trip.refuel.receipt_photo_url.startsWith('local:') && (
              <a href={trip.refuel.receipt_photo_url} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                <img src={trip.refuel.receipt_photo_url} alt="Чек" style={{ width: '100%', borderRadius: 8 }} />
              </a>
            )}
          </div>
        </div>
      )}

      {trip.carwash && (
        <div className="card">
          <h3>Автомойка</h3>
          {trip.carwash.amount != null && (
            <div className="summary-row"><span className="summary-row__label">Сумма</span><span className="summary-row__value">{formatMoney(trip.carwash.amount)}</span></div>
          )}
          <div className="row" style={{ marginTop: 12, gap: 10 }}>
            {trip.carwash.car_photo_url && !trip.carwash.car_photo_url.startsWith('local:') && (
              <a href={trip.carwash.car_photo_url} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                <img src={trip.carwash.car_photo_url} alt="Машина" style={{ width: '100%', borderRadius: 8 }} />
              </a>
            )}
            {trip.carwash.receipt_photo_url && !trip.carwash.receipt_photo_url.startsWith('local:') && (
              <a href={trip.carwash.receipt_photo_url} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                <img src={trip.carwash.receipt_photo_url} alt="Чек" style={{ width: '100%', borderRadius: 8 }} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
