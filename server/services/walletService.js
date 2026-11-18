import Order from '../models/Order.js';
import User from '../models/User.js';
import WalletTx from '../models/WalletTx.js';
import { httpError } from '../utils/httpError.js';
import { round2 } from '../utils/money.js';
import { normCode, normPhone } from '../utils/phone.js';
import { getSiteConfig } from './siteConfig.js';

// Se llama cuando el pedido pasa a "Entregado" (el llamador guarda la orden).
//  - Con cuenta Google: se suma directo al saldo.
//  - Invitado: queda "claimable" y caduca (45 días por defecto); se reclama iniciando sesión con código + teléfono.
export async function grantCashback(order) {
  if (order.cashback?.status && order.cashback.status !== 'none') return;
  const cfg = await getSiteConfig();
  const base = round2(order.subtotal - order.discount - (order.walletUsed || 0));
  const amount = round2((base * cfg.cashbackPercent) / 100);
  if (amount <= 0) return;

  if (order.customer.user) {
    await User.updateOne({ _id: order.customer.user }, { $inc: { walletBalance: amount } });
    await WalletTx.create({
      user: order.customer.user, order: order.code, amount, type: 'cashback',
      note: `Cashback ${cfg.cashbackPercent}% del pedido #${order.code}`,
    });
    order.cashback = { amount, status: 'credited', user: order.customer.user };
  } else {
    order.cashback = { amount, status: 'claimable', expiresAt: new Date(Date.now() + cfg.guestCashbackDays * 86_400_000) };
  }
}

// Vincula un pedido de invitado a la cuenta (código + teléfono) y reclama su cashback si no ha vencido.
export async function claimOrders(user, rawCode, rawPhone) {
  const code = normCode(rawCode);
  const phone = normPhone(rawPhone);
  if (!code || !phone) throw httpError(400, 'Escribe el código del pedido y el teléfono de 8 dígitos');

  const hit = await Order.findOne({ $or: [{ code }, { groupCode: code }], 'customer.phoneNorm': phone }).select('groupCode');
  if (!hit) throw httpError(404, 'No encontramos un pedido con esos datos');

  const orders = hit.groupCode ? await Order.find({ groupCode: hit.groupCode }) : [await Order.findById(hit._id)];
  if (orders.some((o) => o.customer.user && String(o.customer.user) !== String(user._id)))
    throw httpError(409, 'Este pedido ya pertenece a otra cuenta');

  let credited = 0;
  let expired = 0;
  for (const o of orders) {
    o.customer.user = user._id;
    if (o.cashback.status === 'claimable') {
      if (o.cashback.expiresAt && o.cashback.expiresAt < new Date()) {
        o.cashback.status = 'expired';
        expired += o.cashback.amount;
      } else {
        await User.updateOne({ _id: user._id }, { $inc: { walletBalance: o.cashback.amount } });
        await WalletTx.create({
          user: user._id, order: o.code, amount: o.cashback.amount, type: 'claim',
          note: `Cashback reclamado del pedido #${o.code}`,
        });
        o.cashback.status = 'claimed';
        o.cashback.user = user._id;
        credited += o.cashback.amount;
      }
    }
    await o.save();
  }

  const fresh = await User.findById(user._id).select('walletBalance');
  return { linked: orders.length, credited: round2(credited), expired: round2(expired), balance: fresh.walletBalance };
}
