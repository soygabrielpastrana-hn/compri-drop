import mongoose from 'mongoose';
import { ROLES } from '../utils/rbac.js';

// Cuentas del equipo (Administrador, Vendedor, Despachador, …) con correo y contraseña
const staffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.keys(ROLES), default: 'seller' },
    active: { type: Boolean, default: true },
    failedAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Staff', staffSchema);
