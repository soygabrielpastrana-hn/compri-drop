import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Trash2, Wallet } from 'lucide-react';
import { api } from '../lib/api.js';
import { DEPARTAMENTOS, money } from '../lib/format.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSite } from '../context/SiteContext.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import { Notice } from '../components/Spinner.jsx';

const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500';
const BLANK = { label: 'Casa', name: '', phone: '', departamento: '', municipio: '', colonia: '', referencia: '' };
const clean = ({ label, name, phone, departamento, municipio, colonia, referencia, isDefault }) => ({ label, name, phone, departamento, municipio, colonia, referencia, isDefault });

export default function Account() {
  const { user, profile, enabled, refresh, logout } = useAuth();
  const site = useSite();
  const [wallet, setWallet] = useState(null);
  const [claim, setClaim] = useState({ code: '', phone: '' });
  const [claimMsg, setClaimMsg] = useState({ ok: '', error: '' });
  const [addr, setAddr] = useState(BLANK);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    document.title = 'Mi cuenta | Compri';
  }, []);

  useEffect(() => {
    if (user) {
      api.wallet().then(setWallet).catch(() => {});
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
        <Wallet size={44} className="mx-auto text-brand-600" />
        <h1 className="text-2xl font-extrabold">Tu cuenta</h1>
        <p className="text-slate-600">
          Entra con Google para guardar tus direcciones, ver todos tus pedidos y acumular <b>{site.cashbackPercent}%</b> de saldo en cada compra, <b>sin vencimiento</b>.
        </p>
        {enabled ? <GoogleButton /> : <Notice tone="amber">El inicio de sesión con Google aún no está configurado en esta tienda.</Notice>}
        <p className="text-xs text-slate-500">No es obligatorio: puedes comprar como invitado.</p>
      </div>
    );
  }

  const addresses = profile?.addresses || [];
  const balance = wallet?.balance ?? profile?.walletBalance ?? 0;

  const saveList = async (list) => {
    setMsg('');
    try {
      await api.saveAddresses(list);
      await refresh();
      setMsg('Guardado ✓');
    } catch (e) {
      setMsg(e.message);
    }
  };

  const addAddress = async (e) => {
    e.preventDefault();
    await saveList([...addresses.map(clean), { ...addr, isDefault: addresses.length === 0 }]);
    setAddr(BLANK);
  };

  const doClaim = async (e) => {
    e.preventDefault();
    setClaimMsg({ ok: '', error: '' });
    try {
      const r = await api.claim({ orderCode: claim.code, phone: claim.phone });
      setClaimMsg({
        ok: r.credited > 0 ? `¡Listo! Se sumaron ${money(r.credited)} a tu saldo.` : r.expired > 0 ? 'Ese saldo ya venció.' : 'Pedido vinculado a tu cuenta.',
        error: '',
      });
      api.wallet().then(setWallet);
      refresh();
    } catch (err) {
      setClaimMsg({ ok: '', error: err.message });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        {user.photoURL && <img src={user.photoURL} alt="" className="size-12 rounded-full" referrerPolicy="no-referrer" />}
        <div className="flex-1">
          <h1 className="text-xl font-bold">{user.displayName || 'Mi cuenta'}</h1>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
        <button onClick={logout} className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-600"><LogOut size={15} /> Salir</button>
      </div>

      <section className="rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 p-5 text-white">
        <p className="text-sm opacity-90">Tu saldo</p>
        <p className="text-4xl font-extrabold">{money(balance)}</p>
        <p className="mt-1 text-sm opacity-90">Úsalo en tu próxima compra desde el checkout. Ganas {site.cashbackPercent}% al recibir cada pedido.</p>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="font-semibold">Reclamar saldo de un pedido como invitado</h2>
        <form onSubmit={doClaim} className="flex flex-wrap gap-2">
          <input required className={`${input} w-40 uppercase`} placeholder="HN-1042" value={claim.code} onChange={(e) => setClaim({ ...claim, code: e.target.value })} />
          <input required className={`${input} w-40`} placeholder="Teléfono (8 dígitos)" inputMode="numeric" maxLength={8} value={claim.phone} onChange={(e) => setClaim({ ...claim, phone: e.target.value.replace(/\D/g, '') })} />
          <button className="rounded-lg bg-brand-600 px-4 text-sm font-medium text-white">Reclamar</button>
        </form>
        {claimMsg.ok && <Notice tone="green">{claimMsg.ok}</Notice>}
        {claimMsg.error && <Notice>{claimMsg.error}</Notice>}
        <p className="text-xs text-slate-500">El saldo de compras como invitado vence {site.guestCashbackDays} días después de la entrega.</p>
      </section>

      {wallet?.transactions?.length > 0 && (
        <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <h2 className="mb-2 font-semibold">Movimientos</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {wallet.transactions.map((t) => (
              <li key={t._id} className="flex justify-between gap-3 py-2">
                <span className="text-slate-600">{t.note} <span className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleDateString('es-HN')}</span></span>
                <b className={t.amount >= 0 ? 'text-green-600' : 'text-red-600'}>{t.amount >= 0 ? '+' : ''}{money(t.amount)}</b>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="font-semibold">Mis direcciones</h2>
        {addresses.length === 0 && <p className="text-sm text-slate-500">Aún no tienes direcciones guardadas.</p>}
        {addresses.map((a, i) => (
          <div key={a._id || i} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm">
            <div className="flex-1">
              <p className="font-semibold">{a.label} {a.isDefault && <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">PREDETERMINADA</span>}</p>
              <p className="text-slate-600">{a.departamento}, {a.municipio}, {a.colonia}</p>
              {a.referencia && <p className="text-xs text-slate-400">{a.referencia}</p>}
            </div>
            {!a.isDefault && (
              <button className="text-xs font-medium text-brand-600" onClick={() => saveList(addresses.map((x, k) => ({ ...clean(x), isDefault: k === i })))}>Predeterminar</button>
            )}
            <button aria-label="Eliminar" className="text-slate-400 hover:text-red-600" onClick={() => saveList(addresses.filter((_, k) => k !== i).map(clean))}><Trash2 size={16} /></button>
          </div>
        ))}

        {addresses.length < 5 && (
          <form onSubmit={addAddress} className="grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
            <input className={input} placeholder="Nombre (Casa, Trabajo…)" value={addr.label} onChange={(e) => setAddr({ ...addr, label: e.target.value })} />
            <input className={input} placeholder="Teléfono (8 dígitos)" inputMode="numeric" maxLength={8} value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value.replace(/\D/g, '') })} />
            <select required className={input} value={addr.departamento} onChange={(e) => setAddr({ ...addr, departamento: e.target.value })}>
              <option value="">Departamento…</option>
              {DEPARTAMENTOS.map((d) => <option key={d}>{d}</option>)}
            </select>
            <input required className={input} placeholder="Municipio" value={addr.municipio} onChange={(e) => setAddr({ ...addr, municipio: e.target.value })} />
            <input required className={`${input} sm:col-span-2`} placeholder="Colonia / Barrio" value={addr.colonia} onChange={(e) => setAddr({ ...addr, colonia: e.target.value })} />
            <input className={`${input} sm:col-span-2`} placeholder="Referencia" value={addr.referencia} onChange={(e) => setAddr({ ...addr, referencia: e.target.value })} />
            <button className="rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white sm:col-span-2">Guardar dirección</button>
          </form>
        )}
        {msg && <p className="text-sm text-slate-600">{msg}</p>}
      </section>

      <Link to="/rastreo" className="block text-center font-medium text-brand-600">Ver mis pedidos →</Link>
    </div>
  );
}
