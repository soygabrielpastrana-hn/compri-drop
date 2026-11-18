import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  label: { type: String, trim: true, maxlength: 30, default: 'Casa' },
  name: { type: String, trim: true },
  phone: { type: String, trim: true }, // 8 dígitos
  departamento: { type: String, required: true },
  municipio: { type: String, required: true, trim: true },
  colonia: { type: String, required: true, trim: true },
  referencia: { type: String, trim: true },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true }, // Firebase UID (el ID real del usuario es el _id de MongoDB)
    email: { type: String, lowercase: true, trim: true },
    name: String,
    photo: String,
    phone: String,
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    walletBalance: { type: Number, default: 0, min: 0 }, // saldo/cashback en Lempiras
    addresses: { type: [addressSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
