import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/', (req, res) => {
  const drivers = db
    .prepare(`
      SELECT u.id, u.name, u.login, u.phone, u.role, u.created_at,
        (SELECT COUNT(*) FROM trips t WHERE t.driver_id = u.id AND t.status='completed') AS trips_count,
        (SELECT MAX(t.end_time) FROM trips t WHERE t.driver_id = u.id) AS last_activity
      FROM users u
      WHERE u.role = 'driver'
      ORDER BY u.name ASC
    `)
    .all();
  res.json({ drivers });
});

router.post('/', (req, res) => {
  const { name, login, password, phone } = req.body || {};
  if (!name || !login || !password) {
    return res.status(400).json({ error: 'Имя, логин и пароль обязательны' });
  }
  try {
    const hash = bcrypt.hashSync(String(password), 10);
    const info = db
      .prepare(
        "INSERT INTO users (name, login, password_hash, role, phone) VALUES (?,?,?, 'driver', ?)"
      )
      .run(
        String(name).trim(),
        String(login).trim().toLowerCase(),
        hash,
        phone ? String(phone).trim() : null
      );
    const driver = db
      .prepare('SELECT id, name, login, phone, role FROM users WHERE id = ?')
      .get(info.lastInsertRowid);
    res.json({ driver });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Логин уже занят' });
    }
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!u || u.role !== 'driver') {
    return res.status(404).json({ error: 'Водитель не найден' });
  }
  const { name, login, phone, password } = req.body || {};
  try {
    if (password) {
      const hash = bcrypt.hashSync(String(password), 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
    }
    db.prepare(
      'UPDATE users SET name = ?, login = ?, phone = ? WHERE id = ?'
    ).run(
      name ?? u.name,
      login ? String(login).trim().toLowerCase() : u.login,
      phone ?? u.phone,
      req.params.id
    );
    const updated = db
      .prepare('SELECT id, name, login, phone, role FROM users WHERE id = ?')
      .get(req.params.id);
    res.json({ driver: updated });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Логин уже занят' });
    }
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/reset-password', (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'Введите новый пароль' });
  const hash = bcrypt.hashSync(String(password), 10);
  const info = db
    .prepare("UPDATE users SET password_hash = ? WHERE id = ? AND role = 'driver'")
    .run(hash, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Водитель не найден' });
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const active = db
    .prepare("SELECT id FROM trips WHERE driver_id = ? AND status = 'active'")
    .get(req.params.id);
  if (active) {
    return res
      .status(409)
      .json({ error: 'Нельзя удалить водителя с активной поездкой' });
  }
  const info = db
    .prepare("DELETE FROM users WHERE id = ? AND role = 'driver'")
    .run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Водитель не найден' });
  res.json({ ok: true });
});

export default router;
