import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/', (req, res) => {
  const { car_id, from, to } = req.query;
  let sql = `
    SELECT r.*, t.car_id, t.driver_id, t.start_time,
      c.name AS car_name, c.plate_number,
      u.name AS driver_name
    FROM refuels r
    JOIN trips t ON t.id = r.trip_id
    JOIN cars c ON c.id = t.car_id
    JOIN users u ON u.id = t.driver_id
    WHERE 1=1
  `;
  const params = [];
  if (car_id) { sql += ' AND t.car_id = ?'; params.push(car_id); }
  if (from) { sql += ' AND date(r.created_at) >= date(?)'; params.push(from); }
  if (to) { sql += ' AND date(r.created_at) <= date(?)'; params.push(to); }
  sql += ' ORDER BY datetime(r.created_at) DESC LIMIT 500';
  const refuels = db.prepare(sql).all(...params);
  const totals = refuels.reduce(
    (a, r) => ({ liters: a.liters + (r.liters || 0), amount: a.amount + (r.amount || 0) }),
    { liters: 0, amount: 0 }
  );
  res.json({ refuels, totals });
});

router.put('/:id', (req, res) => {
  const refuel = db.prepare('SELECT * FROM refuels WHERE id = ?').get(req.params.id);
  if (!refuel) return res.status(404).json({ error: 'Заправка не найдена' });

  const { liters, amount } = req.body || {};
  db.prepare('UPDATE refuels SET liters = ?, amount = ? WHERE id = ?').run(
    liters != null ? Number(liters) : refuel.liters,
    amount != null ? Number(amount) : refuel.amount,
    refuel.id
  );

  const updated = db.prepare(`
    SELECT r.*, t.car_id, t.driver_id, t.start_time,
      c.name AS car_name, c.plate_number, u.name AS driver_name
    FROM refuels r
    JOIN trips t ON t.id = r.trip_id
    JOIN cars c ON c.id = t.car_id
    JOIN users u ON u.id = t.driver_id
    WHERE r.id = ?
  `).get(refuel.id);
  res.json({ refuel: updated });
});

export default router;
