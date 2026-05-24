import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/', (req, res) => {
  const { from, to } = req.query;

  const totalCars = db.prepare('SELECT COUNT(*) AS c FROM cars').get().c;
  const activeTrips = db
    .prepare("SELECT COUNT(*) AS c FROM trips WHERE status = 'active'")
    .get().c;

  let distanceSql = "SELECT COALESCE(SUM(distance),0) AS d FROM trips WHERE status = 'completed'";
  let fuelSql = 'SELECT COALESCE(SUM(amount),0) AS amount FROM refuels WHERE 1=1';
  const dParams = [];
  const fParams = [];

  if (from || to) {
    if (from) {
      distanceSql += ' AND date(end_time) >= date(?)'; dParams.push(from);
      fuelSql += ' AND date(created_at) >= date(?)'; fParams.push(from);
    }
    if (to) {
      distanceSql += ' AND date(end_time) <= date(?)'; dParams.push(to);
      fuelSql += ' AND date(created_at) <= date(?)'; fParams.push(to);
    }
  } else {
    distanceSql += " AND datetime(end_time) >= datetime('now','start of month')";
    fuelSql += " AND datetime(created_at) >= datetime('now','start of month')";
  }

  const monthDistance = db.prepare(distanceSql).get(...dParams).d;
  const monthFuel = db.prepare(fuelSql).get(...fParams).amount;

  const lastTrips = db
    .prepare(`
      SELECT t.id, t.start_time, t.end_time, t.distance, t.status,
        u.name AS driver_name,
        c.name AS car_name, c.plate_number
      FROM trips t
      JOIN users u ON u.id = t.driver_id
      JOIN cars c ON c.id = t.car_id
      ORDER BY datetime(t.start_time) DESC
      LIMIT 5
    `)
    .all();

  res.json({
    metrics: {
      totalCars,
      activeTrips,
      monthDistance,
      monthFuel,
    },
    lastTrips,
  });
});

export default router;
