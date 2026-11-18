import crypto from 'crypto';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Order, { PAYMENT_METHODS, BANKS } from '../models/Order.js';
import Coupon from '../models/Coupon.js';
import Counter from '../models/Counter.js';
import User from '../models/User.js';
import WalletTx from '../models/WalletTx.js';
import { DEPARTAMENTOS } from '../utils/honduras.js';
import { httpError } from '../utils/httpError.js';
import { round2 } from '../utils/money.js';
import { formatPhone, normPhone } from '../utils/phone.js';
import { calculateShipping } from '../utils/shipping.js';
import { planBlocks, splitAmount } from '../utils/checkoutPlan.js';
import { buildWhatsAppUrl, trackingUrl } from '../utils/whatsapp.js';
import { getSiteConfig, storeWhatsapp } from './siteConfig.js';

const text = (v, max = 120) => String(v ?? '').trim().slice(0, max);
const label = (opts) => opts.map((o) => `${o.name}: ${o.value}`).join(', ');

// Acepta { Color: 'Azul', Talla: '36' } o [{ name: 'Color', value: 'Azul' }]
const toOptionMap = (opts) => {
  const entries = Array.isArray(opts) ? opts.map((o) => [o?.name, o?.value]) : Object.entries(opts || {});
  return new Map(entries.map(([n, v]) => [text(n, 40).toLowerCase(), text(v, 60).toLowerCase()]));
};
const sameOptions = (variantOpts, wanted) =>
  variantOpts.length === wanted.size &&
  variantOpts.every((o) => wanted.get(o.name.toLowerCase()) === o.value.toLowerCase());

// Suma (sign=1) o resta (sign=-1) stock. Cada elemento: { productId, variantId, qty }
async function incStock(list, sign) {
  for (const l of list) {
    if (l.variantId) {
      await Product.updateOne({ _id: l.productId, 'variants._id': l.variantId }, { $inc: { 'variants.$.stock': sign * l.qty } });
    } else {
      await Product.updateOne({ _id: l.productId }, { $inc: { stock: sign * l.qty } });
    }
  }
}

// Descuento atómico: solo baja si todavía hay stock suficiente en ESA combinación.
async function reserveStock(lines) {
  const done = [];
  try {
    for (const l of lines) {
      const res = l.variantId
        ? await Product.updateOne(
            { _id: l.productId, variants: { $elemMatch: { _id: l.variantId, stock: { $gte: l.qty } } } },
            { $inc: { 'variants.$.stock': -l.qty } }
          )
        : await Product.updateOne({ _id: l.productId, stock: { $gte: l.qty } }, { $inc: { stock: -l.qty } });

      if (res.modifiedCount !== 1) throw httpError(409, `Se agotó el stock de "${l.name}"${l.label ? ` (${l.label})` : ''}`);
      done.push(l);
    }
  } catch (err) {
    await incStock(done, 1);
    throw err;
  }
}

async function nextOrderCode() {
  const c = await Counter.findOneAndUpdate({ _id: 'order' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return `HN-${1000 + c.seq}`;
}

// Resuelve líneas con datos del servidor, cupón, saldo, bloques de pago, envío y totales.
// Lo usan createOrder y la cotización del carrito (mismos cálculos).
export async function priceCart({ items, paymentMethod, couponCode, useWallet }, dbUser) {
  if (!Array.isArray(items) || !items.length || items.length > 30) throw httpError(400, 'El carrito está vacío o es inválido');

  const ids = [...new Set(items.map((i) => String(i.productId)))];
  if (!ids.every((id) => mongoose.isValidObjectId(id))) throw httpError(400, 'Producto inválido');
  const products = await Product.find({ _id: { $in: ids }, active: true });
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const merged = new Map(); // une líneas repetidas de la misma variante
  for (const it of items) {
    const qty = parseInt(it.qty, 10);
    if (!(qty >= 1 && qty <= 20)) throw httpError(400, 'Cantidad inválida');

    const product = byId.get(String(it.productId));
    if (!product) throw httpError(404, 'Un producto del carrito ya no está disponible');

    let variant = null;
    if (product.hasVariants) {
      const wanted = toOptionMap(it.options);
      variant = it.variantId ? product.variants.id(it.variantId) : product.variants.find((v) => sameOptions(v.options, wanted));
      if (!variant) throw httpError(400, `Elige una combinación válida de opciones para "${product.name}"`);
    }

    const key = `${product._id}|${variant?._id || ''}`;
    const prev = merged.get(key);
    merged.set(key, {
      productId: product._id,
      product,
      variantId: variant?._id,
      name: product.name,
      image: variant?.image || product.images[0] || '',
      options: variant ? variant.options.map((o) => ({ name: o.name, value: o.value })) : [],
      label: variant ? label(variant.options) : '',
      sku: variant?.sku || '',
      price: variant?.price > 0 ? variant.price : product.price,
      qty: (prev?.qty || 0) + qty,
      available: variant ? variant.stock : product.stock,
    });
  }

  const lines = [...merged.values()];
  for (const l of lines) {
    if (l.available < l.qty)
      throw httpError(409, `Stock insuficiente de "${l.name}"${l.label ? ` (${l.label})` : ''}: quedan ${l.available}`);
  }

  const cfg = await getSiteConfig();
  const subtotal = round2(lines.reduce((a, l) => a + l.price * l.qty, 0));

  // Cupón (sobre todo el carrito; se reparte entre bloques)
  let coupon = null;
  let discount = 0;
  if (couponCode) {
    coupon = await Coupon.findOne({ code: text(couponCode, 40).toUpperCase() });
    if (!coupon) throw httpError(400, 'Cupón no válido');
    const err = coupon.check(subtotal);
    if (err) throw httpError(400, err);
    discount = coupon.discountFor(subtotal);
  }

  // Saldo (solo con cuenta): cubre productos, no el envío
  const balance = dbUser?.walletBalance || 0;
  const walletUsed = useWallet && dbUser ? round2(Math.min(balance, subtotal - discount)) : 0;

  // Bloques por método de pago (checkout dividido)
  const blocks = planBlocks(lines, paymentMethod).map((b) => ({
    ...b,
    subtotal: round2(b.lines.reduce((a, l) => a + l.price * l.qty, 0)),
  }));
  const weights = blocks.map((b) => b.subtotal);
  const discounts = splitAmount(discount, weights);
  const wallets = splitAmount(walletUsed, weights);
  const min = cfg.freeShippingMin || Number(process.env.FREE_SHIPPING_MIN || 0);

  blocks.forEach((b, i) => {
    b.discount = discounts[i];
    b.walletUsed = wallets[i];
    b.shippingCost = round2(calculateShipping(b.lines, subtotal, min));
    b.total = round2(b.subtotal - b.discount - b.walletUsed + b.shippingCost);
  });

  const splitRequired = blocks.length > 1;
  return {
    lines, blocks, coupon, subtotal, discount, walletUsed, splitRequired,
    shippingCost: round2(blocks.reduce((a, b) => a + b.shippingCost, 0)),
    total: round2(blocks.reduce((a, b) => a + b.total, 0)),
    // compatibilidad con el checkout anterior: en un carrito dividido se permiten ambos
    allowed: splitRequired
      ? { cod: true, transfer: true }
      : { cod: lines.every((l) => l.product.payment.cod), transfer: lines.every((l) => l.product.payment.transfer) },
    freeShipping: { min, reached: min > 0 && subtotal >= min, remaining: min > 0 ? Math.max(0, round2(min - subtotal)) : 0 },
    wallet: dbUser ? { balance, applied: walletUsed } : null,
  };
}

const lineOut = (l) => ({
  productId: l.productId, variantId: l.variantId, name: l.name, label: l.label,
  price: l.price, qty: l.qty, available: l.available,
});

// Cotización para el carrito/checkout: sin tocar stock ni saldo.
export async function quoteCart(body, dbUser) {
  const p = await priceCart(body || {}, dbUser);
  return {
    subtotal: p.subtotal, discount: p.discount, walletUsed: p.walletUsed, shippingCost: p.shippingCost, total: p.total,
    allowed: p.allowed, splitRequired: p.splitRequired, freeShipping: p.freeShipping, wallet: p.wallet,
    coupon: p.coupon ? { code: p.coupon.code } : null,
    lines: p.lines.map(lineOut),
    blocks: p.blocks.map((b) => ({
      key: b.key, paymentMethod: b.method, subtotal: b.subtotal, discount: b.discount,
      walletUsed: b.walletUsed, shippingCost: b.shippingCost, total: b.total, lines: b.lines.map(lineOut),
    })),
  };
}

export async function createOrder(body, dbUser) {
  const { customer = {}, address = {}, paymentMethod, bank = '' } = body || {};

  // ---- Validación (invitado: solo nombre, WhatsApp y dirección) ----
  if (text(customer.name).length < 3) throw httpError(400, 'Escribe tu nombre completo');
  const phoneNorm = normPhone(customer.phone);
  if (!phoneNorm) throw httpError(400, 'Escribe tu WhatsApp de 8 dígitos (sin +504)');
  if (!DEPARTAMENTOS.includes(address.departamento)) throw httpError(400, 'Selecciona un departamento válido');
  if (!text(address.municipio) || !text(address.colonia)) throw httpError(400, 'Completa municipio y colonia');
  if (paymentMethod && !PAYMENT_METHODS.includes(paymentMethod)) throw httpError(400, 'Método de pago inválido');
  if (bank && !BANKS.includes(bank)) throw httpError(400, 'Banco inválido');

  const plan = await priceCart(body, dbUser);
  const { lines, blocks, coupon, walletUsed } = plan;

  const undo = [];
  const created = [];
  try {
    if (coupon) {
      const ok = await Coupon.findOneAndUpdate(
        { _id: coupon._id, $or: [{ maxUses: 0 }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }] },
        { $inc: { usedCount: 1 } }
      );
      if (!ok) throw httpError(409, 'El cupón alcanzó su límite de usos');
      undo.push(() => Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: -1 } }));
    }

    if (walletUsed > 0) {
      const ok = await User.findOneAndUpdate(
        { _id: dbUser._id, walletBalance: { $gte: walletUsed } },
        { $inc: { walletBalance: -walletUsed } }
      );
      if (!ok) throw httpError(409, 'Tu saldo cambió, vuelve a intentarlo');
      undo.push(() => User.updateOne({ _id: dbUser._id }, { $inc: { walletBalance: walletUsed } }));
    }

    await reserveStock(lines); // si falla, revierte lo suyo
    undo.push(() => incStock(lines, 1));

    const base = await nextOrderCode();
    const token = crypto.randomBytes(12).toString('hex');

    for (const [i, b] of blocks.entries()) {
      created.push(
        await Order.create({
          code: blocks.length > 1 ? `${base}-${b.key}` : base,
          groupCode: base,
          trackingToken: token,
          items: b.lines.map((l) => ({
            product: l.productId, variantId: l.variantId, name: l.name, image: l.image,
            options: l.options, sku: l.sku, price: l.price, qty: l.qty,
          })),
          customer: {
            user: dbUser?._id,
            name: text(customer.name),
            phone: formatPhone(phoneNorm),
            phoneNorm,
            email: text(customer.email || dbUser?.email),
          },
          address: {
            departamento: address.departamento,
            municipio: text(address.municipio),
            colonia: text(address.colonia),
            referencia: text(address.referencia, 200),
          },
          paymentMethod: b.method,
          bank: b.method === 'Transferencia' ? bank : '',
          subtotal: b.subtotal, discount: b.discount, walletUsed: b.walletUsed,
          shippingCost: b.shippingCost, total: b.total,
          coupon: coupon && b.discount > 0 ? { code: coupon.code, type: coupon.type, value: coupon.value } : undefined,
          status: 'Pendiente',
          statusHistory: [{ status: 'Pendiente', note: blocks.length > 1 ? `Pedido dividido: envío ${i + 1} de ${blocks.length}` : 'Pedido creado' }],
        })
      );
    }

    if (walletUsed > 0) {
      await WalletTx.create({ user: dbUser._id, order: base, amount: -walletUsed, type: 'redeem', note: `Saldo usado en el pedido #${base}` });
    }

    const cfg = await getSiteConfig();
    return {
      groupCode: base,
      split: created.length > 1,
      orders: created,
      grandTotal: plan.total,
      // compatibilidad con el frontend anterior (Confirmation.jsx)
      order: { code: base, total: plan.total, trackingToken: token },
      whatsappUrl: buildWhatsAppUrl(created, storeWhatsapp(cfg)),
      trackingUrl: trackingUrl(created[0]),
    };
  } catch (err) {
    if (created.length) await Order.deleteMany({ _id: { $in: created.map((o) => o._id) } });
    for (const fn of undo.reverse()) await fn().catch(() => {});
    throw err;
  }
}

// Al cancelar: devuelve stock a la variante exacta, reembolsa el saldo usado y libera el cupón
// (el cupón solo se libera cuando se cancelan todas las órdenes del grupo).
export async function releaseOrderStock(order) {
  if (order.stockRestored) return;
  await incStock(order.items.map((i) => ({ productId: i.product, variantId: i.variantId, qty: i.qty })), 1);

  if (order.walletUsed > 0 && order.customer.user) {
    await User.updateOne({ _id: order.customer.user }, { $inc: { walletBalance: order.walletUsed } });
    await WalletTx.create({
      user: order.customer.user, order: order.code, amount: order.walletUsed, type: 'refund',
      note: `Saldo devuelto por cancelar el pedido #${order.code}`,
    });
  }

  if (order.coupon?.code) {
    const others = await Order.countDocuments({ groupCode: order.groupCode, _id: { $ne: order._id }, status: { $ne: 'Cancelado' } });
    if (!others) await Coupon.updateOne({ code: order.coupon.code, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
  }
  order.stockRestored = true;
}
