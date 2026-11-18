import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { api } from '../../lib/api.js';
import Spinner, { Notice } from '../../components/Spinner.jsx';

const field = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500';

function AddInline({ placeholder, onAdd, withIcon = false }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), icon: icon.trim() });
    setName('');
    setIcon('');
  };
  return (
    <form onSubmit={submit} className="flex gap-2">
      {withIcon && <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="😀" className={`${field} w-16 text-center`} />}
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} className={`${field} flex-1`} />
      <button className="rounded-lg bg-slate-900 px-4 text-sm font-medium text-white">Agregar</button>
    </form>
  );
}

export default function CategoriesTab({ guard }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');

  const load = () => guard(api.admin.categories()).then((l) => { setList(l); setError(''); }).catch((e) => setError(e.message));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const run = (p) => p.then(load).catch((e) => setError(e.message));
  const add = (data) => run(guard(api.admin.saveCategory(undefined, data)));
  const rename = (c) => {
    const name = window.prompt('Nuevo nombre', c.name);
    if (name && name.trim() && name.trim() !== c.name) run(guard(api.admin.saveCategory(c._id, { name: name.trim() })));
  };
  const setIcon = (c) => {
    const icon = window.prompt('Emoji o URL de ícono', c.icon || '');
    if (icon !== null) run(guard(api.admin.saveCategory(c._id, { icon: icon.trim() })));
  };
  const toggle = (c) => run(guard(api.admin.saveCategory(c._id, { active: !c.active })));
  const remove = (c) => window.confirm(`¿Eliminar "${c.name}"?`) && run(guard(api.admin.deleteCategory(c._id)));

  if (!list) return error ? <Notice>{error}</Notice> : <Spinner />;
  const tops = list.filter((c) => !c.parent);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Categorías y subcategorías</h2>
      <p className="text-sm text-slate-500">Alimentan el menú de la tienda. Si renombras una categoría, se actualizan sus productos.</p>
      {error && <Notice>{error}</Notice>}

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <p className="mb-2 text-sm font-medium">Nueva categoría principal</p>
        <AddInline placeholder="Ej. Tecnología" withIcon onAdd={add} />
      </div>

      {tops.length === 0 && <p className="text-sm text-slate-500">Aún no hay categorías. Agrega una arriba o corre <code>npm run seed:categories</code> en /server.</p>}

      {tops.map((t) => {
        const subs = list.filter((s) => String(s.parent) === String(t._id));
        return (
          <div key={t._id} className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{t.icon || '📁'}</span>
              <b className="flex-1 text-lg">{t.name}</b>
              <button onClick={() => toggle(t)} className={`rounded-full px-3 py-1 text-xs font-semibold ${t.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>{t.active ? 'Visible' : 'Oculta'}</button>
              <button onClick={() => setIcon(t)} className="text-xs text-slate-500 hover:text-brand-600">Ícono</button>
              <button onClick={() => rename(t)} aria-label="Renombrar" className="text-slate-500 hover:text-brand-600"><Pencil size={15} /></button>
              <button onClick={() => remove(t)} aria-label="Eliminar" className="text-slate-500 hover:text-red-600"><Trash2 size={15} /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {subs.map((s) => (
                <span key={s._id} className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ring-1 ${s.active ? 'bg-slate-50 ring-slate-300' : 'bg-slate-100 text-slate-400 ring-slate-200'}`}>
                  {s.name}
                  <button onClick={() => toggle(s)} className="text-[10px] uppercase text-slate-400 hover:text-slate-700">{s.active ? 'ocultar' : 'mostrar'}</button>
                  <button onClick={() => rename(s)} aria-label="Renombrar"><Pencil size={12} className="text-slate-400 hover:text-brand-600" /></button>
                  <button onClick={() => remove(s)} aria-label="Eliminar"><Trash2 size={12} className="text-slate-400 hover:text-red-600" /></button>
                </span>
              ))}
            </div>
            <AddInline placeholder={`Nueva subcategoría de ${t.name}`} onAdd={(d) => add({ name: d.name, parent: t._id })} />
          </div>
        );
      })}
    </div>
  );
}
