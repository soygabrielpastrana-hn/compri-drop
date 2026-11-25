import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';
import { api } from '../lib/api.js';
import { money } from '../lib/format.js';
import { useAuth } from '../context/AuthContext.jsx';
import TrackingGroup from '../components/TrackingGroup.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import { Notice } from '../components/Spinner.jsx';

const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500';

export default function Rastreo() {
  const [params] = useSearchParams();
  const { user, profile } = useAuth();
  const [code, setCode] = useState(params.get('code') || '');
  const [phone, setPhone] = useState('');
  const [group, setGroup] = useState(null);
  const [mine, setMine] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Enlace de WhatsApp: /rastreo?code=HN-1042&t=TOKEN → carga directa
  useEffect(() => {
    document.title = 'Rastrear pedido | Compri';
    const c = params.get('code');
    const t = params.get('t');
    if (c && t) {
      setBusy(true);
      api.trackLink(c, t).then(setGroup).catch((e) => setError(e.message)).finally(() => setBusy(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Con Google: historial completo de la cuenta
  useEffect(() => {
    if (user) api.myOrders().then(setMine).catch(() => setMine([]));
    else setMine(null);
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      setGroup(await api.lookup({ orderCode: code, phone }));
    } catch (err) {
      setGroup(null);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="text-center">
        <PackageSearch size={40} className="mx-auto text-brand-600" />
        <h1 className="mt-2 text-2xl font-extrabold">Rastrea tu pedido</h1>
        <p className="text-sm text-slate-500">Escribe el código de tu pedido y el teléfono con el que compraste.</p>
      </div>

      <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Código del pedido</span>
            <input required className={`${input} uppercase`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="HN-1042" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Teléfono (8 dígitos){user && ' · opcional'}</span>
            <div className="flex">
              <span className="grid place-items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">+504</span>
              <input
                required={!user} inputMode="numeric" maxLength={8} placeholder="99999999"
                className={`${input} rounded-l-none`} value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
              />
            </div>
          </label>
        </div>
        {error && <Notice>{error}</Notice>}
        <button disabled={busy} className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white disabled:opacity-60">
          {busy ? 'Buscando…' : 'Rastrear'}
        </button>
      </form>

      {!user && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-green-50 p-4 text-sm text-green-800">
          <span>Con Google ves todo tu historial de pedidos y guardas tu saldo de forma permanente.</span>
          <GoogleButton />
        </div>
      )}

      {user && (
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 p-4 text-white">
          <div>
            <p className="text-xs opacity-90">Tu saldo acumulado</p>
            <p className="text-2xl font-extrabold">{money(profile?.walletBalance || 0)}</p>
          </div>
          <Link to="/cuenta" className="rounded-full bg-white/20 px-4 py-2 text-sm font-medium hover:bg-white/30">Ver movimientos</Link>
        </div>
      )}

      {group && <TrackingGroup group={group} phoneHint={phone} />}

      {user && mine && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold">Mis pedidos</h2>
            <Link to="/cuenta" className="text-sm font-medium text-brand-600">Mi saldo y direcciones →</Link>
          </div>
          {mine.length === 0 ? (
            <p className="text-sm text-slate-500">Aún no tienes pedidos vinculados a tu cuenta.</p>
          ) : (
            <ul className="space-y-2">
              {mine.map((g) => (
                <li key={g.groupCode}>
                  <button
                    onClick={() => { setGroup(g); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="flex w-full flex-wrap items-center gap-x-4 rounded-xl bg-white p-3 text-left text-sm ring-1 ring-slate-200 hover:ring-brand-500"
                  >
                    <b>#{g.groupCode}</b>
                    <span className="text-slate-500">{new Date(g.createdAt).toLocaleDateString('es-HN')}</span>
                    <span className="text-slate-600">{[...new Set(g.orders.map((o) => o.status))].join(' · ')}</span>
                    <b className="ml-auto">{money(g.grandTotal)}</b>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
