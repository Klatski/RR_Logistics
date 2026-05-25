import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icons.jsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../components/Toast.jsx';
import { formatKm, formatMoney, formatLiters, formatDuration } from '../../lib/format.js';

export default function TripResultScreen() {
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
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 80 }} />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card text-center" style={{ paddingTop: 28 }}>
        <div className="success-circle">
          <Icon name="check" size={48} />
        </div>
        <h2 style={{ marginBottom: 6 }}>Поездка завершена</h2>
        <div className="text-muted" style={{ marginBottom: 20 }}>
          {trip.car?.name} · {trip.car?.plate_number}
        </div>

        <div className="summary-row">
          <span className="summary-row__label">Проехано</span>
          <span className="summary-row__value mono text-accent" style={{ fontSize: 18 }}>{formatKm(trip.distance)}</span>
        </div>
        <div className="summary-row">
          <span className="summary-row__label">Длительность</span>
          <span className="summary-row__value">{formatDuration(trip.start_time, trip.end_time)}</span>
        </div>
        {trip.refuel && (
          <>
            <div className="summary-row">
              <span className="summary-row__label">Заправка</span>
              <span className="summary-row__value text-success">Да</span>
            </div>
            {trip.refuel.amount != null && (
              <div className="summary-row">
                <span className="summary-row__label">Сумма</span>
                <span className="summary-row__value">{formatMoney(trip.refuel.amount)}</span>
              </div>
            )}
            {trip.refuel.liters != null && (
              <div className="summary-row">
                <span className="summary-row__label">Литры</span>
                <span className="summary-row__value">{formatLiters(trip.refuel.liters)}</span>
              </div>
            )}
          </>
        )}
        {trip.carwash && (
          <>
            <div className="summary-row">
              <span className="summary-row__label">Автомойка</span>
              <span className="summary-row__value text-success">Да</span>
            </div>
            {trip.carwash.amount != null && (
              <div className="summary-row">
                <span className="summary-row__label">Сумма мойки</span>
                <span className="summary-row__value">{formatMoney(trip.carwash.amount)}</span>
              </div>
            )}
          </>
        )}
      </div>

      <button className="btn btn--full btn--lg" onClick={() => navigate('/', { replace: true })}>
        Готово
      </button>
    </div>
  );
}
