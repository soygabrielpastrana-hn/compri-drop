import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { api, mediaUrl } from '../../lib/api.js';
import ImageUploader from './ImageUploader.jsx';
import Spinner, { Notice } from '../../components/Spinner.jsx';

const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500';
const BLANK = { _id: '', title: '', subtitle: '', image: '', link: '', buttonText: 'Ver ofertas', order: 0, active: true };

export default function BannersTab({ guard }) {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => guard(api.admin.banners()).then(setList).catch((e) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.image.trim()) return setError('Sube la imagen del banner');
    setBusy(true);
    try {
      await guard(
        api.admin.saveBanner(form._id || undefined, {
          title: form.title.trim(), subtitle: form.subtitle, image: form.image.trim(),
          link: form.link.trim(), buttonText: form.buttonText, order: Number(form.order) || 0, active: form.active,
        })
      );
      setForm(BLANK);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (b) => guard(api.admin.saveBanner(b._id, { active: !b.active })).then(load).catch((e) => setError(e.message));
  const remove = (b) => {
    if (window.confirm(`¿Eliminar el banner "${b.title}"?`)) guard(api.admin.deleteBanner(b._id)).then(load).catch((e) => setError(e.message));
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="font-semibold">{form._id ? 'Editar banner' : 'Nuevo banner promocional (inicio de la tienda)'}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm"><span className="mb-1 block font-medium">Texto alternativo (describe la imagen)</span>
            <input className={field} value={form.title} onChange={set('title')} placeholder="Ofertas de fin de mes" />
          </label>
          <label className="text-sm"><span className="mb-1 block font-medium">Subtítulo</span>
            <input className={field} value={form.subtitle} onChange={set('subtitle')} placeholder="Envío gratis en toda Honduras" />
          </label>
          <div className="sm:col-span-2">
            <ImageUploader
              value={form.image}
              onChange={(url) => setForm((f) => ({ ...f, image: url }))}
              width={1200}
              height={400}
              label="Imagen del banner principal (1200 × 400 px)"
            />
          </div>
          <label className="text-sm"><span className="mb-1 block font-medium">Enlace del botón (opcional)</span>
            <input className={field} value={form.link} onChange={set('link')} placeholder="/?cat=Tecnología  o  /producto/mi-producto" />
          </label>
          <label className="text-sm"><span className="mb-1 block font-medium">Texto del botón</span>
            <input className={field} value={form.buttonText} onChange={set('buttonText')} />
          </label>
          <label className="text-sm"><span className="mb-1 block font-medium">Orden (0 se muestra primero)</span>
            <input type="number" className={field} value={form.order} onChange={set('order')} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="size-4 accent-brand-600" /> Activo
        </label>
        {error && <Notice>{error}</Notice>}
        <div className="flex gap-3">
          <button disabled={busy} className="rounded-xl bg-brand-600 px-6 py-2.5 font-semibold text-white disabled:opacity-60">
            {form._id ? 'Guardar cambios' : 'Crear banner'}
          </button>
          {form._id && <button type="button" onClick={() => setForm(BLANK)} className="px-4 text-slate-600">Cancelar</button>}
        </div>
      </form>

      {!list ? (
        <Spinner />
      ) : list.length === 0 ? (
        <p className="text-center text-slate-500">Aún no hay banners. Sin banners, el inicio muestra el mensaje por defecto.</p>
      ) : (
        <ul className="space-y-3">
          {list.map((b) => (
            <li key={b._id} className="flex items-center gap-4 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
              <div
                className="size-20 shrink-0 rounded-xl bg-gradient-to-r from-brand-500 to-brand-800 bg-cover bg-center"
                style={b.image ? { backgroundImage: `url(${mediaUrl(b.image)})` } : undefined}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{b.title || 'Banner sin texto alternativo'}</p>
                <p className="truncate text-sm text-slate-500">{b.subtitle}</p>
                <p className="text-xs text-slate-400">Orden {b.order}{b.link && ` · ${b.link}`}</p>
              </div>
              <button onClick={() => toggle(b)} className={`rounded-full px-3 py-1 text-xs font-semibold ${b.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                {b.active ? 'Activo' : 'Oculto'}
              </button>
              <button onClick={() => setForm({ ...b, order: b.order, _id: b._id })} aria-label="Editar" className="text-slate-500 hover:text-brand-600"><Pencil size={16} /></button>
              <button onClick={() => remove(b)} aria-label="Eliminar" className="text-slate-500 hover:text-red-600"><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
