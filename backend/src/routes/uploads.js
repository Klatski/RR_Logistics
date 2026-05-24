import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { UPLOADS_DIR } from '../config.js';
import { requireAuth } from '../auth.js';

const router = Router();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '') || '.jpg';
    const id = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${id}${ext.toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!/^image\//.test(file.mimetype)) {
      return cb(new Error('Файл должен быть изображением'));
    }
    cb(null, true);
  },
});

router.post('/', requireAuth, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не получен' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

router.delete('/:filename', requireAuth, (req, res) => {
  const safe = path.basename(req.params.filename);
  const fp = path.join(UPLOADS_DIR, safe);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  res.json({ ok: true });
});

export default router;
