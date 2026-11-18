import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Order from '../models/Order.js';
import { normPhone } from '../utils/phone.js';

// Pedidos creados antes de la Fase 4: agrega groupCode y phoneNorm para que funcione /rastreo.
await connectDB();
let n = 0;
for (const o of await Order.find({ $or: [{ groupCode: { $exists: false } }, { 'customer.phoneNorm': { $exists: false } }] })) {
  if (!o.groupCode) o.groupCode = o.code;
  if (!o.customer.phoneNorm) o.customer.phoneNorm = normPhone(o.customer.phone) || String(o.customer.phone).replace(/\D/g, '').slice(-8);
  await o.save();
  n++;
}
console.log(`${n} pedidos actualizados`);
await mongoose.disconnect();
