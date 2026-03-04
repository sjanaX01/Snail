
const SALT_LENGTH = 32; // Increased from 16 for better entropy
const IV_LENGTH = 12;
const ITERATIONS = 900000; // OWASP 2024 recommendation for PBKDF2-SHA256
const ENCRYPTION_VERSION = 2; // Version tag for future migration

/**
 * Derive AES-256-GCM key from password using PBKDF2.
 * Uses OWASP-recommended 900k iterations with SHA-256.
 */
async function deriveKey(password, salt) {
  if (!password || typeof password !== 'string' || password.length < 1) {
    throw new Error('Password is required');
  }

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a seed phrase (string) with a password.
 * Returns a base64-encoded string containing version + salt + iv + ciphertext.
 * Format: [version(1)] [salt(32)] [iv(12)] [ciphertext(...)]
 */
export async function encryptSeedPhrase(seedPhrase, password) {
  if (!seedPhrase || typeof seedPhrase !== 'string') {
    throw new Error('Seed phrase is required');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(seedPhrase)
  );

  // Prepend version byte for future migration support
  const combined = new Uint8Array(1 + salt.length + iv.length + encrypted.byteLength);
  combined[0] = ENCRYPTION_VERSION;
  combined.set(salt, 1);
  combined.set(iv, 1 + salt.length);
  combined.set(new Uint8Array(encrypted), 1 + salt.length + iv.length);

  // Convert to base64 for storage
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a seed phrase with a password.
 * Supports both v1 (legacy) and v2 (current) encryption formats.
 * Returns the plaintext seed phrase string, or throws on wrong password.
 */
export async function decryptSeedPhrase(encryptedData, password) {
  if (!encryptedData || !password) {
    throw new Error('Encrypted data and password are required');
  }

  const decoder = new TextDecoder();
  const combined = new Uint8Array(
    atob(encryptedData).split('').map(c => c.charCodeAt(0))
  );

  let salt, iv, ciphertext;

  // Check version byte to determine format
  const version = combined[0];
  if (version === ENCRYPTION_VERSION) {
    // v2 format: [version(1)] [salt(32)] [iv(12)] [ciphertext]
    salt = combined.slice(1, 1 + SALT_LENGTH);
    iv = combined.slice(1 + SALT_LENGTH, 1 + SALT_LENGTH + IV_LENGTH);
    ciphertext = combined.slice(1 + SALT_LENGTH + IV_LENGTH);
  } else {
    // v1 legacy format: [salt(16)] [iv(12)] [ciphertext]
    const LEGACY_SALT_LENGTH = 16;
    salt = combined.slice(0, LEGACY_SALT_LENGTH);
    iv = combined.slice(LEGACY_SALT_LENGTH, LEGACY_SALT_LENGTH + IV_LENGTH);
    ciphertext = combined.slice(LEGACY_SALT_LENGTH + IV_LENGTH);
  }

  const key = await deriveKey(password, salt);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return decoder.decode(decrypted);
  } catch {
    throw new Error('Incorrect password');
  }
}

/**
 * Check if an encrypted wallet exists in localStorage.
 */
export function hasEncryptedWallet() {
  return !!localStorage.getItem('snail_encrypted_seed');
}

/**
 * Save encrypted seed phrase to localStorage.
 */
export function saveEncryptedSeed(encryptedData) {
  localStorage.setItem('snail_encrypted_seed', encryptedData);
}

/**
 * Get encrypted seed phrase from localStorage.
 */
export function getEncryptedSeed() {
  return localStorage.getItem('snail_encrypted_seed');
}

/**
 * Save wallet count to localStorage.
 */
export function saveWalletCount(count) {
  localStorage.setItem('snail_wallet_count', count.toString());
}

/**
 * Get wallet count from localStorage.
 */
export function getWalletCount() {
  return parseInt(localStorage.getItem('snail_wallet_count') || '1', 10);
}

/**
 * Clear all wallet data from localStorage.
 */
export function clearWalletData() {
  localStorage.removeItem('snail_encrypted_seed');
  localStorage.removeItem('snail_wallet_count');
  localStorage.removeItem('walletSeedPhrase');
}

/**
 * SECURITY: Purge any legacy plaintext seed phrase from localStorage.
 * Call this on app startup to ensure no plaintext data persists from older versions.
 */
export function purgeLegacyPlaintextSeed() {
  const plaintext = localStorage.getItem('walletSeedPhrase');
  if (plaintext) {
    localStorage.removeItem('walletSeedPhrase');
    console.warn('[Snail Security] Removed legacy plaintext seed phrase from localStorage.');
  }
}
