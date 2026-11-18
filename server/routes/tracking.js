import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import Order from '../models/Order.js';
import { authOptional, requireAuth } from '../middleware/auth.js';
import { httpError } from '../utils/httpError.js';
import { normCode, normPhone } from '../utils/phone.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: { message: 'Demasiados intentos, espera unos minutos' },
});

// Mismo mensaje para "código inexistente" y "teléfono incorrecto" (no revela qué pedidos existen)
const NOT_FOUND = 'No encontramos un pedido con esos datos. Revisa el código y el teléfono.';

const publicOrder = (o) => ({
  code: o.code,
  status: o.status,
  paymentMethod: o.paymentMethod,
  bank: o.paymentMethod === 'Transferencia' ? o.bank : '',
  items: o.items.map((i) => ({ product: i.product, name: i.name, image: i.image, options: i.options, qty: i.qty, price: i.price })),
  subtotal: o.subtotal, discount: o.discount, walletUsed: o.walletUsed, shippingCost: o.shippingCost, total: o.total,
  shipment: o.shipment,
  statusHistory: o.statusHistory.map((h) => ({ status: h.status, note: h.note, carrier: h.carrier, guide: h.guide, at: h.at })),
  cashback: { amount: o.cashback?.amount || 0, status: o.cashback?.status || 'none', expiresAt: o.cashback?.expiresAt },
});

// Solo datos no sensibles: sin teléfono completo ni dirección exacta
const publicGroup = (orders) => ({
  groupCode: orders[0].groupCode || orders[0].code,
  createdAt: orders[0].createdAt,
  customerName: orders[0].customer.name.split(' ')[0],
  area: `${orders[0].address.municipio}, ${orders[0].address.departamento}`,
  split: orders.length > 1,
  grandTotal: Math.round(orders.reduce((a, o) => a + o.total, 0) * 100) / 100,
  token: orders[0].trackingToken, // permite publicar reseñas (POST /api/reviews)
  orders: orders.map(publicOrder),
});

const loadGroup = async (hit) =>
  hit.groupCode ? Order.find({ groupCode: hit.groupCode }).sort({ code: 1 }) : [await Order.findById(hit._id)];

// POST /api/tracking/lookup  { orderCode, phone }  → coincidencia exacta de código + teléfono (8 dígitos).
// Con sesión de Google se puede omitir el teléfono si el pedido pertenece a la cuenta.
router.post('/lookup', limiter, authOptional, async (req, res) => {
  const code = normCode(req.body?.orderCode);
  const phone = normPhone(req.body?.phone);
  if (!code) throw httpError(400, 'Escribe el código de tu pedido (ej. HN-1042)');

  const base = { $or: [{ code }, { groupCode: code }] };
  let filter;
  if (phone) filter = { ...base, 'customer.phoneNorm': phone };
  else if (req.dbUser) filter = { ...base, 'customer.user': req.dbUser._id };
  else throw httpError(400, 'Escribe el teléfono de 8 dígitos con el que hiciste el pedido');

  const hit = await Order.findOne(filter).select('groupCode');
  if (!hit) throw httpError(404, NOT_FOUND);
  res.json(publicGroup(await loadGroup(hit)));
});

// GET /api/tracking/link?code=HN-1042&t=TOKEN → enlace precargado que enviamos por WhatsApp
router.get('/link', limiter, async (req, res) => {
  const code = normCode(req.query.code);
  const token = String(req.query.t || '');
  if (!code || !token) throw httpError(400, 'Enlace incompleto');
  const hit = await Order.findOne({ $or: [{ code }, { groupCode: code }], trackingToken: token }).select('groupCode');
  if (!hit) throw httpError(404, NOT_FOUND);
  res.json(publicGroup(await loadGroup(hit)));
});

// GET /api/tracking/mine → todos los pedidos de la cuenta (por _id de usuario)
router.get('/mine', requireAuth, async (req, res) => {
  const orders = await Order.find({ 'customer.user': req.dbUser._id }).sort({ createdAt: -1, code: 1 }).limit(100);
  const groups = new Map();
  for (const o of orders) {
    const key = o.groupCode || o.code;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  }
  res.json([...groups.values()].map((list) => publicGroup(list.sort((a, b) => a.code.localeCompare(b.code)))));
});

export default router;
