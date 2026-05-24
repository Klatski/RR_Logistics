import fs from 'node:fs';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { DATA_DIR, DB_PATH, UPLOADS_DIR, config } from './config.js';

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    login TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'driver')),
    phone TEXT,
    avatar_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    plate_number TEXT NOT NULL UNIQUE,
    current_odometer INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','in_trip','maintenance')),
    photo_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    driver_id INTEGER NOT NULL,
    car_id INTEGER NOT NULL,
    odometer_start INTEGER NOT NULL,
    odometer_end INTEGER,
    distance INTEGER,
    start_time TEXT NOT NULL DEFAULT (datetime('now')),
    end_time TEXT,
    start_photo_url TEXT,
    end_photo_url TEXT,
    comment TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed')),
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS refuels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL,
    liters REAL,
    amount REAL,
    fuel_photo_url TEXT,
    receipt_photo_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver_id);
  CREATE INDEX IF NOT EXISTS idx_trips_car ON trips(car_id);
  CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
  CREATE INDEX IF NOT EXISTS idx_refuels_trip ON refuels(trip_id);
`);

// Миграция: добавить avatar_url если колонки ещё нет
try {
  db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT');
} catch { /* колонка уже есть */ }

const adminExists = db
  .prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
  .get();

if (!adminExists) {
  const hash = bcrypt.hashSync(config.admin.password, 10);
  db.prepare(
    "INSERT INTO users (name, login, password_hash, role) VALUES (?, ?, ?, 'admin')"
  ).run(config.admin.name, config.admin.login, hash);
  console.log(
    `[db] Создан администратор: login="${config.admin.login}" password="${config.admin.password}"`
  );
}

const carsCount = db.prepare('SELECT COUNT(*) AS c FROM cars').get().c;
if (carsCount === 0) {
  const seed = db.prepare(
    'INSERT INTO cars (name, plate_number, current_odometer, status) VALUES (?, ?, ?, ?)'
  );
  seed.run('Toyota Camry', 'A 123 BC 01', 45200, 'available');
  seed.run('Hyundai Elantra', 'B 456 DE 02', 78100, 'available');
  seed.run('Kia Rio', 'C 789 FG 03', 32400, 'maintenance');
  console.log('[db] Добавлены тестовые автомобили');
}
