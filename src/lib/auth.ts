import * as jose from 'jose';
import crypto from 'crypto';

const SECRET_KEY = process.env.SECRET_KEY || 'YOUR_SUPER_SECRET_KEY_HERE';
const ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRE_MINUTES = 30;

const secret = new TextEncoder().encode(SECRET_KEY);

export async function createAccessToken(subject: string): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ACCESS_TOKEN_EXPIRE_MINUTES * 60;

  return new jose.SignJWT({ sub: subject })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(secret);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: [ALGORITHM],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Replicates the Python PBKDF2 hashing logic:
 * salt (16 bytes hex) + key (32 bytes hex)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  return salt.toString('hex') + key.toString('hex');
}

export function verifyPassword(password: string, hashed: string): boolean {
  try {
    const saltHex = hashed.substring(0, 32);
    const storedKeyHex = hashed.substring(32);
    const salt = Buffer.from(saltHex, 'hex');
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    return key.toString('hex') === storedKeyHex;
  } catch (e) {
    return false;
  }
}
