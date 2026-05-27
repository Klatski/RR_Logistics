import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM cars ORDER BY name ASC');
    res.json({ cars: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM cars WHERE id = $1', [req.params.id]);
    const car = rows[0];
    if (!car) return res.status(404).json({ error: 'Автомобиль не найден' });

    const { rows: tripsRows } = await db.query(
      "SELECT COUNT(*) AS c FROM trips WHERE car_id = $1 AND status = 'completed'",
      [req.params.id]
    );
    const { rows: distRows } = await db.query(
      "SELECT COALESCE(SUM(distance),0) AS d FROM trips WHERE car_id = $1 AND status = 'completed'",
      [req.params.id]
    );
    const { rows: fuelRows } = await db.query(
      `SELECT COALESCE(SUM(r.amount),0) AS amount, COALESCE(SUM(r.liters),0) AS liters
       FROM refuels r
       JOIN trips t ON t.id = r.trip_id
       WHERE t.car_id = $1`,
      [req.params.id]
    );

    res.json({
      car,
      stats: {
        tripsCount:    parseInt(tripsRows[0].c),
        totalDistance: parseInt(distRows[0].d),
        totalFuel:     fuelRows[0],
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { name, plate_number, current_odometer, status, photo_url } = req.body || {};
  if (!name || !plate_number) {
    return res.status(400).json({ error: 'Название и госномер обязательны' });
  }
  try {
    const { rows } = await db.query(
      'INSERT INTO cars (name, plate_number, current_odometer, status, photo_url) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [
        String(name).trim(),
        String(plate_number).trim(),
        Number(current_odometer) || 0,
        status || 'available',
        photo_url || null,
      ]
    );
    res.json({ car: rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Госномер уже существует' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM cars WHERE id = $1', [req.params.id]);
    const car = rows[0];
    if (!car) return res.status(404).json({ error: 'Автомобиль не найден' });

    const { name, plate_number, current_odometer, status, photo_url } = req.body || {};
    await db.query(
      'UPDATE cars SET name=$1, plate_number=$2, current_odometer=$3, status=$4, photo_url=$5 WHERE id=$6',
      [
        name              ?? car.name,
        plate_number      ?? car.plate_number,
        current_odometer  ?? car.current_odometer,
        status            ?? car.status,
        photo_url         ?? car.photo_url,
        req.params.id,
      ]
    );
    const { rows: updated } = await db.query('SELECT * FROM cars WHERE id = $1', [req.params.id]);
    res.json({ car: updated[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Госномер уже существует' });
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows: activeRows } = await db.query(
      "SELECT 1 FROM trips WHERE car_id = $1 AND status = 'active' LIMIT 1",
      [req.params.id]
    );
    if (activeRows.length > 0) {
      return res.status(409).json({ error: 'Нельзя удалить машину с активной поездкой' });
    }
    const { rows: anyRows } = await db.query(
      'SELECT 1 FROM trips WHERE car_id = $1 LIMIT 1',
      [req.params.id]
    );
    if (anyRows.length > 0) {
      return res.status(409).json({
        error: 'У машины есть поездки в истории — удаление сотрёт их вместе с заправками и мойками',
      });
    }
    await db.query('DELETE FROM cars WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
