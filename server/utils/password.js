import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);

// Contraseñas con scrypt (incluido en Node, sin paquetes extra): formato "salt:hash" en hexadecimal
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [saltHex, hashHex] = String(stored || '').split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(String(password), Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// Se usa cuando el correo no existe, para que la respuesta tarde lo mismo (evita adivinar correos)
export const DUMMY_HASH = `${'00'.repeat(16)}:${'00'.repeat(64)}`;

// Mínimo 10 caracteres, con letras y números
export const strongPassword = (p) => typeof p === 'string' && p.length >= 10 && p.length <= 128 && /[A-Za-z]/.test(p) && /\d/.test(p);
