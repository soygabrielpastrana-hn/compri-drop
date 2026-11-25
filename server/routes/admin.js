import crypto from 'crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Staff from '../models/Staff.js';
import User from '../models/User.js';
import { requirePerm, signStaffToken } from '../middleware/auth.js';
import { httpError } from '../utils/httpError.js';
import { DUMMY_HASH, hashPassword, strongPassword, verifyPassword } from '../utils/password.js';
import { ROLES, permsOf } from '../utils/rbac.js';
import { bool, email, oneOf, str } from '../utils/validate.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { message: 'Demasiados intentos, espera unos minutos' },
});

const safeEqual = (a, b) =>
  crypto.timingSafeEqual(
    crypto.createHash('sha256').update(String(a)).digest(),
    crypto.createHash('sha256').update(String(b)).digest()
  );

const session = (user, token) => ({
  token,
  user: { name: user.name, email: user.email, role: user.role, roleLabel: ROLES[user.role], permissions: permsOf(user.role) },
});

const LOCK_AFTER = 5; // intentos fallidos
const LOCK_MINUTES = 15;
const BAD_LOGIN = 'Correo o contraseña incorrectos';

// POST /api/admin/login
//  - { email, password } → cuenta del equipo (Administrador, Vendedor, Despachador…)
//  - { password }        → clave maestra (ADMIN_PASSWORD), rol Administrador
router.post('/login', loginLimiter, async (req, res) => {
  const password = String(req.body?.password ?? '');
  if (!password || password.length > 128) throw httpError(400, 'Escribe tu contraseña');

  // --- Clave maestra ---
  if (!req.body?.email) {
    if (!process.env.ADMIN_PASSWORD) throw httpError(401, BAD_LOGIN);
    if (!safeEqual(password, process.env.ADMIN_PASSWORD)) throw httpError(401, 'Contraseña incorrecta');
    return res.json(session({ name: 'Administrador', email: '', role: 'admin' }, signStaffToken({ sub: 'master', role: 'admin' })));
  }

  // --- Cuenta del equipo ---
  const mail = String(req.body.email).trim().toLowerCase().slice(0, 120);
  const staff = await Staff.findOne({ email: mail }).select('+passwordHash +failedAttempts +lockUntil');

  if (staff?.lockUntil && staff.lockUntil > new Date()) throw httpError(429, 'Cuenta bloqueada temporalmente por intentos fallidos. Intenta en unos minutos.');

  const ok = await verifyPassword(password, staff?.passwordHash || DUMMY_HASH); // siempre se calcula (mismo tiempo)
  if (!staff || !ok || !staff.active) {
    if (staff) {
      staff.failedAttempts = (staff.failedAttempts || 0) + 1;
      if (staff.failedAttempts >= LOCK_AFTER) {
        staff.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60_000);
        staff.failedAttempts = 0;
      }
      await staff.save();
    }
    throw httpError(401, BAD_LOGIN);
  }

  staff.failedAttempts = 0;
  staff.lockUntil = undefined;
  staff.lastLoginAt = new Date();
  await staff.save();
  res.json(session(staff, signStaffToken({ sub: String(staff._id), role: staff.role })));
});

// Quién soy y qué puedo hacer (el panel arma el menú con esto)
router.get('/me', requirePerm(), (req, res) => {
  const { name, email: mail, role } = req.staff;
  res.json({ name, email: mail, role, roleLabel: ROLES[role], permissions: permsOf(role) });
});

// ---------- Equipo (solo Administrador) ----------
const staffOut = (s) => ({ _id: s._id, name: s.name, email: s.email, role: s.role, roleLabel: ROLES[s.role], active: s.active, lastLoginAt: s.lastLoginAt, createdAt: s.createdAt });

router.get('/staff', requirePerm('staff:manage'), async (_req, res) => {
  res.json((await Staff.find().sort({ createdAt: 1 })).map(staffOut));
});

router.post('/staff', requirePerm('staff:manage'), async (req, res) => {
  const b = req.body || {};
  if (!strongPassword(b.password)) throw httpError(400, 'La contraseña debe tener mínimo 10 caracteres, con letras y números');
  const staff = await Staff.create({
    name: str(b.name, { field: 'El nombre', min: 2, max: 80 }),
    email: email(b.email),
    role: oneOf(b.role, Object.keys(ROLES), 'El rol'),
    passwordHash: await hashPassword(b.password),
    active: b.active === undefined ? true : bool(b.active),
  });
  res.status(201).json(staffOut(staff));
});

router.put('/staff/:id', requirePerm('staff:manage'), async (req, res) => {
  const b = req.body || {};
  const staff = await Staff.findById(req.params.id);
  if (!staff) throw httpError(404, 'Usuario no encontrado');
  if (String(staff._id) === req.staff.id && (b.active === false || (b.role && b.role !== 'admin')))
    throw httpError(400, 'No puedes quitarte tu propio acceso de administrador');

  if (b.name !== undefined) staff.name = str(b.name, { field: 'El nombre', min: 2, max: 80 });
  if (b.email !== undefined) staff.email = email(b.email);
  if (b.role !== undefined) staff.role = oneOf(b.role, Object.keys(ROLES), 'El rol');
  if (b.active !== undefined) staff.active = bool(b.active);
  if (b.password) {
    if (!strongPassword(b.password)) throw httpError(400, 'La contraseña debe tener mínimo 10 caracteres, con letras y números');
    staff.passwordHash = await hashPassword(b.password);
  }
  await staff.save();
  res.json(staffOut(staff));
});

router.delete('/staff/:id', requirePerm('staff:manage'), async (req, res) => {
  if (req.params.id === req.staff.id) throw httpError(400, 'No puedes eliminar tu propia cuenta');
  const deleted = await Staff.findByIdAndDelete(req.params.id);
  if (!deleted) throw httpError(404, 'Usuario no encontrado');
  res.json({ ok: true });
});

// Dashboard: GET /api/admin/stats?days=30
router.get('/stats', requirePerm('stats:view'), async (req, res) => {
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
    walletOutstanding: req.staff.role === 'admin' ? wallet[0]?.total || 0 : null, // saldo por pagar: solo Administrador
  });
});

export default router;
