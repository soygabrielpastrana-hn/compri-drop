import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'fixed'], required: true }, // % o monto fijo en L
    value: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (v) {
          return this.type !== 'percent' || v <= 100;
        },
        message: 'El porcentaje no puede pasar de 100',
      },
    },
    minPurchase: { type: Number, default: 0 },
    maxUses: { type: Number, default: 0 }, // 0 = ilimitado
    usedCount: { type: Number, default: 0 },
    startsAt: Date,
    expiresAt: Date,
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Devuelve un mensaje de error o null si el cupón es válido para ese subtotal.
couponSchema.methods.check = function (subtotal) {
  const now = new Date();
  if (!this.active) return 'Cupón inactivo';
  if (this.startsAt && now < this.startsAt) return 'El cupón aún no está vigente';
  if (this.expiresAt && now > this.expiresAt) return 'El cupón expiró';
  if (this.maxUses > 0 && this.usedCount >= this.maxUses) return 'El cupón alcanzó su límite de usos';
  if (subtotal < this.minPurchase) return `Compra mínima de L ${this.minPurchase.toFixed(2)}`;
  return null;
};

couponSchema.methods.discountFor = function (subtotal) {
  const d = this.type === 'percent' ? (subtotal * this.value) / 100 : this.value;
  return Math.min(Math.round(d * 100) / 100, subtotal);
};

export default mongoose.model('Coupon', couponSchema);
