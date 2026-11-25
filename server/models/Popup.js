import mongoose from 'mongoose';

export const POPUP_FREQUENCIES = ['session', 'day', 'once', 'always'];

// Popup promocional al entrar a la tienda (independiente de los banners del Home)
const popupSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 120, default: '' }, // texto alternativo
    image: { type: String, required: true, trim: true },
    link: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true },
    // session = una vez por visita · day = una vez cada 24 h · once = una sola vez · always = en cada carga (invasivo)
    frequency: { type: String, enum: POPUP_FREQUENCIES, default: 'day' },
    delaySeconds: { type: Number, min: 0, max: 30, default: 2 },
    startsAt: Date,
    endsAt: Date,
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Popup', popupSchema);
