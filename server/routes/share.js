import { Router } from 'express';
import Product from '../models/Product.js';
import { clientUrl } from '../utils/urls.js';
import { fmt } from '../utils/money.js';

const router = Router();
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Enlace limpio para compartir: /p/:slug  → metadatos Open Graph (Facebook/WhatsApp/Instagram) y redirección a la tienda.
// Las imágenes del producto deben ser URLs públicas absolutas (https).
router.get('/:slug', async (req, res) => {
  const p = await Product.findOne({ slug: req.params.slug, active: true }).select('name description price images shipping payment slug');
  if (!p) return res.redirect(clientUrl());

  const target = `${clientUrl()}/producto/${p.slug}`;
  const badge = p.shipping.free ? 'Envío gratis' : p.payment.cod ? 'Pago contra entrega' : 'Compra segura por WhatsApp';
  const title = `${p.name} — ${fmt(p.price)}`;
  const desc = `${badge}. ${(p.description || '').replace(/\s+/g, ' ').slice(0, 140)}`.trim();

  res.type('html').send(`<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Compri">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(target)}">
${p.images[0] ? `<meta property="og:image" content="${esc(p.images[0])}">` : ''}
<meta property="product:price:amount" content="${p.price}">
<meta property="product:price:currency" content="HNL">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
</head><body><a href="${esc(target)}">Ver producto</a></body></html>`);
});

export default router;
