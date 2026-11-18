import mongoose from 'mongoose';

// Libro de movimientos del saldo
const walletTxSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: String, // código del pedido
    amount: { type: Number, required: true }, // + gana, - gasta
    type: { type: String, enum: ['cashback', 'claim', 'redeem', 'refund', 'adjust'], required: true },
    note: String,
  },
  { timestamps: true }
);

export default mongoose.model('WalletTx', walletTxSchema);
