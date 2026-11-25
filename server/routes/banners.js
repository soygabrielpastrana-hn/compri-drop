import { Router } from 'express';
import Banner from '../models/Banner.js';
import { requirePerm } from '../middleware/auth.js';
import { bool, int, safeLink, str } from '../utils/validate.js';
import { httpError } from '../utils/httpError.js';

const router = Router();
// Valida solo los campos que llegan; enlaces e imágenes solo /ruta, /api/media o https://
const pick = (b = {}) => {
  const d = {};
  if (b.title !== undefined) d.title = str(b.title, { field: 'El texto alternativo', max: 120 });
  if (b.subtitle !== undefined) d.subtitle = str(b.subtitle, { field: 'El subtítulo', max: 200 });
  if (b.image !== undefined) d.image = safeLink(b.image, 'La imagen');
  if (b.link !== undefined) d.link = safeLink(b.link, 'El enlace');
  if (b.buttonText !== undefined) d.buttonText = str(b.buttonText, { field: 'El texto del botón', max: 40 });
  if (b.order !== undefined) d.order = int(b.order, { field: 'El orden', min: -1000, max: 1000 });
  if (b.active !== undefined) d.active = bool(b.active);
  return d;
};

// Público: banners activos del Home
router.get('/', async (_req, res) => {
  res.json(await Banner.find({ active: true }).sort({ order: 1, createdAt: -1 }).limit(10));
});

// Admin
router.get('/admin/all', requirePerm('banners:manage'), async (_req, res) => {
  res.json(await Banner.find().sort({ order: 1, createdAt: -1 }));
});

router.post('/', requirePerm('banners:manage'), async (req, res) => res.status(201).json(await Banner.create(pick(req.body))));

router.put('/:id', requirePerm('banners:manage'), async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw httpError(404, 'Banner no encontrado');
  banner.set(pick(req.body));
  await banner.save();
  res.json(banner);
});

router.delete('/:id', requirePerm('banners:manage'), async (req, res) => {
  const deleted = await Banner.findByIdAndDelete(req.params.id);
  if (!deleted) throw httpError(404, 'Banner no encontrado');
  res.json({ ok: true });
});

export default router;
