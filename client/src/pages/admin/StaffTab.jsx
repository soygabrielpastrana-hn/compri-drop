import { useEffect, useState } from 'react';
import { KeyRound, Trash2 } from 'lucide-react';
import { api } from '../../lib/api.js';
import Spinner, { Notice } from '../../components/Spinner.jsx';

const ROLES = [
  ['admin', 'Administrador', 'Acceso total: equipo, configuración, banners, popups, cupones, inventario y pedidos.'],
  ['seller', 'Vendedor', 'Dashboard, pedidos (confirmar, preparar, cancelar) e inventario en solo lectura. No ve costos ni proveedores.'],
  ['dispatcher', 'Despachador', 'Solo pedidos: preparar, enviar y entregar, con guía y notas.'],
  ['inventory', 'Inventario / Proveedor', 'Productos, stock, categorías y proveedores. No ve ventas ni clientes.'],
];
const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-600';
const BLANK = { name: '', email: '', password: '', role: 'seller' };

export default function StaffTab({ guard }) {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [reset, setReset] = useState({ id: '', password: '' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const load = () => guard(api.admin.staff()).then(setList).catch((e) => setError(e.message));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (fn, msg) => {
    setError('');
    setOk('');
    try {
      await guard(fn());
      if (msg) setOk(msg);
      load();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  };

  const create = async (e) => {
    e.preventDefault();
    if (await run(() => api.admin.saveStaff(undefined, form), 'Usuario creado ✓')) setForm(BLANK);
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:grid-cols-2">
        {ROLES.map(([id, label, desc]) => (
          <div key={id} className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-brand-800">{label}</p>
            <p className="text-slate-500">{desc}</p>
          </div>
        ))}
      </section>

      <form onSubmit={create} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
        <h2 className="font-semibold">Nuevo usuario del equipo</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input required className={field} placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input required type="email" className={field} placeholder="Correo" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input required type="password" autoComplete="new-password" className={field} placeholder="Contraseña (10+, letras y números)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select className={field} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>
        {error && <Notice>{error}</Notice>}
        {ok && <Notice tone="green">{ok}</Notice>}
        <button className="rounded-xl bg-brand-600 px-6 py-2.5 font-semibold text-white">Crear usuario</button>
      </form>

      {!list ? <Spinner /> : list.length === 0 ? (
        <p className="text-center text-slate-500">Aún no hay usuarios del equipo. Tú entras con la clave maestra o tu cuenta de administrador.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
              <tr><th className="p-4">Usuario</th><th className="p-4">Rol</th><th className="p-4">Último acceso</th><th className="p-4">Estado</th><th className="p-4" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((s) => (
                <tr key={s._id}>
                  <td className="p-4"><p className="font-semibold">{s.name}</p><p className="text-xs text-slate-400">{s.email}</p></td>
                  <td className="p-4">
                    <select value={s.role} onChange={(e) => run(() => api.admin.saveStaff(s._id, { role: e.target.value }), 'Rol actualizado ✓')} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                      {ROLES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                    </select>
                  </td>
                  <td className="p-4 text-slate-500">{s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString('es-HN') : 'Nunca'}</td>
                  <td className="p-4">
                    <button onClick={() => run(() => api.admin.saveStaff(s._id, { active: !s.active }))} className={`rounded-full px-3 py-1 text-xs font-semibold ${s.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>{s.active ? 'Activo' : 'Desactivado'}</button>
                  </td>
                  <td className="p-4">
                    {reset.id === s._id ? (
                      <form
                        className="flex gap-2"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (await run(() => api.admin.saveStaff(s._id, { password: reset.password }), 'Contraseña actualizada ✓')) setReset({ id: '', password: '' });
                        }}
                      >
                        <input type="password" autoComplete="new-password" required value={reset.password} onChange={(e) => setReset({ ...reset, password: e.target.value })} placeholder="Nueva contraseña" className="w-44 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                        <button className="rounded-lg bg-brand-600 px-3 text-xs font-medium text-white">Guardar</button>
                      </form>
                    ) : (
                      <div className="flex justify-end gap-3">
                        <button onClick={() => setReset({ id: s._id, password: '' })} aria-label="Cambiar contraseña" title="Cambiar contraseña" className="text-slate-500 hover:text-brand-600"><KeyRound size={16} /></button>
                        <button onClick={() => window.confirm(`¿Eliminar a ${s.name}?`) && run(() => api.admin.deleteStaff(s._id))} aria-label="Eliminar" className="text-slate-500 hover:text-red-600"><Trash2 size={16} /></button>
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
