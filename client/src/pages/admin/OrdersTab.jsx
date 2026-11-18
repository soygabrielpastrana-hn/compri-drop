import { useEffect, useState } from 'react';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { api } from '../../lib/api.js';
import { money, optionsLabel } from '../../lib/format.js';
import Spinner, { Notice } from '../../components/Spinner.jsx';

const STATUSES = ['Pendiente', 'Confirmado por WhatsApp', 'Preparando', 'Enviado', 'Entregado', 'Cancelado'];
const COLORS = {
  'Pendiente': 'bg-amber-100 text-amber-800',
  'Confirmado por WhatsApp': 'bg-blue-100 text-blue-800',
  'Preparando': 'bg-purple-100 text-purple-800',
  'Enviado': 'bg-indigo-100 text-indigo-800',
  'Entregado': 'bg-green-100 text-green-800',
  'Cancelado': 'bg-red-100 text-red-700',
};
const EMPTY = { note: '', carrier: '', guide: '' };
const input = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500';

export default function OrdersTab({ guard, initialQuery = '' }) {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState(initialQuery);
  const [search, setSearch] = useState(initialQuery);
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [forms, setForms] = useState({});
  const [flash, setFlash] = useState(null); // pedido recién actualizado → resalta el botón de WhatsApp
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const fetchPage = (page) => guard(api.admin.orders({ status, q: search, page, limit: 30 }));

  useEffect(() => {
    setData(null);
    fetchPage(1).then((d) => { setData(d); setError(''); }).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search]);

  const more = () =>
    fetchPage(data.page + 1).then((d) => setData((prev) => ({ ...d, items: [...prev.items, ...d.items] }))).catch((e) => setError(e.message));

  const formOf = (id) => forms[id] || EMPTY;
  const setField = (id, k, v) => setForms((f) => ({ ...f, [id]: { ...formOf(id), [k]: v } }));
  const apply = (u) => {
    setData((d) => ({ ...d, items: d.items.map((o) => (o._id === u._id ? u : o)) }));
    setForms((f) => ({ ...f, [u._id]: EMPTY }));
    setFlash(u._id);
  };

  const run = async (o, fn, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(o._id);
    try {
      apply(await guard(fn()));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const change = (o, next) =>
    run(o, () => api.admin.setOrderStatus(o._id, { status: next, ...formOf(o._id) }), next === 'Cancelado' ? `¿Cancelar el pedido ${o.code}? Se devolverá el stock y el saldo usado.` : '');
  const saveNote = (o) => run(o, () => api.admin.addOrderNote(o._id, formOf(o._id)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Pedidos {data && <span className="text-slate-400">({data.total})</span>}</h2>
        <form onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); }} className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Código, teléfono o nombre" className={input} />
          <button className="rounded-lg bg-slate-900 px-4 text-sm font-medium text-white">Buscar</button>
        </form>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {['', ...STATUSES].map((s) => (
          <button key={s || 'todos'} onClick={() => setStatus(s)} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${status === s ? 'bg-brand-600 text-white' : 'bg-white ring-1 ring-slate-200'}`}>
            {s || 'Todos'}
          </button>
        ))}
      </div>

      {error && <Notice>{error}</Notice>}
      {!data ? <Spinner /> : data.items.length === 0 ? (
        <p className="rounded-2xl bg-white p-10 text-center text-slate-500 ring-1 ring-slate-200">No hay pedidos con ese filtro.</p>
      ) : (
        <ul className="space-y-3">
          {data.items.map((o) => {
            const f = formOf(o._id);
            return (
              <li key={o._id} className="rounded-2xl bg-white ring-1 ring-slate-200">
                <button onClick={() => setOpen(open === o._id ? null : o._id)} className="flex w-full flex-wrap items-center gap-x-6 gap-y-1 p-4 text-left">
                  <span className="text-lg font-bold">#{o.code}</span>
                  {o.code !== o.groupCode && o.groupCode && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Dividido · grupo {o.groupCode}</span>}
                  <span className="text-sm text-slate-600">{o.customer.name}</span>
                  <span className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleString('es-HN')}</span>
                  <span className="ml-auto font-semibold">{money(o.total)}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${COLORS[o.status]}`}>{o.status}</span>
                  <ChevronDown size={16} className={`transition ${open === o._id ? 'rotate-180' : ''}`} />
                </button>

                {open === o._id && (
                  <div className="space-y-4 border-t border-slate-100 p-4 text-sm">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="mb-1 font-semibold">Cliente {o.customer.user && <span className="ml-1 rounded bg-green-100 px-1.5 text-[10px] text-green-700">CON CUENTA</span>}</p>
                        <p>{o.customer.name}</p>
                        <p className="text-slate-600">{o.customer.phone}</p>
                        {o.customer.email && <p className="text-slate-500">{o.customer.email}</p>}
                      </div>
                      <div>
                        <p className="mb-1 font-semibold">Entrega</p>
                        <p>{o.address.departamento}, {o.address.municipio}</p>
                        <p>{o.address.colonia}</p>
                        {o.address.referencia && <p className="text-slate-500">Ref: {o.address.referencia}</p>}
                      </div>
                    </div>

                    <ul className="divide-y divide-slate-100 rounded-xl bg-slate-50 px-3">
                      {o.items.map((i, idx) => (
                        <li key={idx} className="flex items-center gap-3 py-2">
                          <img src={i.image} alt="" className="size-12 rounded-lg bg-slate-200 object-cover" />
                          <div className="flex-1">
                            <p className="font-medium">{i.qty} × {i.name}</p>
                            {i.options?.length > 0 && <p className="text-xs font-semibold text-brand-700">{optionsLabel(i.options)}</p>}
                          </div>
                          <span>{money(i.price * i.qty)}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-wrap justify-between gap-2 text-slate-600">
                      <span>
                        Pago: <b>{o.paymentMethod}</b>{o.bank && ` (${o.bank})`}
                        {o.coupon?.code && <> · Cupón <b>{o.coupon.code}</b></>}
                        {o.walletUsed > 0 && <> · Saldo usado <b>{money(o.walletUsed)}</b></>}
                      </span>
                      <span>Subtotal {money(o.subtotal)} · Envío {o.shippingCost ? money(o.shippingCost) : 'gratis'} · <b>Total {money(o.total)}</b></span>
                    </div>
                    {o.cashback?.status !== 'none' && o.cashback?.amount > 0 && (
                      <p className="text-xs text-green-700">💰 Cashback {money(o.cashback.amount)} · {o.cashback.status}</p>
                    )}
                    {(o.shipment?.carrier || o.shipment?.guide) && (
                      <p className="rounded-lg bg-indigo-50 px-3 py-2 text-indigo-900">🚚 {o.shipment.carrier} {o.shipment.guide && <>· Guía <b className="font-mono">{o.shipment.guide}</b></>}</p>
                    )}

                    {/* Cambiar estado + nota/guía + notificar */}
                    <div className="space-y-3 rounded-xl border border-slate-200 p-3">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <input className={input} placeholder="Transportista (Cargo Expreso…)" value={f.carrier} onChange={(e) => setField(o._id, 'carrier', e.target.value)} />
                        <input className={input} placeholder="Número de guía" value={f.guide} onChange={(e) => setField(o._id, 'guide', e.target.value)} />
                        <input className={input} placeholder="Nota para el cliente" value={f.note} onChange={(e) => setField(o._id, 'note', e.target.value)} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {(o.nextStatuses || []).length === 0 ? (
                          <span className="text-slate-400">Pedido finalizado</span>
                        ) : (
                          o.nextStatuses.map((s) => (
                            <button key={s} disabled={busyId === o._id} onClick={() => change(o, s)}
                              className={`rounded-lg px-4 py-2 font-medium disabled:opacity-50 ${s === 'Cancelado' ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-brand-600 text-white'}`}>
                              → {s}
                            </button>
                          ))
                        )}
                        <button disabled={busyId === o._id || !(f.note || f.carrier || f.guide)} onClick={() => saveNote(o)} className="rounded-lg bg-white px-4 py-2 font-medium ring-1 ring-slate-300 disabled:opacity-40">
                          Guardar nota / guía
                        </button>
                        <a
                          href={o.notifyUrl} target="_blank" rel="noreferrer"
                          className={`ml-auto inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 font-medium text-white ${flash === o._id ? 'animate-pulse ring-4 ring-green-200' : ''}`}
                        >
                          <MessageCircle size={16} /> Notificar por WhatsApp
                        </a>
                      </div>
                      <p className="text-xs text-slate-500">El mensaje incluye el estado actual, la guía/nota más reciente y el enlace directo a /rastreo.</p>
                    </div>

                    <details className="text-xs text-slate-500">
                      <summary className="cursor-pointer">Historial</summary>
                      <ul className="mt-1 space-y-0.5">
                        {o.statusHistory.map((h, idx) => (
                          <li key={idx}>
                            {new Date(h.at).toLocaleString('es-HN')} — <b>{h.status}</b>
                            {h.carrier && ` · ${h.carrier}`}{h.guide && ` · Guía ${h.guide}`}{h.note && ` (${h.note})`}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {data && data.page < data.pages && (
        <div className="text-center">
          <button onClick={more} className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold ring-1 ring-slate-300">Ver más pedidos</button>
        </div>
      )}
    </div>
  );
}
