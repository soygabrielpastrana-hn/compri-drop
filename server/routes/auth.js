import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { requireAuth, verifyBearer } from '../middleware/auth.js';
import { httpError } from '../utils/httpError.js';

const googleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  message: { message: 'Demasiados intentos, espera unos minutos' },
});
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const router = Router();

// El frontend llama esto después del login con Google para crear/actualizar el usuario.
router.post('/sync', requireAuth, async (req, res) => {
  const { uid, email, name, picture } = req.user;
  const user = await User.findOneAndUpdate(
    { uid },
    { $set: { email, name: name || req.body?.name, photo: picture }, $setOnInsert: { uid } },
    { new: true, upsert: true }
  );
  const isAdmin =
    user.role === 'admin' ||
    (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).includes((email || '').toLowerCase());
  res.json({ ...user.toObject(), isAdmin });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findOne({ uid: req.user.uid });
  res.json(user);
});

// POST /api/auth/google  { email, name, googleUid, photoURL }  + header Authorization: Bearer <ID token de Firebase>
// El servidor NO confía en lo que dice el cuerpo: la identidad sale del token verificado.
// Busca al usuario por googleUid (uid) o por correo, o lo crea. El _id de MongoDB es la llave principal.
// Vincula pedidos previos hechos como invitado cuyo correo coincide (solo con correo verificado por Google).
router.post('/google', googleLimiter, async (req, res) => {
  const decoded = await verifyBearer(req);
  const body = req.body || {};
  const email = String(decoded.email || '').toLowerCase();
  if (!email) throw httpError(400, 'Tu cuenta de Google no tiene correo');
  if (body.googleUid && body.googleUid !== decoded.uid) throw httpError(401, 'El usuario enviado no coincide con tu sesión');
  if (body.email && String(body.email).toLowerCase() !== email) throw httpError(401, 'El correo enviado no coincide con tu sesión');

  const uid = decoded.uid;
  const found = (await User.findOne({ uid })) || (await User.findOne({ email }));
  const set = { uid, email };
  const photo = decoded.picture || body.photoURL;
  if (photo) set.photo = String(photo).slice(0, 500);
  if (!found?.name) set.name = String(decoded.name || body.name || email.split('@')[0]).slice(0, 80);

  const user = await User.findOneAndUpdate(
    found ? { _id: found._id } : { uid },
    { $set: set, $setOnInsert: { role: 'customer', walletBalance: 0 } },
    { new: true, upsert: true }
  );

  let linkedOrders = 0;
  if (decoded.email_verified) {
    const r = await Order.updateMany(
      { 'customer.user': null, 'customer.email': new RegExp(`^${esc(email)}$`, 'i') },
      { $set: { 'customer.user': user._id } }
    );
    linkedOrders = r.modifiedCount;
  }

  const admins = (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
  res.json({
    _id: user._id, name: user.name, email: user.email, photo: user.photo, phone: user.phone,
    walletBalance: user.walletBalance, addresses: user.addresses,
    isAdmin: user.role === 'admin' || (decoded.email_verified && admins.includes(email)),
    linkedOrders,
  });
});

export default router;
