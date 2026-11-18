import { useEffect, useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { api } from '../../lib/api.js';
import { money } from '../../lib/format.js';
import Spinner, { Notice } from '../../components/Spinner.jsx';

// Proveedores: se asignan dentro de cada producto (Inventario). Aquí se resumen por nombre.
export default function SuppliersTab({ guard }) {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    guard(api.admin.products()).then(setProducts).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => {
    const m = new Map();
    for (const p of products || []) {
      const name = (p.supplier?.name || '').trim() || 'Sin proveedor asignado';
      const r = m.get(name) || { name, phone: '', products: 0, active: 0, units: 0, inventoryCost: 0 };
      r.products += 1;
      if (p.active) r.active += 1;
      r.units += p.totalStock;
      r.inventoryCost += (p.supplier?.cost || 0) * p.totalStock;
      if (!r.phone && p.supplier?.phone) r.phone = p.supplier.phone;
      m.set(name, r);
    }
    return [...m.values()].sort((a, b) => b.products - a.products);
  }, [products]);

  if (error) return <Notice>{error}</Notice>;
  if (!products) return <Spinner />;

  const wa = (phone) => {
    const d = phone.replace(/\D/g, '');
    return `https://wa.me/${d.length === 8 ? `504${d}` : d}`;
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">El proveedor se asigna en cada producto (pestaña Inventario → editar producto → “Proveedor interno”). El cliente nunca lo ve.</p>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-white p-10 text-center text-slate-500 shadow-sm ring-1 ring-slate-200/70">Aún no hay productos.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
              <tr><th className="p-4">Proveedor</th><th className="p-4">Contacto</th><th className="p-4">Productos</th><th className="p-4">Unidades en stock</th><th className="p-4">Costo del inventario</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.name} className="hover:bg-slate-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-brand-50 font-bold text-brand-700">{r.name[0]}</span>
                      <b>{r.name}</b>
                    </div>
                  </td>
                  <td className="p-4">
                    {r.phone ? (
                      <a href={wa(r.phone)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-green-600"><MessageCircle size={14} /> {r.phone}</a>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="p-4">{r.active} activos <span className="text-slate-400">/ {r.products}</span></td>
                  <td className={`p-4 font-semibold ${r.units === 0 ? 'text-red-600' : ''}`}>{r.units}</td>
                  <td className="p-4">{r.inventoryCost ? money(r.inventoryCost) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
