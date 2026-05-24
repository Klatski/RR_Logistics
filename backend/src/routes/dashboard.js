import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query;

    const { rows: carsRows }  = await db.query('SELECT COUNT(*) AS c FROM cars');
    const { rows: activeRows } = await db.query(
      "SELECT COUNT(*) AS c FROM trips WHERE status = 'active'"
    );

    const dParams = [];
    const fParams = [];
    let distanceSql = "SELECT COALESCE(SUM(distance),0) AS d FROM trips WHERE status = 'completed'";
    let fuelSql     = 'SELECT COALESCE(SUM(amount),0) AS amount FROM refuels WHERE 1=1';

    if (from || to) {
      if (from) {
        dParams.push(from);
        distanceSql += ` AND end_time::date >= $${dParams.length}::date`;
        fParams.push(from);
        fuelSql     += ` AND created_at::date >= $${fParams.length}::date`;
      }
      if (to) {
        dParams.push(to);
        distanceSql += ` AND end_time::date <= $${dParams.length}::date`;
        fParams.push(to);
        fuelSql     += ` AND created_at::date <= $${fParams.length}::date`;
      }
    } else {
      distanceSql += " AND end_time >= date_trunc('month', NOW())";
      fuelSql     += " AND created_at >= date_trunc('month', NOW())";
    }

    const { rows: distRows } = await db.query(distanceSql, dParams);
    const { rows: fuelRows } = await db.query(fuelSql, fParams);

    const { rows: lastTrips } = await db.query(`
      SELECT t.id, t.start_time, t.end_time, t.distance, t.status,
        u.name AS driver_name,
        c.name AS car_name, c.plate_number
      FROM trips t
      JOIN users u ON u.id = t.driver_id
      JOIN cars  c ON c.id = t.car_id
      ORDER BY t.start_time DESC
      LIMIT 5
    `);

    res.json({
      metrics: {
        totalCars:     parseInt(carsRows[0].c),
        activeTrips:   parseInt(activeRows[0].c),
        monthDistance: parseInt(distRows[0].d),
        monthFuel:     parseFloat(fuelRows[0].amount),
      },
      lastTrips,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
