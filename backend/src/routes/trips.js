import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

function withRelations(trip) {
  if (!trip) return null;
  const driver = db
    .prepare('SELECT id, name, login FROM users WHERE id = ?')
    .get(trip.driver_id);
  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(trip.car_id);
  const refuel = db
    .prepare('SELECT * FROM refuels WHERE trip_id = ? ORDER BY id DESC LIMIT 1')
    .get(trip.id);
  return { ...trip, driver, car, refuel };
}

router.get('/active', (req, res) => {
  const trip = db
    .prepare("SELECT * FROM trips WHERE driver_id = ? AND status = 'active' LIMIT 1")
    .get(req.user.id);
  res.json({ trip: withRelations(trip) });
});

router.get('/mine', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  const trips = db
    .prepare(
      "SELECT * FROM trips WHERE driver_id = ? AND status = 'completed' ORDER BY datetime(start_time) DESC LIMIT ? OFFSET ?"
    )
    .all(req.user.id, limit, offset)
    .map(withRelations);
  const total = db
    .prepare("SELECT COUNT(*) AS c FROM trips WHERE driver_id = ? AND status = 'completed'")
    .get(req.user.id).c;
  res.json({ trips, total });
});

router.get('/', (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Только для администратора' });
  }
  const { driver_id, car_id, from, to } = req.query;
  let sql = 'SELECT * FROM trips WHERE 1=1';
  const params = [];
  if (driver_id) { sql += ' AND driver_id = ?'; params.push(driver_id); }
  if (car_id) { sql += ' AND car_id = ?'; params.push(car_id); }
  if (from) { sql += " AND date(start_time) >= date(?)"; params.push(from); }
  if (to) { sql += " AND date(start_time) <= date(?)"; params.push(to); }
  sql += ' ORDER BY datetime(start_time) DESC LIMIT 500';
  const trips = db.prepare(sql).all(...params).map(withRelations);
  res.json({ trips });
});

router.get('/:id', (req, res) => {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Поездка не найдена' });
  if (req.user.role !== 'admin' && trip.driver_id !== req.user.id) {
    return res.status(403).json({ error: 'Нет доступа' });
  }
  res.json({ trip: withRelations(trip) });
});

router.put('/:id', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Только администратор' });
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Поездка не найдена' });
  if (trip.status !== 'completed') return res.status(409).json({ error: 'Можно редактировать только завершённые поездки' });

  const { odometer_end, comment } = req.body || {};
  const newOdo = odometer_end != null ? Number(odometer_end) : trip.odometer_end;
  if (newOdo < Number(trip.odometer_start)) {
    return res.status(400).json({ error: 'Пробег не может быть меньше начального' });
  }
  const distance = newOdo - Number(trip.odometer_start);
  db.prepare('UPDATE trips SET odometer_end = ?, distance = ?, comment = ? WHERE id = ?')
    .run(newOdo, distance, comment !== undefined ? (comment || null) : trip.comment, trip.id);

  res.json({ trip: withRelations(db.prepare('SELECT * FROM trips WHERE id = ?').get(trip.id)) });
});

router.post('/start', (req, res) => {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ error: 'Только водитель может начать поездку' });
  }
  const { car_id, odometer_start, start_photo_url } = req.body || {};
  if (!car_id || odometer_start == null || !start_photo_url) {
    return res.status(400).json({ error: 'Машина, одометр и фото обязательны' });
  }

  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(car_id);
  if (!car) return res.status(404).json({ error: 'Автомобиль не найден' });
  if (car.status !== 'available') {
    return res.status(409).json({ error: 'Автомобиль недоступен' });
  }
  if (Number(odometer_start) < Number(car.current_odometer)) {
    return res
      .status(400)
      .json({ error: 'Пробег не может быть меньше начального' });
  }
  const existingActive = db
    .prepare("SELECT id FROM trips WHERE driver_id = ? AND status = 'active'")
    .get(req.user.id);
  if (existingActive) {
    return res.status(409).json({ error: 'У вас уже есть активная поездка' });
  }

  const tx = db.transaction(() => {
    const info = db
      .prepare(
        "INSERT INTO trips (driver_id, car_id, odometer_start, start_photo_url, status) VALUES (?,?,?,?, 'active')"
      )
      .run(req.user.id, car_id, Number(odometer_start), start_photo_url);
    db.prepare("UPDATE cars SET status = 'in_trip', current_odometer = ? WHERE id = ?")
      .run(Number(odometer_start), car_id);
    return info.lastInsertRowid;
  });

  const id = tx();
  const trip = withRelations(
    db.prepare('SELECT * FROM trips WHERE id = ?').get(id)
  );
  res.json({ trip });
});

router.post('/:id/finish', (req, res) => {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Поездка не найдена' });
  if (req.user.role !== 'admin' && trip.driver_id !== req.user.id) {
    return res.status(403).json({ error: 'Нет доступа' });
  }
  if (trip.status === 'completed') {
    return res.status(409).json({ error: 'Поездка уже завершена' });
  }
  const { odometer_end, end_photo_url, comment, refuel } = req.body || {};
  if (odometer_end == null || !end_photo_url) {
    return res.status(400).json({ error: 'Одометр и фото обязательны' });
  }
  if (Number(odometer_end) < Number(trip.odometer_start)) {
    return res.status(400).json({ error: 'Пробег не может быть меньше начального' });
  }
  const distance = Number(odometer_end) - Number(trip.odometer_start);

  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE trips SET odometer_end = ?, distance = ?, end_time = datetime('now'), end_photo_url = ?, comment = ?, status = 'completed' WHERE id = ?"
    ).run(Number(odometer_end), distance, end_photo_url, comment || null, trip.id);
    db.prepare("UPDATE cars SET status = 'available', current_odometer = ? WHERE id = ?")
      .run(Number(odometer_end), trip.car_id);
    if (refuel && (refuel.amount || refuel.liters || refuel.fuel_photo_url || refuel.receipt_photo_url)) {
      db.prepare(
        'INSERT INTO refuels (trip_id, liters, amount, fuel_photo_url, receipt_photo_url) VALUES (?,?,?,?,?)'
      ).run(
        trip.id,
        refuel.liters ? Number(refuel.liters) : null,
        refuel.amount ? Number(refuel.amount) : null,
        refuel.fuel_photo_url || null,
        refuel.receipt_photo_url || null
      );
    }
  });

  tx();
  const completed = withRelations(
    db.prepare('SELECT * FROM trips WHERE id = ?').get(trip.id)
  );
  res.json({ trip: completed });
});

export default router;
