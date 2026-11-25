import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { api, mediaUrl } from '../../lib/api.js';
import Spinner, { Notice } from '../../components/Spinner.jsx';
import ImageUploader from './ImageUploader.jsx';

const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-600';
const BLANK = { _id: '', title: '', image: '', link: '', active: true, frequency: 'day', delaySeconds: 2, startsAt: '', endsAt: '', order: 0 };
const FREQ = [
  ['day', 'Una vez cada 24 horas (recomendado)'],
  ['session', 'Una vez por visita'],
  ['once', 'Una sola vez por cliente'],
  ['always', 'En cada carga de la página (invasivo)'],
];
const dateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export default function PopupsTab({ guard }) {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => guard(api.admin.popups()).then(setList).catch((e) => setError(e.message));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.image) return setError('Sube la imagen del popup');
    setBusy(true);
    try {
      await guard(
        api.admin.savePopup(form._id || undefined, {
          title: form.title, image: form.image, link: form.link, active: form.active, frequency: form.frequency,
          delaySeconds: Number(form.delaySeconds) || 0, order: Number(form.order) || 0,
          startsAt: form.startsAt ? new Date(`${form.startsAt}T00:00:00`).toISOString() : null,
          endsAt: form.endsAt ? new Date(`${form.endsAt}T23:59:59`).toISOString() : null,
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

  const toggle = (p) => guard(api.admin.savePopup(p._id, { active: !p.active })).then(load).catch((e) => setError(e.message));
  const remove = (p) => window.confirm('¿Eliminar este popup?') && guard(api.admin.deletePopup(p._id)).then(load).catch((e) => setError(e.message));
  const edit = (p) => setForm({ ...BLANK, ...p, startsAt: dateInput(p.startsAt), endsAt: dateInput(p.endsAt) });

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="grid gap-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 md:grid-cols-[280px_1fr]">
        <ImageUploader compact value={form.image} onChange={(url) => setForm((f) => ({ ...f, image: url }))} width={800} height={800} label="Imagen del popup (800 × 800 px)" />

        <div className="space-y-3">
          <h2 className="font-semibold">{form._id ? 'Editar popup' : 'Nuevo popup promocional'}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm"><span className="mb-1 block font-medium">Texto alternativo</span><input className={field} value={form.title} onChange={set('title')} placeholder="Ej. 20% de descuento" maxLength={120} /></label>
            <label className="text-sm"><span className="mb-1 block font-medium">Enlace al hacer clic (opcional)</span><input className={field} value={form.link} onChange={set('link')} placeholder="/?promo=1  o  https://…" /></label>
            <label className="text-sm"><span className="mb-1 block font-medium">¿Cada cuánto se muestra?</span>
              <select className={field} value={form.frequency} onChange={set('frequency')}>{FREQ.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </label>
            <label className="text-sm"><span className="mb-1 block font-medium">Aparece después de (segundos)</span><input type="number" min="0" max="30" className={field} value={form.delaySeconds} onChange={set('delaySeconds')} /></label>
            <label className="text-sm"><span className="mb-1 block font-medium">Desde (opcional)</span><input type="date" className={field} value={form.startsAt} onChange={set('startsAt')} /></label>
            <label className="text-sm"><span className="mb-1 block font-medium">Hasta (opcional)</span><input type="date" className={field} value={form.endsAt} onChange={set('endsAt')} /></label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="size-4 accent-brand-600" /> Activo</label>
          <p className="text-xs text-slate-400">Se muestra solo al entrar al inicio. Si editas el popup, vuelve a mostrarse a todos los clientes. El cliente siempre puede cerrarlo o elegir “No volver a mostrar”.</p>
          {error && <Notice>{error}</Notice>}
          <div className="flex gap-3">
            <button disabled={busy} className="rounded-xl bg-brand-600 px-6 py-2.5 font-semibold text-white disabled:opacity-60">{form._id ? 'Guardar cambios' : 'Crear popup'}</button>
            {form._id && <button type="button" onClick={() => setForm(BLANK)} className="px-4 text-slate-600">Cancelar</button>}
          </div>
        </div>
      </form>

      {!list ? <Spinner /> : list.length === 0 ? (
        <p className="text-center text-slate-500">Aún no hay popups.</p>
      ) : (
        <ul className="space-y-3">
          {list.map((p) => (
            <li key={p._id} className="flex items-center gap-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70">
              <img src={mediaUrl(p.image)} alt="" className="size-20 shrink-0 rounded-xl bg-slate-100 object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.title || 'Popup sin texto alternativo'}</p>
                <p className="text-xs text-slate-400">{FREQ.find(([v]) => v === p.frequency)?.[1]} · demora {p.delaySeconds}s{p.link && ` · ${p.link}`}</p>
                {(p.startsAt || p.endsAt) && <p className="text-xs text-slate-400">{dateInput(p.startsAt) || '…'} → {dateInput(p.endsAt) || '…'}</p>}
              </div>
              <button onClick={() => toggle(p)} className={`rounded-full px-3 py-1 text-xs font-semibold ${p.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>{p.active ? 'Activo' : 'Inactivo'}</button>
              <button onClick={() => edit(p)} aria-label="Editar" className="text-slate-500 hover:text-brand-600"><Pencil size={16} /></button>
              <button onClick={() => remove(p)} aria-label="Eliminar" className="text-slate-500 hover:text-red-600"><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
