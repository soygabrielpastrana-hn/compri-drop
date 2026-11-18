import crypto from 'crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { requireAdmin, signAdminToken } from '../middleware/auth.js';
import { httpError } from '../utils/httpError.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { message: 'Demasiados intentos, espera unos minutos' },
});

const safeEqual = (a, b) =>
  crypto.timingSafeEqual(
    crypto.createHash('sha256').update(String(a)).digest(),
    crypto.createHash('sha256').update(String(b)).digest()
  );

router.post('/login', limiter, (req, res) => {
  if (!process.env.ADMIN_PASSWORD) throw httpError(503, 'Configura ADMIN_PASSWORD en server/.env');
  if (!safeEqual(req.body?.password ?? '', process.env.ADMIN_PASSWORD)) throw httpError(401, 'Contraseña incorrecta');
  res.json({ token: signAdminToken(12) });
});

router.get('/check', requireAdmin, (_req, res) => res.json({ ok: true }));

// Dashboard: GET /api/admin/stats?days=30
router.get('/stats', requireAdmin, async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days) || 30));
  const since = new Date(Date.now() - days * 86_400_000);
  const live = { status: { $ne: 'Cancelado' } };
  const inPeriod = { ...live, createdAt: { $gte: since } };

  const [byStatus, allTime, byDay, top, products, wallet] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } }]),
    Order.aggregate([
      { $match: live },
      { $group: {
          _id: null,
          orders: { $sum: 1 },
          pipeline: { $sum: '$total' }, // vendido sin contar cancelados
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'Entregado'] }, '$total', 0] } }, // ya entregado
      } },
    ]),
    Order.aggregate([
      { $match: inPeriod },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'America/Tegucigalpa' } },
          total: { $sum: '$total' },
          orders: { $sum: 1 },
      } },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: inPeriod },
      { $unwind: '$items' },
      { $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          image: { $first: '$items.image' },
          qty: { $sum: '$items.qty' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
      } },
      { $sort: { qty: -1 } },
      { $limit: 10 },
    ]),
    Product.find({ active: true }).select('name stock hasVariants variants').lean(),
    User.aggregate([{ $group: { _id: null, total: { $sum: '$walletBalance' } } }]),
  ]);

  const lowStock = products
    .flatMap((p) =>
      p.hasVariants
        ? p.variants.filter((v) => v.stock <= 3).map((v) => ({ product: p.name, variant: v.options.map((o) => o.value).join(' / '), stock: v.stock }))
        : p.stock <= 3 ? [{ product: p.name, variant: '', stock: p.stock }] : []
    )
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 15);

  const a = allTime[0] || { orders: 0, pipeline: 0, delivered: 0 };
  res.json({
    days,
    sales: {
      delivered: a.delivered,
      pipeline: a.pipeline,
      orders: a.orders,
      avgTicket: a.orders ? Math.round((a.pipeline / a.orders) * 100) / 100 : 0,
    },
    byStatus: byStatus.map((r) => ({ status: r._id, count: r.count, total: r.total })),
    byDay: byDay.map((r) => ({ date: r._id, total: r.total, orders: r.orders })),
    topProducts: top.map((r) => ({ productId: r._id, name: r.name, image: r.image, qty: r.qty, revenue: r.revenue })),
    lowStock,
    walletOutstanding: wallet[0]?.total || 0, // saldo total que debes a clientes
  });
});

export default router;
