import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { signToken, requireAuth } from '../auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body || {};
    if (!login || !password) {
      return res.status(400).json({ error: 'Введите логин и пароль' });
    }
    const { rows } = await db.query(
      'SELECT * FROM users WHERE login = $1',
      [String(login).trim().toLowerCase()]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Неверный логин или пароль' });

    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Неверный логин или пароль' });

    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, name: user.name, login: user.login, role: user.role },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, login, role, phone, avatar_url FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({ user: rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, current_password, new_password, avatar_url } = req.body || {};
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ error: 'Введите текущий пароль' });
      }
      const ok = await bcrypt.compare(String(current_password), user.password_hash);
      if (!ok) return res.status(401).json({ error: 'Неверный текущий пароль' });
      if (String(new_password).length < 4) {
        return res.status(400).json({ error: 'Новый пароль слишком короткий' });
      }
      const hash = await bcrypt.hash(String(new_password), 10);
      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user.id]);
    }

    await db.query(
      'UPDATE users SET name = $1, avatar_url = $2 WHERE id = $3',
      [
        name ? String(name).trim() : user.name,
        avatar_url !== undefined ? (avatar_url || null) : user.avatar_url,
        user.id,
      ]
    );

    const { rows: updated } = await db.query(
      'SELECT id, name, login, role, phone, avatar_url FROM users WHERE id = $1',
      [user.id]
    );
    res.json({ user: updated[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
