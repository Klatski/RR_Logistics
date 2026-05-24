import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { signToken, requireAuth } from '../auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) {
    return res.status(400).json({ error: 'Введите логин и пароль' });
  }
  const user = db
    .prepare('SELECT * FROM users WHERE login = ?')
    .get(String(login).trim().toLowerCase());
  if (!user) return res.status(401).json({ error: 'Неверный логин или пароль' });

  const ok = bcrypt.compareSync(String(password), user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Неверный логин или пароль' });

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, login: user.login, role: user.role },
  });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db
    .prepare('SELECT id, name, login, role, phone, avatar_url FROM users WHERE id = ?')
    .get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json({ user });
});

router.put('/profile', requireAuth, (req, res) => {
  const { name, current_password, new_password, avatar_url } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  // Смена пароля — требует подтверждение текущего
  if (new_password) {
    if (!current_password) {
      return res.status(400).json({ error: 'Введите текущий пароль' });
    }
    const ok = bcrypt.compareSync(String(current_password), user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Неверный текущий пароль' });
    if (String(new_password).length < 4) {
      return res.status(400).json({ error: 'Новый пароль слишком короткий' });
    }
    const hash = bcrypt.hashSync(String(new_password), 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  }

  db.prepare('UPDATE users SET name = ?, avatar_url = ? WHERE id = ?').run(
    name ? String(name).trim() : user.name,
    avatar_url !== undefined ? (avatar_url || null) : user.avatar_url,
    user.id
  );

  const updated = db
    .prepare('SELECT id, name, login, role, phone, avatar_url FROM users WHERE id = ?')
    .get(user.id);
  res.json({ user: updated });
});

export default router;
