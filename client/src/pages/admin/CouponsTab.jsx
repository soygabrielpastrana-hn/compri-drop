import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { api } from '../../lib/api.js';
import { money } from '../../lib/format.js';
import Spinner, { Notice } from '../../components/Spinner.jsx';

const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500';
const BLANK = { _id: '', code: '', type: 'percent', value: '', minPurchase: '', maxUses: '', expiresAt: '', active: true };

export default function CouponsTab({ guard }) {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    guard(api.admin.coupons()).then(setList).catch((e) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.code.trim() || form.value === '') return setError('Código y valor son obligatorios');
    if (form.type === 'percent' && Number(form.value) > 100) return setError('El porcentaje no puede pasar de 100');
    setBusy(true);
    try {
      await guard(
        api.admin.saveCoupon(form._id || undefined, {
          code: form.code.trim().toUpperCase(),
          type: form.type,
          value: Number(form.value),
          minPurchase: Number(form.minPurchase) || 0,
          maxUses: parseInt(form.maxUses, 10) || 0,
          expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
          active: form.active,
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

  const edit = (c) =>
    setForm({
      _id: c._id, code: c.code, type: c.type, value: c.value, minPurchase: c.minPurchase || '',
      maxUses: c.maxUses || '', expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '', active: c.active,
    });

  const toggle = (c) => guard(api.admin.saveCoupon(c._id, { active: !c.active })).then(load).catch((e) => setError(e.message));
  const remove = (c) => {
    if (window.confirm(`¿Eliminar el cupón ${c.code}?`)) guard(api.admin.deleteCoupon(c._id)).then(load).catch((e) => setError(e.message));
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="font-semibold">{form._id ? `Editar cupón ${form.code}` : 'Nuevo cupón de descuento'}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm"><span className="mb-1 block font-medium">Código</span>
            <input className={`${field} uppercase`} value={form.code} onChange={set('code')} placeholder="BIENVENIDO10" />
          </label>
          <label className="text-sm"><span className="mb-1 block font-medium">Tipo</span>
            <select className={field} value={form.type} onChange={set('type')}>
              <option value="percent">Porcentaje (%)</option>
              <option value="fixed">Monto fijo (L)</option>
            </select>
          </label>
          <label className="text-sm"><span className="mb-1 block font-medium">{form.type === 'percent' ? 'Descuento (%)' : 'Descuento (L)'}</span>
            <input type="number" min="0" step="0.01" className={field} value={form.value} onChange={set('value')} />
          </label>
          <label className="text-sm"><span className="mb-1 block font-medium">Compra mínima (L, opcional)</span>
            <input type="number" min="0" className={field} value={form.minPurchase} onChange={set('minPurchase')} />
          </label>
          <label className="text-sm"><span className="mb-1 block font-medium">Usos máximos (vacío = ilimitado)</span>
            <input type="number" min="0" className={field} value={form.maxUses} onChange={set('maxUses')} />
          </label>
          <label className="text-sm"><span className="mb-1 block font-medium">Vence el (opcional)</span>
            <input type="date" className={field} value={form.expiresAt} onChange={set('expiresAt')} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="size-4 accent-brand-600" /> Activo
        </label>
        {error && <Notice>{error}</Notice>}
        <div className="flex gap-3">
          <button disabled={busy} className="rounded-xl bg-brand-600 px-6 py-2.5 font-semibold text-white disabled:opacity-60">
            {form._id ? 'Guardar cambios' : 'Crear cupón'}
          </button>
          {form._id && <button type="button" onClick={() => setForm(BLANK)} className="px-4 text-slate-600">Cancelar</button>}
        </div>
      </form>

      {!list ? (
        <Spinner />
      ) : list.length === 0 ? (
        <p className="text-center text-slate-500">Aún no hay cupones.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr><th className="p-3">Código</th><th className="p-3">Descuento</th><th className="p-3">Mínimo</th><th className="p-3">Usos</th><th className="p-3">Vence</th><th className="p-3">Estado</th><th className="p-3" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((c) => (
                <tr key={c._id}>
                  <td className="p-3 font-mono font-bold">{c.code}</td>
                  <td className="p-3">{c.type === 'percent' ? `${c.value}%` : money(c.value)}</td>
                  <td className="p-3">{c.minPurchase ? money(c.minPurchase) : '—'}</td>
                  <td className="p-3">{c.usedCount} / {c.maxUses || '∞'}</td>
                  <td className="p-3">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('es-HN') : '—'}</td>
                  <td className="p-3">
                    <button onClick={() => toggle(c)} className={`rounded-full px-3 py-1 text-xs font-semibold ${c.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                      {c.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => edit(c)} aria-label="Editar" className="text-slate-500 hover:text-brand-600"><Pencil size={16} /></button>
                      <button onClick={() => remove(c)} aria-label="Eliminar" className="text-slate-500 hover:text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
