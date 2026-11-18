import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    orderCode: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    rating: { type: Number, required: true, min: 1, max: 5 }, // producto
    shippingRating: { type: Number, required: true, min: 1, max: 5 }, // rapidez del envío
    comment: { type: String, trim: true, maxlength: 600 },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, orderCode: 1 }, { unique: true }); // 1 reseña por producto y pedido

export default mongoose.model('Review', reviewSchema);
