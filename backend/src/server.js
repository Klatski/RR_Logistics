import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { config, UPLOADS_DIR } from './config.js';
import './db.js';
import authRoutes from './routes/auth.js';
import carsRoutes from './routes/cars.js';
import driversRoutes from './routes/drivers.js';
import tripsRoutes from './routes/trips.js';
import refuelsRoutes from './routes/refuels.js';
import uploadsRoutes from './routes/uploads.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/uploads', express.static(UPLOADS_DIR, {
  maxAge: '7d',
  immutable: true,
}));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/cars', carsRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/refuels', refuelsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((err, req, res, next) => {
  console.error('[error]', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err.message || 'Внутренняя ошибка сервера' });
});

app.listen(config.port, () => {
  console.log(`[rr-logistics] backend on http://localhost:${config.port}`);
});
