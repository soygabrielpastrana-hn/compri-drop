import crypto from 'crypto';
import admin from 'firebase-admin';
import User from '../models/User.js';

// ---- Acceso de administrador con contraseña simple (ADMIN_PASSWORD) ----
const secret = () => process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || '';

export function signAdminToken(hours = 12) {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + hours * 3600_000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token) {
  if (!secret() || !token) return false;
  const [payload, sig] = String(token).split('.');
  if (!payload || !sig) return false;
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now();
  } catch {
    return false;
  }
}

function initFirebase() {
  if (admin.apps.length) return true;
  // Para VERIFICAR tokens de inicio de sesión basta el projectId (no hace falta la cuenta de servicio)
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  admin.initializeApp(
    raw
      ? { credential: admin.credential.cert(JSON.parse(raw)) }
      : { projectId: process.env.FIREBASE_PROJECT_ID || 'yoloquiero-76a81' }
  );
  return true;
}

// Verifica el ID token de Firebase del header Authorization. Lanza 401 si falta o es inválido.
export async function verifyBearer(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ') || !initFirebase()) {
    throw Object.assign(new Error('Inicia sesión con Google para continuar'), { status: 401 });
  }
  try {
    return await admin.auth().verifyIdToken(header.slice(7));
  } catch {
    throw Object.assign(new Error('Tu sesión no es válida o venció'), { status: 401 });
  }
}

// Lee el token de Firebase si viene; si no, sigue como invitado.
async function parseToken(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ') || !initFirebase()) return;
  try {
    req.user = await admin.auth().verifyIdToken(header.slice(7));
    const { uid, email, name, picture } = req.user;
    const profile = Object.fromEntries(Object.entries({ email, name, photo: picture }).filter(([, v]) => v));
    // req.dbUser._id es el ID real del usuario (nunca el teléfono)
    req.dbUser = await User.findOneAndUpdate({ uid }, { $setOnInsert: { ...profile, role: 'customer', walletBalance: 0 } }, { new: true, upsert: true });
  } catch {
    /* token inválido: se trata como invitado */
  }
}

export async function authOptional(req, _res, next) {
  await parseToken(req);
  next();
}

export async function requireAuth(req, res, next) {
  await parseToken(req);
  if (!req.user) return res.status(401).json({ message: 'Inicia sesión para continuar' });
  next();
}

export async function requireAdmin(req, res, next) {
  if (verifyAdminToken(req.headers['x-admin-token'])) return next(); // login con contraseña
  await parseToken(req); // o cuenta de Google listada en ADMIN_EMAILS
  if (!req.user) return res.status(401).json({ message: 'Inicia sesión para continuar' });

  const emails = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const byEmail = emails.includes((req.user.email || '').toLowerCase());
  const byRole = byEmail || (await User.exists({ uid: req.user.uid, role: 'admin' }));
  if (!byRole) return res.status(403).json({ message: 'Acceso solo para administradores' });
  next();
}
