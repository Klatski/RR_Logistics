import { useEffect, useState, useCallback } from 'react';
import { Icon } from '../../components/Icons.jsx';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../components/Toast.jsx';
import { formatDate, formatMoney } from '../../lib/format.js';

const EMPTY = { car_id: '', from: '', to: '' };

const filterCtrl = {
  height: 36, padding: '0 10px',
  background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', color: 'var(--text)',
  fontSize: 13, outline: 'none', cursor: 'pointer',
  appearance: 'none', WebkitAppearance: 'none', minWidth: 0,
};

const inputStyle = {
  width: '100%', height: 40, padding: '0 10px',
  background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', color: 'var(--text)',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

export default function CarwashesAdminScreen() {
  const toast = useToast();
  const [data, setData] = useState({ carwashes: [], totals: { amount: 0 } });
  const [cars, setCars] = useState([]);
  const [filters, setFilters] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);
  const [editForm, setEditForm] = useState({ amount: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.carwashes.list(filters)
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    api.cars.list().then((r) => setCars(r.cars)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const hasFilters = Object.values(filters).some(Boolean);
  const f = (k) => (e) => setFilters((prev) => ({ ...prev, [k]: e.target.value }));

  function openEdit(carwash) {
    setEdit(carwash);
    setEditForm({ amount: carwash.amount ?? '' });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await api.carwashes.update(edit.id, {
        amount: editForm.amount !== '' ? Number(editForm.amount) : null,
      });
      setData((prev) => {
        const carwashes = prev.carwashes.map((r) => r.id === updated.carwash.id ? updated.carwash : r);
        const totals = carwashes.reduce(
          (a, r) => ({ amount: a.amount + (r.amount || 0) }),
          { amount: 0 }
        );
        return { carwashes, totals };
      });
      setEdit(null);
      toast.success('Мойка обновлена');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="page-head" style={{ alignItems: 'baseline' }}>
        <h1 style={{ marginBottom: 0 }}>Отчёт по автомойкам</h1>
        {!loading && (
          <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>
            {data.carwashes.length} записей
          </span>
        )}
      </div>

      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
        padding: '10px 14px',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
      }}>
        <Icon name="filter" size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />

        <select style={filterCtrl} value={filters.car_id} onChange={f('car_id')}>
          <option value="">Все машины</option>
          {cars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="date" style={{ ...filterCtrl, width: 130 }} value={filters.from} onChange={f('from')} title="От" />
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
          <input type="date" style={{ ...filterCtrl, width: 130 }} value={filters.to} onChange={f('to')} title="До" />
        </div>

        {hasFilters && (
          <button
            onClick={() => setFilters(EMPTY)}
            style={{
              height: 36, padding: '0 10px', borderRadius: 'var(--radius-sm)',
              background: 'var(--danger-soft)', border: '1px solid var(--danger)',
              color: 'var(--danger)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <Icon name="x" size={13} /> Сбросить
          </button>
        )}
      </div>

      <div className="metrics-grid">
        <div className="card metric-card">
          <div className="metric-card__label">Итого сумма</div>
          <div className="metric-card__value text-accent">{formatMoney(data.totals.amount)}</div>
        </div>
        <div className="card metric-card">
          <div className="metric-card__label">Кол-во моек</div>
          <div className="metric-card__value">{data.carwashes.length}</div>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 120 }} />
      ) : data.carwashes.length === 0 ? (
        <div className="empty-state">Нет моек по выбранным фильтрам</div>
      ) : (
        <div className="table-wrap">
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Машина</th>
                  <th>Водитель</th>
                  <th>Сумма</th>
                  <th>Машина (фото)</th>
                  <th>Чек</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.carwashes.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDate(r.created_at)}</td>
                    <td>{r.car_name} · <span className="text-muted">{r.plate_number}</span></td>
                    <td>{r.driver_name}</td>
                    <td className="mono">{r.amount != null ? formatMoney(r.amount) : '—'}</td>
                    <td>
                      {r.car_photo_url && !r.car_photo_url.startsWith('local:') ? (
                        <a href={r.car_photo_url} target="_blank" rel="noreferrer">Открыть</a>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      {r.receipt_photo_url && !r.receipt_photo_url.startsWith('local:') ? (
                        <a href={r.receipt_photo_url} target="_blank" rel="noreferrer">Открыть</a>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      <button className="icon-btn" onClick={() => openEdit(r)} aria-label="Редактировать">
                        <Icon name="pencil" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title="Редактировать мойку"
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
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {edit.car_name} · {edit.driver_name} · {formatDate(edit.created_at)}
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Сумма (₸)</div>
              <input
                type="number" step="1" min="0"
                style={inputStyle}
                value={editForm.amount}
                onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
                placeholder="Необязательно"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
