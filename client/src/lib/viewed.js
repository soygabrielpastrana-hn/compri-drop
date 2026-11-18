// Memoria local de categorías vistas → sección "Para Vos"
const KEY = 'tienda-hn-viewed-v1';
const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
};

export function trackView(category) {
  if (!category) return;
  try {
    const d = read();
    d[category] = (d[category] || 0) + 1;
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* ignorar */
  }
}

export function topViewedCategory() {
  const top = Object.entries(read()).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : '';
}
