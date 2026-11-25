import mongoose from 'mongoose';
import { BANKS } from './Order.js';

const { Schema } = mongoose;

// Documento único (key = 'main') editable desde /admin
const siteConfigSchema = new Schema(
  {
    key: { type: String, default: 'main', unique: true },
    siteName: { type: String, trim: true, default: 'Compri' },
    logoUrl: { type: String, trim: true, default: '' },
    whatsapp: { type: String, trim: true, default: '' }, // ventas: 504XXXXXXXX

    sideBanners: {
      type: [{ image: String, title: String, link: String, active: { type: Boolean, default: true }, _id: false }],
      default: [],
      validate: (v) => v.length <= 6,
    },

    freeShippingMin: { type: Number, min: 0, default: 0 }, // 0 = desactivado
    cashbackPercent: { type: Number, min: 0, max: 50, default: 5 },
    guestCashbackDays: { type: Number, min: 1, max: 365, default: 45 },

    bankAccounts: {
      type: [
        {
          bank: { type: String, enum: BANKS, required: true },
          holder: { type: String, trim: true },
          accountType: { type: String, trim: true, default: 'Ahorros' },
          accountNumber: { type: String, trim: true },
          active: { type: Boolean, default: true },
          _id: false,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model('SiteConfig', siteConfigSchema);
