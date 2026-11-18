import { useEffect, useState } from 'react';
import StarRating from './StarRating.jsx';
import { api } from '../lib/api.js';

export default function Reviews({ product }) {
  const [list, setList] = useState(null);

  useEffect(() => {
    api.reviews(product._id).then(setList).catch(() => setList([]));
  }, [product._id]);

  return (
    <section className="mt-12">
      <h2 className="mb-4 text-xl font-bold">Opiniones de compradores</h2>

      {product.ratingCount > 0 && (
        <div className="mb-6 flex flex-wrap gap-6 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <div>
            <p className="text-3xl font-extrabold">{product.ratingAvg.toFixed(1)}</p>
            <StarRating value={product.ratingAvg} />
            <p className="text-xs text-slate-500">Producto ({product.ratingCount})</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold">{product.shippingRatingAvg.toFixed(1)}</p>
            <StarRating value={product.shippingRatingAvg} />
            <p className="text-xs text-slate-500">Rapidez del envío</p>
          </div>
        </div>
      )}

      {list === null ? null : list.length === 0 ? (
        <p className="text-sm text-slate-500">Aún no hay opiniones. Las reseñas se habilitan al recibir tu pedido.</p>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r._id} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">{r.name}</span>
                <StarRating value={r.rating} size={14} />
                <span className="text-xs text-slate-500">
                  Envío: <StarRating value={r.shippingRating} size={12} />
                </span>
              </div>
              {r.comment && <p className="mt-2 text-sm text-slate-600">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
