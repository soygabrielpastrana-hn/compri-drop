import { Router } from 'express';
import Popup, { POPUP_FREQUENCIES } from '../models/Popup.js';
import { requirePerm } from '../middleware/auth.js';
import { httpError } from '../utils/httpError.js';
import { bool, dateOrNull, int, oneOf, safeLink, str } from '../utils/validate.js';

const router = Router();

// Valida solo los campos que llegan (sirve para crear y para cambios parciales como activar/desactivar)
function clean(b = {}) {
  const d = {};
  if (b.title !== undefined) d.title = str(b.title, { field: 'El texto alternativo', max: 120 });
  if (b.image !== undefined) d.image = safeLink(b.image, 'La imagen');
  if (b.link !== undefined) d.link = safeLink(b.link, 'El enlace');
  if (b.active !== undefined) d.active = bool(b.active);
  if (b.frequency !== undefined) d.frequency = oneOf(b.frequency, POPUP_FREQUENCIES, 'La frecuencia');
  if (b.delaySeconds !== undefined) d.delaySeconds = int(b.delaySeconds, { field: 'La demora', min: 0, max: 30, def: 2 });
  if (b.order !== undefined) d.order = int(b.order, { field: 'El orden', min: -1000, max: 1000 });
  if (b.startsAt !== undefined) d.startsAt = dateOrNull(b.startsAt, 'La fecha de inicio');
  if (b.endsAt !== undefined) d.endsAt = dateOrNull(b.endsAt, 'La fecha de fin');
  return d;
}

// Público: popups activos y vigentes (el navegador decide cuál mostrar según su frecuencia)
router.get('/', async (_req, res) => {
  const now = new Date();
  const list = await Popup.find({
    active: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  })
    .sort({ order: 1, createdAt: -1 })
    .limit(5);

  res.json(
    list.map((p) => ({
      _id: p._id, title: p.title, image: p.image, link: p.link,
      frequency: p.frequency, delaySeconds: p.delaySeconds,
      version: p.updatedAt.getTime(), // al editar el popup cambia la versión y vuelve a mostrarse
    }))
  );
});

// Admin
router.get('/admin/all', requirePerm('popups:manage'), async (_req, res) => {
  res.json(await Popup.find().sort({ order: 1, createdAt: -1 }));
});

router.post('/', requirePerm('popups:manage'), async (req, res) => {
  const data = clean(req.body);
  if (!data.image) throw httpError(400, 'Sube la imagen del popup');
  res.status(201).json(await Popup.create(data));
});

router.put('/:id', requirePerm('popups:manage'), async (req, res) => {
  const popup = await Popup.findById(req.params.id);
  if (!popup) throw httpError(404, 'Popup no encontrado');
  popup.set(clean(req.body));
  await popup.save();
  res.json(popup);
});

router.delete('/:id', requirePerm('popups:manage'), async (req, res) => {
  const deleted = await Popup.findByIdAndDelete(req.params.id);
  if (!deleted) throw httpError(404, 'Popup no encontrado');
  res.json({ ok: true });
});

export default router;
