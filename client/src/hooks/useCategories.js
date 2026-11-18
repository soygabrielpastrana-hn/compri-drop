import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

let promise = null;

// Árbol de categorías (administrado en /admin). Si aún no hay, se arma con las categorías de los productos.
function load() {
  return api.categories().then(async (tree) => {
    if (tree.length) return tree;
    const rows = await api.productCategories();
    const map = new Map();
    rows.forEach((r) => {
      const g = map.get(r.category) || { _id: r.category, name: r.category, icon: '', count: 0, subcategories: [] };
      g.count += r.count;
      if (r.subcategory) g.subcategories.push({ _id: r.subcategory, name: r.subcategory, count: r.count });
      map.set(r.category, g);
    });
    return [...map.values()];
  });
}

export function useCategories() {
  const [cats, setCats] = useState([]);
  useEffect(() => {
    let alive = true;
    promise = promise || load().catch(() => {
      promise = null;
      return [];
    });
    promise.then((c) => alive && setCats(c));
    return () => {
      alive = false;
    };
  }, []);
  return cats;
}
