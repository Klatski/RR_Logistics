import { api } from './api.js';

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const MONTHS_UPPER = MONTHS.map((m) => m.toUpperCase());
const WEEKDAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const DEFAULTS = {
  customer: 'АО «ХАБАР»',
  fuelSupplier: 'Helios',
  fuelType: 'АИ-92',
  fuelUnit: 'КМ',
  tankL: 70,
  normL100: 14,
  pricePerL: 236,
  allowedExcessPct: 20,
  minResidueL: 70,
};

const COLORS = {
  headerBg: 'FF1F4E78',
  headerFg: 'FFFFFFFF',
  bandBg: 'FFEAF1F8',
  totalBg: 'FFFFE699',
  warnBg: 'FFFFD6CC',
  okBg: 'FFE2EFDA',
  yellowFill: 'FFFFF2CC',
  border: 'FFB7B7B7',
  titleBg: 'FF1F4E78',
};

function colLetter(n) {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function daysInMonth(year, monthIdx) {
  return new Date(year, monthIdx + 1, 0).getDate();
}

function parseToDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value);
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
  return isNaN(d.getTime()) ? null : d;
}

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function setBorder(cell, style = 'thin') {
  cell.border = {
    top: { style, color: { argb: COLORS.border } },
    left: { style, color: { argb: COLORS.border } },
    bottom: { style, color: { argb: COLORS.border } },
    right: { style, color: { argb: COLORS.border } },
  };
}

function rangeBorder(ws, top, left, bottom, right, style = 'thin') {
  for (let r = top; r <= bottom; r++) {
    for (let c = left; c <= right; c++) {
      setBorder(ws.getCell(r, c), style);
    }
  }
}

function fillCell(cell, argb) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function titleRow(ws, row, lastCol, text) {
  ws.mergeCells(row, 1, row, lastCol);
  const c = ws.getCell(row, 1);
  c.value = text;
  c.font = { bold: true, size: 14, color: { argb: COLORS.headerFg } };
  c.alignment = { vertical: 'middle', horizontal: 'center' };
  fillCell(c, COLORS.titleBg);
  ws.getRow(row).height = 28;
}

function headerCell(cell, text) {
  cell.value = text;
  cell.font = { bold: true, color: { argb: COLORS.headerFg }, size: 11 };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  fillCell(cell, COLORS.headerBg);
  setBorder(cell);
}

function valueCell(cell, value, opts = {}) {
  cell.value = value;
  cell.alignment = { vertical: 'middle', horizontal: opts.align || 'center', wrapText: true };
  if (opts.bold) cell.font = { ...(cell.font || {}), bold: true };
  if (opts.numFmt) cell.numFmt = opts.numFmt;
  if (opts.fill) fillCell(cell, opts.fill);
  setBorder(cell);
}

async function fetchAll({ year, from, to }) {
  const yearFrom = `${year}-01-01`;
  const yearTo = `${year}-12-31`;

  const [cars, driversData, tripsYear, refuelsYear, washesYear] = await Promise.all([
    api.cars.list(),
    api.drivers.list(),
    api.trips.list({ from: yearFrom, to: yearTo }),
    api.refuels.list({ from: yearFrom, to: yearTo }),
    api.carwashes.list({ from: yearFrom, to: yearTo }),
  ]);

  let tripsPeriod = tripsYear.trips;
  let refuelsPeriod = refuelsYear.refuels;
  let washesPeriod = washesYear.carwashes;
  if (from || to) {
    const f = from ? parseToDate(from) : null;
    const t = to ? parseToDate(to) : null;
    const inRange = (dateVal) => {
      const d = parseToDate(dateVal);
      if (!d) return false;
      if (f && d < new Date(f.getFullYear(), f.getMonth(), f.getDate())) return false;
      if (t && d > new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59)) return false;
      return true;
    };
    tripsPeriod = tripsYear.trips.filter((tr) => inRange(tr.start_time));
    refuelsPeriod = refuelsYear.refuels.filter((r) => inRange(r.created_at));
    washesPeriod = washesYear.carwashes.filter((w) => inRange(w.created_at));
  }

  return {
    cars: cars.cars || [],
    drivers: driversData.drivers || [],
    tripsYear: tripsYear.trips || [],
    refuelsYear: refuelsYear.refuels || [],
    washesYear: washesYear.carwashes || [],
    tripsPeriod,
    refuelsPeriod,
    washesPeriod,
  };
}

function indexByDay(items, dateKey, valueKey, carIdKey = 'car_id') {
  // returns Map: carId -> Map<'YYYY-MM-DD', sum>
  const result = new Map();
  for (const item of items) {
    const d = parseToDate(item[dateKey]);
    if (!d) continue;
    const cid = item[carIdKey];
    const key = ymd(d);
    if (!result.has(cid)) result.set(cid, new Map());
    const m = result.get(cid);
    const val = Number(item[valueKey]) || 0;
    m.set(key, (m.get(key) || 0) + val);
  }
  return result;
}

function indexTripsByDay(trips) {
  // carId -> Map<'YYYY-MM-DD', { distance, driverName }>
  const result = new Map();
  for (const t of trips) {
    if (t.status !== 'completed') continue;
    const d = parseToDate(t.end_time || t.start_time);
    if (!d) continue;
    const cid = t.car_id;
    const key = ymd(d);
    if (!result.has(cid)) result.set(cid, new Map());
    const m = result.get(cid);
    const cur = m.get(key) || { distance: 0, drivers: new Set() };
    cur.distance += Number(t.distance) || 0;
    if (t.driver?.name) cur.drivers.add(t.driver.name);
    m.set(key, cur);
  }
  return result;
}

function indexDriverTrips(trips) {
  // driverId -> Map<'YYYY-MM-DD', count>
  const result = new Map();
  for (const t of trips) {
    const d = parseToDate(t.start_time);
    if (!d) continue;
    const did = t.driver_id;
    const key = ymd(d);
    if (!result.has(did)) result.set(did, new Map());
    const m = result.get(did);
    m.set(key, (m.get(key) || 0) + 1);
  }
  return result;
}

function buildSettingsSheet(wb, cars) {
  const ws = wb.addWorksheet('⚙ Настройки', { properties: { tabColor: { argb: 'FFFFC000' } } });
  const lastCol = 1 + cars.length;
  ws.getColumn(1).width = 32;
  for (let i = 0; i < cars.length; i++) ws.getColumn(2 + i).width = 22;

  titleRow(ws, 1, lastCol, `⚙  НАСТРОЙКИ СИСТЕМЫ  |  ${DEFAULTS.customer}`);

  headerCell(ws.getCell(3, 1), 'Параметр');
  cars.forEach((c, i) => headerCell(ws.getCell(3, 2 + i), `Машина ${i + 1} (${c.plate_number})`));

  const rows = [
    ['🚗 Гос. номер (ГРНЗ)', cars.map((c) => c.plate_number)],
    ['🏢 Заказчик', cars.map(() => DEFAULTS.customer)],
    ['⛽ Поставщик ГСМ', cars.map(() => DEFAULTS.fuelSupplier)],
    ['💳 Номер карты ГСМ', cars.map(() => '—')],
    ['🔢 Объём бака (л)', cars.map(() => DEFAULTS.tankL)],
    ['📏 Норма расхода (л/100км)', cars.map(() => DEFAULTS.normL100)],
    ['⛽ Цена ГСМ (₸/л)', cars.map(() => DEFAULTS.pricePerL)],
    ['⚠️ Допуст. перерасход (%)', cars.map(() => DEFAULTS.allowedExcessPct)],
    ['🔔 Не снижаемый остаток (л)', cars.map(() => DEFAULTS.minResidueL)],
  ];
  rows.forEach((r, i) => {
    const rowIdx = 4 + i;
    valueCell(ws.getCell(rowIdx, 1), r[0], { align: 'left', bold: true });
    r[1].forEach((v, idx) => valueCell(ws.getCell(rowIdx, 2 + idx), v, { fill: COLORS.yellowFill }));
  });

  const noteRow = 4 + rows.length + 1;
  ws.mergeCells(noteRow, 1, noteRow, lastCol);
  const note = ws.getCell(noteRow, 1);
  note.value = '💡 Жёлтые ячейки — настройки можно править вручную. Значения по умолчанию подставлены при экспорте.';
  note.font = { italic: true, color: { argb: 'FF555555' } };
  note.alignment = { wrapText: true, vertical: 'middle' };

  return ws;
}

function buildMonthSheet(wb, { year, monthIdx, cars, refuelsYear, washesYear, tripsYear }) {
  const monthName = MONTHS[monthIdx];
  const monthUp = MONTHS_UPPER[monthIdx];
  const dim = daysInMonth(year, monthIdx);
  const ROWS_PER_CAR = 3; // mileage / liters / wash

  const ws = wb.addWorksheet(monthName, { properties: { tabColor: { argb: 'FF4472C4' } } });

  // Cols: A№, B Заказчик, C Наим.ТС, D ГРНЗ, E Поставщик, F Карта ГСМ, G Тип, H Бак, I Метрика
  // J..(I+dim) — дни
  // +1 — ИТОГО
  // +8 — Норма, Факт, Расход норма, Факт расход, Разница, % от нормы, Стоим. факт, СТАТУС
  const dayStartCol = 10; // J
  const dayEndCol = dayStartCol + dim - 1;
  const totalCol = dayEndCol + 1;
  const calcStart = totalCol + 1;
  const lastCol = calcStart + 7;

  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 14;
  ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 11;
  ws.getColumn(5).width = 10;
  ws.getColumn(6).width = 20;
  ws.getColumn(7).width = 7;
  ws.getColumn(8).width = 7;
  ws.getColumn(9).width = 13;
  for (let i = dayStartCol; i <= dayEndCol; i++) ws.getColumn(i).width = 14;
  ws.getColumn(totalCol).width = 16;
  for (let i = calcStart; i <= lastCol; i++) ws.getColumn(i).width = 15;

  titleRow(ws, 1, lastCol, `УЧЁТ ЗАПРАВКИ ГСМ И ПРОБЕГА  |  ${monthUp} ${year}  |  ${DEFAULTS.customer}  |  Поставщик: ${DEFAULTS.fuelSupplier}`);

  ws.mergeCells(2, 1, 2, 9);
  headerCell(ws.getCell(2, 1), 'ИНФОРМАЦИЯ О ТС');
  ws.mergeCells(2, dayStartCol, 2, totalCol);
  headerCell(ws.getCell(2, dayStartCol), 'ЕЖЕДНЕВНЫЙ ПРОБЕГ / ГСМ / МОЙКА');
  ws.mergeCells(2, calcStart, 2, lastCol);
  headerCell(ws.getCell(2, calcStart), 'РАСЧЁТ И КОНТРОЛЬ (по пробегу)');
  ws.getRow(2).height = 22;

  const headers = ['№', 'Заказчик', 'Наим. ТС', 'ГРНЗ', 'Поставщик', 'Номер карты ГСМ', 'Тип\nтоплива', 'Бак\n(л)', 'Метрика'];
  headers.forEach((h, i) => headerCell(ws.getCell(3, 1 + i), h));
  for (let d = 1; d <= dim; d++) {
    const date = new Date(year, monthIdx, d);
    const w = WEEKDAYS_SHORT[date.getDay()];
    headerCell(ws.getCell(3, dayStartCol + d - 1), `${d}\n${w}`);
  }
  headerCell(ws.getCell(3, totalCol), 'ИТОГО');
  const calcHeaders = ['Норма\nл/100км', 'Факт\nл/100км', 'Расход\nпо норме (л)', 'Факт\nрасход (л)', 'Разница\n(л)', '% от\nнормы', 'Стоим.\nфакт (₸)', 'СТАТУС'];
  calcHeaders.forEach((h, i) => headerCell(ws.getCell(3, calcStart + i), h));
  ws.getRow(3).height = 34;

  const mileageIdx = indexTripsByDay(tripsYear);
  const refuelLitersIdx = indexByDay(refuelsYear, 'created_at', 'liters');
  const washIdx = indexByDay(washesYear, 'created_at', 'amount');

  const metricLabels = ['📏 Пробег (км)', '⛽ ГСМ (л)', '🚿 Мойка (₸)'];
  const metricFmts = ['#,##0', '0.00', '#,##0'];
  const metricFills = [null, COLORS.bandBg, null];

  let row = 4;
  cars.forEach((car, ci) => {
    const r1 = row;
    const r3 = row + ROWS_PER_CAR - 1;

    // Merge info cells (columns 1..8) across all metric rows
    for (let c = 1; c <= 8; c++) ws.mergeCells(r1, c, r3, c);
    valueCell(ws.getCell(r1, 1), ci + 1, { bold: true });
    valueCell(ws.getCell(r1, 2), DEFAULTS.customer);
    valueCell(ws.getCell(r1, 3), car.name);
    valueCell(ws.getCell(r1, 4), car.plate_number);
    valueCell(ws.getCell(r1, 5), DEFAULTS.fuelSupplier);
    valueCell(ws.getCell(r1, 6), '—');
    valueCell(ws.getCell(r1, 7), DEFAULTS.fuelType);
    valueCell(ws.getCell(r1, 8), DEFAULTS.tankL);

    // Metric labels in column I
    for (let m = 0; m < ROWS_PER_CAR; m++) {
      valueCell(ws.getCell(r1 + m, 9), metricLabels[m], {
        align: 'left', bold: true, fill: metricFills[m] || (m === 1 ? COLORS.bandBg : null),
      });
    }

    let totalMileage = 0, totalLiters = 0, totalWash = 0, totalAmount = 0;
    const refuelAmountIdx = indexByDay(refuelsYear, 'created_at', 'amount');
    for (let d = 1; d <= dim; d++) {
      const date = new Date(year, monthIdx, d);
      const key = ymd(date);
      const col = dayStartCol + d - 1;
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      const distance = mileageIdx.get(car.id)?.get(key)?.distance || 0;
      const liters = refuelLitersIdx.get(car.id)?.get(key) || 0;
      const amount = refuelAmountIdx.get(car.id)?.get(key) || 0;
      const wash = washIdx.get(car.id)?.get(key) || 0;
      totalMileage += distance;
      totalLiters += liters;
      totalAmount += amount;
      totalWash += wash;

      valueCell(ws.getCell(r1 + 0, col), distance || null, { numFmt: metricFmts[0], fill: isWeekend ? COLORS.bandBg : null });
      valueCell(ws.getCell(r1 + 1, col), liters ? Number(liters.toFixed(2)) : null, { numFmt: metricFmts[1], fill: isWeekend ? COLORS.bandBg : null });
      valueCell(ws.getCell(r1 + 2, col), wash || null, { numFmt: metricFmts[2], fill: isWeekend ? COLORS.bandBg : null });
    }

    valueCell(ws.getCell(r1 + 0, totalCol), totalMileage, { bold: true, fill: COLORS.totalBg, numFmt: '#,##0' });
    valueCell(ws.getCell(r1 + 1, totalCol), Number(totalLiters.toFixed(2)), { bold: true, fill: COLORS.totalBg, numFmt: '0.00' });
    valueCell(ws.getCell(r1 + 2, totalCol), Number(totalWash.toFixed(0)), { bold: true, fill: COLORS.totalBg, numFmt: '#,##0' });

    const norm = DEFAULTS.normL100;
    const allowed = DEFAULTS.allowedExcessPct;
    const expectedL = +((totalMileage * norm) / 100).toFixed(2);
    const factL = Number(totalLiters.toFixed(2));
    const factPer100 = totalMileage > 0 ? +((factL / totalMileage) * 100).toFixed(2) : 0;
    const diffL = +(expectedL - factL).toFixed(2);
    const pctOfNorm = expectedL > 0 ? +(((factL - expectedL) / expectedL) * 100).toFixed(1) : 0;
    const factCost = Number(totalAmount.toFixed(0));
    const status = totalMileage === 0 ? '—' : (pctOfNorm <= allowed ? '✅ ОК' : '⚠️ ПЕРЕРАСХОД');

    // Merge calc block across the car's rows
    for (let c = calcStart; c <= lastCol; c++) ws.mergeCells(r1, c, r3, c);
    valueCell(ws.getCell(r1, calcStart + 0), norm, { numFmt: '0.00' });
    valueCell(ws.getCell(r1, calcStart + 1), factPer100, { numFmt: '0.00' });
    valueCell(ws.getCell(r1, calcStart + 2), expectedL, { numFmt: '0.00' });
    valueCell(ws.getCell(r1, calcStart + 3), factL, { numFmt: '0.00' });
    valueCell(ws.getCell(r1, calcStart + 4), diffL, { numFmt: '0.00' });
    valueCell(ws.getCell(r1, calcStart + 5), pctOfNorm, { numFmt: '0.0"%"' });
    valueCell(ws.getCell(r1, calcStart + 6), factCost, { numFmt: '#,##0" ₸"' });
    valueCell(ws.getCell(r1, calcStart + 7), status, {
      bold: true,
      fill: status.startsWith('⚠️') ? COLORS.warnBg : status === '✅ ОК' ? COLORS.okBg : null,
    });

    row += ROWS_PER_CAR;
  });

  // ИТОГО ПО ПАРКУ — 3 rows
  const totalsRowStart = row;
  ws.mergeCells(totalsRowStart, 1, totalsRowStart, 8);
  valueCell(ws.getCell(totalsRowStart, 1), 'ИТОГО ПО ПАРКУ', { align: 'right', bold: true, fill: COLORS.totalBg });
  ws.mergeCells(totalsRowStart + 1, 1, totalsRowStart + 1, 8);
  valueCell(ws.getCell(totalsRowStart + 1, 1), 'ИТОГО ПО ПАРКУ', { align: 'right', bold: true, fill: COLORS.totalBg });
  ws.mergeCells(totalsRowStart + 2, 1, totalsRowStart + 2, 8);
  valueCell(ws.getCell(totalsRowStart + 2, 1), 'ИТОГО ПО ПАРКУ', { align: 'right', bold: true, fill: COLORS.totalBg });
  for (let m = 0; m < ROWS_PER_CAR; m++) {
    valueCell(ws.getCell(totalsRowStart + m, 9), metricLabels[m], {
      align: 'left', bold: true, fill: COLORS.totalBg,
    });
  }

  for (let d = 1; d <= dim; d++) {
    const col = dayStartCol + d - 1;
    let sumM = 0, sumL = 0, sumW = 0;
    cars.forEach((_, ci) => {
      const rr = 4 + ci * ROWS_PER_CAR;
      const mVal = ws.getCell(rr, col).value;
      const lVal = ws.getCell(rr + 1, col).value;
      const wVal = ws.getCell(rr + 2, col).value;
      if (typeof mVal === 'number') sumM += mVal;
      if (typeof lVal === 'number') sumL += lVal;
      if (typeof wVal === 'number') sumW += wVal;
    });
    valueCell(ws.getCell(totalsRowStart + 0, col), sumM || null, { bold: true, fill: COLORS.totalBg, numFmt: '#,##0' });
    valueCell(ws.getCell(totalsRowStart + 1, col), sumL ? Number(sumL.toFixed(2)) : null, { bold: true, fill: COLORS.totalBg, numFmt: '0.00' });
    valueCell(ws.getCell(totalsRowStart + 2, col), sumW || null, { bold: true, fill: COLORS.totalBg, numFmt: '#,##0' });
  }

  const grandMileage = cars.reduce((acc, _, ci) => acc + (Number(ws.getCell(4 + ci * ROWS_PER_CAR, totalCol).value) || 0), 0);
  const grandLiters = cars.reduce((acc, _, ci) => acc + (Number(ws.getCell(5 + ci * ROWS_PER_CAR, totalCol).value) || 0), 0);
  const grandWash = cars.reduce((acc, _, ci) => acc + (Number(ws.getCell(6 + ci * ROWS_PER_CAR, totalCol).value) || 0), 0);
  const grandCost = cars.reduce((acc, _, ci) => acc + (Number(ws.getCell(4 + ci * ROWS_PER_CAR, calcStart + 6).value) || 0), 0);

  valueCell(ws.getCell(totalsRowStart + 0, totalCol), grandMileage, { bold: true, fill: COLORS.totalBg, numFmt: '#,##0' });
  valueCell(ws.getCell(totalsRowStart + 1, totalCol), Number(grandLiters.toFixed(2)), { bold: true, fill: COLORS.totalBg, numFmt: '0.00' });
  valueCell(ws.getCell(totalsRowStart + 2, totalCol), grandWash, { bold: true, fill: COLORS.totalBg, numFmt: '#,##0' });

  // ИТОГО ₸ row across calc area
  ws.mergeCells(totalsRowStart, calcStart, totalsRowStart, calcStart + 6);
  valueCell(ws.getCell(totalsRowStart, calcStart), 'ИТОГО ₸:', { align: 'right', bold: true, fill: COLORS.totalBg });
  valueCell(ws.getCell(totalsRowStart, lastCol), grandCost, { bold: true, fill: COLORS.totalBg, numFmt: '#,##0" ₸"' });

  rangeBorder(ws, 2, 1, totalsRowStart + 2, lastCol);
  ws.views = [{ state: 'frozen', xSplit: 9, ySplit: 3 }];
  return { totalMileage: grandMileage, totalLiters: grandLiters, totalWash: grandWash, totalCost: grandCost };
}

function buildDashboardSheet(wb, { year, fromDate, toDate, cars, monthlyTotals, periodMetrics }) {
  const ws = wb.addWorksheet('📋 ДАШБОРД', { properties: { tabColor: { argb: 'FF1F4E78' } } });
  const lastCol = 1 + cars.length + 1; // Параметр + по машинам + ПО ПАРКУ
  ws.getColumn(1).width = 32;
  for (let i = 0; i < cars.length; i++) ws.getColumn(2 + i).width = 18;
  ws.getColumn(lastCol).width = 18;

  titleRow(ws, 1, lastCol, `📋  ДАШБОРД РУКОВОДИТЕЛЯ  |  ${DEFAULTS.customer}  |  ${year}`);

  headerCell(ws.getCell(3, 1), 'Показатель');
  cars.forEach((c, i) => headerCell(ws.getCell(3, 2 + i), c.plate_number));
  headerCell(ws.getCell(3, lastCol), 'ПО ПАРКУ');

  ws.mergeCells(4, 1, 4, lastCol);
  const periodLabel = (fromDate && toDate)
    ? `── ${fromDate.toLocaleDateString('ru-RU')} — ${toDate.toLocaleDateString('ru-RU')} ──────────────────`
    : `── ${year} ──────────────────`;
  valueCell(ws.getCell(4, 1), periodLabel, { bold: true, fill: COLORS.bandBg, align: 'center' });

  // Per-car metrics for the selected period
  const perCar = cars.map((c) => periodMetrics.byCar.get(c.id) || { mileage: 0, liters: 0, wash: 0, amount: 0 });
  const grandMileage = perCar.reduce((a, m) => a + m.mileage, 0);
  const grandLiters = perCar.reduce((a, m) => a + m.liters, 0);
  const grandWash = perCar.reduce((a, m) => a + m.wash, 0);
  const grandAmount = perCar.reduce((a, m) => a + m.amount, 0);
  const norm = DEFAULTS.normL100;
  const price = DEFAULTS.pricePerL;
  const allowed = DEFAULTS.allowedExcessPct;

  const rows = [
    ['📏 Общий пробег (км)', perCar.map((m) => m.mileage), grandMileage, '#,##0'],
    ['⛽ Заправлено (л)', perCar.map((m) => Number(m.liters.toFixed(2))), Number(grandLiters.toFixed(2)), '0.00'],
    ['📐 Расход по норме (л)', perCar.map((m) => Number(((m.mileage * norm) / 100).toFixed(2))), Number(((grandMileage * norm) / 100).toFixed(2)), '0.00'],
    ['🔥 Факт расход (л)', perCar.map((m) => Number(m.liters.toFixed(2))), Number(grandLiters.toFixed(2)), '0.00'],
    ['⚖️ Разница норма-факт (л)', perCar.map((m) => Number(((m.mileage * norm) / 100 - m.liters).toFixed(2))), Number((grandMileage * norm / 100 - grandLiters).toFixed(2)), '0.00'],
    ['📊 % отклонения от нормы', perCar.map((m) => {
      const exp = (m.mileage * norm) / 100;
      return exp > 0 ? Number((((m.liters - exp) / exp) * 100).toFixed(1)) : 0;
    }), (() => {
      const exp = (grandMileage * norm) / 100;
      return exp > 0 ? Number((((grandLiters - exp) / exp) * 100).toFixed(1)) : 0;
    })(), '0.0"%"'],
    ['💰 Стоимость топлива (₸)', perCar.map((m) => Number(m.amount.toFixed(0))), Number(grandAmount.toFixed(0)), '#,##0" ₸"'],
    ['🚿 Мойка (₸)', perCar.map((m) => Number(m.wash.toFixed(0))), Number(grandWash.toFixed(0)), '#,##0" ₸"'],
  ];
  rows.forEach((r, i) => {
    const row = 5 + i;
    valueCell(ws.getCell(row, 1), r[0], { align: 'left', bold: true });
    r[1].forEach((v, idx) => valueCell(ws.getCell(row, 2 + idx), v, { numFmt: r[3] }));
    valueCell(ws.getCell(row, lastCol), r[2], { bold: true, fill: COLORS.totalBg, numFmt: r[3] });
  });

  // СТАТУС row
  const statusRow = 5 + rows.length;
  valueCell(ws.getCell(statusRow, 1), '✅ СТАТУС', { align: 'left', bold: true });
  perCar.forEach((m, idx) => {
    const exp = (m.mileage * norm) / 100;
    const pct = exp > 0 ? ((m.liters - exp) / exp) * 100 : 0;
    const status = m.mileage === 0 ? '—' : pct <= allowed ? '✅ ОК' : '⚠️ ПЕРЕРАСХОД';
    valueCell(ws.getCell(statusRow, 2 + idx), status, {
      bold: true,
      fill: status.startsWith('⚠️') ? COLORS.warnBg : status === '✅ ОК' ? COLORS.okBg : null,
    });
  });
  const parkExp = (grandMileage * norm) / 100;
  const parkPct = parkExp > 0 ? ((grandLiters - parkExp) / parkExp) * 100 : 0;
  const parkStatus = grandMileage === 0 ? '—' : parkPct <= allowed ? '✅ ОК' : '⚠️ ПЕРЕРАСХОД';
  valueCell(ws.getCell(statusRow, lastCol), parkStatus, {
    bold: true,
    fill: parkStatus.startsWith('⚠️') ? COLORS.warnBg : parkStatus === '✅ ОК' ? COLORS.okBg : null,
  });

  rangeBorder(ws, 3, 1, statusRow, lastCol);

  // Note
  const noteRow = statusRow + 2;
  ws.mergeCells(noteRow, 1, noteRow, lastCol);
  const note = ws.getCell(noteRow, 1);
  note.value = '💡 Данные собраны из PWA автоматически. Норма, цена и допустимый перерасход — настройки на листе «⚙ Настройки».';
  note.font = { italic: true, color: { argb: 'FF555555' } };
  note.alignment = { wrapText: true, vertical: 'middle' };

  return ws;
}

function buildAllProjectsSheet(wb, { year, cars, monthlyTotals }) {
  const ws = wb.addWorksheet('📊 ВСЕ ПРОЕКТЫ', { properties: { tabColor: { argb: 'FF70AD47' } } });
  // Cols: №, Наим. ТС, ГРНЗ, Тип, [Пробег|ГСМ] × 12 месяцев, ИТОГО Пробег, ИТОГО ГСМ, ИТОГО ₸, СТАТУС
  const fixedCols = 4;
  const monthCols = 12 * 2;
  const tailCols = 4;
  const lastCol = fixedCols + monthCols + tailCols;

  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 6;
  for (let i = 0; i < monthCols; i++) ws.getColumn(fixedCols + 1 + i).width = 13;
  ws.getColumn(fixedCols + monthCols + 1).width = 14;
  ws.getColumn(fixedCols + monthCols + 2).width = 14;
  ws.getColumn(fixedCols + monthCols + 3).width = 16;
  ws.getColumn(fixedCols + monthCols + 4).width = 16;

  titleRow(ws, 1, lastCol, `СВОДНЫЙ ГОДОВОЙ ОТЧЁТ  |  ${DEFAULTS.customer}  |  ${year}`);

  // Row 3 — group headers
  ['№', 'Наим. ТС', 'ГРНЗ', 'Тип'].forEach((h, i) => {
    ws.mergeCells(3, i + 1, 4, i + 1);
    headerCell(ws.getCell(3, i + 1), h);
  });
  for (let mi = 0; mi < 12; mi++) {
    const c1 = fixedCols + 1 + mi * 2;
    const c2 = c1 + 1;
    ws.mergeCells(3, c1, 3, c2);
    headerCell(ws.getCell(3, c1), MONTHS[mi].slice(0, 4));
    headerCell(ws.getCell(4, c1), 'Пробег');
    headerCell(ws.getCell(4, c2), 'ГСМ (л)');
  }
  const tailLabels = ['ИТОГО\nПробег', 'ИТОГО\nГСМ (л)', 'ИТОГО\n₸', 'СТАТУС'];
  tailLabels.forEach((h, i) => {
    ws.mergeCells(3, fixedCols + monthCols + 1 + i, 4, fixedCols + monthCols + 1 + i);
    headerCell(ws.getCell(3, fixedCols + monthCols + 1 + i), h);
  });
  ws.getRow(3).height = 22;
  ws.getRow(4).height = 22;

  cars.forEach((car, ci) => {
    const row = 5 + ci;
    valueCell(ws.getCell(row, 1), ci + 1, { bold: true });
    valueCell(ws.getCell(row, 2), car.name);
    valueCell(ws.getCell(row, 3), car.plate_number);
    valueCell(ws.getCell(row, 4), 'КМ');

    let yearMileage = 0, yearLiters = 0, yearCost = 0;
    for (let mi = 0; mi < 12; mi++) {
      const c1 = fixedCols + 1 + mi * 2;
      const c2 = c1 + 1;
      const stat = monthlyTotals[mi]?.byCar?.get(car.id) || { mileage: 0, liters: 0, amount: 0 };
      yearMileage += stat.mileage;
      yearLiters += stat.liters;
      yearCost += stat.amount;
      valueCell(ws.getCell(row, c1), stat.mileage || null, { numFmt: '#,##0' });
      valueCell(ws.getCell(row, c2), stat.liters ? Number(stat.liters.toFixed(2)) : null, { numFmt: '0.00' });
    }

    const norm = DEFAULTS.normL100;
    const exp = (yearMileage * norm) / 100;
    const pct = exp > 0 ? ((yearLiters - exp) / exp) * 100 : 0;
    const status = yearMileage === 0 ? '—' : pct <= DEFAULTS.allowedExcessPct ? '✅ ОК' : '⚠️ ПЕРЕРАСХОД';

    valueCell(ws.getCell(row, fixedCols + monthCols + 1), yearMileage, { bold: true, fill: COLORS.totalBg, numFmt: '#,##0' });
    valueCell(ws.getCell(row, fixedCols + monthCols + 2), Number(yearLiters.toFixed(2)), { bold: true, fill: COLORS.totalBg, numFmt: '0.00' });
    valueCell(ws.getCell(row, fixedCols + monthCols + 3), Number(yearCost.toFixed(0)), { bold: true, fill: COLORS.totalBg, numFmt: '#,##0" ₸"' });
    valueCell(ws.getCell(row, fixedCols + monthCols + 4), status, {
      bold: true,
      fill: status.startsWith('⚠️') ? COLORS.warnBg : status === '✅ ОК' ? COLORS.okBg : null,
    });
  });

  // ИТОГО по парку
  const totalRow = 5 + cars.length;
  ws.mergeCells(totalRow, 1, totalRow, 4);
  valueCell(ws.getCell(totalRow, 1), 'ИТОГО ПО ПАРКУ', { align: 'right', bold: true, fill: COLORS.totalBg });
  let parkMileage = 0, parkLiters = 0, parkCost = 0;
  for (let mi = 0; mi < 12; mi++) {
    const c1 = fixedCols + 1 + mi * 2;
    const c2 = c1 + 1;
    let sumM = 0, sumL = 0;
    cars.forEach((car) => {
      const s = monthlyTotals[mi]?.byCar?.get(car.id) || { mileage: 0, liters: 0, amount: 0 };
      sumM += s.mileage; sumL += s.liters; parkCost += s.amount;
    });
    parkMileage += sumM; parkLiters += sumL;
    valueCell(ws.getCell(totalRow, c1), sumM || null, { bold: true, fill: COLORS.totalBg, numFmt: '#,##0' });
    valueCell(ws.getCell(totalRow, c2), sumL ? Number(sumL.toFixed(2)) : null, { bold: true, fill: COLORS.totalBg, numFmt: '0.00' });
  }
  valueCell(ws.getCell(totalRow, fixedCols + monthCols + 1), parkMileage, { bold: true, fill: COLORS.totalBg, numFmt: '#,##0' });
  valueCell(ws.getCell(totalRow, fixedCols + monthCols + 2), Number(parkLiters.toFixed(2)), { bold: true, fill: COLORS.totalBg, numFmt: '0.00' });
  valueCell(ws.getCell(totalRow, fixedCols + monthCols + 3), Number(parkCost.toFixed(0)), { bold: true, fill: COLORS.totalBg, numFmt: '#,##0" ₸"' });
  valueCell(ws.getCell(totalRow, fixedCols + monthCols + 4), '—', { bold: true, fill: COLORS.totalBg });

  rangeBorder(ws, 3, 1, totalRow, lastCol);
  ws.views = [{ state: 'frozen', xSplit: 4, ySplit: 4 }];
  return ws;
}

function buildScheduleSheet(wb, { year, monthIdx, drivers, cars, tripsYear, refuelsYear, washesYear }) {
  const monthName = MONTHS[monthIdx];
  const dim = daysInMonth(year, monthIdx);
  const ws = wb.addWorksheet(`🚗 График ${monthName}`, { properties: { tabColor: { argb: 'FFC65911' } } });

  const dayStartCol = 3; // C
  const dayEndCol = dayStartCol + dim - 1;
  const tailStart = dayEndCol + 1;
  // Driver schedule: Кол-во дн. смен, Опл. дн., Опл. ноч., К выплате, Примечание (5 cols)
  const driverTailCount = 5;
  const driverLastCol = tailStart + driverTailCount - 1;
  const lastCol = driverLastCol;

  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 24;
  for (let i = dayStartCol; i <= dayEndCol; i++) ws.getColumn(i).width = 12;
  for (let i = tailStart; i <= driverLastCol; i++) ws.getColumn(i).width = 15;

  titleRow(ws, 1, lastCol, `ГРАФИК РАБОТЫ  |  ${monthName.toUpperCase()} ${year}  |  ${DEFAULTS.customer}`);

  // Section 1: Driver schedule
  let row = 2;
  ws.mergeCells(row, 1, row, lastCol);
  valueCell(ws.getCell(row, 1), 'Раздел 1. График работы водителей', { align: 'left', bold: true, fill: COLORS.bandBg });
  row++;
  const sec1HeaderRow = row;
  ws.mergeCells(row, 1, row + 1, 1); headerCell(ws.getCell(row, 1), '№');
  ws.mergeCells(row, 2, row + 1, 2); headerCell(ws.getCell(row, 2), 'Ф.И.О');
  for (let d = 1; d <= dim; d++) {
    const date = new Date(year, monthIdx, d);
    headerCell(ws.getCell(row, dayStartCol + d - 1), WEEKDAYS_SHORT[date.getDay()]);
    headerCell(ws.getCell(row + 1, dayStartCol + d - 1), d);
  }
  ['Кол-во\nдн. смен', 'Опл.\nдневная', 'Опл.\nночная', 'К выплате', 'Примечание'].forEach((h, i) => {
    ws.mergeCells(row, tailStart + i, row + 1, tailStart + i);
    headerCell(ws.getCell(row, tailStart + i), h);
  });
  row += 2;

  const driverTrips = indexDriverTrips(tripsYear);
  drivers.forEach((drv, di) => {
    const r = row + di;
    valueCell(ws.getCell(r, 1), di + 1, { bold: true });
    valueCell(ws.getCell(r, 2), drv.name, { align: 'left' });
    let shifts = 0;
    for (let d = 1; d <= dim; d++) {
      const date = new Date(year, monthIdx, d);
      const key = ymd(date);
      const cnt = driverTrips.get(drv.id)?.get(key);
      const col = dayStartCol + d - 1;
      if (cnt) {
        valueCell(ws.getCell(r, col), 1, { bold: true, fill: COLORS.okBg });
        shifts += 1;
      } else {
        valueCell(ws.getCell(r, col), null);
        if (date.getDay() === 0 || date.getDay() === 6) fillCell(ws.getCell(r, col), COLORS.bandBg);
      }
    }
    valueCell(ws.getCell(r, tailStart), shifts, { bold: true, fill: COLORS.totalBg });
    valueCell(ws.getCell(r, tailStart + 1), 11365, { numFmt: '#,##0' });
    valueCell(ws.getCell(r, tailStart + 2), 25000, { numFmt: '#,##0' });
    valueCell(ws.getCell(r, tailStart + 3), Number((shifts * 11365).toFixed(0)), { bold: true, fill: COLORS.totalBg, numFmt: '#,##0' });
    valueCell(ws.getCell(r, tailStart + 4), '', { align: 'left' });
  });

  let nextRow = row + drivers.length + 2;

  // Section 2: Refuels per car/day
  ws.mergeCells(nextRow, 1, nextRow, lastCol);
  valueCell(ws.getCell(nextRow, 1), 'Раздел 2. Заправка ГСМ (л) по дням', { align: 'left', bold: true, fill: COLORS.bandBg });
  nextRow++;
  ws.mergeCells(nextRow, 1, nextRow + 1, 1); headerCell(ws.getCell(nextRow, 1), '№');
  ws.mergeCells(nextRow, 2, nextRow + 1, 2); headerCell(ws.getCell(nextRow, 2), 'Автомобиль');
  for (let d = 1; d <= dim; d++) {
    const date = new Date(year, monthIdx, d);
    headerCell(ws.getCell(nextRow, dayStartCol + d - 1), WEEKDAYS_SHORT[date.getDay()]);
    headerCell(ws.getCell(nextRow + 1, dayStartCol + d - 1), d);
  }
  ws.mergeCells(nextRow, tailStart, nextRow + 1, tailStart);
  headerCell(ws.getCell(nextRow, tailStart), 'Итого (л)');
  nextRow += 2;

  const refuelLitersIdx = indexByDay(refuelsYear, 'created_at', 'liters');
  cars.forEach((car, ci) => {
    const r = nextRow + ci;
    valueCell(ws.getCell(r, 1), ci + 1, { bold: true });
    valueCell(ws.getCell(r, 2), `${car.name} ${car.plate_number}`, { align: 'left' });
    let sum = 0;
    for (let d = 1; d <= dim; d++) {
      const date = new Date(year, monthIdx, d);
      const key = ymd(date);
      const liters = refuelLitersIdx.get(car.id)?.get(key) || 0;
      sum += liters;
      const col = dayStartCol + d - 1;
      valueCell(ws.getCell(r, col), liters || null, { numFmt: '0.00' });
      if (date.getDay() === 0 || date.getDay() === 6) {
        if (!liters) fillCell(ws.getCell(r, col), COLORS.bandBg);
      }
    }
    valueCell(ws.getCell(r, tailStart), Number(sum.toFixed(2)), { bold: true, fill: COLORS.totalBg, numFmt: '0.00' });
  });

  nextRow = nextRow + cars.length + 2;

  // Section 3: Wash per car/day
  ws.mergeCells(nextRow, 1, nextRow, lastCol);
  valueCell(ws.getCell(nextRow, 1), 'Раздел 3. Мойка авто (₸) по дням', { align: 'left', bold: true, fill: COLORS.bandBg });
  nextRow++;
  ws.mergeCells(nextRow, 1, nextRow + 1, 1); headerCell(ws.getCell(nextRow, 1), '№');
  ws.mergeCells(nextRow, 2, nextRow + 1, 2); headerCell(ws.getCell(nextRow, 2), 'Автомобиль');
  for (let d = 1; d <= dim; d++) {
    const date = new Date(year, monthIdx, d);
    headerCell(ws.getCell(nextRow, dayStartCol + d - 1), WEEKDAYS_SHORT[date.getDay()]);
    headerCell(ws.getCell(nextRow + 1, dayStartCol + d - 1), d);
  }
  ws.mergeCells(nextRow, tailStart, nextRow + 1, tailStart);
  headerCell(ws.getCell(nextRow, tailStart), 'Итого (₸)');
  nextRow += 2;

  const washIdx = indexByDay(washesYear, 'created_at', 'amount');
  cars.forEach((car, ci) => {
    const r = nextRow + ci;
    valueCell(ws.getCell(r, 1), ci + 1, { bold: true });
    valueCell(ws.getCell(r, 2), `${car.name} ${car.plate_number}`, { align: 'left' });
    let sum = 0;
    for (let d = 1; d <= dim; d++) {
      const date = new Date(year, monthIdx, d);
      const key = ymd(date);
      const amount = washIdx.get(car.id)?.get(key) || 0;
      sum += amount;
      const col = dayStartCol + d - 1;
      valueCell(ws.getCell(r, col), amount || null, { numFmt: '#,##0' });
      if (date.getDay() === 0 || date.getDay() === 6) {
        if (!amount) fillCell(ws.getCell(r, col), COLORS.bandBg);
      }
    }
    valueCell(ws.getCell(r, tailStart), Number(sum.toFixed(0)), { bold: true, fill: COLORS.totalBg, numFmt: '#,##0' });
  });

  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 3 }];
  return ws;
}

function aggregateByCar(items, dateKey, getValue, carIdKey = 'car_id') {
  const m = new Map();
  for (const it of items) {
    const cid = it[carIdKey];
    const v = getValue(it);
    if (!v) continue;
    m.set(cid, (m.get(cid) || 0) + v);
  }
  return m;
}

function buildMonthlyTotals({ year, cars, tripsYear, refuelsYear, washesYear }) {
  const result = [];
  for (let mi = 0; mi < 12; mi++) {
    const byCar = new Map();
    cars.forEach((c) => byCar.set(c.id, { mileage: 0, liters: 0, amount: 0, wash: 0 }));
    tripsYear.forEach((t) => {
      if (t.status !== 'completed') return;
      const d = parseToDate(t.end_time || t.start_time);
      if (!d || d.getFullYear() !== year || d.getMonth() !== mi) return;
      const rec = byCar.get(t.car_id);
      if (rec) rec.mileage += Number(t.distance) || 0;
    });
    refuelsYear.forEach((r) => {
      const d = parseToDate(r.created_at);
      if (!d || d.getFullYear() !== year || d.getMonth() !== mi) return;
      const rec = byCar.get(r.car_id);
      if (rec) {
        rec.liters += Number(r.liters) || 0;
        rec.amount += Number(r.amount) || 0;
      }
    });
    washesYear.forEach((w) => {
      const d = parseToDate(w.created_at);
      if (!d || d.getFullYear() !== year || d.getMonth() !== mi) return;
      const rec = byCar.get(w.car_id);
      if (rec) rec.wash += Number(w.amount) || 0;
    });
    result.push({ byCar });
  }
  return result;
}

function buildPeriodMetrics({ cars, tripsPeriod, refuelsPeriod, washesPeriod }) {
  const byCar = new Map();
  cars.forEach((c) => byCar.set(c.id, { mileage: 0, liters: 0, amount: 0, wash: 0 }));
  tripsPeriod.forEach((t) => {
    if (t.status !== 'completed') return;
    const rec = byCar.get(t.car_id);
    if (rec) rec.mileage += Number(t.distance) || 0;
  });
  refuelsPeriod.forEach((r) => {
    const rec = byCar.get(r.car_id);
    if (rec) {
      rec.liters += Number(r.liters) || 0;
      rec.amount += Number(r.amount) || 0;
    }
  });
  washesPeriod.forEach((w) => {
    const rec = byCar.get(w.car_id);
    if (rec) rec.wash += Number(w.amount) || 0;
  });
  return { byCar };
}

function getMonthsInRange(fromDate, toDate) {
  // returns array of { year, monthIdx } months that intersect [fromDate, toDate]
  const result = [];
  const cur = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  const end = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
  while (cur <= end) {
    result.push({ year: cur.getFullYear(), monthIdx: cur.getMonth() });
    cur.setMonth(cur.getMonth() + 1);
  }
  return result;
}

function triggerDownload(buffer, filename) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function exportDashboardToExcel({ from, to } = {}) {
  const today = new Date();
  let fromDate = from ? parseToDate(from) : null;
  let toDate = to ? parseToDate(to) : null;
  if (!fromDate && !toDate) {
    fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
    toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  } else if (fromDate && !toDate) {
    toDate = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 0);
  } else if (!fromDate && toDate) {
    fromDate = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
  }

  const year = fromDate.getFullYear();
  const [{ default: ExcelJS }, data] = await Promise.all([
    import('exceljs'),
    fetchAll({ year, from: ymd(fromDate), to: ymd(toDate) }),
  ]);
  const { cars, drivers, tripsYear, refuelsYear, washesYear, tripsPeriod, refuelsPeriod, washesPeriod } = data;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'RR Logistics PWA';
  wb.created = new Date();

  const monthlyTotals = buildMonthlyTotals({ year, cars, tripsYear, refuelsYear, washesYear });
  const periodMetrics = buildPeriodMetrics({ cars, tripsPeriod, refuelsPeriod, washesPeriod });

  buildDashboardSheet(wb, { year, fromDate, toDate, cars, monthlyTotals, periodMetrics });
  buildSettingsSheet(wb, cars);
  buildAllProjectsSheet(wb, { year, cars, monthlyTotals });

  const months = getMonthsInRange(fromDate, toDate);
  for (const { year: y, monthIdx } of months) {
    buildMonthSheet(wb, { year: y, monthIdx, cars, refuelsYear, washesYear, tripsYear });
    buildScheduleSheet(wb, { year: y, monthIdx, drivers, cars, tripsYear, refuelsYear, washesYear });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const fname = months.length === 1
    ? `RRL-Отчёт-${MONTHS[months[0].monthIdx]}-${year}.xlsx`
    : `RRL-Отчёт-${ymd(fromDate)}_${ymd(toDate)}.xlsx`;
  triggerDownload(buffer, fname);
  return { fname, monthsCount: months.length };
}
