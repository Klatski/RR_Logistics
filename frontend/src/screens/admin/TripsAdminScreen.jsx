import { useEffect, useState, useCallback } from 'react';
import { Icon } from '../../components/Icons.jsx';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../components/Toast.jsx';
import {
  formatKm, formatDateTime, formatDuration, formatMoney, formatLiters, statusLabel,
} from '../../lib/format.js';

const EMPTY = { driver_id: '', car_id: '', from: '', to: '' };

const filterCtrl = {
  height: 36,
  padding: '0 10px',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
  minWidth: 0,
  transition: 'border-color .15s',
};

const inputStyle = {
  width: '100%', height: 40, padding: '0 10px',
  background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', color: 'var(--text)',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

export default function TripsAdminScreen() {
  const toast = useToast();
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [cars, setCars] = useState([]);
  const [filters, setFilters] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [edit, setEdit] = useState(null);
  const [editForm, setEditForm] = useState({ odometer_end: '', comment: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.trips.list(filters)
      .then((r) => setTrips(r.trips))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    Promise.all([api.drivers.list(), api.cars.list()])
      .then(([d, c]) => { setDrivers(d.drivers); setCars(c.cars); })
      .catch((e) => toast.error(e.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const hasFilters = Object.values(filters).some(Boolean);
  const f = (k) => (e) => setFilters((prev) => ({ ...prev, [k]: e.target.value }));

  function openEdit(trip) {
    setEdit(trip);
    setEditForm({
      odometer_end: trip.odometer_end ?? '',
      comment: trip.comment ?? '',
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await api.trips.update(edit.id, {
        odometer_end: editForm.odometer_end !== '' ? Number(editForm.odometer_end) : undefined,
        comment: editForm.comment,
      });
      setTrips((prev) => prev.map((t) => t.id === updated.trip.id ? updated.trip : t));
      if (detail?.id === updated.trip.id) setDetail(updated.trip);
      setEdit(null);
      toast.success('Поездка обновлена');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 14 }}>

      <div className="page-head" style={{ alignItems: 'baseline' }}>
        <h1 style={{ marginBottom: 0 }}>Журнал поездок</h1>
        {!loading && (
          <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>
            {trips.length} {trips.length === 1 ? 'запись' : trips.length < 5 ? 'записи' : 'записей'}
          </span>
        )}
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
        padding: '10px 14px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
      }}>
        <Icon name="filter" size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />

        <select style={filterCtrl} value={filters.driver_id} onChange={f('driver_id')}>
          <option value="">Все водители</option>
          {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select style={filterCtrl} value={filters.car_id} onChange={f('car_id')}>
          <option value="">Все машины</option>
          {cars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="date"
            style={{ ...filterCtrl, width: 130 }}
            value={filters.from}
            onChange={f('from')}
            title="От"
          />
          <span style={{ color: 'var(--text-muted)', fontSize: 12, flexShrink: 0 }}>—</span>
          <input
            type="date"
            style={{ ...filterCtrl, width: 130 }}
            value={filters.to}
            onChange={f('to')}
            title="До"
          />
        </div>

        {hasFilters && (
          <button
            onClick={() => setFilters(EMPTY)}
            style={{
              height: 36, padding: '0 10px', borderRadius: 'var(--radius-sm)',
              background: 'var(--danger-soft)', border: '1px solid var(--danger)',
              color: 'var(--danger)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
            }}
          >
            <Icon name="x" size={13} /> Сбросить
          </button>
        )}
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 120 }} />
      ) : trips.length === 0 ? (
        <div className="empty-state">Нет поездок по выбранным фильтрам</div>
      ) : (
        <div className="table-wrap">
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Водитель</th>
                  <th>Машина</th>
                  <th>Одометр</th>
                  <th>Пробег</th>
                  <th>Заправка</th>
                  <th>Мойка</th>
                  <th>Статус</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => (
                  <tr key={t.id}>
                    <td>{formatDateTime(t.start_time)}</td>
                    <td>{t.driver?.name}</td>
                    <td>{t.car?.name} · <span className="text-muted">{t.car?.plate_number}</span></td>
                    <td className="mono">{t.odometer_start} → {t.odometer_end ?? '...'}</td>
                    <td className="mono">{t.distance != null ? formatKm(t.distance) : '—'}</td>
                    <td>{t.refuel ? <span className="text-success">Да</span> : <span className="text-muted">—</span>}</td>
                    <td>{t.carwash ? <span className="text-success">Да</span> : <span className="text-muted">—</span>}</td>
                    <td><span className={`badge badge--${t.status}`}>{statusLabel(t.status)}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="icon-btn" onClick={() => setDetail(t)} aria-label="Детали">
                          <Icon name="route" size={16} />
                        </button>
                        {t.status === 'completed' && (
                          <button className="icon-btn" onClick={() => openEdit(t)} aria-label="Редактировать">
                            <Icon name="pencil" size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Модалка деталей */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Детали поездки">
        {detail && (
          <div className="stack">
            <div>
              <div style={{ fontWeight: 600 }}>{detail.car?.name} · {detail.car?.plate_number}</div>
              <div className="text-muted" style={{ fontSize: 13 }}>Водитель: {detail.driver?.name}</div>
            </div>
            <div className="summary-row"><span className="summary-row__label">Старт</span><span className="summary-row__value">{formatDateTime(detail.start_time)}</span></div>
            <div className="summary-row"><span className="summary-row__label">Финиш</span><span className="summary-row__value">{detail.end_time ? formatDateTime(detail.end_time) : '—'}</span></div>
            <div className="summary-row"><span className="summary-row__label">Длительность</span><span className="summary-row__value">{detail.end_time ? formatDuration(detail.start_time, detail.end_time) : '—'}</span></div>
            <div className="summary-row"><span className="summary-row__label">Проехано</span><span className="summary-row__value mono text-accent">{detail.distance != null ? formatKm(detail.distance) : '—'}</span></div>
            <div className="summary-row"><span className="summary-row__label">Одометр</span><span className="summary-row__value mono">{detail.odometer_start} → {detail.odometer_end ?? '—'}</span></div>
            {detail.comment && (
              <div>
                <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>Комментарий</div>
                <div>{detail.comment}</div>
              </div>
            )}
            <div className="row" style={{ gap: 8 }}>
              {detail.start_photo_url && !detail.start_photo_url.startsWith('local:') && (
                <a href={detail.start_photo_url} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                  <img src={detail.start_photo_url} alt="Старт" style={{ width: '100%', borderRadius: 8 }} />
                </a>
              )}
              {detail.end_photo_url && !detail.end_photo_url.startsWith('local:') && (
                <a href={detail.end_photo_url} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                  <img src={detail.end_photo_url} alt="Финиш" style={{ width: '100%', borderRadius: 8 }} />
                </a>
              )}
            </div>
            {detail.refuel && (
              <div className="card">
                <h3>Заправка</h3>
                {detail.refuel.amount != null && <div className="summary-row"><span className="summary-row__label">Сумма</span><span className="summary-row__value">{formatMoney(detail.refuel.amount)}</span></div>}
                {detail.refuel.liters != null && <div className="summary-row"><span className="summary-row__label">Литры</span><span className="summary-row__value">{formatLiters(detail.refuel.liters)}</span></div>}
                <div className="row" style={{ marginTop: 10, gap: 8 }}>
                  {detail.refuel.fuel_photo_url && !detail.refuel.fuel_photo_url.startsWith('local:') && (
                    <a href={detail.refuel.fuel_photo_url} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                      <img src={detail.refuel.fuel_photo_url} alt="Бак" style={{ width: '100%', borderRadius: 8 }} />
                    </a>
                  )}
                  {detail.refuel.receipt_photo_url && !detail.refuel.receipt_photo_url.startsWith('local:') && (
                    <a href={detail.refuel.receipt_photo_url} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                      <img src={detail.refuel.receipt_photo_url} alt="Чек" style={{ width: '100%', borderRadius: 8 }} />
                    </a>
                  )}
                </div>
              </div>
            )}
            {detail.carwash && (
              <div className="card">
                <h3>Автомойка</h3>
                {detail.carwash.amount != null && <div className="summary-row"><span className="summary-row__label">Сумма</span><span className="summary-row__value">{formatMoney(detail.carwash.amount)}</span></div>}
                <div className="row" style={{ marginTop: 10, gap: 8 }}>
                  {detail.carwash.car_photo_url && !detail.carwash.car_photo_url.startsWith('local:') && (
                    <a href={detail.carwash.car_photo_url} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                      <img src={detail.carwash.car_photo_url} alt="Машина" style={{ width: '100%', borderRadius: 8 }} />
                    </a>
                  )}
                  {detail.carwash.receipt_photo_url && !detail.carwash.receipt_photo_url.startsWith('local:') && (
                    <a href={detail.carwash.receipt_photo_url} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                      <img src={detail.carwash.receipt_photo_url} alt="Чек" style={{ width: '100%', borderRadius: 8 }} />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Модалка редактирования */}
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title="Редактировать поездку"
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setEdit(null)}>Отмена</button>
            <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </>
        }
      >
        {edit && (
          <div className="stack">
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Одометр (финиш)</div>
              <input
                type="number"
                style={inputStyle}
                value={editForm.odometer_end}
                onChange={(e) => setEditForm((p) => ({ ...p, odometer_end: e.target.value }))}
                placeholder={`Текущее: ${edit.odometer_end ?? '—'}`}
                min={edit.odometer_start}
              />
              {editForm.odometer_end !== '' && editForm.odometer_end >= edit.odometer_start && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Пробег: {formatKm(editForm.odometer_end - edit.odometer_start)}
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Комментарий</div>
              <textarea
                style={{ ...inputStyle, height: 80, padding: '8px 10px', resize: 'vertical' }}
                value={editForm.comment}
                onChange={(e) => setEditForm((p) => ({ ...p, comment: e.target.value }))}
                placeholder="Необязательно"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
