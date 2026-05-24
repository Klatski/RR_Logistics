import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Icon } from '../../components/Icons.jsx';
import PhotoCapture from '../../components/PhotoCapture.jsx';
import NetworkBar from '../../components/NetworkBar.jsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../components/Toast.jsx';
import { formatKm } from '../../lib/format.js';
import {
  savePendingAction,
  savePendingPhoto,
  uuid,
} from '../../lib/offline.js';

export default function EndTripScreen() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [trip, setTrip] = useState(null);
  const [odometer, setOdometer] = useState('');
  const [odoPhoto, setOdoPhoto] = useState(null);
  const [comment, setComment] = useState('');
  const [hasRefuel, setHasRefuel] = useState(false);
  const [amount, setAmount] = useState('');
  const [liters, setLiters] = useState('');
  const [fuelPhoto, setFuelPhoto] = useState(null);
  const [receiptPhoto, setReceiptPhoto] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.trips.get(tripId)
      .then((r) => {
        if (r.trip.status !== 'active') {
          navigate('/', { replace: true });
          return;
        }
        setTrip(r.trip);
      })
      .catch((e) => toast.error(e.message));
  }, [tripId, navigate, toast]);

  const distance = useMemo(() => {
    if (!trip || !odometer) return null;
    const d = Number(odometer) - Number(trip.odometer_start);
    return Number.isFinite(d) ? d : null;
  }, [trip, odometer]);

  function validate() {
    if (!trip) return false;
    if (!odometer) { setError('Введите показание одометра'); return false; }
    if (Number(odometer) < Number(trip.odometer_start)) {
      setError('Пробег не может быть меньше начального');
      return false;
    }
    if (!odoPhoto) { toast.error('Сфотографируйте одометр'); return false; }
    setError(null);
    return true;
  }

  async function uploadOrLocal(blob, filename) {
    if (navigator.onLine) {
      const r = await api.uploads.upload(blob, filename);
      return { url: r.url, pending: false };
    }
    const localId = uuid();
    await savePendingPhoto(localId, blob);
    return { url: `local:${localId}`, pending: true };
  }

  async function onFinish() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const endUp = await uploadOrLocal(odoPhoto.blob, 'odo-end.jpg');
      let fuelUp = null, receiptUp = null;
      if (hasRefuel) {
        if (fuelPhoto) fuelUp = await uploadOrLocal(fuelPhoto.blob, 'fuel.jpg');
        if (receiptPhoto) receiptUp = await uploadOrLocal(receiptPhoto.blob, 'receipt.jpg');
      }
      const body = {
        odometer_end: Number(odometer),
        end_photo_url: endUp.url,
        comment: comment.trim() || null,
        refuel: hasRefuel
          ? {
              amount: amount ? Number(amount) : null,
              liters: liters ? Number(liters) : null,
              fuel_photo_url: fuelUp ? fuelUp.url : null,
              receipt_photo_url: receiptUp ? receiptUp.url : null,
            }
          : null,
      };

      const hasPending =
        endUp.pending || (fuelUp && fuelUp.pending) || (receiptUp && receiptUp.pending);

      if (!navigator.onLine || hasPending) {
        await savePendingAction(uuid(), {
          path: `/trips/${tripId}/finish`,
          method: 'POST',
          body,
          photoFields: ['end_photo_url'],
          refuelPhotoFields: ['fuel_photo_url', 'receipt_photo_url'],
        });
        toast.show('Поездка сохранена локально и отправится при появлении сети', 'info');
        navigate('/', { replace: true });
        return;
      }

      const res = await api.trips.finish(tripId, body);
      navigate(`/trip/result/${res.trip.id}`, { replace: true });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

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
      <div className="page">
        <div className="row" style={{ alignItems: 'center', gap: 8 }}>
          <Link to="/active" className="btn btn--ghost" aria-label="Назад">
            <Icon name="back" size={22} />
          </Link>
          <h2 style={{ margin: 0 }}>Завершение поездки</h2>
        </div>

        <div className="card">
          <div style={{ fontWeight: 600 }}>{trip.car?.name} · {trip.car?.plate_number}</div>
          <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
            Одометр на старте: <span className="mono">{formatKm(trip.odometer_start)}</span>
          </div>
        </div>

        <div className="section-title">Одометр</div>
        <div className="field">
          <label>Показание одометра</label>
          <input
            type="number"
            inputMode="numeric"
            className={`input ${error ? 'input--error' : ''}`}
            value={odometer}
            onChange={(e) => { setOdometer(e.target.value); setError(null); }}
            placeholder="Введите финальный пробег"
          />
          {error && <div className="error">{error}</div>}
          {distance != null && distance >= 0 && (
            <div className="hint text-accent">Проехано: <span className="mono">{distance.toLocaleString('ru-RU')} км</span></div>
          )}
        </div>
        <div className="field">
          <label>Фото одометра</label>
          <PhotoCapture value={odoPhoto} onChange={setOdoPhoto} label="Сфотографировать одометр" />
        </div>

        <div className="section-title" style={{ marginTop: 8 }}>Заправка</div>
        <label className="toggle">
          <input type="checkbox" checked={hasRefuel} onChange={(e) => setHasRefuel(e.target.checked)} />
          <span className="toggle__track" />
          <span>Была заправка?</span>
        </label>

        {hasRefuel && (
          <div className="stack" style={{ marginTop: 4 }}>
            <div className="field">
              <label>Фото уровня бензобака</label>
              <PhotoCapture value={fuelPhoto} onChange={setFuelPhoto} label="Сфотографировать уровень топлива" />
            </div>
            <div className="field">
              <label>Фото чека АЗС</label>
              <PhotoCapture value={receiptPhoto} onChange={setReceiptPhoto} label="Сфотографировать чек АЗС" />
            </div>
            <div className="row" style={{ gap: 10 }}>
              <div className="field" style={{ flex: 1 }}>
                <label>Сумма, ₸</label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Литры</label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="input"
                  value={liters}
                  onChange={(e) => setLiters(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        )}

        <div className="section-title" style={{ marginTop: 8 }}>Комментарий</div>
        <div className="field">
          <textarea
            className="textarea"
            placeholder="Комментарий (необязательно)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </div>

        <button
          className="btn btn--full btn--lg"
          onClick={onFinish}
          disabled={submitting || !odometer || !odoPhoto}
        >
          {submitting ? <span className="spinner" /> : 'Завершить'}
        </button>
      </div>
    </>
  );
}
