import pg from 'pg';
import bcrypt from 'bcryptjs';
import { config } from './config.js';

const { Pool } = pg;

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Проверка подключения
db.connect()
  .then(client => {
    console.log('[db] PostgreSQL подключён');
    client.release();
  })
  .catch(err => {
    console.error('[db] Ошибка подключения к PostgreSQL:', err.message);
    process.exit(1);
  });

export async function initDb() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id        SERIAL PRIMARY KEY,
      name      TEXT NOT NULL,
      login     TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role      TEXT NOT NULL CHECK (role IN ('admin', 'driver')),
      phone     TEXT,
      avatar_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cars (
      id                SERIAL PRIMARY KEY,
      name              TEXT NOT NULL,
      plate_number      TEXT NOT NULL UNIQUE,
      current_odometer  INTEGER NOT NULL DEFAULT 0,
      status            TEXT NOT NULL DEFAULT 'available'
                          CHECK (status IN ('available','in_trip','maintenance')),
      photo_url         TEXT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS trips (
      id              SERIAL PRIMARY KEY,
      driver_id       INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
      car_id          INTEGER NOT NULL REFERENCES cars(id)   ON DELETE CASCADE,
      odometer_start  INTEGER NOT NULL,
      odometer_end    INTEGER,
      distance        INTEGER,
      start_time      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      end_time        TIMESTAMPTZ,
      start_photo_url TEXT,
      end_photo_url   TEXT,
      comment         TEXT,
      status          TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','completed'))
    );

    CREATE TABLE IF NOT EXISTS refuels (
      id               SERIAL PRIMARY KEY,
      trip_id          INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      liters           REAL,
      amount           REAL,
      fuel_photo_url   TEXT,
      receipt_photo_url TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS carwashes (
      id               SERIAL PRIMARY KEY,
      trip_id          INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      amount           REAL,
      car_photo_url    TEXT,
      receipt_photo_url TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver_id);
    CREATE INDEX IF NOT EXISTS idx_trips_car    ON trips(car_id);
    CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
    CREATE INDEX IF NOT EXISTS idx_refuels_trip ON refuels(trip_id);
    CREATE INDEX IF NOT EXISTS idx_carwashes_trip ON carwashes(trip_id);
  `);

  // Seed: admin
  const { rows: adminRows } = await db.query(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  );
  if (adminRows.length === 0) {
    const hash = await bcrypt.hash(config.admin.password, 10);
    await db.query(
      "INSERT INTO users (name, login, password_hash, role) VALUES ($1, $2, $3, 'admin')",
      [config.admin.name, config.admin.login, hash]
    );
    console.log(`[db] Создан администратор: login="${config.admin.login}"`);
  }

  // Seed: cars
  const { rows: carsRows } = await db.query('SELECT COUNT(*) AS c FROM cars');
  if (parseInt(carsRows[0].c) === 0) {
    await db.query(
      'INSERT INTO cars (name, plate_number, current_odometer, status) VALUES ($1,$2,$3,$4),($5,$6,$7,$8),($9,$10,$11,$12)',
      [
        'Toyota Camry',    'A 123 BC 01', 45200, 'available',
        'Hyundai Elantra', 'B 456 DE 02', 78100, 'available',
        'Kia Rio',         'C 789 FG 03', 32400, 'maintenance',
      ]
    );
    console.log('[db] Добавлены тестовые автомобили');
  }
}
