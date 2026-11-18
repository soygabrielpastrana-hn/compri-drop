import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { api } from '../lib/api.js';
import ProductCard from './ProductCard.jsx';

// Sección del Home: título + productos (carrusel horizontal o cuadrícula). Se oculta si no hay productos.
export default function ProductRow({ title, params, fallback, to, scroll = false, right = null }) {
  const [items, setItems] = useState(null);
  const sig = JSON.stringify([params, fallback]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let r = await api.products(params);
        if (!r.items.length && fallback) r = await api.products(fallback);
        if (alive) setItems(r.items);
      } catch {
        if (alive) setItems([]);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  if (items && items.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <h2 className="text-xl font-extrabold">{title}</h2>
        {right}
        {to && (
          <Link to={to} className="ml-auto flex items-center text-sm font-medium text-brand-600">
            Ver todo <ChevronRight size={16} />
          </Link>
        )}
      </div>

      {!items ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : scroll ? (
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
          {items.map((p) => (
            <div key={p._id} className="w-40 shrink-0 snap-start sm:w-48">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
