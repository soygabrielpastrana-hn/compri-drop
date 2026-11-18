import mongoose from 'mongoose';

// Imágenes subidas desde el panel (banners). Se guardan en MongoDB: no dependen del disco de Render.
const mediaSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true },
    mime: { type: String, required: true },
    size: Number,
    name: String,
  },
  { timestamps: true }
);

export default mongoose.model('Media', mediaSchema);
