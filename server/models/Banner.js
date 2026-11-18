import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 120, default: '' }, // texto alternativo de la imagen
    subtitle: { type: String, trim: true, maxlength: 200, default: '' },
    image: { type: String, trim: true, default: '' }, // URL (opcional; sin imagen se usa fondo de color)
    link: { type: String, trim: true, default: '' }, // /?cat=Tecnología  o  /producto/mi-slug
    buttonText: { type: String, trim: true, maxlength: 40, default: 'Ver ofertas' },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Banner', bannerSchema);
