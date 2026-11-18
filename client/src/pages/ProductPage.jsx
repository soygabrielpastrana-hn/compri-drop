import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Banknote, Landmark, Minus, Plus, ShoppingBag, Truck, Zap } from 'lucide-react';
import { api } from '../lib/api.js';
import { useCart } from '../context/CartContext.jsx';
import { effectivePrice, money } from '../lib/format.js';
import { findVariant, matching, normalizeSelection } from '../lib/variants.js';
import { trackView } from '../lib/viewed.js';
import VariantSelector from '../components/VariantSelector.jsx';
import StarRating from '../components/StarRating.jsx';
import ShareButton from '../components/ShareButton.jsx';
import Reviews from '../components/Reviews.jsx';
import Spinner, { Notice } from '../components/Spinner.jsx';

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();

  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState({});
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(null);

  useEffect(() => {
    setProduct(null);
    setError('');
    api
      .product(slug)
      .then((p) => {
        setProduct(p);
        document.title = `${p.name} | Yo lo Quiero HN`;
        trackView(p.category); // alimenta la sección "Para Vos"
        setSelected(p.hasVariants ? normalizeSelection(p.variants, p.attributes, {}) : {});
        setQty(1);
        setActiveImg(null);
        window.scrollTo(0, 0);
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  if (error)
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <Notice>{error}</Notice>
        <Link to="/" className="mt-4 inline-block font-medium text-brand-600">
          Volver a la tienda
        </Link>
      </div>
    );
  if (!product) return <Spinner />;

  const { variants = [], attributes = [] } = product;
  const variant = product.hasVariants ? findVariant(variants, attributes, selected) : null;
  const stock = product.hasVariants ? (variant ? variant.stock : null) : product.stock;
  const price = effectivePrice(product, variant);
  const anySelected = Object.values(selected).some(Boolean);
  const variantImg = product.hasVariants && anySelected ? matching(variants, selected)[0]?.image : null;
  const gallery = [...new Set([...product.images, ...variants.map((v) => v.image).filter(Boolean)])];
  const shownImg = activeImg || variantImg || product.images[0] || gallery[0];
  const missing = attributes.filter((a) => !selected[a.name]).map((a) => a.name);
  const canBuy = product.hasVariants ? Boolean(variant && variant.stock > 0) : product.stock > 0;
  const discount = product.comparePrice > price ? Math.round((1 - price / product.comparePrice) * 100) : 0;

  const pick = (name, value) => {
    setActiveImg(null);
    setQty(1);
    setSelected((prev) =>
      normalizeSelection(variants, attributes, { ...prev, [name]: prev[name] === value ? '' : value })
    );
  };

  const buildItem = () => ({
    productId: product._id,
    slug: product.slug,
    variantId: variant?._id,
    name: product.name,
    image: shownImg,
    options: variant?.options || [],
    price,
    stock,
    payment: product.payment,
    shipping: product.shipping,
  });

  const stockLabel =
    stock === null ? null : stock === 0 ? (
      <span className="font-medium text-red-600">Agotado</span>
    ) : stock <= 5 ? (
      <span className="font-medium text-amber-600">¡Solo quedan {stock}!</span>
    ) : (
      <span className="font-medium text-green-600">Disponible</span>
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <nav className="mb-4 text-sm text-slate-500">
        <Link to="/" className="hover:text-brand-600">Tienda</Link> ›{' '}
        <Link to={`/?cat=${encodeURIComponent(product.category)}`} className="hover:text-brand-600">
          {product.category}
        </Link>
        {product.subcategory && <> › {product.subcategory}</>}
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Galería */}
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
            {shownImg && <img src={shownImg} alt={product.name} className="size-full object-cover" />}
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {gallery.map((src) => (
                <button
                  key={src}
                  onClick={() => setActiveImg(src)}
                  className={`size-16 shrink-0 overflow-hidden rounded-lg ring-2 ${shownImg === src ? 'ring-brand-600' : 'ring-transparent'}`}
                >
                  <img src={src} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Información */}
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold leading-tight">{product.name}</h1>
            {product.ratingCount > 0 && (
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                <StarRating value={product.ratingAvg} /> {product.ratingAvg.toFixed(1)} ({product.ratingCount} opiniones)
              </div>
            )}
          </div>

          <div className="flex items-end gap-3">
            <span className="text-3xl font-extrabold text-brand-700">{money(price)}</span>
            {product.comparePrice > price && (
              <>
                <span className="text-lg text-slate-400 line-through">{money(product.comparePrice)}</span>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-sm font-bold text-red-600">-{discount}%</span>
              </>
            )}
          </div>

          {product.hasVariants && (
            <VariantSelector variants={variants} attributes={attributes} selected={selected} onPick={pick} />
          )}

          <div className="flex items-center gap-4">
            <div className="inline-flex items-center rounded-lg border border-slate-300">
              <button className="p-2.5 disabled:opacity-30" disabled={qty <= 1} onClick={() => setQty(qty - 1)} aria-label="Menos">
                <Minus size={16} />
              </button>
              <span className="w-10 text-center font-medium">{qty}</span>
              <button className="p-2.5 disabled:opacity-30" disabled={!stock || qty >= stock} onClick={() => setQty(qty + 1)} aria-label="Más">
                <Plus size={16} />
              </button>
            </div>
            <div className="text-sm">{stockLabel}</div>
          </div>

          {product.hasVariants && missing.length > 0 && (
            <p className="text-sm text-amber-700">Elige: {missing.join(', ')}</p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              disabled={!canBuy}
              onClick={() => add(buildItem(), qty)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingBag size={18} /> {canBuy || stock === null ? 'Agregar al carrito' : 'Agotado'}
            </button>
            <button
              disabled={!canBuy}
              onClick={() => {
                add(buildItem(), qty);
                navigate('/checkout');
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Zap size={18} /> Comprar ahora
            </button>
          </div>

          <ul className="space-y-2 rounded-2xl bg-white p-4 text-sm ring-1 ring-slate-200">
            <li className="flex items-center gap-2">
              <Truck size={16} className="text-green-600" />
              {product.shipping.free ? <b className="text-green-600">Envío gratis</b> : <>Envío: {money(product.shipping.cost)}</>}
            </li>
            {product.payment.cod && (
              <li className="flex items-center gap-2">
                <Banknote size={16} className="text-slate-500" /> Pago contra entrega (efectivo al recibir)
              </li>
            )}
            {product.payment.transfer && (
              <li className="flex items-center gap-2">
                <Landmark size={16} className="text-slate-500" /> Transferencia (BAC, Ficohsa, Atlántida)
              </li>
            )}
          </ul>

          <ShareButton product={product} image={shownImg} price={price} />
        </div>
      </div>

      {product.description && (
        <section className="mt-10">
          <h2 className="mb-2 text-xl font-bold">Descripción</h2>
          <p className="whitespace-pre-line text-slate-600">{product.description}</p>
        </section>
      )}

      <Reviews product={product} />
    </div>
  );
}
