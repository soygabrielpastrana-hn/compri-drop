import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories.js';

const Icon = ({ icon }) =>
  !icon ? null : icon.startsWith('http') ? <img src={icon} alt="" className="mr-1 inline size-4 object-contain" /> : <span className="mr-1">{icon}</span>;

// Menú de categorías: en computador, al pasar el mouse se abre el panel con subcategorías.
export default function CategoryMenu() {
  const cats = useCategories();
  const [hover, setHover] = useState(null);
  if (!cats.length) return null;

  const active = cats.find((c) => c.name === hover);
  const to = (c, s) => `/?cat=${encodeURIComponent(c)}${s ? `&sub=${encodeURIComponent(s)}` : ''}`;

  return (
    <nav className="relative border-t border-slate-100 bg-white" onMouseLeave={() => setHover(null)}>
      <div className="mx-auto flex max-w-6xl overflow-x-auto px-2 text-sm">
        <Link to="/?promo=1" onMouseEnter={() => setHover(null)} className="whitespace-nowrap px-3 py-2.5 font-bold text-red-600">
          🔥 Promos
        </Link>
        {cats.map((c) => (
          <Link
            key={c._id}
            to={to(c.name)}
            onMouseEnter={() => setHover(c.name)}
            className={`whitespace-nowrap px-3 py-2.5 font-medium hover:text-brand-600 ${hover === c.name ? 'text-brand-600' : 'text-slate-700'}`}
          >
            <Icon icon={c.icon} />
            {c.name}
          </Link>
        ))}
      </div>

      {active?.subcategories?.length > 0 && (
        <div className="absolute inset-x-0 top-full z-40 hidden border-b border-slate-200 bg-white shadow-lg md:block">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-2 px-4 py-4 lg:grid-cols-4">
            <Link to={to(active.name)} onClick={() => setHover(null)} className="font-bold text-brand-600">
              Ver todo en {active.name}
            </Link>
            {active.subcategories.map((s) => (
              <Link key={s._id} to={to(active.name, s.name)} onClick={() => setHover(null)} className="text-slate-700 hover:text-brand-600">
                {s.name} <span className="text-xs text-slate-400">({s.count})</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
