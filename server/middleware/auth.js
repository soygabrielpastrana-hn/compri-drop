import crypto from 'crypto';
import admin from 'firebase-admin';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Staff from '../models/Staff.js';
import { can } from '../utils/rbac.js';

// ---------------------------------------------------------------------------------------------
// Sesión del panel: token firmado (HMAC) con { sub, role, exp }. sub = id del Staff o "master".
// ---------------------------------------------------------------------------------------------
const secret = () => process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || '';
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

export function signStaffToken({ sub, role }, hours = 8) {
  const payload = b64({ sub, role, exp: Date.now() + hours * 3_600_000 });
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyStaffToken(token) {
  if (!secret() || !token) return null;
  const [payload, sig] = String(token).split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Firebase (clientes con Google)
// Para VERIFICAR el inicio de sesión basta el projectId. La cuenta de servicio es opcional y, si está mal
// escrita, se ignora con un aviso en consola (nunca se imprime su contenido) en vez de romper el servidor.
// ---------------------------------------------------------------------------------------------
const projectId = () => (process.env.FIREBASE_PROJECT_ID || 'comprihn').trim();

let firebaseMode = null; // null = aún no se inicializó | 'service-account' | 'project-id' | 'disabled'

// Acepta (en este orden): 1) JSON completo en FIREBASE_SERVICE_ACCOUNT, 2) ese mismo JSON en base64,
// 3) campos sueltos FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY. Devuelve null si no hay nada válido.
function readServiceAccount() {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();

  if (raw) {
    const unquoted = raw.replace(/^['"]|['"]$/g, '');
    const candidates = [raw, unquoted, Buffer.from(unquoted, 'base64').toString('utf8')];
    for (const text of candidates) {
      try {
        const obj = JSON.parse(text);
        if (obj && typeof obj === 'object' && obj.client_email && obj.private_key) {
          return { ...obj, project_id: obj.project_id || projectId(), private_key: String(obj.private_key).replace(/\\n/g, '\n') };
        }
      } catch {
        /* probar el siguiente formato */
      }
    }
    console.warn('[auth] FIREBASE_SERVICE_ACCOUNT no contiene un JSON válido de cuenta de servicio: se ignora y se usa solo el projectId. Revisa server/.env.');
  }

  const { FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY: privateKey } = process.env;
  if (clientEmail && privateKey) {
    return { project_id: projectId(), client_email: clientEmail.trim(), private_key: privateKey.replace(/\\n/g, '\n') };
  }
  return null;
}

// Nunca lanza excepciones. Devuelve true si Firebase Admin quedó listo para verificar tokens.
function initFirebase() {
  if (firebaseMode !== null) return firebaseMode !== 'disabled';
  if (admin.apps.length) {
    firebaseMode = 'project-id';
    return true;
  }

  const account = readServiceAccount();
  if (account) {
    try {
      admin.initializeApp({ credential: admin.credential.cert(account), projectId: account.project_id });
      firebaseMode = 'service-account';
      return true;
    } catch {
      console.warn('[auth] Las credenciales de Firebase no son válidas (clave privada o correo incorrectos): se usa solo el projectId.');
    }
  }

  try {
    admin.initializeApp({ projectId: projectId() });
    firebaseMode = 'project-id';
  } catch (err) {
    console.error('[auth] No se pudo iniciar Firebase Admin:', err.message);
    firebaseMode = 'disabled';
  }
  return firebaseMode !== 'disabled';
}

export const firebaseStatus = () => {
  initFirebase();
  return firebaseMode;
};

// Verifica el ID token del header Authorization. Lanza un error con su código HTTP:
//  401 = falta, es inválido o venció · 503 = Firebase no está disponible en el servidor
export async function verifyBearer(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ') || header.length < 20) {
    throw Object.assign(new Error('Inicia sesión con Google para continuar'), { status: 401 });
  }
  if (!initFirebase()) {
    throw Object.assign(new Error('El inicio de sesión no está disponible por el momento'), { status: 503 });
  }
  try {
    return await admin.auth().verifyIdToken(header.slice(7).trim());
  } catch (err) {
    const expired = err?.code === 'auth/id-token-expired';
    throw Object.assign(new Error(expired ? 'Tu sesión venció, vuelve a iniciar sesión' : 'Tu sesión no es válida'), { status: 401 });
  }
}

// Lee el token si viene (una sola vez por petición). NUNCA lanza: deja req.user / req.dbUser, o req.authError.
async function parseToken(req) {
  if (req.authParsed) return;
  req.authParsed = true;
  if (!req.headers.authorization?.startsWith('Bearer ')) return; // invitado

  try {
    req.user = await verifyBearer(req);
  } catch (err) {
    req.authError = err;
    return;
  }

  try {
    const { uid, email, name, picture } = req.user;
    const profile = Object.fromEntries(Object.entries({ email, name, photo: picture }).filter(([, v]) => v));
    // req.dbUser._id es el ID real del usuario (nunca el teléfono)
    req.dbUser = await User.findOneAndUpdate({ uid }, { $setOnInsert: { ...profile, role: 'customer', walletBalance: 0 } }, { new: true, upsert: true });
  } catch (err) {
    console.error('[auth] No se pudo cargar el usuario de la base de datos:', err.message);
    req.authError = Object.assign(new Error('No se pudo cargar tu cuenta, intenta de nuevo'), { status: 503 });
  }
}

// Sesión opcional: sin token, token inválido o fallo de Firebase → sigue como invitado (nunca responde 500).
export async function authOptional(req, _res, next) {
  await parseToken(req);
  next();
}

// Sesión obligatoria: 401 si falta o es inválida; 503 si el servicio no puede cargar la cuenta.
export async function requireAuth(req, res, next) {
  await parseToken(req);
  if (req.authError) return res.status(req.authError.status || 401).json({ message: req.authError.message });
  if (!req.user || !req.dbUser) return res.status(401).json({ message: 'Inicia sesión para continuar' });
  next();
}

// ---------------------------------------------------------------------------------------------
// Personal del panel (RBAC)
// ---------------------------------------------------------------------------------------------
// Orígenes de sesión de staff: cuenta de equipo (correo + contraseña), clave maestra, o cuenta de Google en ADMIN_EMAILS.
async function resolveStaff(req) {
  const t = verifyStaffToken(req.headers['x-admin-token']);
  if (t) {
    if (!t.sub || t.sub === 'master') return { id: 'master', name: 'Administrador', role: 'admin', source: 'master' };
    if (!mongoose.isValidObjectId(t.sub)) return null;
    const s = await Staff.findById(t.sub).select('name email role active'); // se revalida en cada petición
    return s?.active ? { id: String(s._id), name: s.name, email: s.email, role: s.role, source: 'staff' } : null;
  }

  await parseToken(req);
  if (req.user) {
    const emails = (process.env.ADMIN_EMAILS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    const byEmail = req.user.email_verified !== false && emails.includes((req.user.email || '').toLowerCase());
    if (byEmail || (await User.exists({ uid: req.user.uid, role: 'admin' }))) {
      return { id: `google:${req.user.uid}`, name: req.user.name || 'Administrador', email: req.user.email, role: 'admin', source: 'google' };
    }
  }
  return null;
}

// requirePerm('orders:read') → exige sesión de staff cuyo rol tenga ese permiso. Sin argumento: cualquier staff.
export const requirePerm = (perm) => async (req, res, next) => {
  const staff = req.staff || (await resolveStaff(req));
  if (!staff) return res.status(401).json({ message: 'Inicia sesión para continuar' });
  if (!can(staff.role, perm)) return res.status(403).json({ message: 'No tienes permiso para esta acción' });
  req.staff = staff;
  next();
};

export const requireAdmin = requirePerm('staff:manage'); // solo Administrador
