import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icons.jsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../components/Toast.jsx';
import { formatKm, formatDate, formatDuration } from '../../lib/format.js';
import NetworkBar from '../../components/NetworkBar.jsx';

const PAGE = 20;

export default function HistoryScreen() {
  const toast = useToast();
  const [trips, setTrips] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.trips.mine(0, PAGE);
      setTrips(r.trips);
      setTotal(r.total);
    } catch (e) {
      if (e.status !== 0) toast.error(e.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const r = await api.trips.mine(trips.length, PAGE);
      setTrips((prev) => [...prev, ...r.trips]);
      setTotal(r.total);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoadingMore(false);
    }
  }

  const hasMore = trips.length < total;

  return (
    <>
      <NetworkBar />
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
          <h1 style={{ margin: 0 }}>История поездок</h1>
          {!loading && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{total}</span>
          )}
        </div>

        {loading ? (
          <div className="stack">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 88 }} />)}
          </div>
        ) : trips.length === 0 ? (
          <div className="empty-state">
            <Icon name="clock" size={48} />
            <div>Поездок пока нет</div>
          </div>
        ) : (
          <>
            <div>
              {trips.map((t) => (
                <Link key={t.id} to={`/trip/${t.id}`} className="history-card">
                  <div className="row row--between">
                    <div>
                      <div style={{ fontWeight: 600 }}>{t.car?.name}</div>
                      <div className="text-muted" style={{ fontSize: 13 }}>{t.car?.plate_number}</div>
                    </div>
                    <div className="text-muted" style={{ fontSize: 13 }}>{formatDate(t.start_time)}</div>
                  </div>
                  <div className="row" style={{ marginTop: 10, gap: 16 }}>
                    <div>
                      <div className="text-muted" style={{ fontSize: 12 }}>Проехано</div>
                      <div className="mono" style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatKm(t.distance)}</div>
                    </div>
                    <div>
                      <div className="text-muted" style={{ fontSize: 12 }}>Длительность</div>
                      <div style={{ fontWeight: 600 }}>{formatDuration(t.start_time, t.end_time)}</div>
                    </div>
                    {t.refuel && (
                      <div>
                        <div className="text-muted" style={{ fontSize: 12 }}>Заправка</div>
                        <div className="text-success" style={{ fontWeight: 600 }}>Да</div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  marginTop: 12, width: '100%', height: 44,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', color: 'var(--text)',
                  fontSize: 14, cursor: loadingMore ? 'default' : 'pointer',
                  opacity: loadingMore ? 0.6 : 1,
                }}
              >
                {loadingMore ? 'Загрузка...' : `Загрузить ещё (осталось ${total - trips.length})`}
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}
