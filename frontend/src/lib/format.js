export function formatKm(value) {
  if (value == null) return '—';
  return Number(value).toLocaleString('ru-RU') + ' км';
}

export function formatNumber(value) {
  if (value == null) return '—';
  return Number(value).toLocaleString('ru-RU');
}

export function formatMoney(value) {
  if (value == null) return '—';
  return Number(value).toLocaleString('ru-RU') + ' ₸';
}

export function formatLiters(value) {
  if (value == null) return '—';
  return Number(value).toFixed(2).replace('.', ',') + ' л';
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(start, end) {
  if (!start || !end) return '—';
  const s = new Date(start.includes('T') ? start : start.replace(' ', 'T') + 'Z').getTime();
  const e = new Date(end.includes('T') ? end : end.replace(' ', 'T') + 'Z').getTime();
  if (isNaN(s) || isNaN(e)) return '—';
  const diff = Math.max(0, e - s);
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours === 0) return `${mins} мин`;
  if (mins === 0) return `${hours} ч`;
  return `${hours} ч ${mins} мин`;
}

export function statusLabel(status) {
  switch (status) {
    case 'available': return 'Доступна';
    case 'in_trip': return 'В поездке';
    case 'maintenance': return 'На обслуживании';
    case 'active': return 'Активна';
    case 'completed': return 'Завершена';
    default: return status;
  }
}
