import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const cars = db
    .prepare('SELECT * FROM cars ORDER BY name ASC')
    .all();
  res.json({ cars });
});

router.get('/:id', (req, res) => {
  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
  if (!car) return res.status(404).json({ error: 'Автомобиль не найден' });
  const tripsCount = db
    .prepare("SELECT COUNT(*) AS c FROM trips WHERE car_id = ? AND status = 'completed'")
    .get(req.params.id).c;
  const totalDistance = db
    .prepare("SELECT COALESCE(SUM(distance),0) AS d FROM trips WHERE car_id = ? AND status = 'completed'")
    .get(req.params.id).d;
  const totalFuel = db
    .prepare(`
      SELECT COALESCE(SUM(r.amount),0) AS amount, COALESCE(SUM(r.liters),0) AS liters
      FROM refuels r
      JOIN trips t ON t.id = r.trip_id
      WHERE t.car_id = ?
    `)
    .get(req.params.id);
  res.json({ car, stats: { tripsCount, totalDistance, totalFuel } });
});

router.post('/', requireAdmin, (req, res) => {
  const { name, plate_number, current_odometer, status, photo_url } = req.body || {};
  if (!name || !plate_number) {
    return res.status(400).json({ error: 'Название и госномер обязательны' });
  }
  try {
    const info = db
      .prepare(
        'INSERT INTO cars (name, plate_number, current_odometer, status, photo_url) VALUES (?,?,?,?,?)'
      )
      .run(
        String(name).trim(),
        String(plate_number).trim(),
        Number(current_odometer) || 0,
        status || 'available',
        photo_url || null
      );
    const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(info.lastInsertRowid);
    res.json({ car });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Госномер уже существует' });
    }
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireAdmin, (req, res) => {
  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
  if (!car) return res.status(404).json({ error: 'Автомобиль не найден' });
  const { name, plate_number, current_odometer, status, photo_url } = req.body || {};
  try {
    db.prepare(
      'UPDATE cars SET name = ?, plate_number = ?, current_odometer = ?, status = ?, photo_url = ? WHERE id = ?'
    ).run(
      name ?? car.name,
      plate_number ?? car.plate_number,
      current_odometer ?? car.current_odometer,
      status ?? car.status,
      photo_url ?? car.photo_url,
      req.params.id
    );
    const updated = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
    res.json({ car: updated });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Госномер уже существует' });
    }
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, (req, res) => {
  const active = db
    .prepare("SELECT id FROM trips WHERE car_id = ? AND status = 'active'")
    .get(req.params.id);
  if (active) {
    return res
      .status(409)
      .json({ error: 'Нельзя удалить машину с активной поездкой' });
  }
  db.prepare('DELETE FROM cars WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
