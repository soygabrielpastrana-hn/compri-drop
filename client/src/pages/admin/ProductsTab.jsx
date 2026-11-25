import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api.js';
import { money } from '../../lib/format.js';
import Spinner, { Notice } from '../../components/Spinner.jsx';
import ProductForm from './ProductForm.jsx';

export default function ProductsTab({ guard, canWrite = true }) {
  const [list, setList] = useState(null);
  const [editing, setEditing] = useState(null); // null = lista | {} = nuevo | producto = editar
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const load = () =>
    guard(api.admin.products())
      .then((items) => {
        setList(items);
        setError('');
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (editing) {
    return (
      <ProductForm
        product={editing._id ? editing : null}
        guard={guard}
        onClose={(saved) => {
          setEditing(null);
          if (saved) load();
        }}
      />
    );
  }

  const toggle = (p) =>
    guard(api.admin.saveProduct(p._id, { active: !p.active })).then(load).catch((e) => setError(e.message));

  const remove = (p) => {
    if (!window.confirm(`¿Eliminar "${p.name}" definitivamente?`)) return;
    guard(api.admin.deleteProduct(p._id)).then(load).catch((e) => setError(e.message));
  };

  const shown = (list || []).filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Productos {list && <span className="text-slate-400">({list.length})</span>}</h2>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          {canWrite && (
          <button onClick={() => setEditing({})} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
            <Plus size={16} /> Nuevo producto
          </button>
          )}
        </div>
      </div>

      {error && <Notice>{error}</Notice>}
      {!list ? (
        <Spinner />
      ) : shown.length === 0 ? (
        <p className="rounded-2xl bg-white p-10 text-center text-slate-500 ring-1 ring-slate-200">
          Aún no hay productos. Crea el primero con “Nuevo producto”.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">Producto</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Precio</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Activo</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((p) => (
                <tr key={p._id}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img src={p.images?.[0]} alt="" className="size-12 rounded-lg bg-slate-100 object-cover" />
                      <div>
                        <Link to={`/producto/${p.slug}`} target="_blank" className="font-medium hover:text-brand-600">
                          {p.name}
                        </Link>
                        {p.hasVariants && <p className="text-xs text-slate-500">{p.variants.length} variantes</p>}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-slate-600">
                    {p.category}
                    {p.subcategory && ` · ${p.subcategory}`}
                  </td>
                  <td className="p-3 font-medium">{money(p.price)}</td>
                  <td className={`p-3 ${p.totalStock === 0 ? 'font-semibold text-red-600' : ''}`}>{p.totalStock}</td>
                  <td className="p-3">
                    <button
                      onClick={() => canWrite && toggle(p)}
                      disabled={!canWrite}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${p.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}
                    >
                      {p.active ? 'Activo' : 'Oculto'}
                    </button>
                  </td>
                  <td className="p-3">
                    {canWrite && (
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setEditing(p)} aria-label="Editar" className="text-slate-500 hover:text-brand-600">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => remove(p)} aria-label="Eliminar" className="text-slate-500 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    )}
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
