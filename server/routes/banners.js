import { Router } from 'express';
import Banner from '../models/Banner.js';
import { requireAdmin } from '../middleware/auth.js';
import { httpError } from '../utils/httpError.js';

const router = Router();
const EDITABLE = ['title', 'subtitle', 'image', 'link', 'buttonText', 'order', 'active'];
const pick = (obj) => Object.fromEntries(EDITABLE.filter((k) => obj?.[k] !== undefined).map((k) => [k, obj[k]]));

// Público: banners activos del Home
router.get('/', async (_req, res) => {
  res.json(await Banner.find({ active: true }).sort({ order: 1, createdAt: -1 }).limit(10));
});

// Admin
router.get('/admin/all', requireAdmin, async (_req, res) => {
  res.json(await Banner.find().sort({ order: 1, createdAt: -1 }));
});

router.post('/', requireAdmin, async (req, res) => res.status(201).json(await Banner.create(pick(req.body))));

router.put('/:id', requireAdmin, async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw httpError(404, 'Banner no encontrado');
  banner.set(pick(req.body));
  await banner.save();
  res.json(banner);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const deleted = await Banner.findByIdAndDelete(req.params.id);
  if (!deleted) throw httpError(404, 'Banner no encontrado');
  res.json({ ok: true });
});

export default router;
