import { fmt } from './money.js';
import { clientUrl } from './urls.js';

// Enlace de rastreo precargado (código + token: el cliente no necesita escribir el teléfono)
export const trackingUrl = (order) => `${clientUrl()}/rastreo?code=${order.groupCode || order.code}&t=${order.trackingToken}`;

const optsLabel = (i) => (i.options?.length ? ` | ${i.options.map((o) => `${o.name}: ${o.value}`).join(' | ')}` : '');

// Mensaje del cliente hacia la tienda. Recibe 1 orden o 2 (checkout dividido).
export function buildWhatsAppUrl(orders, waNumber) {
  const first = orders[0];
  const a = first.address;
  const split = orders.length > 1;

  const blocks = orders.map((o, idx) => {
    const head = `*📦 ${split ? `Envío ${idx + 1} — ` : ''}${o.paymentMethod}${o.bank ? ` (${o.bank})` : ''}* [#${o.code}]`;
    const items = o.items.map((i) => `• ${i.qty} x ${i.name}${optsLabel(i)} — ${fmt(i.price * i.qty)}`);
    return [
      head, ...items,
      `Subtotal: ${fmt(o.subtotal)}`,
      o.discount > 0 ? `Descuento (${o.coupon?.code}): -${fmt(o.discount)}` : null,
      o.walletUsed > 0 ? `Saldo usado: -${fmt(o.walletUsed)}` : null,
      `Envío: ${o.shippingCost > 0 ? fmt(o.shippingCost) : 'GRATIS'}`,
      `*Total${split ? ' del envío' : ''}: ${fmt(o.total)}*`,
    ].filter((l) => l !== null).join('\n');
  });

  const sum = (list) => list.reduce((acc, o) => acc + o.total, 0);
  const grand = sum(orders);
  const transfer = sum(orders.filter((o) => o.paymentMethod === 'Transferencia'));
  const cod = sum(orders.filter((o) => o.paymentMethod === 'Contra Entrega'));

  const text = [
    `🛒 *Nuevo pedido #${first.groupCode || first.code}*`,
    split ? '⚠️ Se divide en 2 envíos porque los productos tienen distinto método de pago.' : null,
    '',
    blocks.join('\n\n'),
    '',
    split ? `*TOTAL GENERAL: ${fmt(grand)}*` : null,
    transfer > 0 ? `💳 A pagar por transferencia: ${fmt(transfer)}` : null,
    cod > 0 ? `💵 A pagar al recibir: ${fmt(cod)}` : null,
    '',
    `👤 ${first.customer.name} — ${first.customer.phone}`,
    `📍 ${a.departamento}, ${a.municipio}, ${a.colonia}${a.referencia ? ` (${a.referencia})` : ''}`,
    `🔎 Rastrea tu pedido: ${trackingUrl(first)}`,
  ].filter((l) => l !== null).join('\n');

  return `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
}

const STATUS_MSG = {
  'Pendiente': 'Recibimos tu pedido y lo estamos revisando.',
  'Confirmado por WhatsApp': '✅ ¡Tu pedido está confirmado!',
  'Preparando': '📦 Estamos preparando tu pedido.',
  'Enviado': '🚚 ¡Tu pedido va en camino!',
  'Entregado': '🎉 ¡Tu pedido fue entregado! Gracias por tu compra.',
  'Cancelado': '❌ Tu pedido fue cancelado.',
};

// Mensaje de la tienda hacia el cliente (botón "Notificar por WhatsApp" del admin)
export function buildNotifyUrl(order) {
  const last = order.statusHistory?.[order.statusHistory.length - 1];
  const phone = order.customer.phoneNorm || String(order.customer.phone || '').replace(/\D/g, '').slice(-8);
  const carrier = last?.carrier || order.shipment?.carrier;
  const guide = last?.guide || order.shipment?.guide;
  const cb = order.status === 'Entregado' && order.cashback?.amount > 0
    ? `💰 Ganaste ${fmt(order.cashback.amount)} de saldo. Inicia sesión con Google en la tienda para ${order.cashback.status === 'claimable' ? 'reclamarlo' : 'usarlo'}.`
    : null;

  const text = [
    `Hola ${order.customer.name.split(' ')[0]} 👋`,
    STATUS_MSG[order.status],
    `Pedido #${order.code}`,
    carrier ? `Transportista: ${carrier}` : null,
    guide ? `Guía: ${guide}` : null,
    last?.note ? `Nota: ${last.note}` : null,
    cb,
    '',
    `Sigue tu pedido aquí: ${trackingUrl(order)}`,
  ].filter((l) => l !== null).join('\n');

  return `https://wa.me/504${phone}?text=${encodeURIComponent(text)}`;
}
