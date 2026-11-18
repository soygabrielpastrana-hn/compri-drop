import { Router } from 'express';
import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { httpError } from '../utils/httpError.js';

const router = Router();
const round1 = (n) => Math.round(n * 10) / 10;

router.get('/product/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(400, 'Producto inválido');
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const items = await Review.find({ product: req.params.id }).sort({ createdAt: -1 }).skip((page - 1) * 20).limit(20);
  res.json(items);
});

// Solo compradores: pedido ENTREGADO + token de seguimiento + contiene el producto
router.post('/', async (req, res) => {
  const { productId, orderCode, token, name, rating, shippingRating, comment } = req.body;
  if (!mongoose.isValidObjectId(productId)) throw httpError(400, 'Producto inválido');

  const order = await Order.findOne({
    code: String(orderCode || '').toUpperCase(),
    trackingToken: String(token || ''),
    status: 'Entregado',
    'items.product': productId,
  });
  if (!order) throw httpError(403, 'Solo puedes calificar productos de pedidos entregados');

  try {
    await Review.create({
      product: productId,
      orderCode: order.code,
      name: name || order.customer.name.split(' ')[0],
      rating: Number(rating),
      shippingRating: Number(shippingRating),
      comment,
    });
  } catch (err) {
    if (err.code === 11000) throw httpError(409, 'Ya calificaste este producto');
    throw err;
  }

  const [agg] = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: '$product', n: { $sum: 1 }, r: { $avg: '$rating' }, s: { $avg: '$shippingRating' } } },
  ]);
  await Product.updateOne(
    { _id: productId },
    { ratingAvg: round1(agg.r), ratingCount: agg.n, shippingRatingAvg: round1(agg.s) }
  );

  res.status(201).json({ ok: true });
});

export default router;
