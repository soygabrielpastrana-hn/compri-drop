import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, Wallet, X } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useSite } from '../context/SiteContext.jsx';
import { useQuote } from '../hooks/useQuote.js';
import { money, optionsLabel } from '../lib/format.js';
import FreeShippingBar from './FreeShippingBar.jsx';
import { Notice } from './Spinner.jsx';

export default function CartDrawer() {
  const { items, open, setOpen, setQty, remove } = useCart();
  const { cashbackPercent } = useSite();
  const navigate = useNavigate();
  const { quote, error, loading } = useQuote(open ? items : [], {});

  if (!open) return null;

  const lineOf = (i) =>
    quote?.lines.find((l) => String(l.productId) === String(i.productId) && String(l.variantId || '') === String(i.variantId || ''));
  const cashback = quote ? Math.round((quote.subtotal - quote.discount) * cashbackPercent) / 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-label="Carrito">
      <div className="flex-1 bg-black/40" onClick={() => setOpen(false)} />
      <aside className="flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ShoppingBag size={20} /> Tu carrito
          </h2>
          <button onClick={() => setOpen(false)} aria-label="Cerrar">
            <X />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-slate-500">
            <ShoppingBag size={48} className="text-slate-300" />
            <p>Tu carrito está vacío</p>
            <button onClick={() => setOpen(false)} className="font-medium text-brand-600">Seguir comprando</button>
          </div>
        ) : (
          <>
            <div className="space-y-2 border-b border-slate-100 p-4">
              <FreeShippingBar freeShipping={quote?.freeShipping} />
              {quote?.splitRequired && (
                <Notice tone="amber">
                  📦 Tu pedido saldrá en <b>{quote.blocks.length} envíos</b> porque mezcla productos de pago por transferencia y contra entrega. Lo resolvemos automáticamente al finalizar.
                </Notice>
              )}
            </div>

            <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto px-4">
              {items.map((i) => {
                const price = lineOf(i)?.price ?? i.price;
                return (
                  <li key={i.key} className="flex gap-3 py-4">
                    <Link to={`/producto/${i.slug}`} onClick={() => setOpen(false)}>
                      <img src={i.image} alt="" className="size-20 rounded-lg bg-slate-100 object-cover" />
                    </Link>
                    <div className="flex flex-1 flex-col gap-1">
                      <p className="line-clamp-2 text-sm font-medium">{i.name}</p>
                      {i.options?.length > 0 && <p className="text-xs text-slate-500">{optionsLabel(i.options)}</p>}
                      <div className="mt-auto flex items-center justify-between">
                        <div className="inline-flex items-center rounded-lg border border-slate-300">
                          <button className="p-1.5 disabled:opacity-30" disabled={i.qty <= 1} onClick={() => setQty(i.key, i.qty - 1)} aria-label="Menos"><Minus size={14} /></button>
                          <span className="w-8 text-center text-sm">{i.qty}</span>
                          <button className="p-1.5 disabled:opacity-30" disabled={i.qty >= i.stock} onClick={() => setQty(i.key, i.qty + 1)} aria-label="Más"><Plus size={14} /></button>
                        </div>
                        <span className="font-semibold">{money(price * i.qty)}</span>
                      </div>
                      {i.qty >= i.stock && <p className="text-[11px] text-amber-600">Máximo disponible: {i.stock}</p>}
                    </div>
                    <button onClick={() => remove(i.key)} className="self-start text-slate-400 hover:text-red-600" aria-label="Quitar"><Trash2 size={16} /></button>
                  </li>
                );
              })}
            </ul>

            <div className="space-y-2 border-t border-slate-200 p-4 text-sm">
              {error && <Notice>{error}</Notice>}
              {quote && (
                <>
                  <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{money(quote.subtotal)}</span></div>
                  <div className="flex justify-between text-slate-600">
                    <span>Envío</span>
                    <span className={quote.shippingCost === 0 ? 'font-medium text-green-600' : ''}>{quote.shippingCost === 0 ? 'GRATIS' : money(quote.shippingCost)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold">
                    <span>Total</span><span className="text-brand-700">{money(quote.total)}</span>
                  </div>
                  {cashback > 0 && (
                    <p className="flex items-center gap-1.5 text-xs text-green-700"><Wallet size={13} /> Ganarás {money(cashback)} de saldo al recibir tu pedido</p>
                  )}
                </>
              )}
              {loading && !quote && <p className="text-slate-400">Calculando…</p>}
              <button
                disabled={!quote || Boolean(error)}
                onClick={() => { setOpen(false); navigate('/checkout'); }}
                className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Finalizar pedido
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
