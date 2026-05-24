import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const { car_id, from, to } = req.query;
    const params = [];
    let sql = `
      SELECT r.*, t.car_id, t.driver_id, t.start_time,
        c.name AS car_name, c.plate_number,
        u.name AS driver_name
      FROM refuels r
      JOIN trips t ON t.id = r.trip_id
      JOIN cars  c ON c.id = t.car_id
      JOIN users u ON u.id = t.driver_id
      WHERE 1=1
    `;

    if (car_id) { params.push(car_id); sql += ` AND t.car_id = $${params.length}`; }
    if (from)   { params.push(from);   sql += ` AND r.created_at::date >= $${params.length}::date`; }
    if (to)     { params.push(to);     sql += ` AND r.created_at::date <= $${params.length}::date`; }

    sql += ' ORDER BY r.created_at DESC LIMIT 500';

    const { rows: refuels } = await db.query(sql, params);
    const totals = refuels.reduce(
      (a, r) => ({ liters: a.liters + (r.liters || 0), amount: a.amount + (r.amount || 0) }),
      { liters: 0, amount: 0 }
    );
    res.json({ refuels, totals });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM refuels WHERE id = $1', [req.params.id]);
    const refuel = rows[0];
    if (!refuel) return res.status(404).json({ error: 'Заправка не найдена' });

    const { liters, amount } = req.body || {};
    await db.query(
      'UPDATE refuels SET liters=$1, amount=$2 WHERE id=$3',
      [
        liters != null ? Number(liters) : refuel.liters,
        amount != null ? Number(amount) : refuel.amount,
        refuel.id,
      ]
    );

    const { rows: updated } = await db.query(`
      SELECT r.*, t.car_id, t.driver_id, t.start_time,
        c.name AS car_name, c.plate_number, u.name AS driver_name
      FROM refuels r
      JOIN trips t ON t.id = r.trip_id
      JOIN cars  c ON c.id = t.car_id
      JOIN users u ON u.id = t.driver_id
      WHERE r.id = $1
    `, [refuel.id]);
    res.json({ refuel: updated[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
