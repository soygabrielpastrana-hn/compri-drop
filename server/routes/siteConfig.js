import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { getSiteConfig, invalidateSiteConfig } from '../services/siteConfig.js';

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
router.get('/admin', requireAdmin, async (_req, res) => res.json(await getSiteConfig(true)));

router.put('/', requireAdmin, async (req, res) => {
  const body = {};
  EDITABLE.forEach((k) => {
    if (req.body?.[k] !== undefined) body[k] = req.body[k];
  });
  if (body.whatsapp !== undefined) {
    let d = String(body.whatsapp).replace(/\D/g, '');
    if (d.length === 8) d = `504${d}`;
    body.whatsapp = d;
  }

  const cfg = await getSiteConfig(true);
  cfg.set(body);
  await cfg.save();
  invalidateSiteConfig();
  res.json(cfg);
});

export default router;
