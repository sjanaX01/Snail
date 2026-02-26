
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ITERATIONS = 600000;

async function deriveKey(password, salt) {
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
 * Returns a base64-encoded string containing salt + iv + ciphertext.
 */
export async function encryptSeedPhrase(seedPhrase, password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(seedPhrase)
  );

  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  // Convert to base64 for storage
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a seed phrase with a password.
 * Returns the plaintext seed phrase string, or throws on wrong password.
 */
export async function decryptSeedPhrase(encryptedData, password) {
  const decoder = new TextDecoder();
  const combined = new Uint8Array(
    atob(encryptedData).split('').map(c => c.charCodeAt(0))
  );

  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

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
