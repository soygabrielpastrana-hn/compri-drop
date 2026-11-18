import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import WalletTx from '../models/WalletTx.js';
import { requireAuth } from '../middleware/auth.js';
import { claimOrders } from '../services/walletService.js';
import { DEPARTAMENTOS } from '../utils/honduras.js';
import { httpError } from '../utils/httpError.js';
import { normPhone } from '../utils/phone.js';

const router = Router();
router.use(requireAuth);

const claimLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, message: { message: 'Demasiados intentos, espera unos minutos' } });
const str = (v, max = 120) => String(v ?? '').trim().slice(0, max);

const profile = (u) => ({
  _id: u._id, name: u.name, email: u.email, photo: u.photo, phone: u.phone,
  walletBalance: u.walletBalance, addresses: u.addresses,
});

// Perfil + saldo + direcciones guardadas
router.get('/', (req, res) => res.json(profile(req.dbUser)));

// Reemplaza las direcciones guardadas (máx. 5; una queda como predeterminada)
router.put('/addresses', async (req, res) => {
  const list = req.body?.addresses;
  if (!Array.isArray(list) || list.length > 5) throw httpError(400, 'Puedes guardar hasta 5 direcciones');

  const clean = list.map((a) => {
    if (!DEPARTAMENTOS.includes(a.departamento)) throw httpError(400, 'Departamento inválido');
    if (!str(a.municipio) || !str(a.colonia)) throw httpError(400, 'Completa municipio y colonia');
    const phone = a.phone ? normPhone(a.phone) : '';
    if (a.phone && !phone) throw httpError(400, 'El teléfono debe tener 8 dígitos');
    return {
      label: str(a.label, 30) || 'Casa', name: str(a.name), phone,
      departamento: a.departamento, municipio: str(a.municipio), colonia: str(a.colonia),
      referencia: str(a.referencia, 200), isDefault: Boolean(a.isDefault),
    };
  });
  if (clean.length && !clean.some((a) => a.isDefault)) clean[0].isDefault = true;
  let seen = false;
  clean.forEach((a) => {
    if (a.isDefault && seen) a.isDefault = false;
    if (a.isDefault) seen = true;
  });

  req.dbUser.addresses = clean;
  await req.dbUser.save();
  res.json(profile(req.dbUser));
});

// Saldo y movimientos
router.get('/wallet', async (req, res) => {
  const transactions = await WalletTx.find({ user: req.dbUser._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ balance: req.dbUser.walletBalance, transactions });
});

// Vincula un pedido hecho como invitado (código + teléfono) y reclama su cashback si no ha vencido
router.post('/claim', claimLimiter, async (req, res) => {
  res.json(await claimOrders(req.dbUser, req.body?.orderCode, req.body?.phone));
});

export default router;
