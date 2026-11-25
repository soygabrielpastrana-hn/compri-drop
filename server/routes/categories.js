import { Router } from 'express';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { requirePerm } from '../middleware/auth.js';
import { bool, int, safeLink, str } from '../utils/validate.js';
import { httpError } from '../utils/httpError.js';

const router = Router();
const pick = (b = {}) => {
  const d = {};
  if (b.name !== undefined) d.name = str(b.name, { field: 'El nombre', min: 1, max: 60 });
  if (b.icon !== undefined) d.icon = /^https?:/i.test(String(b.icon)) ? safeLink(b.icon, 'El ícono') : str(b.icon, { field: 'El ícono', max: 16 });
  if (b.image !== undefined) d.image = safeLink(b.image, 'La imagen');
  if (b.parent !== undefined) d.parent = b.parent || null;
  if (b.order !== undefined) d.order = int(b.order, { field: 'El orden', min: -1000, max: 1000 });
  if (b.active !== undefined) d.active = bool(b.active);
  return d;
};

// Público: árbol de categorías activas con conteo de productos
router.get('/', async (_req, res) => {
  const [cats, counts] = await Promise.all([
    Category.find({ active: true }).sort({ order: 1, name: 1 }).lean(),
    Product.aggregate([{ $match: { active: true } }, { $group: { _id: { c: '$category', s: '$subcategory' }, n: { $sum: 1 } } }]),
  ]);
  const key = (c, s) => `${c}|${s || ''}`;
  const cnt = new Map(counts.map((r) => [key(r._id.c, r._id.s), r.n]));

  const tree = cats
    .filter((c) => !c.parent)
    .map((top) => ({
      ...top,
      count: counts.filter((r) => r._id.c === top.name).reduce((a, r) => a + r.n, 0),
      subcategories: cats
        .filter((s) => String(s.parent) === String(top._id))
        .map((s) => ({ ...s, count: cnt.get(key(top.name, s.name)) || 0 })),
    }));
  res.json(tree);
});

// ---------- Admin ----------
router.get('/admin/all', requirePerm('categories:read'), async (_req, res) => {
  res.json(await Category.find().sort({ order: 1, name: 1 }));
});

router.post('/', requirePerm('categories:write'), async (req, res) => {
  const data = pick(req.body);
  if (data.parent) {
    const parent = await Category.findById(data.parent);
    if (!parent || parent.parent) throw httpError(400, 'La categoría padre debe ser una categoría principal');
  } else {
    data.parent = null;
  }
  res.status(201).json(await Category.create(data));
});

router.put('/:id', requirePerm('categories:write'), async (req, res) => {
  const cat = await Category.findById(req.params.id);
  if (!cat) throw httpError(404, 'Categoría no encontrada');
  const data = pick(req.body);
  delete data.parent; // no se mueve de nivel
  const oldName = cat.name;

  cat.set(data);
  await cat.save();

  // Si cambió el nombre, actualiza los productos que la usan
  if (data.name && data.name !== oldName) {
    if (!cat.parent) await Product.updateMany({ category: oldName }, { category: cat.name });
    else {
      const parent = await Category.findById(cat.parent);
      await Product.updateMany({ category: parent.name, subcategory: oldName }, { subcategory: cat.name });
    }
  }
  res.json(cat);
});

router.delete('/:id', requirePerm('categories:write'), async (req, res) => {
  if (await Category.exists({ parent: req.params.id })) throw httpError(409, 'Elimina primero sus subcategorías');
  const deleted = await Category.findByIdAndDelete(req.params.id);
  if (!deleted) throw httpError(404, 'Categoría no encontrada');
  res.json({ ok: true });
});

export default router;
