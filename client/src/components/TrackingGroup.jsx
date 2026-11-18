import { useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { money, optionsLabel } from '../lib/format.js';
import Timeline from './Timeline.jsx';
import ReviewForm from './ReviewForm.jsx';
import GoogleButton from './GoogleButton.jsx';
import { Notice } from './Spinner.jsx';

// Cashback de invitado: se reclama con Google (código + teléfono) antes de que venza
function ClaimBox({ order, groupCode, phoneHint }) {
  const { user, refresh } = useAuth();
  const [phone, setPhone] = useState(phoneHint || '');
  const [msg, setMsg] = useState({ ok: '', error: '' });
  const [busy, setBusy] = useState(false);
  const exp = new Date(order.cashback.expiresAt).toLocaleDateString('es-HN');

  const claim = async () => {
    setBusy(true);
    setMsg({ ok: '', error: '' });
    try {
      const r = await api.claim({ orderCode: groupCode, phone });
      setMsg({ ok: r.credited > 0 ? `¡Listo! Se sumaron ${money(r.credited)} a tu saldo.` : 'El saldo ya no está disponible (venció).', error: '' });
      refresh();
    } catch (e) {
      setMsg({ ok: '', error: e.message });
    } finally {
      setBusy(false);
    }
  };

  if (msg.ok) return <Notice tone="green">{msg.ok}</Notice>;
  return (
    <div className="space-y-2 rounded-xl bg-green-50 p-3 text-sm text-green-800">
      <p>💰 Ganaste <b>{money(order.cashback.amount)}</b> de saldo. Reclámalo antes del <b>{exp}</b>.</p>
      {!user ? (
        <GoogleButton label="Continuar con Google para reclamarlo" />
      ) : (
        <div className="flex flex-wrap gap-2">
          <input
            value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
            inputMode="numeric" placeholder="Tu teléfono (8 dígitos)"
            className="w-44 rounded-lg border border-green-300 bg-white px-3 py-2 outline-none"
          />
          <button onClick={claim} disabled={busy || phone.length !== 8} className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white disabled:opacity-50">
            {busy ? 'Reclamando…' : 'Reclamar a mi saldo'}
          </button>
        </div>
      )}
      {msg.error && <p className="text-xs text-red-600">{msg.error}</p>}
    </div>
  );
}

export default function TrackingGroup({ group, phoneHint = '' }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-xl font-bold">Pedido #{group.groupCode}</h2>
        <p className="text-sm text-slate-500">
          {group.customerName} · {group.area} · {new Date(group.createdAt).toLocaleDateString('es-HN')}
        </p>
        {group.split && (
          <div className="mt-3"><Notice tone="amber">📦 Tu pedido se dividió en {group.orders.length} envíos (por método de pago). Cada uno avanza por separado. Total general: <b>{money(group.grandTotal)}</b>.</Notice></div>
        )}
      </div>

      {group.orders.map((o, idx) => (
        <section key={o.code} className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold">
              {group.split ? `Envío ${idx + 1} · ` : ''}{o.paymentMethod}{o.bank ? ` (${o.bank})` : ''}
            </h3>
            <span className="font-mono text-xs text-slate-400">#{o.code}</span>
          </div>

          <Timeline order={o} />

          {(o.shipment?.carrier || o.shipment?.guide) && (
            <div className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900">
              🚚 {o.shipment.carrier || 'Transportista'} {o.shipment.guide && <>· Guía: <b className="font-mono">{o.shipment.guide}</b></>}
            </div>
          )}

          <ul className="divide-y divide-slate-100 text-sm">
            {o.items.map((i, k) => (
              <li key={k} className="py-3">
                <div className="flex gap-3">
                  <img src={i.image} alt="" className="size-14 rounded-lg bg-slate-100 object-cover" />
                  <div className="flex-1">
                    <p className="font-medium">{i.name}</p>
                    {i.options?.length > 0 && <p className="text-xs text-slate-500">{optionsLabel(i.options)}</p>}
                    <p className="text-xs text-slate-500">Cantidad: {i.qty}</p>
                  </div>
                  <b>{money(i.price * i.qty)}</b>
                </div>
                {o.status === 'Entregado' && <ReviewForm item={i} code={o.code} token={group.token} />}
              </li>
            ))}
          </ul>

          <div className="space-y-1 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{money(o.subtotal)}</span></div>
            {o.discount > 0 && <div className="flex justify-between text-green-600"><span>Descuento</span><span>- {money(o.discount)}</span></div>}
            {o.walletUsed > 0 && <div className="flex justify-between text-green-600"><span>Saldo usado</span><span>- {money(o.walletUsed)}</span></div>}
            <div className="flex justify-between text-slate-600"><span>Envío</span><span>{o.shippingCost ? money(o.shippingCost) : 'GRATIS'}</span></div>
            <div className="flex justify-between text-base font-bold"><span>Total</span><span>{money(o.total)}</span></div>
          </div>

          {o.cashback.status === 'claimable' && <ClaimBox order={o} groupCode={group.groupCode} phoneHint={phoneHint} />}
          {o.cashback.status === 'credited' && <Notice tone="green">💰 Se acreditaron {money(o.cashback.amount)} a tu saldo.</Notice>}
          {o.cashback.status === 'claimed' && <Notice tone="green">💰 Saldo reclamado: {money(o.cashback.amount)} ✓</Notice>}
          {o.cashback.status === 'expired' && <Notice tone="amber">El saldo de {money(o.cashback.amount)} de este pedido venció.</Notice>}
        </section>
      ))}
    </div>
  );
}
