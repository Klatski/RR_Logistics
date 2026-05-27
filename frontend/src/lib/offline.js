import { get, set, del, keys } from 'idb-keyval';
import { api, request } from './api.js';

const PHOTO_PREFIX = 'photo:';
const PENDING_PREFIX = 'pending:';

export async function savePendingPhoto(localId, blob) {
  await set(PHOTO_PREFIX + localId, blob);
}

export async function getPendingPhoto(localId) {
  return get(PHOTO_PREFIX + localId);
}

export async function removePendingPhoto(localId) {
  await del(PHOTO_PREFIX + localId);
}

export async function savePendingAction(id, action) {
  await set(PENDING_PREFIX + id, action);
}

export async function getPendingActions() {
  const all = await keys();
  const result = [];
  for (const k of all) {
    if (typeof k === 'string' && k.startsWith(PENDING_PREFIX)) {
      const v = await get(k);
      result.push({ key: k, action: v });
    }
  }
  return result;
}

export async function removePendingAction(key) {
  await del(key);
}

export async function uploadAllPendingPhotos() {
  const all = await keys();
  const map = {};
  for (const k of all) {
    if (typeof k === 'string' && k.startsWith(PHOTO_PREFIX)) {
      const localId = k.slice(PHOTO_PREFIX.length);
      try {
        const blob = await get(k);
        if (!blob) continue;
        const { url } = await api.uploads.upload(blob, `${localId}.jpg`);
        map[localId] = url;
        await del(k);
      } catch (e) {
        console.warn('[offline] не удалось загрузить', k, e);
      }
    }
  }
  return map;
}

export async function syncPendingActions() {
  const uploaded = await uploadAllPendingPhotos();
  const actions = await getPendingActions();
  for (const { key, action } of actions) {
    try {
      const body = JSON.parse(JSON.stringify(action.body));
      for (const field of action.photoFields || []) {
        const localRef = body[field];
        if (typeof localRef === 'string' && localRef.startsWith('local:')) {
          const localId = localRef.slice('local:'.length);
          if (uploaded[localId]) body[field] = uploaded[localId];
          else throw new Error('Фото ещё не загружено');
        }
      }
      if (action.refuelPhotoFields) {
        for (const field of action.refuelPhotoFields) {
          const localRef = body.refuel && body.refuel[field];
          if (typeof localRef === 'string' && localRef.startsWith('local:')) {
            const localId = localRef.slice('local:'.length);
            if (uploaded[localId]) body.refuel[field] = uploaded[localId];
            else throw new Error('Фото заправки ещё не загружено');
          }
        }
      }
      if (action.carwashPhotoFields) {
        for (const field of action.carwashPhotoFields) {
          const localRef = body.carwash && body.carwash[field];
          if (typeof localRef === 'string' && localRef.startsWith('local:')) {
            const localId = localRef.slice('local:'.length);
            if (uploaded[localId]) body.carwash[field] = uploaded[localId];
            else throw new Error('Фото мойки ещё не загружено');
          }
        }
      }
      try {
        await request(action.path, { method: action.method, body });
        await removePendingAction(key);
      } catch (e) {
        const status = e && typeof e.status === 'number' ? e.status : null;
        // 2xx уже обработано выше. Удаляем только при постоянных клиентских ошибках
        // (400/403/404/409 и т.п.). Сохраняем при 401 (может починиться после re-login),
        // 5xx и сетевых сбоях (status=0).
        if (status !== null && status >= 400 && status < 500 && status !== 401) {
          console.warn('[offline] действие отклонено сервером, удаляем', key, e);
          await removePendingAction(key);
        } else {
          console.warn('[offline] действие отложено до следующей синхронизации', key, e);
        }
      }
    } catch (e) {
      // Ошибка подготовки body (например, фото ещё не залилось) — оставляем в очереди
      console.warn('[offline] подготовка действия не удалась', key, e);
    }
  }
}

export function uuid() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
