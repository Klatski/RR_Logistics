import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

async function withRelations(trip) {
  if (!trip) return null;
  const { rows: driverRows } = await db.query(
    'SELECT id, name, login FROM users WHERE id = $1',
    [trip.driver_id]
  );
  const { rows: carRows } = await db.query(
    'SELECT * FROM cars WHERE id = $1',
    [trip.car_id]
  );
  const { rows: refuelRows } = await db.query(
    'SELECT * FROM refuels WHERE trip_id = $1 ORDER BY id DESC LIMIT 1',
    [trip.id]
  );
  const { rows: carwashRows } = await db.query(
    'SELECT * FROM carwashes WHERE trip_id = $1 ORDER BY id DESC LIMIT 1',
    [trip.id]
  );
  return {
    ...trip,
    driver: driverRows[0] || null,
    car: carRows[0] || null,
    refuel: refuelRows[0] || null,
    carwash: carwashRows[0] || null,
  };
}

// GET /trips/active — активная поездка текущего водителя
router.get('/active', async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM trips WHERE driver_id = $1 AND status = 'active' LIMIT 1",
      [req.user.id]
    );
    res.json({ trip: await withRelations(rows[0] || null) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /trips/mine — история завершённых поездок водителя
router.get('/mine', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 20, 100);
    const offset = Math.max(parseInt(req.query.offset) || 0,  0);

    const { rows: trips } = await db.query(
      "SELECT * FROM trips WHERE driver_id = $1 AND status = 'completed' ORDER BY start_time DESC LIMIT $2 OFFSET $3",
      [req.user.id, limit, offset]
    );
    const { rows: countRows } = await db.query(
      "SELECT COUNT(*) AS c FROM trips WHERE driver_id = $1 AND status = 'completed'",
      [req.user.id]
    );
    const result = await Promise.all(trips.map(withRelations));
    res.json({ trips: result, total: parseInt(countRows[0].c) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /trips — все поездки (только admin) с фильтрами
router.get('/', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Только для администратора' });
  }
  try {
    const { driver_id, car_id, from, to } = req.query;
    const params = [];
    let sql = 'SELECT * FROM trips WHERE 1=1';

    if (driver_id) { params.push(driver_id);  sql += ` AND driver_id = $${params.length}`; }
    if (car_id)    { params.push(car_id);     sql += ` AND car_id = $${params.length}`; }
    if (from)      { params.push(from);       sql += ` AND start_time::date >= $${params.length}::date`; }
    if (to)        { params.push(to);         sql += ` AND start_time::date <= $${params.length}::date`; }

    sql += ' ORDER BY start_time DESC LIMIT 500';

    const { rows } = await db.query(sql, params);
    const trips = await Promise.all(rows.map(withRelations));
    res.json({ trips });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /trips/:id — одна поездка
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
    const trip = rows[0];
    if (!trip) return res.status(404).json({ error: 'Поездка не найдена' });
    if (req.user.role !== 'admin' && trip.driver_id !== req.user.id) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    res.json({ trip: await withRelations(trip) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /trips/:id — редактирование завершённой поездки (admin)
router.put('/:id', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Только администратор' });
  }
  try {
    const { rows } = await db.query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
    const trip = rows[0];
    if (!trip) return res.status(404).json({ error: 'Поездка не найдена' });
    if (trip.status !== 'completed') {
      return res.status(409).json({ error: 'Можно редактировать только завершённые поездки' });
    }

    const { odometer_end, comment } = req.body || {};
    const newOdo = odometer_end != null ? Number(odometer_end) : trip.odometer_end;
    if (newOdo < Number(trip.odometer_start)) {
      return res.status(400).json({ error: 'Пробег не может быть меньше начального' });
    }
    const distance = newOdo - Number(trip.odometer_start);

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'UPDATE trips SET odometer_end = $1, distance = $2, comment = $3 WHERE id = $4',
        [newOdo, distance, comment !== undefined ? (comment || null) : trip.comment, trip.id]
      );
      // Пересинхронизация одометра машины: максимум из всех известных показаний.
      // Включает завершённые (odometer_end) и активные (odometer_start) поездки.
      await client.query(
        `UPDATE cars SET current_odometer = GREATEST(
           COALESCE((SELECT MAX(odometer_end)   FROM trips WHERE car_id = $1 AND odometer_end IS NOT NULL), 0),
           COALESCE((SELECT MAX(odometer_start) FROM trips WHERE car_id = $1), 0)
         )
         WHERE id = $1`,
        [trip.car_id]
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const { rows: updated } = await db.query('SELECT * FROM trips WHERE id = $1', [trip.id]);
    res.json({ trip: await withRelations(updated[0]) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /trips/start — начать поездку
router.post('/start', async (req, res) => {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ error: 'Только водитель может начать поездку' });
  }
  const { car_id, odometer_start, start_photo_url } = req.body || {};
  if (!car_id || odometer_start == null || !start_photo_url) {
    return res.status(400).json({ error: 'Машина, одометр и фото обязательны' });
  }

  try {
    // Валидация вне транзакции
    const { rows: carRows } = await db.query('SELECT * FROM cars WHERE id = $1', [car_id]);
    const car = carRows[0];
    if (!car) return res.status(404).json({ error: 'Автомобиль не найден' });
    if (car.status !== 'available') return res.status(409).json({ error: 'Автомобиль недоступен' });
    if (Number(odometer_start) < Number(car.current_odometer)) {
      return res.status(400).json({ error: 'Пробег не может быть меньше начального' });
    }
    const { rows: activeRows } = await db.query(
      "SELECT id FROM trips WHERE driver_id = $1 AND status = 'active'",
      [req.user.id]
    );
    if (activeRows.length > 0) {
      return res.status(409).json({ error: 'У вас уже есть активная поездка' });
    }

    // Транзакция только для записи
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Повторная проверка с блокировкой строки
      const { rows: locked } = await client.query(
        "SELECT status FROM cars WHERE id = $1 FOR UPDATE",
        [car_id]
      );
      if (locked[0]?.status !== 'available') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Автомобиль стал недоступен' });
      }

      const { rows: insertRows } = await client.query(
        "INSERT INTO trips (driver_id, car_id, odometer_start, start_photo_url, status) VALUES ($1,$2,$3,$4,'active') RETURNING id",
        [req.user.id, car_id, Number(odometer_start), start_photo_url]
      );
      await client.query(
        "UPDATE cars SET status = 'in_trip', current_odometer = $1 WHERE id = $2",
        [Number(odometer_start), car_id]
      );
      await client.query('COMMIT');

      const { rows: tripRows } = await db.query('SELECT * FROM trips WHERE id = $1', [insertRows[0].id]);
      res.json({ trip: await withRelations(tripRows[0]) });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /trips/:id/finish — завершить поездку
router.post('/:id/finish', async (req, res) => {
  const client = await db.connect();
  try {
    const { rows } = await client.query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
    const trip = rows[0];
    if (!trip) return res.status(404).json({ error: 'Поездка не найдена' });
    if (req.user.role !== 'admin' && trip.driver_id !== req.user.id) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    if (trip.status === 'completed') {
      return res.status(409).json({ error: 'Поездка уже завершена' });
    }

    const { odometer_end, end_photo_url, comment, refuel, carwash } = req.body || {};
    if (odometer_end == null || !end_photo_url) {
      return res.status(400).json({ error: 'Одометр и фото обязательны' });
    }
    if (Number(odometer_end) < Number(trip.odometer_start)) {
      return res.status(400).json({ error: 'Пробег не может быть меньше начального' });
    }
    const distance = Number(odometer_end) - Number(trip.odometer_start);

    await client.query('BEGIN');

    await client.query(
      "UPDATE trips SET odometer_end=$1, distance=$2, end_time=NOW(), end_photo_url=$3, comment=$4, status='completed' WHERE id=$5",
      [Number(odometer_end), distance, end_photo_url, comment || null, trip.id]
    );
    await client.query(
      "UPDATE cars SET status='available', current_odometer=$1 WHERE id=$2",
      [Number(odometer_end), trip.car_id]
    );

    if (refuel && (refuel.amount || refuel.liters || refuel.fuel_photo_url || refuel.receipt_photo_url)) {
      await client.query(
        'INSERT INTO refuels (trip_id, liters, amount, fuel_photo_url, receipt_photo_url) VALUES ($1,$2,$3,$4,$5)',
        [
          trip.id,
          refuel.liters  ? Number(refuel.liters)  : null,
          refuel.amount  ? Number(refuel.amount)  : null,
          refuel.fuel_photo_url    || null,
          refuel.receipt_photo_url || null,
        ]
      );
    }

    if (carwash && (carwash.amount || carwash.car_photo_url || carwash.receipt_photo_url)) {
      await client.query(
        'INSERT INTO carwashes (trip_id, amount, car_photo_url, receipt_photo_url) VALUES ($1,$2,$3,$4)',
        [
          trip.id,
          carwash.amount ? Number(carwash.amount) : null,
          carwash.car_photo_url    || null,
          carwash.receipt_photo_url || null,
        ]
      );
    }

    await client.query('COMMIT');

    const { rows: completed } = await db.query('SELECT * FROM trips WHERE id = $1', [trip.id]);
    res.json({ trip: await withRelations(completed[0]) });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

export default router;
