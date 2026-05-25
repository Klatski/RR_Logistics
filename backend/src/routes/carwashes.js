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
      SELECT w.*, t.car_id, t.driver_id, t.start_time,
        c.name AS car_name, c.plate_number,
        u.name AS driver_name
      FROM carwashes w
      JOIN trips t ON t.id = w.trip_id
      JOIN cars  c ON c.id = t.car_id
      JOIN users u ON u.id = t.driver_id
      WHERE 1=1
    `;

    if (car_id) { params.push(car_id); sql += ` AND t.car_id = $${params.length}`; }
    if (from)   { params.push(from);   sql += ` AND w.created_at::date >= $${params.length}::date`; }
    if (to)     { params.push(to);     sql += ` AND w.created_at::date <= $${params.length}::date`; }

    sql += ' ORDER BY w.created_at DESC LIMIT 500';

    const { rows: carwashes } = await db.query(sql, params);
    const totals = carwashes.reduce(
      (a, r) => ({ amount: a.amount + (r.amount || 0) }),
      { amount: 0 }
    );
    res.json({ carwashes, totals });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM carwashes WHERE id = $1', [req.params.id]);
    const carwash = rows[0];
    if (!carwash) return res.status(404).json({ error: 'Мойка не найдена' });

    const { amount } = req.body || {};
    await db.query(
      'UPDATE carwashes SET amount=$1 WHERE id=$2',
      [amount != null ? Number(amount) : carwash.amount, carwash.id]
    );

    const { rows: updated } = await db.query(`
      SELECT w.*, t.car_id, t.driver_id, t.start_time,
        c.name AS car_name, c.plate_number, u.name AS driver_name
      FROM carwashes w
      JOIN trips t ON t.id = w.trip_id
      JOIN cars  c ON c.id = t.car_id
      JOIN users u ON u.id = t.driver_id
      WHERE w.id = $1
    `, [carwash.id]);
    res.json({ carwash: updated[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
