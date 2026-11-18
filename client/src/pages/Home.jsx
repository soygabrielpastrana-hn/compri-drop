import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Banknote, Truck, Wallet } from 'lucide-react';
import { api } from '../lib/api.js';
import { money } from '../lib/format.js';
import { topViewedCategory } from '../lib/viewed.js';
import { useSite } from '../context/SiteContext.jsx';
import { useCategories } from '../hooks/useCategories.js';
import HeroBanners from '../components/HeroBanners.jsx';
import Countdown from '../components/Countdown.jsx';
import ProductCard from '../components/ProductCard.jsx';
import ProductRow from '../components/ProductRow.jsx';
import Spinner, { Notice } from '../components/Spinner.jsx';

const SORTS = [
  ['recientes', 'Más recientes'],
  ['populares', 'Más populares'],
  ['precio_asc', 'Precio: menor a mayor'],
  ['precio_desc', 'Precio: mayor a menor'],
];

const chip = (active) =>
  `whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
    active ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
  }`;

const Benefit = ({ icon: Icon, children }) => (
  <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 sm:text-sm">
    <Icon size={18} className="shrink-0 text-brand-600" /> {children}
  </div>
);

// ---------- Portada estilo Temu ----------
function Landing() {
  const site = useSite();
  const fav = useMemo(() => topViewedCategory(), []);

  return (
    <>
      <HeroBanners />

      <div className="grid gap-2 sm:grid-cols-3">
        <Benefit icon={Truck}>
          {site.freeShippingMin > 0 ? <>Envío gratis desde <b>{money(site.freeShippingMin)}</b></> : 'Envíos a todo Honduras'}
        </Benefit>
        <Benefit icon={Banknote}>Paga al recibir (contra entrega)</Benefit>
        <Benefit icon={Wallet}>Gana <b>{site.cashbackPercent}%</b> de saldo en cada compra</Benefit>
      </div>

      <ProductRow
        title="⚡ Ofertas Relámpago"
        right={<Countdown />}
        params={{ promo: 'true', sort: 'precio_asc', limit: 10 }}
        to="/?promo=1"
        scroll
      />
      <ProductRow
        title="Para Vos"
        params={fav ? { category: fav, sort: 'populares', limit: 8 } : { featured: 'true', limit: 8 }}
        fallback={{ sort: 'populares', limit: 8 }}
        to={fav ? `/?cat=${encodeURIComponent(fav)}` : '/?sort=populares'}
      />
      <ProductRow title="🔥 En Tendencia" params={{ sort: 'populares', limit: 8 }} to="/?sort=populares" />
      <ProductRow title="✨ Nuevos" params={{ sort: 'recientes', limit: 8 }} to="/?sort=recientes" />
      <ProductRow title="🏷️ Promos" params={{ promo: 'true', limit: 8 }} to="/?promo=1" />
    </>
  );
}

// ---------- Catálogo filtrado (categoría, búsqueda, promos, orden) ----------
function Catalog({ params, setParams }) {
  const cat = params.get('cat') || '';
  const sub = params.get('sub') || '';
  const q = params.get('q') || '';
  const promo = params.get('promo') === '1';
  const sort = params.get('sort') || 'recientes';

  const cats = useCategories();
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const query = (page) => ({ category: cat, subcategory: sub, q, sort, page, limit: 24, promo: promo ? 'true' : '' });

  useEffect(() => {
    setLoading(true);
    setError('');
    api.products(query(1)).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, sub, q, sort, promo]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const r = await api.products(query(data.page + 1));
      setData((d) => ({ ...r, items: [...d.items, ...r.items] }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const setFilter = (next) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    setParams(p);
  };

  const subs = cats.find((c) => c.name === cat)?.subcategories || [];

  return (
    <>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
        <Link to="/" className={chip(false)}>← Inicio</Link>
        <button className={chip(promo)} onClick={() => setFilter({ promo: promo ? '' : '1' })}>🔥 Promos</button>
        {cats.map((c) => (
          <button key={c._id} className={chip(cat === c.name)} onClick={() => setFilter({ cat: cat === c.name ? '' : c.name, sub: '' })}>
            {c.name}
          </button>
        ))}
      </div>

      {subs.length > 0 && (
        <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-2">
          <button className={chip(!sub)} onClick={() => setFilter({ sub: '' })}>Todos</button>
          {subs.map((s) => (
            <button key={s._id} className={chip(sub === s.name)} onClick={() => setFilter({ sub: s.name })}>{s.name}</button>
          ))}
        </div>
      )}

      <div className="mb-4 mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          {q && <>Resultados para “{q}” · </>}
          {data.total} producto{data.total === 1 ? '' : 's'}
        </p>
        <select
          value={sort}
          onChange={(e) => setFilter({ sort: e.target.value })}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
        >
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {error && <Notice>{error}</Notice>}
      {loading ? (
        <Spinner />
      ) : data.items.length === 0 ? (
        <p className="py-16 text-center text-slate-500">No encontramos productos con esos filtros.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {data.items.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
          {data.page < data.pages && (
            <div className="mt-8 text-center">
              <button onClick={loadMore} disabled={loadingMore} className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold ring-1 ring-slate-300 hover:bg-slate-100 disabled:opacity-50">
                {loadingMore ? 'Cargando…' : 'Ver más productos'}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function Home() {
  const [params, setParams] = useSearchParams();
  const filtered = ['cat', 'sub', 'q', 'promo', 'sort'].some((k) => params.get(k));

  useEffect(() => {
    document.title = 'Yo lo Quiero HN';
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {filtered ? <Catalog params={params} setParams={setParams} /> : <Landing />}
    </div>
  );
}
