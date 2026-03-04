/**
 * DEPRECATED: Do not read plaintext seed from localStorage.
 * Use WalletContext.unlock() to get the decrypted mnemonic securely.
 */
export const WalletAuthentication = () => {
    console.warn('WalletAuthentication is deprecated. Use WalletContext.unlock() instead.');
    return null;
}
