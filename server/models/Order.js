import mongoose from 'mongoose';

const { Schema } = mongoose;

export const ORDER_STATUSES = ['Pendiente', 'Confirmado por WhatsApp', 'Preparando', 'Enviado', 'Entregado', 'Cancelado'];
export const PAYMENT_METHODS = ['Contra Entrega', 'Transferencia'];
export const BANKS = ['BAC', 'Ficohsa', 'Atlántida'];

const itemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId }, // vacío en productos simples
    name: String,
    image: String,
    options: [{ name: String, value: String, _id: false }], // atributos elegidos (Color, Talla, Capacidad...)
    sku: String,
    price: { type: Number, required: true }, // precio congelado al comprar
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    // Un checkout = 1 grupo. Si se divide por método de pago: HN-1042-A (transferencia) y HN-1042-B (contra entrega).
    code: { type: String, unique: true, index: true },
    groupCode: { type: String, index: true }, // HN-1042
    trackingToken: { type: String, required: true }, // compartido por el grupo (enlace /rastreo)
    items: { type: [itemSchema], validate: (v) => v.length > 0 },

    customer: {
      user: { type: Schema.Types.ObjectId, ref: 'User', index: true }, // _id de MongoDB; vacío si compró como invitado
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true }, // +504 9999-9999
      phoneNorm: { type: String, index: true }, // 99999999
      email: { type: String, trim: true },
    },
    address: {
      departamento: { type: String, required: true },
      municipio: { type: String, required: true, trim: true },
      colonia: { type: String, required: true, trim: true },
      referencia: { type: String, trim: true },
    },

    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    bank: { type: String, enum: [...BANKS, ''], default: '' },

    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    walletUsed: { type: Number, default: 0 }, // saldo (L) aplicado
    shippingCost: { type: Number, default: 0 },
    total: { type: Number, required: true },
    coupon: { code: String, type: { type: String }, value: Number },

    status: { type: String, enum: ORDER_STATUSES, default: 'Pendiente', index: true },
    statusHistory: [
      {
        status: String,
        note: String, // nota libre del admin
        carrier: String, // transportista / encomienda
        guide: String, // número de guía
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    shipment: { carrier: String, guide: String }, // último dato de envío

    // Cashback: se genera al pasar a "Entregado".
    //  credited  = ya sumado al saldo de la cuenta
    //  claimable = compra como invitado: se puede reclamar con Google hasta expiresAt
    cashback: {
      amount: { type: Number, default: 0 },
      status: { type: String, enum: ['none', 'claimable', 'credited', 'claimed', 'expired'], default: 'none' },
      expiresAt: Date,
      user: { type: Schema.Types.ObjectId, ref: 'User' },
    },

    stockRestored: { type: Boolean, default: false },
  },
  { timestamps: true }
);

orderSchema.index({ 'customer.phoneNorm': 1, groupCode: 1 });

export default mongoose.model('Order', orderSchema);
