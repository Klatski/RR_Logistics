import { useEffect, useState, useCallback, useRef } from 'react';
import { Icon } from '../../components/Icons.jsx';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../components/Toast.jsx';
import { formatKm, statusLabel } from '../../lib/format.js';
import { compressImage } from '../../lib/photo.js';

const STATUSES = [
  { value: 'available', label: 'Доступна' },
  { value: 'maintenance', label: 'На обслуживании' },
];

function emptyForm() {
  return { name: '', plate_number: '', current_odometer: '', status: 'available', photo_url: '' };
}

export default function CarsAdminScreen() {
  const toast = useToast();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const photoInputRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    api.cars.list()
      .then((r) => setCars(r.cars))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing('new');
    setForm(emptyForm());
  }

  function openEdit(car) {
    setEditing(car.id);
    setForm({
      name: car.name,
      plate_number: car.plate_number,
      current_odometer: car.current_odometer,
      status: car.status === 'in_trip' ? 'available' : car.status,
      photo_url: car.photo_url || '',
    });
  }

  async function handlePhotoFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const blob = await compressImage(file, { maxDim: 1200, quality: 0.85 });
      const { url } = await api.uploads.upload(blob || file, 'car-photo.jpg');
      setForm((f) => ({ ...f, photo_url: url }));
      toast.success('Фото загружено');
    } catch (err) {
      toast.error('Ошибка загрузки фото');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        plate_number: form.plate_number.trim(),
        current_odometer: Number(form.current_odometer) || 0,
        status: form.status,
        photo_url: form.photo_url || null,
      };
      if (editing === 'new') {
        await api.cars.create(payload);
        toast.success('Автомобиль добавлен');
      } else {
        await api.cars.update(editing, payload);
        toast.success('Автомобиль обновлён');
      }
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    try {
      await api.cars.remove(id);
      toast.success('Автомобиль удалён');
      setConfirmDelete(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head">
        <h1>Автомобили</h1>
        <button className="btn" onClick={openCreate}><Icon name="plus" size={18} />Добавить</button>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 120 }} />
      ) : cars.length === 0 ? (
        <div className="empty-state">
          <Icon name="car" size={48} /><div>Машин пока нет</div>
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Госномер</th>
                  <th>Пробег</th>
                  <th>Статус</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cars.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.plate_number}</td>
                    <td className="mono">{formatKm(c.current_odometer)}</td>
                    <td><span className={`badge badge--${c.status}`}>{statusLabel(c.status)}</span></td>
                    <td className="actions">
                      <button className="icon-btn" onClick={() => openEdit(c)} aria-label="Редактировать">
                        <Icon name="pencil" size={16} />
                      </button>
                      <button
                        className="icon-btn icon-btn--danger"
                        onClick={() => setConfirmDelete(c)}
                        aria-label="Удалить"
                        disabled={c.status === 'in_trip'}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => !saving && setEditing(null)}
        title={editing === 'new' ? 'Новый автомобиль' : 'Редактировать автомобиль'}
      >
        <form onSubmit={save} className="stack">
          <div className="field">
            <label>Марка / модель</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="field">
            <label>Госномер</label>
            <input className="input" value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value })} required />
          </div>
          <div className="field">
            <label>Начальный пробег</label>
            <input type="number" inputMode="numeric" className="input" value={form.current_odometer} onChange={(e) => setForm({ ...form, current_odometer: e.target.value })} />
          </div>
          <div className="field">
            <label>Статус</label>
            <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Фото автомобиля */}
          <div className="field">
            <label>Фото автомобиля</label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoFile}
            />
            {form.photo_url ? (
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
                <img
                  src={form.photo_url}
                  alt="Фото авто"
                  style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }}
                />
                <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn--small btn--secondary"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    <Icon name="camera" size={14} /> Заменить
                  </button>
                  <button
                    type="button"
                    className="btn btn--small btn--danger"
                    onClick={() => setForm((f) => ({ ...f, photo_url: '' }))}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="photo-area"
                style={{ minHeight: 100 }}
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? <span className="spinner" /> : <Icon name="camera" size={28} />}
                <span>{uploadingPhoto ? 'Загрузка...' : 'Загрузить фото'}</span>
              </button>
            )}
          </div>

          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn--secondary" onClick={() => setEditing(null)} disabled={saving}>Отмена</button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Сохранить'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Удалить автомобиль?"
        footer={
          <>
            <button className="btn btn--secondary" onClick={() => setConfirmDelete(null)}>Отмена</button>
            <button className="btn btn--danger" onClick={() => remove(confirmDelete.id)}>Удалить</button>
          </>
        }
      >
        {confirmDelete && (
          <p>Точно удалить {confirmDelete.name} ({confirmDelete.plate_number})?</p>
        )}
      </Modal>
    </div>
  );
}
