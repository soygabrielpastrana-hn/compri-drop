import mongoose from 'mongoose';

const slugify = (s) =>
  s.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Árbol de 2 niveles: Tecnología → Celulares, Audio, Gaming
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, unique: true },
    icon: { type: String, trim: true, default: '' }, // emoji o URL pequeña
    image: { type: String, trim: true, default: '' },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

categorySchema.index({ parent: 1, name: 1 }, { unique: true });

categorySchema.pre('validate', function () {
  if (!this.slug && this.name) this.slug = `${slugify(this.name)}-${Math.random().toString(36).slice(2, 6)}`;
});

export default mongoose.model('Category', categorySchema);
