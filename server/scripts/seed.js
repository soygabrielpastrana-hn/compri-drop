import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';

await connectDB();

if ((await Product.countDocuments()) > 0 && !process.argv.includes('--force')) {
  console.log('Ya hay productos en la base de datos. El seed BORRA todo; si realmente quieres reiniciar usa: npm run seed -- --force');
  await mongoose.disconnect();
  process.exit(0);
}

await Product.deleteMany({});
await Coupon.deleteMany({});

const opt = (name, value) => ({ name, value });

await Product.create([
  {
    // Atributos: Color + Talla (ejemplo; puedes usar cualquier nombre de atributo)
    name: 'Tenis Urbanos Runner',
    category: 'Ropa y Calzado',
    subcategory: 'Caballeros',
    description: 'Tenis livianos y cómodos para uso diario.',
    price: 650,
    comparePrice: 850,
    images: ['https://placehold.co/800x800?text=Tenis'],
    hasVariants: true,
    variants: [
      { options: [opt('Color', 'Azul'), opt('Talla', '36')], stock: 3, image: 'https://placehold.co/800x800/1d4ed8/fff?text=Azul' },
      { options: [opt('Color', 'Azul'), opt('Talla', '37')], stock: 2, image: 'https://placehold.co/800x800/1d4ed8/fff?text=Azul' },
      { options: [opt('Color', 'Blanco'), opt('Talla', '38')], stock: 4, image: 'https://placehold.co/800x800/ffffff/000?text=Blanco' },
    ],
    supplier: { name: 'Proveedor Demo', cost: 400 },
    payment: { cod: true, transfer: true },
    shipping: { free: true, cost: 0 },
    featured: true,
  },
  {
    // Atributos: Capacidad + Color, con precio distinto por variante
    name: 'Celular Galaxy Lite',
    category: 'Tecnología',
    description: 'Pantalla 6.5", cámara 50MP.',
    price: 5500,
    images: ['https://placehold.co/800x800?text=Celular'],
    hasVariants: true,
    variants: [
      { options: [opt('Capacidad', '64GB'), opt('Color', 'Negro')], stock: 5 },
      { options: [opt('Capacidad', '128GB'), opt('Color', 'Negro')], stock: 3, price: 6300 },
      { options: [opt('Capacidad', '128GB'), opt('Color', 'Verde')], stock: 2, price: 6300 },
    ],
    supplier: { name: 'Proveedor Demo', cost: 4200 },
    payment: { cod: false, transfer: true },
    shipping: { free: false, cost: 120 },
  },
  {
    // Un solo atributo: Talla
    name: 'Camiseta Básica Algodón',
    category: 'Ropa y Calzado',
    subcategory: 'Damas',
    price: 220,
    images: ['https://placehold.co/800x800?text=Camiseta'],
    hasVariants: true,
    variants: ['S', 'M', 'L'].map((t) => ({ options: [opt('Talla', t)], stock: 6 })),
    payment: { cod: true, transfer: true },
    shipping: { free: false, cost: 60 },
  },
  {
    // Sin variantes: stock simple
    name: 'Audífonos Bluetooth TWS',
    category: 'Tecnología',
    description: 'Estuche de carga, 20 h de batería.',
    price: 450,
    images: ['https://placehold.co/800x800?text=Audifonos'],
    hasVariants: false,
    stock: 15,
    supplier: { name: 'Proveedor Demo', cost: 260 },
    payment: { cod: true, transfer: true },
    shipping: { free: false, cost: 80 },
  },
]);

await Coupon.create([
  { code: 'BIENVENIDO10', type: 'percent', value: 10 },
  { code: 'L50', type: 'fixed', value: 50, minPurchase: 400 },
]);

console.log('Seed listo');
await mongoose.disconnect();
