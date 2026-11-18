import { useState } from 'react';
import { api } from '../lib/api.js';
import StarRating from './StarRating.jsx';
import { Notice } from './Spinner.jsx';

// Reseña de un producto de un pedido entregado (producto + rapidez del envío)
export default function ReviewForm({ item, code, token }) {
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
      <p className="font-medium">Califica: {item.name}</p>
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
