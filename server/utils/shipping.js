// Envío por proveedor: productos del mismo proveedor viajan juntos (se cobra la tarifa más alta del grupo).
// `min` = monto del carrito a partir del cual el envío es gratis (0 = desactivado).
export function calculateShipping(lines, cartSubtotal, min = 0) {
  if (min > 0 && cartSubtotal >= min) return 0;

  const groups = new Map();
  for (const { product } of lines) {
    if (product.shipping?.free) continue;
    const key = product.supplier?.name?.trim().toLowerCase() || String(product._id);
    groups.set(key, Math.max(groups.get(key) || 0, product.shipping?.cost || 0));
  }
  return [...groups.values()].reduce((a, b) => a + b, 0);
}
