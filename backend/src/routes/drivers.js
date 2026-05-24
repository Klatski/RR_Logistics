import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT u.id, u.name, u.login, u.phone, u.role, u.created_at,
        (SELECT COUNT(*) FROM trips t WHERE t.driver_id = u.id AND t.status='completed') AS trips_count,
        (SELECT MAX(t.end_time) FROM trips t WHERE t.driver_id = u.id) AS last_activity
      FROM users u
      WHERE u.role = 'driver'
      ORDER BY u.name ASC
    `);
    res.json({ drivers: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const { name, login, password, phone } = req.body || {};
  if (!name || !login || !password) {
    return res.status(400).json({ error: 'Имя, логин и пароль обязательны' });
  }
  try {
    const hash = await bcrypt.hash(String(password), 10);
    const { rows } = await db.query(
      "INSERT INTO users (name, login, password_hash, role, phone) VALUES ($1,$2,$3,'driver',$4) RETURNING id, name, login, phone, role",
      [
        String(name).trim(),
        String(login).trim().toLowerCase(),
        hash,
        phone ? String(phone).trim() : null,
      ]
    );
    res.json({ driver: rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Логин уже занят' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    const u = rows[0];
    if (!u || u.role !== 'driver') {
      return res.status(404).json({ error: 'Водитель не найден' });
    }
    const { name, login, phone, password } = req.body || {};

    if (password) {
      const hash = await bcrypt.hash(String(password), 10);
      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.params.id]);
    }
    await db.query(
      'UPDATE users SET name=$1, login=$2, phone=$3 WHERE id=$4',
      [
        name  ?? u.name,
        login ? String(login).trim().toLowerCase() : u.login,
        phone ?? u.phone,
        req.params.id,
      ]
    );
    const { rows: updated } = await db.query(
      'SELECT id, name, login, phone, role FROM users WHERE id = $1',
      [req.params.id]
    );
    res.json({ driver: updated[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Логин уже занят' });
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/reset-password', async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: 'Введите новый пароль' });
    const hash = await bcrypt.hash(String(password), 10);
    const { rowCount } = await db.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2 AND role = 'driver'",
      [hash, req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Водитель не найден' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id FROM trips WHERE driver_id = $1 AND status = 'active'",
      [req.params.id]
    );
    if (rows.length > 0) {
      return res.status(409).json({ error: 'Нельзя удалить водителя с активной поездкой' });
    }
    const { rowCount } = await db.query(
      "DELETE FROM users WHERE id = $1 AND role = 'driver'",
      [req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Водитель не найден' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
