import { httpError } from './httpError.js';

// Validadores pequeños para datos de entrada: devuelven el valor limpio o lanzan un 400 claro.
export const str = (v, { field = 'Campo', min = 0, max = 200 } = {}) => {
  const s = String(v ?? '').trim();
  if (s.length < min) throw httpError(400, `${field} es obligatorio`);
  if (s.length > max) throw httpError(400, `${field} no puede superar ${max} caracteres`);
  return s;
};

export const int = (v, { field = 'Número', min = 0, max = 1_000_000, def = 0 } = {}) => {
  if (v === '' || v === undefined || v === null) return def;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw httpError(400, `${field} debe ser un entero entre ${min} y ${max}`);
  return n;
};

export const bool = (v) => v === true || v === 'true';

export const oneOf = (v, list, field = 'Valor') => {
  if (!list.includes(v)) throw httpError(400, `${field} inválido`);
  return v;
};

export const email = (v) => {
  const s = String(v ?? '').trim().toLowerCase();
  if (!/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(s) || s.length > 120) throw httpError(400, 'Correo inválido');
  return s;
};

// Enlaces e imágenes: solo rutas internas (/algo), /api/media/… o https://… (bloquea javascript:, data: y similares)
export const safeLink = (v, field = 'Enlace') => {
  const s = String(v ?? '').trim();
  if (!s) return '';
  if (s.length > 600) throw httpError(400, `${field} es demasiado largo`);
  if (/^\/(?!\/)[^\s]*$/.test(s) || /^https?:\/\/[^\s]+$/i.test(s)) return s;
  throw httpError(400, `${field} inválido: usa una ruta (/…) o una URL que empiece con https://`);
};

export const dateOrNull = (v, field = 'Fecha') => {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw httpError(400, `${field} inválida`);
  return d;
};
