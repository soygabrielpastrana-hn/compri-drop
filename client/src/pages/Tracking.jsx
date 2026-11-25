import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { api } from '../lib/api.js';
import { money, optionsLabel } from '../lib/format.js';
import StarRating from '../components/StarRating.jsx';
import Spinner, { Notice } from '../components/Spinner.jsx';

const STEPS = ['Pendiente', 'Confirmado por WhatsApp', 'Enviado', 'Entregado'];

function ReviewForm({ item, code, token }) {
  const [rating, setRating] = useState(5);
  const [shippingRating, setShippingRating] = useState(5);
  const [comment, setComment] = useState('');
  const [state, setState] = useState({ done: false, error: '', busy: false });

  const send = async (e) => {
    e.preventDefault();
    setState({ done: false, error: '', busy: true });
    try {
      await api.addReview({ productId: item.product, orderCode: code, token, rating, shippingRating, comment });
      setState({ done: true, error: '', busy: false });
    } catch (err) {
      setState({ done: false, error: err.message, busy: false });
    }
  };

  if (state.done) return <Notice tone="green">¡Gracias por tu opinión!</Notice>;

  return (
    <form onSubmit={send} className="mt-2 space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <span className="flex items-center gap-2">Producto <StarRating value={rating} onChange={setRating} size={20} /></span>
        <span className="flex items-center gap-2">Rapidez del envío <StarRating value={shippingRating} onChange={setShippingRating} size={20} /></span>
      </div>
      <textarea
        rows={2} maxLength={600} value={comment} onChange={(e) => setComment(e.target.value)}
        placeholder="Cuéntanos qué tal estuvo (opcional)"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand-500"
      />
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      <button disabled={state.busy} className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white disabled:opacity-60">
        {state.busy ? 'Enviando…' : 'Publicar opinión'}
      </button>
    </form>
  );
}

export default function Tracking() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const token = params.get('t') || '';
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = `Pedido #${code} | Compri HN`;
    api.track(code, token).then(setOrder).catch((e) => setError(e.message));
  }, [code, token]);

  if (error) return <div className="mx-auto max-w-xl px-4 py-16"><Notice>{error}</Notice></div>;
  if (!order) return <Spinner />;

  const cancelled = order.status === 'Cancelado';
  const current = STEPS.indexOf(order.status);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Pedido #{order.code}</h1>

      {cancelled ? (
        <Notice>Este pedido fue cancelado.</Notice>
      ) : (
        <ol className="flex justify-between gap-1">
          {STEPS.map((s, idx) => (
            <li key={s} className="flex flex-1 flex-col items-center gap-1 text-center">
              <span className={`grid size-9 place-items-center rounded-full text-sm font-bold ${idx <= current ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {idx <= current ? <Check size={16} /> : idx + 1}
              </span>
              <span className={`text-xs ${idx <= current ? 'font-semibold' : 'text-slate-500'}`}>{s}</span>
            </li>
          ))}
        </ol>
      )}

      <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <ul className="divide-y divide-slate-100">
          {order.items.map((i, idx) => (
            <li key={idx} className="py-3">
              <div className="flex gap-3 text-sm">
                <img src={i.image} alt="" className="size-14 rounded-lg bg-slate-100 object-cover" />
                <div className="flex-1">
                  <p className="font-medium">{i.name}</p>
                  {i.options?.length > 0 && <p className="text-xs text-slate-500">{optionsLabel(i.options)}</p>}
                  <p className="text-xs text-slate-500">Cantidad: {i.qty}</p>
                </div>
                <b>{money(i.price * i.qty)}</b>
              </div>
              {order.status === 'Entregado' && <ReviewForm item={i} code={order.code} token={token} />}
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
          <div className="flex justify-between"><span>Pago</span><span>{order.paymentMethod}</span></div>
          <div className="flex justify-between"><span>Entrega en</span><span>{order.address.municipio}, {order.address.departamento}</span></div>
          <div className="flex justify-between text-base font-bold"><span>Total</span><span>{money(order.total)}</span></div>
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Historial</h2>
        <ul className="space-y-1 text-sm text-slate-600">
          {[...order.statusHistory].reverse().map((h, idx) => (
            <li key={idx}>
              <b>{h.status}</b> · {new Date(h.at).toLocaleString('es-HN')}
              {h.note ? ` — ${h.note}` : ''}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
