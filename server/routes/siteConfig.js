import { Router } from 'express';
import { requirePerm } from '../middleware/auth.js';
import { bool, int, oneOf, safeLink, str } from '../utils/validate.js';
import { getSiteConfig, invalidateSiteConfig } from '../services/siteConfig.js';
import { httpError } from '../utils/httpError.js';

const router = Router();
const EDITABLE = ['siteName', 'logoUrl', 'whatsapp', 'sideBanners', 'freeShippingMin', 'cashbackPercent', 'guestCashbackDays', 'bankAccounts'];

// Público: lo que necesita la tienda (logo, WhatsApp, banners laterales, envío gratis, cuentas activas)
router.get('/', async (_req, res) => {
  const cfg = (await getSiteConfig()).toObject();
  res.json({
    siteName: cfg.siteName,
    logoUrl: cfg.logoUrl,
    whatsapp: cfg.whatsapp || process.env.STORE_WHATSAPP || '',
    sideBanners: cfg.sideBanners.filter((b) => b.active),
    freeShippingMin: cfg.freeShippingMin,
    cashbackPercent: cfg.cashbackPercent,
    guestCashbackDays: cfg.guestCashbackDays,
    bankAccounts: cfg.bankAccounts.filter((b) => b.active),
  });
});

// Admin: configuración completa
router.get('/admin', requirePerm('settings:manage'), async (_req, res) => res.json(await getSiteConfig(true)));

router.put('/', requirePerm('settings:manage'), async (req, res) => {
  const body = {};
  EDITABLE.forEach((k) => {
    if (req.body?.[k] !== undefined) body[k] = req.body[k];
  });
  if (body.whatsapp !== undefined) {
    let d = String(body.whatsapp).replace(/\D/g, '');
    if (d.length === 8) d = `504${d}`;
    body.whatsapp = d;
  }

  // Validación de entrada (sin HTML ni enlaces peligrosos)
  if (body.siteName !== undefined) body.siteName = str(body.siteName, { field: 'El nombre', min: 1, max: 60 });
  if (body.logoUrl !== undefined) body.logoUrl = safeLink(body.logoUrl, 'El logo');
  if (body.whatsapp !== undefined && body.whatsapp.length > 15) throw httpError(400, 'WhatsApp inválido');
  if (body.freeShippingMin !== undefined) body.freeShippingMin = int(body.freeShippingMin, { field: 'El envío gratis', min: 0, max: 1_000_000 });
  if (body.guestCashbackDays !== undefined) body.guestCashbackDays = int(body.guestCashbackDays, { field: 'Los días', min: 1, max: 365 });
  if (body.cashbackPercent !== undefined) {
    const n = Number(body.cashbackPercent);
    if (!(n >= 0 && n <= 50)) throw httpError(400, 'El cashback debe estar entre 0 y 50%');
    body.cashbackPercent = n;
  }
  if (body.sideBanners !== undefined) {
    if (!Array.isArray(body.sideBanners) || body.sideBanners.length > 6) throw httpError(400, 'Máximo 6 banners laterales');
    body.sideBanners = body.sideBanners.map((b) => ({
      image: safeLink(b.image, 'La imagen'), title: str(b.title, { field: 'El texto', max: 80 }), link: safeLink(b.link, 'El enlace'), active: bool(b.active),
    }));
  }
  if (body.bankAccounts !== undefined) {
    if (!Array.isArray(body.bankAccounts) || body.bankAccounts.length > 10) throw httpError(400, 'Máximo 10 cuentas');
    body.bankAccounts = body.bankAccounts.map((b) => ({
      bank: oneOf(b.bank, ['BAC', 'Ficohsa', 'Atlántida'], 'El banco'), holder: str(b.holder, { field: 'El titular', max: 80 }),
      accountType: str(b.accountType, { field: 'El tipo de cuenta', max: 20 }), accountNumber: str(b.accountNumber, { field: 'El número de cuenta', min: 4, max: 30 }), active: bool(b.active),
    }));
  }

  const cfg = await getSiteConfig(true);
  cfg.set(body);
  await cfg.save();
  invalidateSiteConfig();
  res.json(cfg);
});

export default router;
