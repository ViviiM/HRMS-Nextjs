import crypto from 'crypto';

const KEY = process.env.ENCRYPTION_KEY || '';

if (!KEY) {
  // It's okay to proceed in dev, but production should set ENCRYPTION_KEY
  // eslint-disable-next-line no-console
  console.warn('ENCRYPTION_KEY not set; encryption will fail if used');
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended for GCM

export function encrypt(plaintext: string): string {
  if (!KEY) throw new Error('ENCRYPTION_KEY not configured');
  const key = Buffer.from(KEY, 'base64');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Return base64: iv:tag:encrypted
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(encryptedBase64: string): string {
  if (!KEY) throw new Error('ENCRYPTION_KEY not configured');
  const key = Buffer.from(KEY, 'base64');
  const data = Buffer.from(encryptedBase64, 'base64');
  const iv = data.slice(0, IV_LENGTH);
  const tag = data.slice(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = data.slice(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}
