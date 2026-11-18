import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { api, mediaUrl } from '../../lib/api.js';

// Recorta (centrado) y redimensiona al tamaño exacto antes de subir → imagen liviana y con la medida correcta
async function fit(file, w, h) {
  const bmp = await createImageBitmap(file);
  const scale = Math.max(w / bmp.width, h / bmp.height);
  const sw = w / scale;
  const sh = h / scale;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bmp, (bmp.width - sw) / 2, (bmp.height - sh) / 2, sw, sh, 0, 0, w, h);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85));
  return { blob, srcWidth: bmp.width };
}

export default function ImageUploader({ value, onChange, width = 1200, height = 400, label = 'Imagen', compact = false }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ error: '', warn: '' });

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setMsg({ error: 'Usa una imagen JPG, PNG o WebP', warn: '' });

    setBusy(true);
    setMsg({ error: '', warn: '' });
    try {
      const { blob, srcWidth } = await fit(file, width, height);
      const { url } = await api.admin.uploadImage(blob, file.name);
      onChange(url);
      if (srcWidth < width) setMsg({ error: '', warn: `Tu imagen mide ${srcWidth}px de ancho (ideal ${width}px): puede verse borrosa.` });
    } catch (err) {
      setMsg({ error: err.message || 'No se pudo subir la imagen', warn: '' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      <div className="overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200" style={{ aspectRatio: `${width} / ${height}` }}>
        {value ? (
          <img src={mediaUrl(value)} alt="" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-center text-xs text-slate-400">
            <span>{width} × {height} px<br />JPG, PNG o WebP</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
          <ImagePlus size={15} /> {busy ? 'Subiendo…' : value ? 'Cambiar imagen' : 'Subir imagen'}
        </button>
        {value && (
          <button type="button" onClick={() => onChange('')} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-red-600">
            <Trash2 size={14} /> Quitar
          </button>
        )}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} className="hidden" />
      </div>

      {!compact && (
        <input
          value={value?.startsWith('/api/') ? '' : value || ''}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder="…o pega la URL de una imagen"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
        />
      )}
      {msg.error && <p className="text-xs text-red-600">{msg.error}</p>}
      {msg.warn && <p className="text-xs text-amber-600">{msg.warn}</p>}
      <p className="text-[11px] text-slate-400">Se recorta y optimiza automáticamente a {width} × {height} px.</p>
    </div>
  );
}
