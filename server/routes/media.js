import express, { Router } from 'express';
import mongoose from 'mongoose';
import Media from '../models/Media.js';
import { requireAdmin } from '../middleware/auth.js';
import { httpError } from '../utils/httpError.js';

const router = Router();

// Comprueba los primeros bytes: solo JPG, PNG o WebP reales (nunca SVG, por seguridad)
function sniff(b) {
  if (b.length > 12) {
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
    if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
    if (b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  }
  return '';
}

// POST /api/media   (cuerpo = la imagen en binario, Content-Type: image/webp | image/jpeg | image/png)
router.post(
  '/',
  requireAdmin,
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '3mb' }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !req.body.length) throw httpError(400, 'Sube una imagen JPG, PNG o WebP');
    const mime = sniff(req.body);
    if (!mime) throw httpError(400, 'El archivo no es una imagen válida (JPG, PNG o WebP)');

    const doc = await Media.create({ data: req.body, mime, size: req.body.length, name: String(req.query.name || '').slice(0, 80) });
    res.status(201).json({ id: doc._id, url: `/api/media/${doc._id}` });
  }
);

// GET /api/media/:id  (público, con caché larga: el id cambia si subes otra imagen)
router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, 'Imagen no encontrada');
  const m = await Media.findById(req.params.id);
  if (!m) throw httpError(404, 'Imagen no encontrada');
  res.set({ 'Content-Type': m.mime, 'Cache-Control': 'public, max-age=31536000, immutable' });
  res.send(m.data);
});

export default router;
