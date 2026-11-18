import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api.js';
import { money } from '../../lib/format.js';
import { Notice } from '../../components/Spinner.jsx';
import VariantBuilder from './VariantBuilder.jsx';

const CATEGORIES = ['Tecnología', 'Hogar', 'Ropa', 'Calzado', 'Ropa y Calzado', 'Accesorios', 'Belleza y Cuidado Personal', 'Deportes', 'Juguetes', 'Mascotas', 'Otros'];
const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500';

const BLANK = {
  name: '', category: '', subcategory: '', description: '', images: '', price: '', comparePrice: '',
  hasVariants: false, stock: 0, attributes: [], variants: [],
  supplier: { name: '', phone: '', cost: '', notes: '' },
  payment: { cod: true, transfer: true },
  shipping: { free: false, cost: '' },
  active: true, featured: false,
};

const fromProduct = (p) => ({
  ...BLANK,
  name: p.name, category: p.category, subcategory: p.subcategory || '', description: p.description || '',
  images: (p.images || []).join('\n'),
  price: p.price, comparePrice: p.comparePrice || '',
  hasVariants: p.hasVariants, stock: p.stock || 0,
  attributes: (p.attributes || []).map((a) => ({ name: a.name, values: [...a.values] })),
  variants: (p.variants || []).map((v) => ({
    _id: v._id, options: v.options.map((o) => ({ name: o.name, value: o.value })),
    stock: v.stock, price: v.price || '', sku: v.sku || '', image: v.image || '',
  })),
  supplier: { name: p.supplier?.name || '', phone: p.supplier?.phone || '', cost: p.supplier?.cost || '', notes: p.supplier?.notes || '' },
  payment: { cod: p.payment.cod, transfer: p.payment.transfer },
  shipping: { free: p.shipping.free, cost: p.shipping.cost || '' },
  active: p.active, featured: p.featured,
});

const Section = ({ title, children }) => (
  <section className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
    <h3 className="font-semibold">{title}</h3>
    {children}
  </section>
);
const Label = ({ text, children }) => (
  <label className="block text-sm">
    <span className="mb-1 block font-medium text-slate-700">{text}</span>
    {children}
  </label>
);
const Check = ({ checked, onChange, children }) => (
  <label className="flex cursor-pointer items-center gap-2 text-sm">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-brand-600" />
    {children}
  </label>
);

export default function ProductForm({ product, guard, onClose }) {
  const [f, setF] = useState(product ? fromProduct(product) : BLANK);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cats, setCats] = useState([]); // categorías administradas en la pestaña Categorías

  useEffect(() => {
    guard(api.admin.categories()).then(setCats).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tops = cats.filter((c) => !c.parent);
  const parent = tops.find((c) => c.name === f.category);
  const subs = parent ? cats.filter((c) => String(c.parent) === String(parent._id)) : [];

  const set = (patch) => setF((prev) => ({ ...prev, ...patch }));
  const text = (k) => (e) => set({ [k]: e.target.value });
  const nested = (group, k, v) => set({ [group]: { ...f[group], [k]: v } });

  const margin = Number(f.price) - Number(f.supplier.cost || 0);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const images = f.images.split('\n').map((s) => s.trim()).filter(Boolean);

    if (!f.name.trim() || !f.category.trim()) return setError('Nombre y categoría son obligatorios');
    if (f.price === '' || Number(f.price) < 0) return setError('Escribe un precio válido en Lempiras');
    if (!images.length) return setError('Agrega al menos una URL de imagen');
    if (!f.payment.cod && !f.payment.transfer) return setError('Activa al menos un método de pago');
    if (f.hasVariants) {
      if (!f.attributes.length || f.attributes.some((a) => !a.name.trim() || !a.values.length))
        return setError('Completa el nombre y los valores de cada atributo');
      if (!f.variants.length) return setError('Pulsa “Generar combinaciones” para crear las variantes');
    }

    const body = {
      name: f.name.trim(), category: f.category.trim(), subcategory: f.subcategory,
      description: f.description, images,
      price: Number(f.price), comparePrice: Number(f.comparePrice) || 0,
      hasVariants: f.hasVariants,
      stock: Number(f.stock) || 0,
      variants: f.hasVariants
        ? f.variants.map((v) => ({
            ...(v._id ? { _id: v._id } : {}),
            options: v.options, stock: Math.max(0, parseInt(v.stock, 10) || 0),
            price: Number(v.price) || 0, sku: v.sku, image: v.image,
          }))
        : [],
      supplier: { name: f.supplier.name, phone: f.supplier.phone, cost: Number(f.supplier.cost) || 0, notes: f.supplier.notes },
      payment: f.payment,
      shipping: { free: f.shipping.free, cost: Number(f.shipping.cost) || 0 },
      active: f.active, featured: f.featured,
    };

    setBusy(true);
    try {
      await guard(api.admin.saveProduct(product?._id, body));
      onClose(true);
    } catch (err) {
      setError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => onClose(false)} className="flex items-center gap-1 text-sm text-slate-600">
          <ArrowLeft size={16} /> Volver
        </button>
        <h2 className="text-xl font-bold">{product ? 'Editar producto' : 'Nuevo producto'}</h2>
      </div>

      {error && <Notice>{error}</Notice>}

      <Section title="Información básica">
        <Label text="Nombre del producto">
          <input className={field} value={f.name} onChange={text('name')} maxLength={160} />
        </Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text="Categoría (elige o escribe una nueva)">
            <input className={field} list="cats" value={f.category} onChange={text('category')} />
            <datalist id="cats">{(tops.length ? tops.map((c) => c.name) : CATEGORIES).map((c) => <option key={c} value={c} />)}</datalist>
          </Label>
          <Label text="Subcategoría">
            <input className={field} list="subs" value={f.subcategory} onChange={text('subcategory')} placeholder="Opcional" />
            <datalist id="subs">{subs.map((c) => <option key={c._id} value={c.name} />)}</datalist>
          </Label>
        </div>
        <Label text="Descripción">
          <textarea rows={4} className={field} value={f.description} onChange={text('description')} />
        </Label>
        <Label text="Imágenes (una URL por línea; la primera es la principal)">
          <textarea rows={3} className={field} value={f.images} onChange={text('images')} placeholder="https://…" />
        </Label>
        {f.images.trim() && (
          <div className="flex gap-2 overflow-x-auto">
            {f.images.split('\n').map((s) => s.trim()).filter(Boolean).map((src) => (
              <img key={src} src={src} alt="" className="size-16 rounded-lg bg-slate-100 object-cover" />
            ))}
          </div>
        )}
      </Section>

      <Section title="Precio">
        <div className="grid gap-4 sm:grid-cols-3">
          <Label text="Precio de venta (L)">
            <input type="number" min="0" step="0.01" className={field} value={f.price} onChange={text('price')} />
          </Label>
          <Label text="Precio antes (tachado, opcional)">
            <input type="number" min="0" step="0.01" className={field} value={f.comparePrice} onChange={text('comparePrice')} />
          </Label>
          <Label text="Costo del proveedor (L)">
            <input type="number" min="0" step="0.01" className={field} value={f.supplier.cost} onChange={(e) => nested('supplier', 'cost', e.target.value)} />
          </Label>
        </div>
        {f.price !== '' && f.supplier.cost !== '' && (
          <p className={`text-sm ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>Ganancia estimada por unidad: {money(margin)}</p>
        )}
      </Section>

      <Section title="Variantes y stock">
        <Check checked={f.hasVariants} onChange={(v) => set({ hasVariants: v })}>
          Este producto tiene variantes (Color, Talla, Capacidad, Modelo…)
        </Check>
        {f.hasVariants ? (
          <VariantBuilder
            attributes={f.attributes}
            variants={f.variants}
            onChange={({ attributes, variants }) => set({ attributes, variants })}
          />
        ) : (
          <Label text="Stock disponible">
            <input type="number" min="0" step="1" className={`${field} max-w-40`} value={f.stock} onChange={text('stock')} />
          </Label>
        )}
      </Section>

      <Section title="Proveedor interno (el cliente nunca lo ve)">
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text="Nombre del proveedor">
            <input className={field} value={f.supplier.name} onChange={(e) => nested('supplier', 'name', e.target.value)} />
          </Label>
          <Label text="Teléfono / contacto">
            <input className={field} value={f.supplier.phone} onChange={(e) => nested('supplier', 'phone', e.target.value)} />
          </Label>
        </div>
        <Label text="Notas internas">
          <textarea rows={2} className={field} value={f.supplier.notes} onChange={(e) => nested('supplier', 'notes', e.target.value)} />
        </Label>
        <p className="text-xs text-slate-500">
          Productos del mismo proveedor viajan juntos: si el nombre coincide, el envío se cobra una sola vez (la tarifa más alta).
        </p>
      </Section>

      <Section title="Pago y envío">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Check checked={f.payment.cod} onChange={(v) => nested('payment', 'cod', v)}>Pago contra entrega</Check>
          <Check checked={f.payment.transfer} onChange={(v) => nested('payment', 'transfer', v)}>Transferencia (BAC, Ficohsa, Atlántida)</Check>
        </div>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <Check checked={f.shipping.free} onChange={(v) => nested('shipping', 'free', v)}>Envío gratis</Check>
          {!f.shipping.free && (
            <Label text="Costo de envío (L)">
              <input type="number" min="0" step="0.01" className={`${field} w-40`} value={f.shipping.cost} onChange={(e) => nested('shipping', 'cost', e.target.value)} />
            </Label>
          )}
        </div>
      </Section>

      <Section title="Visibilidad">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Check checked={f.active} onChange={(v) => set({ active: v })}>Visible en la tienda</Check>
          <Check checked={f.featured} onChange={(v) => set({ featured: v })}>Producto destacado</Check>
        </div>
      </Section>

      <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-slate-100/95 py-3 backdrop-blur">
        <button type="button" onClick={() => onClose(false)} className="rounded-xl px-5 py-3 font-medium text-slate-600">Cancelar</button>
        <button disabled={busy} className="rounded-xl bg-brand-600 px-8 py-3 font-semibold text-white disabled:opacity-60">
          {busy ? 'Guardando…' : product ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </div>
    </form>
  );
}
