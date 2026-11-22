import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const DEFAULT_SALT = 'quant-vault-master-salt-2026';

/**
 * Derives a 32-byte (256-bit) buffer key from the master secret.
 */
function getDerivedKey(masterKey?: string): Buffer {
  const secret = masterKey || process.env.VAULT_MASTER_KEY || 'quant-super-secure-vault-master-key-2026';
  return crypto.scryptSync(secret, DEFAULT_SALT, 32);
}

/**
 * Encrypts sensitive API keys using AES-256-GCM authenticated encryption.
 * Output format: <hex_iv>:<hex_auth_tag>:<hex_encrypted_data>
 */
export function encryptSecret(plainText: string, masterKey?: string): string {
  if (!plainText) {
    throw new Error('Cannot encrypt empty or null plaintext');
  }

  const key = getDerivedKey(masterKey);
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM ciphertext, verifying integrity via authentication tag.
 * Throws an error if data has been tampered with or key is invalid.
 */
export function decryptSecret(cipherText: string, masterKey?: string): string {
  if (!cipherText || !cipherText.includes(':')) {
    throw new Error('Invalid ciphertext format. Expected <iv>:<authTag>:<encrypted>');
  }

  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed ciphertext segments');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getDerivedKey(masterKey);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Safely masks an API Key for display in frontend (e.g. vm39...82la)
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) return '****';
  const start = apiKey.slice(0, 4);
  const end = apiKey.slice(-4);
  return `${start}...${end}`;
}
