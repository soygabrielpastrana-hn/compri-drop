import mongoose from 'mongoose';
import { serverUrl } from '../utils/urls.js';

const { Schema } = mongoose;

const slugify = (s) =>
  s.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const norm = (s) => (s || '').toString().trim().toLowerCase();

// Atributos 100% dinámicos: cada variante guarda una lista de opciones { name, value } en texto libre.
// Ej.: [{name:'Color',value:'Azul'},{name:'Talla',value:'36'}]  o  [{name:'Capacidad',value:'128GB'}]
const optionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    value: { type: String, required: true, trim: true, maxlength: 60 },
  },
  { _id: false }
);

const variantSchema = new Schema({
  options: { type: [optionSchema], default: [] },
  stock: { type: Number, min: 0, default: 0, validate: { validator: Number.isInteger, message: 'El stock debe ser entero' } },
  price: { type: Number, min: 0, default: 0 }, // 0 = usa el precio base del producto
  sku: { type: String, trim: true },
  image: { type: String, trim: true },
});

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, unique: true, index: true },
    description: { type: String, default: '' },
    category: { type: String, required: true, trim: true }, // Tecnología, Hogar, Ropa y Calzado, Accesorios...
    subcategory: { type: String, trim: true, default: '' }, // nombre de una subcategoría (ver Category)
    brand: { type: String, trim: true },
    images: { type: [String], default: [] },

    price: { type: Number, required: true, min: 0 }, // Lempiras
    comparePrice: { type: Number, min: 0, default: 0 }, // precio tachado

    // Stock simple (si hasVariants = false)
    hasVariants: { type: Boolean, default: false },
    stock: { type: Number, min: 0, default: 0 },
    variants: { type: [variantSchema], default: [] },

    // Interno: nunca se expone al público
    supplier: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      cost: { type: Number, min: 0, default: 0 },
      notes: { type: String },
    },

    // Modelo A (transferencia) / Modelo B (contra entrega) / ambos
    payment: {
      cod: { type: Boolean, default: true },
      transfer: { type: Boolean, default: true },
    },
    shipping: {
      free: { type: Boolean, default: false },
      cost: { type: Number, min: 0, default: 0 },
    },

    active: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },

    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    shippingRatingAvg: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.__v;
        delete ret.id;
        return ret;
      },
    },
  }
);

productSchema.index({ name: 'text', description: 'text' }, { default_language: 'spanish' });
productSchema.index({ category: 1, subcategory: 1, active: 1 });

productSchema.pre('validate', function () {
  if (!this.slug && this.name) this.slug = `${slugify(this.name)}-${Math.random().toString(36).slice(2, 6)}`;
  if (!this.payment.cod && !this.payment.transfer) this.invalidate('payment', 'Activa al menos un método de pago');

  if (this.hasVariants) {
    if (!this.variants.length) return this.invalidate('variants', 'Agrega al menos una variante');

    const nameKey = (v) => v.options.map((o) => norm(o.name)).sort().join('|');
    const base = nameKey(this.variants[0]);
    const seen = new Set();

    for (const v of this.variants) {
      if (!v.options.length || v.options.length > 5) return this.invalidate('variants', 'Cada variante necesita entre 1 y 5 atributos');
      if (new Set(v.options.map((o) => norm(o.name))).size !== v.options.length)
        return this.invalidate('variants', 'Un atributo está repetido dentro de una variante');
      if (nameKey(v) !== base) return this.invalidate('variants', 'Todas las variantes deben usar los mismos atributos');

      const key = v.options.map((o) => `${norm(o.name)}=${norm(o.value)}`).sort().join('|');
      if (seen.has(key)) return this.invalidate('variants', `Variante duplicada: ${v.options.map((o) => o.value).join(' / ')}`);
      seen.add(key);
    }
  } else {
    this.variants = [];
  }
});

productSchema.virtual('totalStock').get(function () {
  return this.hasVariants ? this.variants.reduce((a, v) => a + v.stock, 0) : this.stock;
});

productSchema.virtual('inStock').get(function () {
  return this.totalStock > 0;
});

productSchema.virtual('shareUrl').get(function () {
  return `${serverUrl()}/p/${this.slug}`;
});

// Lista de atributos con sus valores, en el orden en que los definió el admin.
// El frontend filtra dependencias con `variants`: un valor se habilita solo si existe una variante
// con ese valor + las demás opciones ya elegidas, y con stock > 0.
productSchema.virtual('attributes').get(function () {
  if (!this.hasVariants) return [];
  const map = new Map();
  for (const v of this.variants) {
    for (const o of v.options) {
      const k = norm(o.name);
      if (!map.has(k)) map.set(k, { name: o.name, values: [] });
      const attr = map.get(k);
      if (!attr.values.some((x) => norm(x) === norm(o.value))) attr.values.push(o.value);
    }
  }
  return [...map.values()];
});

export default mongoose.model('Product', productSchema);
