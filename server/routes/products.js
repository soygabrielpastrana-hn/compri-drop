import { Router } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { requireAdmin } from '../middleware/auth.js';
import { httpError } from '../utils/httpError.js';

const router = Router();

const EDITABLE = [
  'name', 'slug', 'description', 'category', 'subcategory', 'brand', 'images', 'price', 'comparePrice',
  'hasVariants', 'stock', 'variants', 'supplier', 'payment', 'shipping', 'active', 'featured',
];
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj?.[k] !== undefined).map((k) => [k, obj[k]]));

const SORTS = {
  recientes: { createdAt: -1 },
  precio_asc: { price: 1 },
  precio_desc: { price: -1 },
  populares: { ratingCount: -1, ratingAvg: -1 },
};

// ---------- Público ----------
router.get('/', async (req, res) => {
  const { category, subcategory, q, sort = 'recientes', featured, min, max } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(60, parseInt(req.query.limit) || 24);

  const filter = { active: true };
  if (category) filter.category = String(category);
  if (subcategory) filter.subcategory = String(subcategory);
  if (featured === 'true') filter.featured = true;
  if (req.query.promo === 'true') filter.$expr = { $gt: ['$comparePrice', '$price'] }; // productos con precio rebajado
  if (q) filter.$text = { $search: String(q) };
  if (min || max) {
    filter.price = {};
    if (min) filter.price.$gte = Number(min);
    if (max) filter.price.$lte = Number(max);
  }

  const [items, total] = await Promise.all([
    Product.find(filter).select('-supplier').sort(SORTS[sort] || SORTS.recientes).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

router.get('/categories', async (_req, res) => {
  const rows = await Product.aggregate([
    { $match: { active: true } },
    { $group: { _id: { category: '$category', subcategory: '$subcategory' }, count: { $sum: 1 } } },
    { $sort: { '_id.category': 1, '_id.subcategory': 1 } },
  ]);
  res.json(rows.map((r) => ({ category: r._id.category, subcategory: r._id.subcategory, count: r.count })));
});

// ---------- Admin ----------
router.get('/admin/list', requireAdmin, async (req, res) => {
  const filter = req.query.q ? { $text: { $search: String(req.query.q) } } : {};
  res.json(await Product.find(filter).sort({ createdAt: -1 }).limit(500));
});

router.post('/', requireAdmin, async (req, res) => {
  const product = await Product.create(pick(req.body, EDITABLE));
  res.status(201).json(product);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw httpError(404, 'Producto no encontrado');
  product.set(pick(req.body, EDITABLE)); // para variantes existentes envía su _id y se conserva
  await product.save();
  res.json(product);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const deleted = await Product.findByIdAndDelete(req.params.id);
  if (!deleted) throw httpError(404, 'Producto no encontrado');
  res.json({ ok: true });
});

// ---------- Detalle (al final para no chocar con /categories y /admin) ----------
router.get('/:idOrSlug', async (req, res) => {
  const v = req.params.idOrSlug;
  const query = mongoose.isValidObjectId(v) ? Product.findById(v) : Product.findOne({ slug: v });
  const product = await query.select('-supplier');
  if (!product || !product.active) throw httpError(404, 'Producto no encontrado');
  res.json(product);
});

export default router;
