import { useEffect, useState, useCallback } from 'react';
import { Icon } from '../../components/Icons.jsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../components/Toast.jsx';
import {
  formatKm, formatMoney, formatDate, statusLabel,
} from '../../lib/format.js';

const filterCtrl = {
  height: 36, padding: '0 10px',
  background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', color: 'var(--text)',
  fontSize: 13, outline: 'none', cursor: 'pointer',
  appearance: 'none', WebkitAppearance: 'none', minWidth: 0,
};

function getMonthRange(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  const from = new Date(d.getFullYear(), d.getMonth(), 1);
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const fmt = (x) => x.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

const PRESETS = [
  { label: 'Этот месяц', value: 'this' },
  { label: 'Прошлый месяц', value: 'prev' },
  { label: 'Период', value: 'custom' },
];

export default function DashboardScreen() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [preset, setPreset] = useState('this');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);

  const getQuery = useCallback(() => {
    if (preset === 'this') return getMonthRange(0);
    if (preset === 'prev') return getMonthRange(-1);
    return custom;
  }, [preset, custom]);

  const load = useCallback(() => {
    setLoading(true);
    api.dashboard.get(getQuery())
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getQuery]);

  useEffect(() => { load(); }, [load]);

  const distanceLabel = preset === 'this' ? 'Пробег за месяц'
    : preset === 'prev' ? 'Пробег (пр. месяц)' : 'Пробег за период';
  const fuelLabel = preset === 'this' ? 'Топливо за месяц'
    : preset === 'prev' ? 'Топливо (пр. месяц)' : 'Топливо за период';

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head">
        <h1>Дашборд</h1>
      </div>

      {/* Фильтр периода */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
        padding: '10px 14px',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
      }}>
        <Icon name="filter" size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              style={{
                height: 30, padding: '0 10px', borderRadius: 'var(--radius-sm)',
                fontSize: 12, fontWeight: preset === p.value ? 700 : 400, cursor: 'pointer',
                background: preset === p.value ? 'var(--accent)' : 'var(--bg)',
                color: preset === p.value ? '#fff' : 'var(--text)',
                border: preset === p.value ? '1px solid var(--accent)' : '1px solid var(--border)',
                transition: 'all .15s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="date" style={{ ...filterCtrl, width: 130 }}
              value={custom.from}
              onChange={(e) => setCustom((p) => ({ ...p, from: e.target.value }))}
              title="От"
            />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
            <input
              type="date" style={{ ...filterCtrl, width: 130 }}
              value={custom.to}
              onChange={(e) => setCustom((p) => ({ ...p, to: e.target.value }))}
              title="До"
            />
          </div>
        )}
      </div>

      {loading || !data ? (
        <div className="metrics-grid">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 80 }} />)}
        </div>
      ) : (
        <>
          <div className="metrics-grid">
            <div className="card metric-card">
              <div className="metric-card__icon"><Icon name="car" size={20} /></div>
              <div className="metric-card__label">Всего машин</div>
              <div className="metric-card__value">{data.metrics.totalCars}</div>
            </div>
            <div className="card metric-card">
              <div className="metric-card__icon"><Icon name="route" size={20} /></div>
              <div className="metric-card__label">Активных поездок</div>
              <div className="metric-card__value">{data.metrics.activeTrips}</div>
            </div>
            <div className="card metric-card">
              <div className="metric-card__icon"><Icon name="gauge" size={20} /></div>
              <div className="metric-card__label">{distanceLabel}</div>
              <div className="metric-card__value">{formatKm(data.metrics.monthDistance)}</div>
            </div>
            <div className="card metric-card">
              <div className="metric-card__icon"><Icon name="fuel" size={20} /></div>
              <div className="metric-card__label">{fuelLabel}</div>
              <div className="metric-card__value">{formatMoney(data.metrics.monthFuel)}</div>
            </div>
          </div>

          <div>
            <h2>Последние поездки</h2>
            {data.lastTrips.length === 0 ? (
              <div className="empty-state">Поездок ещё не было</div>
            ) : (
              <div className="table-wrap">
                <div className="table-scroll">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Дата</th>
                        <th>Водитель</th>
                        <th>Машина</th>
                        <th>Пробег</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.lastTrips.map((t) => (
                        <tr key={t.id}>
                          <td>{formatDate(t.start_time)}</td>
                          <td>{t.driver_name}</td>
                          <td>{t.car_name} · <span className="text-muted">{t.plate_number}</span></td>
                          <td className="mono">{t.distance != null ? formatKm(t.distance) : '—'}</td>
                          <td><span className={`badge badge--${t.status}`}>{statusLabel(t.status)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
