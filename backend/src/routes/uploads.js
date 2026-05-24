import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../auth.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BUCKET = 'uploads';

const router = Router();

// multer хранит файл в памяти (не на диске)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!/^image\//.test(file.mimetype)) {
      return cb(new Error('Файл должен быть изображением'));
    }
    cb(null, true);
  },
});

router.post('/', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл не получен' });

    const ext      = path.extname(req.file.originalname || '') || '.jpg';
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext.toLowerCase()}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error('[upload] Supabase error:', error.message);
      return res.status(500).json({ error: 'Ошибка загрузки файла' });
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    res.json({ url: data.publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:filename', requireAuth, async (req, res) => {
  try {
    const safe = path.basename(req.params.filename);
    await supabase.storage.from(BUCKET).remove([safe]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
