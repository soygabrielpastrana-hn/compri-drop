import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import Order, { ORDER_STATUSES } from '../models/Order.js';
import { authOptional, requirePerm } from '../middleware/auth.js';
import { canSetStatus } from '../utils/rbac.js';
import { createOrder, quoteCart, releaseOrderStock } from '../services/orderService.js';
import { grantCashback } from '../services/walletService.js';
import { httpError } from '../utils/httpError.js';
import { buildNotifyUrl } from '../utils/whatsapp.js';

const router = Router();
const str = (v, max) => String(v ?? '').trim().slice(0, max);

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { message: 'Demasiados pedidos desde esta conexión, intenta más tarde' },
});

const TRANSITIONS = {
  'Pendiente': ['Confirmado por WhatsApp', 'Cancelado'],
  'Confirmado por WhatsApp': ['Preparando', 'Enviado', 'Cancelado'],
  'Preparando': ['Enviado', 'Cancelado'],
  'Enviado': ['Entregado', 'Cancelado'],
  'Entregado': [],
  'Cancelado': [],
};

// Respuesta admin: la orden + link para notificar al cliente por WhatsApp (con /rastreo precargado)
// nextStatuses: solo los estados que el rol de quien consulta puede aplicar
const withNotify = (o, role = 'admin') => ({
  ...o.toObject(), notifyUrl: buildNotifyUrl(o),
  nextStatuses: (TRANSITIONS[o.status] || []).filter((s) => canSetStatus(role, s)),
});

// Cotización del carrito: totales, bloques de pago (split), barra de envío gratis y saldo
router.post('/quote', authOptional, async (req, res) => {
  res.json(await quoteCart(req.body, req.dbUser));
});

// Crear pedido (invitado o con sesión). Devuelve el link de WhatsApp para redirigir.
router.post('/', orderLimiter, authOptional, async (req, res) => {
  res.status(201).json(await createOrder(req.body, req.dbUser));
});

// (Compatibilidad) seguimiento por código + token. El nuevo rastreo está en /api/tracking.
router.get('/track/:code', async (req, res) => {
  const order = await Order.findOne({
    code: String(req.params.code).toUpperCase(),
    trackingToken: String(req.query.t || ''),
  }).select('code status statusHistory items total subtotal discount shippingCost paymentMethod createdAt address.departamento address.municipio');
  if (!order) throw httpError(404, 'Pedido no encontrado');
  res.json(order);
});

// ---------- Admin ----------
router.get('/', requirePerm('orders:read'), async (req, res) => {
  const { status, q } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 30);

  const filter = {};
  if (status && ORDER_STATUSES.includes(status)) filter.status = status;
  if (q) {
    const s = String(q).trim();
    filter.$or = [
      { code: s.toUpperCase() },
      { groupCode: s.toUpperCase() },
      { 'customer.phoneNorm': s.replace(/\D/g, '').slice(-8) },
      { 'customer.name': new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
    ];
  }

  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);
  res.json({ items: items.map((o) => withNotify(o, req.staff.role)), total, page, pages: Math.ceil(total / limit) });
});

router.get('/:id', requirePerm('orders:read'), async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw httpError(404, 'Pedido no encontrado');
  res.json(withNotify(order, req.staff.role));
});

// Cambiar estado (+ nota, transportista y guía opcionales)
router.patch('/:id/status', requirePerm('orders:status'), async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw httpError(404, 'Pedido no encontrado');

  const { status } = req.body;
  if (!canSetStatus(req.staff.role, status)) throw httpError(403, `Tu rol no puede cambiar un pedido a "${status}"`);
  if (!TRANSITIONS[order.status]?.includes(status))
    throw httpError(400, `No se puede pasar de "${order.status}" a "${status}"`);

  const entry = { status, note: str(req.body.note, 300), carrier: str(req.body.carrier, 60), guide: str(req.body.guide, 80) };

  if (status === 'Cancelado') await releaseOrderStock(order);
  if (status === 'Entregado') await grantCashback(order); // 5% (configurable) al saldo, o "reclamable" si fue invitado

  if (entry.carrier || entry.guide) {
    order.shipment = { carrier: entry.carrier || order.shipment?.carrier, guide: entry.guide || order.shipment?.guide };
  }
  order.status = status;
  order.statusHistory.push(entry);
  await order.save();
  res.json(withNotify(order, req.staff.role));
});

// Agregar nota / guía sin cambiar el estado (ej. la guía llega después de marcar "Enviado")
router.patch('/:id/note', requirePerm('orders:note'), async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw httpError(404, 'Pedido no encontrado');

  const entry = { status: order.status, note: str(req.body.note, 300), carrier: str(req.body.carrier, 60), guide: str(req.body.guide, 80) };
  if (!entry.note && !entry.carrier && !entry.guide) throw httpError(400, 'Escribe una nota, transportista o guía');

  if (entry.carrier || entry.guide) {
    order.shipment = { carrier: entry.carrier || order.shipment?.carrier, guide: entry.guide || order.shipment?.guide };
  }
  order.statusHistory.push(entry);
  await order.save();
  res.json(withNotify(order, req.staff.role));
});

export default router;
