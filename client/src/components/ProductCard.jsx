import { Link } from 'react-router-dom';
import { Truck } from 'lucide-react';
import StarRating from './StarRating.jsx';
import { money, priceInfo } from '../lib/format.js';

const Badge = ({ children, green }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
      green ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
    }`}
  >
    {children}
  </span>
);

export default function ProductCard({ product }) {
  const { min, max } = priceInfo(product);
  const soldOut = !product.inStock;
  const discount = product.comparePrice > min ? Math.round((1 - min / product.comparePrice) * 100) : 0;

  return (
    <Link
      to={`/producto/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        {product.images[0] && (
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition duration-300 group-hover:scale-105"
          />
        )}
        {discount > 0 && !soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
            -{discount}%
          </span>
        )}
        {!soldOut && product.totalStock <= 5 && (
          <span className="absolute bottom-2 left-2 rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] font-bold text-white">
            ¡Últimas unidades!
          </span>
        )}
        {soldOut && (
          <div className="absolute inset-0 grid place-items-center bg-white/70 text-sm font-semibold text-slate-700">
            Agotado
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</h3>
        {product.ratingCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <StarRating value={product.ratingAvg} size={12} /> ({product.ratingCount})
          </div>
        )}
        <div className="mt-auto pt-1">
          {min !== max && <span className="text-xs text-slate-500">Desde </span>}
          <span className="text-lg font-bold text-brand-700">{money(min)}</span>
          {min === max && product.comparePrice > min && (
            <span className="ml-2 text-xs text-slate-400 line-through">{money(product.comparePrice)}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {product.shipping.free && (
            <Badge green>
              <Truck size={11} /> Envío gratis
            </Badge>
          )}
          {product.payment.cod && <Badge>Contra entrega</Badge>}
        </div>
      </div>
    </Link>
  );
}
