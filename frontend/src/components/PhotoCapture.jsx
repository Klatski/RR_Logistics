import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons.jsx';
import { compressImage, blobToDataUrl } from '../lib/photo.js';

export default function PhotoCapture({
  value,
  onChange,
  label = 'Сфотографировать',
  hint,
}) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let active = true;
    if (!value) { setPreview(null); return; }
    if (value.url) { setPreview(value.url); return; }
    if (value.blob) {
      blobToDataUrl(value.blob).then((d) => active && setPreview(d));
    }
    return () => { active = false; };
  }, [value]);

  async function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const blob = await compressImage(file);
      onChange({ blob, pending: true });
    } catch (err) {
      console.error(err);
      onChange({ blob: file, pending: true });
    }
  }

  function remove() {
    onChange(null);
  }

  if (preview) {
    return (
      <div className="photo-thumb">
        <img src={preview} alt="" />
        {value && value.pending && (
          <div className="photo-thumb__badge">
            <Icon name="cloud-up" size={12} /> Будет загружено
          </div>
        )}
        <button type="button" className="photo-thumb__remove" onClick={remove} aria-label="Удалить фото">
          <Icon name="x" size={16} />
        </button>
      </div>
    );
  }

  return (
    <label className="photo-area">
      <Icon name="camera" size={32} />
      <span>{label}</span>
      {hint && <span style={{ fontSize: 12 }}>{hint}</span>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
      />
    </label>
  );
}
