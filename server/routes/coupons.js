import { Router } from 'express';
import Coupon from '../models/Coupon.js';
import { requireAdmin } from '../middleware/auth.js';
import { httpError } from '../utils/httpError.js';

const router = Router();
const EDITABLE = ['code', 'type', 'value', 'minPurchase', 'maxUses', 'startsAt', 'expiresAt', 'active'];
const pick = (obj) => Object.fromEntries(EDITABLE.filter((k) => obj?.[k] !== undefined).map((k) => [k, obj[k]]));

// Público: el carrito valida el cupón antes de confirmar
router.post('/validate', async (req, res) => {
  const subtotal = Number(req.body.subtotal) || 0;
  const coupon = await Coupon.findOne({ code: String(req.body.code || '').trim().toUpperCase() });
  if (!coupon) throw httpError(404, 'Cupón no válido');
  const err = coupon.check(subtotal);
  if (err) throw httpError(400, err);
  res.json({ code: coupon.code, type: coupon.type, value: coupon.value, discount: coupon.discountFor(subtotal) });
});

// Admin
router.get('/', requireAdmin, async (_req, res) => res.json(await Coupon.find().sort({ createdAt: -1 })));

router.post('/', requireAdmin, async (req, res) => res.status(201).json(await Coupon.create(pick(req.body))));

router.put('/:id', requireAdmin, async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw httpError(404, 'Cupón no encontrado');
  coupon.set(pick(req.body));
  await coupon.save();
  res.json(coupon);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const deleted = await Coupon.findByIdAndDelete(req.params.id);
  if (!deleted) throw httpError(404, 'Cupón no encontrado');
  res.json({ ok: true });
});

export default router;
