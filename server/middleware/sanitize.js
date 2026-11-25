// Defensa contra inyección de operadores NoSQL: elimina claves que empiezan con "$" o contienen "." del cuerpo JSON.
// (En Express 5 los parámetros de URL llegan como texto simple, así que solo el cuerpo necesita limpieza.)
const clean = (v) => {
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      if (k.startsWith('$') || k.includes('.')) continue;
      out[k] = clean(val);
    }
    return out;
  }
  return v;
};

export function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) req.body = clean(req.body);
  next();
}
