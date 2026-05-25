import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../auth.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET || 'uploads';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[upload] SUPABASE_URL или SUPABASE_SERVICE_KEY не заданы в окружении');
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_KEY || '');

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
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Сервер не настроен: SUPABASE_URL/SUPABASE_SERVICE_KEY' });
    }
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
      console.error('[upload] Supabase error:', {
        message: error.message,
        statusCode: error.statusCode,
        name: error.name,
        bucket: BUCKET,
      });
      return res.status(500).json({ error: `Supabase: ${error.message}` });
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    res.json({ url: data.publicUrl });
  } catch (e) {
    console.error('[upload] Неожиданная ошибка:', e);
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
