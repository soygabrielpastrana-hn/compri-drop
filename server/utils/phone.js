// Honduras: 8 dígitos (acepta +504, espacios y guiones). Devuelve '' si no es válido.
export function normPhone(raw) {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('504')) d = d.slice(3);
  return /^\d{8}$/.test(d) ? d : '';
}

export const formatPhone = (d8) => `+504 ${d8.slice(0, 4)}-${d8.slice(4)}`;

// '#hn-1042', 'HN1042', 'hn-1042-a' → 'HN-1042' / 'HN-1042-A'. '' si no tiene el formato.
export function normCode(raw) {
  const m = String(raw ?? '').toUpperCase().replace(/[\s#]/g, '').match(/^HN-?(\d{3,})(?:-?([AB]))?$/);
  return m ? `HN-${m[1]}${m[2] ? `-${m[2]}` : ''}` : '';
}
