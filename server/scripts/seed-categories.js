import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';

// Crea (sin borrar nada) un árbol base y las categorías que ya usan tus productos.
const TREE = {
  'Tecnología': ['Celulares', 'Audio', 'Gaming', 'Accesorios tech'],
  'Hogar': ['Cocina', 'Decoración', 'Organización'],
  'Ropa': ['Caballeros', 'Damas', 'Niños'],
  'Calzado': ['Caballeros', 'Damas', 'Niños'],
  'Accesorios': [],
  'Belleza y Cuidado Personal': [],
};

await connectDB();

const used = await Product.distinct('category');
used.forEach((name) => {
  if (name && !(name in TREE)) TREE[name] = [];
});

let order = 0;
for (const [name, subs] of Object.entries(TREE)) {
  const parent = await Category.findOneAndUpdate(
    { name, parent: null },
    { $setOnInsert: { name, parent: null, order: order++, slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).slice(2, 6)}` } },
    { new: true, upsert: true }
  );
  let j = 0;
  for (const sub of subs) {
    await Category.findOneAndUpdate(
      { name: sub, parent: parent._id },
      { $setOnInsert: { name: sub, parent: parent._id, order: j++, slug: `${sub.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).slice(2, 6)}` } },
      { upsert: true }
    );
  }
}

console.log('Categorías listas');
await mongoose.disconnect();
