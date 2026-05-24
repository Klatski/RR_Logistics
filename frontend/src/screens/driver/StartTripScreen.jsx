import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Icon } from '../../components/Icons.jsx';
import PhotoCapture from '../../components/PhotoCapture.jsx';
import Modal from '../../components/Modal.jsx';
import NetworkBar from '../../components/NetworkBar.jsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../components/Toast.jsx';
import { formatKm } from '../../lib/format.js';
import {
  savePendingAction,
  savePendingPhoto,
  uuid,
} from '../../lib/offline.js';

export default function StartTripScreen() {
  const { carId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [car, setCar] = useState(null);
  const [odometer, setOdometer] = useState('');
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.cars.get(carId)
      .then((r) => setCar(r.car))
      .catch((e) => toast.error(e.message));
  }, [carId, toast]);

  function validate() {
    if (!car) return false;
    if (!odometer) { setError('Введите показание одометра'); return false; }
    const value = Number(odometer);
    if (Number.isNaN(value)) { setError('Введите число'); return false; }
    if (value < Number(car.current_odometer)) {
      setError('Пробег не может быть меньше начального');
      return false;
    }
    if (!photo || !photo.blob) {
      toast.error('Сфотографируйте одометр');
      return false;
    }
    setError(null);
    return true;
  }

  async function onConfirm() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      let startPhotoUrl;
      if (navigator.onLine) {
        const up = await api.uploads.upload(photo.blob, 'odo-start.jpg');
        startPhotoUrl = up.url;
      } else {
        const localId = uuid();
        await savePendingPhoto(localId, photo.blob);
        startPhotoUrl = `local:${localId}`;
        await savePendingAction(uuid(), {
          path: '/trips/start',
          method: 'POST',
          body: {
            car_id: Number(carId),
            odometer_start: Number(odometer),
            start_photo_url: startPhotoUrl,
          },
          photoFields: ['start_photo_url'],
        });
        toast.show('Поездка сохранена локально и отправится при появлении сети', 'info');
        navigate('/', { replace: true });
        return;
      }
      await api.trips.start({
        car_id: Number(carId),
        odometer_start: Number(odometer),
        start_photo_url: startPhotoUrl,
      });
      navigate('/active', { replace: true });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
      setConfirm(false);
    }
  }

  if (!car) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 80 }} />
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  return (
    <>
      <NetworkBar />
      <div className="page">
        <div className="row" style={{ alignItems: 'center', gap: 8 }}>
          <Link to="/" className="btn btn--ghost" aria-label="Назад">
            <Icon name="back" size={22} />
          </Link>
          <h2 style={{ margin: 0 }}>Начало поездки</h2>
        </div>

        <div className="card">
          <div className="row" style={{ alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 12, background: 'var(--accent-soft)',
              color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Icon name="car" size={28} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{car.name}</div>
              <div className="text-muted" style={{ fontSize: 13 }}>{car.plate_number}</div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="text-muted" style={{ fontSize: 13 }}>Текущий пробег по системе</div>
            <div className="mono" style={{ color: 'var(--accent)', fontSize: 28, fontWeight: 700 }}>
              {formatKm(car.current_odometer)}
            </div>
          </div>
        </div>

        <div className="field">
          <label>Показание одометра</label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            className={`input ${error ? 'input--error' : ''}`}
            value={odometer}
            onChange={(e) => { setOdometer(e.target.value); setError(null); }}
            placeholder="Введите текущий пробег"
          />
          {error && <div className="error">{error}</div>}
        </div>

        <div className="field">
          <label>Фото одометра</label>
          <PhotoCapture
            value={photo}
            onChange={setPhoto}
            label="Сфотографировать одометр"
            hint="Камера откроется автоматически"
          />
        </div>

        <button
          className="btn btn--full btn--lg"
          onClick={() => validate() && setConfirm(true)}
          disabled={submitting || !odometer || !photo}
        >
          Начать поездку
        </button>
      </div>

      <Modal
        open={confirm}
        onClose={() => !submitting && setConfirm(false)}
        title="Начать поездку?"
        footer={
          <>
            <button className="btn btn--secondary" onClick={() => setConfirm(false)} disabled={submitting}>Отмена</button>
            <button className="btn" onClick={onConfirm} disabled={submitting}>
              {submitting ? <span className="spinner" /> : 'Подтвердить'}
            </button>
          </>
        }
      >
        <p>Начать поездку на {car.name} ({car.plate_number})?</p>
      </Modal>
    </>
  );
}
