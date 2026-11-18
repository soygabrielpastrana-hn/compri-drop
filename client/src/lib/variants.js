// Lógica de variantes dinámicas (cualquier atributo: Color, Talla, Capacidad, Modelo...).
const norm = (s) => String(s ?? '').trim().toLowerCase();

export const optValue = (variant, name) => variant.options.find((o) => norm(o.name) === norm(name))?.value;

// Variantes compatibles con la selección actual (ignorando el atributo `exceptName`)
export function matching(variants, selected, exceptName = '') {
  return variants.filter((v) =>
    Object.entries(selected).every(
      ([n, val]) => !val || norm(n) === norm(exceptName) || norm(optValue(v, n)) === norm(val)
    )
  );
}

// 'hidden'  = no existe con la selección actual (se oculta)
// 'soldout' = existe pero sin stock (se muestra tachado y deshabilitado)
// 'ok'      = disponible
export function valueState(variants, selected, name, value) {
  const list = matching(variants, selected, name).filter((v) => norm(optValue(v, name)) === norm(value));
  if (!list.length) return 'hidden';
  return list.some((v) => v.stock > 0) ? 'ok' : 'soldout';
}

// Limpia selecciones incompatibles y auto-selecciona atributos con una sola opción posible.
export function normalizeSelection(variants, attributes, selected) {
  const next = { ...selected };
  for (let pass = 0; pass < 3; pass++) {
    for (const a of attributes) {
      if (next[a.name] && valueState(variants, next, a.name, next[a.name]) === 'hidden') next[a.name] = '';
      if (!next[a.name]) {
        const visible = a.values.filter((val) => valueState(variants, next, a.name, val) !== 'hidden');
        if (visible.length === 1) next[a.name] = visible[0];
      }
    }
  }
  return next;
}

// Variante exacta cuando ya se eligieron TODOS los atributos
export function findVariant(variants, attributes, selected) {
  if (!attributes.length || !attributes.every((a) => selected[a.name])) return null;
  return (
    variants.find((v) => attributes.every((a) => norm(optValue(v, a.name)) === norm(selected[a.name]))) || null
  );
}
