export const money = (n) =>
  `L ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const optionsLabel = (opts) => (opts || []).map((o) => `${o.name}: ${o.value}`).join(' · ');

export const effectivePrice = (product, variant) => (variant?.price > 0 ? variant.price : product.price);

// Rango de precios (si las variantes tienen precios distintos)
export function priceInfo(product) {
  if (!product.hasVariants || !product.variants?.length) return { min: product.price, max: product.price };
  const prices = product.variants.map((v) => (v.price > 0 ? v.price : product.price));
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export const DEPARTAMENTOS = [
  'Atlántida', 'Choluteca', 'Colón', 'Comayagua', 'Copán', 'Cortés', 'El Paraíso',
  'Francisco Morazán', 'Gracias a Dios', 'Intibucá', 'Islas de la Bahía', 'La Paz',
  'Lempira', 'Ocotepeque', 'Olancho', 'Santa Bárbara', 'Valle', 'Yoro',
];

export const BANKS = ['BAC', 'Ficohsa', 'Atlántida'];
