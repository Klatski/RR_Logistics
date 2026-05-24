# RR Logistics — PWA для учёта поездок

Мобильное PWA-приложение для учёта поездок и аренды автомобилей.
Реализовано по ТЗ из `pwa_design_v2.docx` (версия 2.0).

## Стек

**Фронтенд:**
- React 18 + Vite 5
- React Router 6
- `vite-plugin-pwa` (Workbox) — Service Worker, manifest, офлайн-кэш
- `idb-keyval` — IndexedDB для очереди отложенной отправки фото и действий
- Адаптивный mobile-first интерфейс, поддержка `safe-area-inset`

**Бэкенд:**
- Node.js 22 + Express
- `better-sqlite3` — локальная база данных
- `bcryptjs` + `jsonwebtoken` — собственная авторизация по логину/паролю с JWT на 30 дней
- `multer` — загрузка фото в `backend/uploads/`

> В ТЗ указан Supabase + Node.js Express. Для готового локального продукта
> выбран SQLite — структура таблиц совпадает с ТЗ, миграция на Postgres
> сводится к замене драйвера. Авторизация (login/password → bcrypt → JWT 30d)
> точно по ТЗ.

## Структура

```
RR_Logistics/
├── backend/                  Node.js API
│   ├── src/
│   │   ├── server.js         Express entrypoint
│   │   ├── db.js             SQLite + seed admin/cars
│   │   ├── auth.js           JWT middleware
│   │   ├── config.js
│   │   └── routes/           auth, cars, drivers, trips, refuels, uploads, dashboard
│   └── package.json
├── frontend/                 React PWA
│   ├── src/
│   │   ├── App.jsx           Роутер
│   │   ├── lib/              api, auth, format, photo, offline
│   │   ├── components/       Layouts, Icons, Toast, Modal, PhotoCapture, ...
│   │   ├── screens/
│   │   │   ├── driver/       Login, Cars, StartTrip, ActiveTrip, EndTrip, Result, History, Details
│   │   │   └── admin/        Dashboard, Cars, Drivers, Trips, Refuels
│   │   └── styles/global.css Дизайн-система
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons/            192/512/apple-touch
│   └── vite.config.js        + PWA конфиг
├── pwa_design_v2.docx        Исходное ТЗ
└── package.json              Корневой — скрипты dev для обоих сервисов
```

## Запуск

```powershell
# 1. Установить все зависимости (один раз)
npm run install:all

# 2. Запустить и backend, и frontend одной командой
npm run dev
```

После старта:
- API: <http://localhost:4000>
- PWA: <http://localhost:5173>

Логин администратора по умолчанию: **`admin` / `admin123`**.
Переопределить можно в `backend/.env` (см. `backend/.env.example`).

## Сборка production

```powershell
npm --prefix frontend run build   # → frontend/dist
npm --prefix backend run start    # API сервер
```

`frontend/dist` можно раздавать любым статическим хостингом (Vercel/Netlify),
проксируя `/api` и `/uploads` на backend.

## Возможности (по ТЗ)

### Водитель
- Login по логину/паролю, JWT в `localStorage` (30 дней).
- Список доступных машин со статусами (Доступна / В поездке / На обслуживании).
- Начало поездки: ввод одометра + обязательное фото (с камеры телефона).
- Если есть активная поездка — она открывается сразу после логина.
- Активная поездка с таймером ЧЧ:ММ:СС.
- Завершение: одометр + фото + опциональная заправка (фото бака, фото чека, сумма, литры) + комментарий.
- Итог поездки и история.

### Администратор
- Дашборд: всего машин, активных поездок, общий пробег за месяц, расходы на бензин за месяц, последние 5 поездок.
- Управление автомобилями (CRUD, госномер уникальный).
- Управление водителями (CRUD, генератор случайного пароля, сброс пароля).
- Журнал поездок с фильтрами (водитель, машина, период).
- Отчёт по заправкам с итогами по сумме и литрам.

### PWA / офлайн
- Service Worker с предкэшем интерфейса.
- IndexedDB-очередь: фото и отложенные действия сохраняются локально без сети.
- Полоса статуса сети: жёлтая «Нет сети…» / синяя «Синхронизация…».
- Автоматическая синхронизация при появлении сети и при возврате во вкладку.
- Сжатие фотографий на клиенте (canvas, до 1600px / JPEG q=0.8) перед отправкой.
- Установка на главный экран через браузер (Add to Home Screen).

## Безопасность

- Пароли хешируются bcrypt (10 раундов).
- JWT подписан секретом из `JWT_SECRET` (по умолчанию dev-значение — обязательно поменяйте в проде).
- Загруженные файлы валидируются по mime-type (только изображения, ≤5 МБ).
- В админских роутах middleware проверяет роль `admin`.

## Примечания

- Тёмная тема, цвета по дизайну ТЗ (`#0D1117`, `#2B7FFF`, `#3FB950`, `#F85149`, `#D29922`).
- Шрифт интерфейса Inter + JetBrains Mono для цифр одометра (Google Fonts).
- Адаптивно: на телефоне — нижняя навигация; на десктопе у админа — боковое меню; на узких экранах — drawer.
