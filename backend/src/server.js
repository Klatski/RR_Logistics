import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { initDb } from './db.js';
import authRoutes from './routes/auth.js';
import carsRoutes from './routes/cars.js';
import driversRoutes from './routes/drivers.js';
import tripsRoutes from './routes/trips.js';
import refuelsRoutes from './routes/refuels.js';
import carwashesRoutes from './routes/carwashes.js';
import uploadsRoutes from './routes/uploads.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();
const PORT = process.env.PORT || config.port || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use('/api/auth',      authRoutes);
app.use('/api/cars',      carsRoutes);
app.use('/api/drivers',   driversRoutes);
app.use('/api/trips',     tripsRoutes);
app.use('/api/refuels',   refuelsRoutes);
app.use('/api/carwashes', carwashesRoutes);
app.use('/api/uploads',   uploadsRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((err, req, res, next) => {
  console.error('[error]', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err.message || 'Внутренняя ошибка сервера' });
});

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] Запущен на порту ${PORT}`));
  })
  .catch(err => {
    console.error('[server] Не удалось запустить:', err.message);
    process.exit(1);
  });
