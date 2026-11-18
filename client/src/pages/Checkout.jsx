import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Banknote, Landmark, MessageCircle, Tag, Wallet } from 'lucide-react';
import { api } from '../lib/api.js';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSite } from '../context/SiteContext.jsx';
import { useQuote } from '../hooks/useQuote.js';
import { BANKS, DEPARTAMENTOS, money } from '../lib/format.js';
import { Notice } from '../components/Spinner.jsx';
import FreeShippingBar from '../components/FreeShippingBar.jsx';
import GoogleButton from '../components/GoogleButton.jsx';

const FORM_KEY = 'tienda-hn-checkout-v2';
const EMPTY = { name: '', phone: '', email: '', departamento: '', municipio: '', colonia: '', referencia: '', bank: '', payment: 'Contra Entrega' };
const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500';

const Field = ({ label, children }) => (
  <label className="block text-sm">
    <span className="mb-1 block font-medium text-slate-700">{label}</span>
    {children}
  </label>
);

const PayCard = ({ value, current, onPick, Icon, title, desc }) => (
  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${current === value ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-slate-300'}`}>
    <input type="radio" name="pay" className="mt-1 accent-brand-600" checked={current === value} onChange={() => onPick(value)} />
    <Icon size={20} className="mt-0.5 shrink-0 text-slate-600" />
    <span>
      <b className="block text-sm">{title}</b>
      <span className="text-xs text-slate-500">{desc}</span>
    </span>
  </label>
);

export default function Checkout() {
  const { items, clear } = useCart();
  const { user, profile, refresh } = useAuth();
  const site = useSite();
  const navigate = useNavigate();

  const [form, setForm] = useState(() => {
    try {
      return { ...EMPTY, ...JSON.parse(localStorage.getItem(FORM_KEY)) };
    } catch {
      return EMPTY;
    }
  });
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState('');
  const [useWallet, setUseWallet] = useState(false);
  const [saveAddr, setSaveAddr] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const { quote, error, couponError, loading } = useQuote(items, { coupon, paymentMethod: form.payment, useWallet });

  useEffect(() => {
    document.title = 'Finalizar pedido | Yo lo Quiero HN';
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FORM_KEY, JSON.stringify(form));
    } catch {
      /* ignorar */
    }
  }, [form]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const applyAddress = (a) =>
    setForm((f) => ({
      ...f,
      name: a.name || f.name, phone: a.phone || f.phone,
      departamento: a.departamento, municipio: a.municipio, colonia: a.colonia, referencia: a.referencia || '',
    }));

  // Con Google: precarga nombre/correo y la dirección predeterminada
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({ ...f, name: f.name || user.displayName || '', email: f.email || user.email || '' }));
    const a = profile?.addresses?.find((x) => x.isDefault) || profile?.addresses?.[0];
    if (a && !form.municipio) applyAddress(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile?._id]);

  const split = Boolean(quote?.splitRequired);
  const flexible = items.some((i) => i.payment?.cod && i.payment?.transfer);
  const needsBank = Boolean(quote?.blocks.some((b) => b.paymentMethod === 'Transferencia'));
  const bankList = site.bankAccounts.length ? [...new Set(site.bankAccounts.map((b) => b.bank))] : BANKS;
  const cashback = quote ? Math.round((quote.subtotal - quote.discount - quote.walletUsed) * site.cashbackPercent) / 100 : 0;
  const blockLabel = (b, idx) => (split ? `📦 Envío ${idx + 1} · ${b.paymentMethod}` : b.paymentMethod);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    try {
      const address = {
        departamento: form.departamento, municipio: form.municipio.trim(), colonia: form.colonia.trim(), referencia: form.referencia.trim(),
      };
      const res = await api.createOrder({
        items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, qty: i.qty })),
        customer: { name: form.name, phone: form.phone, email: form.email },
        address,
        paymentMethod: form.payment,
        bank: needsBank ? form.bank : '',
        couponCode: quote?.coupon?.code,
        useWallet: useWallet || undefined,
      });

      sessionStorage.setItem(
        `order-${res.groupCode}`,
        JSON.stringify({
          whatsappUrl: res.whatsappUrl, total: res.grandTotal, token: res.order.trackingToken, split: res.split,
          orders: res.orders.map((o) => ({ code: o.code, paymentMethod: o.paymentMethod, bank: o.bank, total: o.total })),
        })
      );

      // Guardar la dirección en la cuenta (solo con Google y si hay espacio)
      if (user && saveAddr && (profile?.addresses?.length || 0) < 5) {
        const keep = (profile?.addresses || []).map(({ label, name, phone, departamento, municipio, colonia, referencia, isDefault }) => ({ label, name, phone, departamento, municipio, colonia, referencia, isDefault }));
        const dup = keep.some((a) => a.colonia === address.colonia && a.municipio === address.municipio);
        if (!dup) await api.saveAddresses([...keep, { ...address, label: 'Casa', name: form.name, phone: form.phone, isDefault: keep.length === 0 }]).catch(() => {});
      }
      if (user) refresh();

      clear();
      navigate(`/pedido/${res.groupCode}`);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0)
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="mb-4 text-slate-500">Tu carrito está vacío.</p>
        <Link to="/" className="font-semibold text-brand-600">Ir a la tienda</Link>
      </div>
    );

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-6xl gap-8 px-4 py-6 lg:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Finalizar pedido</h1>

        {!user && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-green-50 p-4 text-sm text-green-800">
            <span>💡 Compra sin registrarte. Con Google guardas tus direcciones y tu saldo ({site.cashbackPercent}% de cada compra) <b>permanente</b>.</span>
            <GoogleButton label="Continuar con Google" />
          </div>
        )}

        <section className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">1. Tus datos y entrega</h2>
            {profile?.addresses?.length > 0 && (
              <select className="rounded-lg border border-slate-300 px-2 py-1 text-xs" defaultValue="" onChange={(e) => e.target.value !== '' && applyAddress(profile.addresses[Number(e.target.value)])}>
                <option value="">Usar dirección guardada…</option>
                {profile.addresses.map((a, i) => <option key={a._id || i} value={i}>{a.label} · {a.colonia}</option>)}
              </select>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre completo">
              <input required minLength={3} className={input} value={form.name} onChange={set('name')} autoComplete="name" />
            </Field>
            <Field label="WhatsApp">
              <div className="flex">
                <span className="grid place-items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">+504</span>
                <input
                  required inputMode="numeric" pattern="\d{8}" maxLength={8} placeholder="99999999"
                  className={`${input} rounded-l-none`}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
                  autoComplete="tel-national"
                />
              </div>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Departamento">
              <select required className={input} value={form.departamento} onChange={set('departamento')}>
                <option value="">Selecciona…</option>
                {DEPARTAMENTOS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Municipio">
              <input required className={input} value={form.municipio} onChange={set('municipio')} />
            </Field>
          </div>
          <Field label="Colonia / Barrio">
            <input required className={input} value={form.colonia} onChange={set('colonia')} />
          </Field>
          <Field label="Referencia (cerca de…, color de casa, etc.)">
            <textarea rows={2} className={input} value={form.referencia} onChange={set('referencia')} />
          </Field>
          {user && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} className="size-4 accent-brand-600" /> Guardar esta dirección en mi cuenta
            </label>
          )}
        </section>

        <section className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <h2 className="font-semibold">2. Método de pago</h2>

          {split ? (
            <>
              <Notice tone="amber">
                📦 Tu carrito mezcla productos que solo se pagan por <b>transferencia</b> con otros que solo se pagan <b>contra entrega</b>. Lo dividimos automáticamente en {quote.blocks.length} envíos; verás ambos desgloses en el resumen y en tu mensaje de WhatsApp.
              </Notice>
              {flexible && (
                <div>
                  <p className="mb-2 text-sm font-medium">Los productos que aceptan ambos métodos, ¿cómo los pagas?</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PayCard value="Transferencia" current={form.payment} onPick={(v) => setForm((f) => ({ ...f, payment: v }))} Icon={Landmark} title="Transferencia" desc="Pagas antes del envío" />
                    <PayCard value="Contra Entrega" current={form.payment} onPick={(v) => setForm((f) => ({ ...f, payment: v }))} Icon={Banknote} title="Contra entrega" desc="Pagas en efectivo al recibir" />
                  </div>
                </div>
              )}
            </>
          ) : quote?.allowed.cod && quote?.allowed.transfer ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <PayCard value="Contra Entrega" current={form.payment} onPick={(v) => setForm((f) => ({ ...f, payment: v }))} Icon={Banknote} title="Contra entrega" desc="Pagas en efectivo al recibir tu paquete" />
              <PayCard value="Transferencia" current={form.payment} onPick={(v) => setForm((f) => ({ ...f, payment: v }))} Icon={Landmark} title="Transferencia bancaria" desc="Pagas antes del envío" />
            </div>
          ) : quote ? (
            <p className="rounded-xl bg-slate-50 p-3 text-sm">
              Los productos de tu carrito se pagan solo por <b>{quote.blocks[0].paymentMethod}</b>.
            </p>
          ) : null}

          {needsBank && (
            <div>
              <p className="mb-2 text-sm font-medium">¿Desde qué banco transferirás?</p>
              <div className="flex flex-wrap gap-2">
                {bankList.map((b) => (
                  <button key={b} type="button" onClick={() => setForm((f) => ({ ...f, bank: b }))}
                    className={`rounded-lg border px-4 py-2 text-sm ${form.bank === b ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700' : 'border-slate-300'}`}>
                    {b}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Al confirmar te mostraremos los datos de la cuenta y te los enviaremos por WhatsApp.</p>
            </div>
          )}
        </section>
      </div>

      {/* Resumen */}
      <aside className="h-fit space-y-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200 lg:sticky lg:top-28">
        <h2 className="font-semibold">Resumen</h2>
        <FreeShippingBar freeShipping={quote?.freeShipping} />

        {quote?.blocks.map((b, idx) => (
          <div key={b.key} className="rounded-xl border border-slate-200 p-3 text-sm">
            <p className="mb-2 font-semibold">{blockLabel(b, idx)}</p>
            <ul className="space-y-1.5">
              {b.lines.map((l) => (
                <li key={`${l.productId}${l.variantId || ''}`} className="flex justify-between gap-3">
                  <span className="text-slate-600">
                    {l.qty} × {l.name}
                    {l.label && <span className="block text-xs text-slate-400">{l.label}</span>}
                  </span>
                  <span className="shrink-0">{money(l.price * l.qty)}</span>
                </li>
              ))}
            </ul>
            {split && (
              <div className="mt-2 space-y-0.5 border-t border-slate-100 pt-2 text-xs text-slate-500">
                <div className="flex justify-between"><span>Subtotal</span><span>{money(b.subtotal)}</span></div>
                {b.discount > 0 && <div className="flex justify-between text-green-600"><span>Descuento</span><span>- {money(b.discount)}</span></div>}
                {b.walletUsed > 0 && <div className="flex justify-between text-green-600"><span>Saldo</span><span>- {money(b.walletUsed)}</span></div>}
                <div className="flex justify-between"><span>Envío</span><span>{b.shippingCost ? money(b.shippingCost) : 'GRATIS'}</span></div>
                <div className="flex justify-between text-sm font-bold text-slate-800"><span>Total del envío</span><span>{money(b.total)}</span></div>
              </div>
            )}
          </div>
        ))}

        <div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Cupón de descuento" className={`${input} pl-8 uppercase`} />
            </div>
            <button type="button" onClick={() => setCoupon(couponInput.trim().toUpperCase())} className="rounded-lg bg-slate-900 px-4 text-sm font-medium text-white">Aplicar</button>
          </div>
          {couponError && <p className="mt-1 text-xs text-red-600">{couponError}</p>}
          {quote?.coupon && <p className="mt-1 text-xs text-green-600">Cupón {quote.coupon.code} aplicado ✓</p>}
        </div>

        {quote?.wallet?.balance > 0 && (
          <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-800">
            <input type="checkbox" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} className="size-4 accent-green-600" />
            <Wallet size={16} /> Usar mi saldo ({money(quote.wallet.balance)})
          </label>
        )}

        {error && <Notice>{error}</Notice>}
        {quote && (
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{money(quote.subtotal)}</span></div>
            {quote.discount > 0 && <div className="flex justify-between text-green-600"><span>Descuento</span><span>- {money(quote.discount)}</span></div>}
            {quote.walletUsed > 0 && <div className="flex justify-between text-green-600"><span>Saldo usado</span><span>- {money(quote.walletUsed)}</span></div>}
            <div className="flex justify-between text-slate-600">
              <span>Envío{split ? ' (total)' : ''}</span>
              <span className={quote.shippingCost === 0 ? 'font-medium text-green-600' : ''}>{quote.shippingCost === 0 ? 'GRATIS' : money(quote.shippingCost)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-bold">
              <span>{split ? 'TOTAL GENERAL' : 'Total'}</span><span className="text-brand-700">{money(quote.total)}</span>
            </div>
            {cashback > 0 && (
              <p className="text-xs text-green-700">
                💰 Ganarás {money(cashback)} de saldo al recibir{!user && ` (como invitado vence en ${site.guestCashbackDays} días; con Google es permanente)`}.
              </p>
            )}
          </div>
        )}
        {loading && !quote && <p className="text-sm text-slate-400">Calculando…</p>}

        {submitError && <Notice>{submitError}</Notice>}
        <button
          type="submit"
          disabled={submitting || !quote || Boolean(error) || (needsBank && !form.bank)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MessageCircle size={18} /> {submitting ? 'Enviando…' : 'Enviar pedido por WhatsApp'}
        </button>
        <p className="text-center text-xs text-slate-500">Se guarda tu pedido y te llevamos a WhatsApp con el resumen listo para enviar.</p>
      </aside>
    </form>
  );
}
