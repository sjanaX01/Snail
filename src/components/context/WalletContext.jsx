import { createContext, useContext, useState, useCallback } from 'react';
import { generateMnemonic, mnemonicToSeed, validateMnemonic } from 'bip39';
import { deriveSolanaKeypair } from '../../services/svm/util';
import { deriveEthereumWallet } from '../../services/evm/util';
import {
    encryptSeedPhrase,
    decryptSeedPhrase,
    saveEncryptedSeed,
    getEncryptedSeed,
    hasEncryptedWallet,
    saveWalletCount,
    getWalletCount,
    clearWalletData,
} from '../../utils/crypto';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [mnemonic, setMnemonic] = useState(null);
    const [wallets, setWallets] = useState([]);
    const [walletCount, setWalletCountState] = useState(getWalletCount());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const isInitialized = hasEncryptedWallet();

    /**
     * Derive all wallets from mnemonic for all chains.
     */
    const deriveAllWallets = useCallback(async (mnemonicPhrase, count) => {
        const seed = await mnemonicToSeed(mnemonicPhrase);
        const derivedWallets = [];

        for (let i = 0; i < count; i++) {
            const solPath = `m/44'/501'/${i}'/0'`;
            const ethPath = `m/44'/60'/0'/0/${i}`;
            // BTC path (BIP84 native segwit)
            const btcPath = `m/84'/0'/${i}'/0/0`;

            // Solana
            const solKeypair = deriveSolanaKeypair(seed, solPath);
            const solPublicKey = solKeypair.publicKey.toBase58();

            // Ethereum
            const ethWallet = deriveEthereumWallet(seed, ethPath);
            const ethPublicKey = ethWallet.address;

            // BTC — derive using the same HD seed
            let btcAddress = '';
            try {
                const { HDNodeWallet } = await import('ethers');
                // Use bip32 for proper BTC derivation
                const { BIP32Factory } = await import('bip32');
                const ecc = await import('tiny-secp256k1');
                const bip32 = BIP32Factory(ecc);
                const root = bip32.fromSeed(seed);
                const child = root.derivePath(btcPath);
                const { payments } = await import('bitcoinjs-lib');
                const { p2wpkh } = payments;
                btcAddress = p2wpkh({ pubkey: Buffer.from(child.publicKey) }).address;
            } catch (e) {
                // If bitcoinjs-lib or bip32 fails, generate a placeholder
                console.warn('BTC derivation not available:', e);
                // Fallback: use ethers HD derivation for BTC public key display
                const { HDNodeWallet: HDNode } = await import('ethers');
                const hdNode = HDNode.fromSeed(seed);
                const btcChild = hdNode.derivePath(`m/84'/0'/${i}'/0/0`);
                btcAddress = btcChild.address; // Not a real BTC address, just for display
            }

            derivedWallets.push({
                index: i,
                name: `Wallet ${i + 1}`,
                sol: {
                    publicKey: solPublicKey,
                    privateKey: Buffer.from(solKeypair.secretKey).toString('hex'),
                },
                eth: {
                    publicKey: ethPublicKey,
                    privateKey: ethWallet.privateKey,
                },
                btc: {
                    address: btcAddress,
                },
            });
        }

        return derivedWallets;
    }, []);

    /**
     * Generate a new mnemonic only — does NOT save or encrypt.
     * Used for the multi-step create flow in Setup.
     */
    const generateNewMnemonic = useCallback(() => {
        return generateMnemonic().split(' ');
    }, []);

    /**
     * Save a wallet from a mnemonic + password — encrypts and stores.
     * Call this AFTER the user has seen and confirmed their seed phrase.
     */
    const saveNewWallet = useCallback(async (mnemonicPhrase, password) => {
        setIsLoading(true);
        setError(null);
        try {
            const phrase = mnemonicPhrase.trim();
            const encrypted = await encryptSeedPhrase(phrase, password);
            saveEncryptedSeed(encrypted);
            saveWalletCount(1);
            setMnemonic(phrase);
            setWalletCountState(1);

            const derived = await deriveAllWallets(phrase, 1);
            setWallets(derived);
            setIsUnlocked(true);
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [deriveAllWallets]);

    /**
     * Legacy createWallet — generates + saves in one step.
     */
    const createWallet = useCallback(async (password) => {
        setIsLoading(true);
        setError(null);
        try {
            const newMnemonic = generateMnemonic();
            const encrypted = await encryptSeedPhrase(newMnemonic, password);
            saveEncryptedSeed(encrypted);
            saveWalletCount(1);
            setMnemonic(newMnemonic);
            setWalletCountState(1);

            const derived = await deriveAllWallets(newMnemonic, 1);
            setWallets(derived);
            setIsUnlocked(true);

            return newMnemonic.split(' ');
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [deriveAllWallets]);

    /**
     * Import wallet from existing seed phrase and encrypt with password.
     */
    const importWallet = useCallback(async (seedPhrase, password) => {
        setIsLoading(true);
        setError(null);
        try {
            const phrase = seedPhrase.trim();
            if (!validateMnemonic(phrase)) {
                throw new Error('Invalid mnemonic seed phrase');
            }

            const encrypted = await encryptSeedPhrase(phrase, password);
            saveEncryptedSeed(encrypted);
            saveWalletCount(1);
            setMnemonic(phrase);
            setWalletCountState(1);

            const derived = await deriveAllWallets(phrase, 1);
            setWallets(derived);
            setIsUnlocked(true);
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [deriveAllWallets]);

    /**
     * Unlock an existing wallet with a password.
     */
    const unlock = useCallback(async (password) => {
        setIsLoading(true);
        setError(null);
        try {
            const encrypted = getEncryptedSeed();
            if (!encrypted) throw new Error('No wallet found');

            const decrypted = await decryptSeedPhrase(encrypted, password);
            const count = getWalletCount();
            setMnemonic(decrypted);
            setWalletCountState(count);

            const derived = await deriveAllWallets(decrypted, count);
            setWallets(derived);
            setIsUnlocked(true);
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [deriveAllWallets]);

    /**
     * Add a new wallet (derive next index from same seed).
     */
    const addWallet = useCallback(async () => {
        if (!mnemonic) return;
        setIsLoading(true);
        try {
            const newCount = walletCount + 1;
            const derived = await deriveAllWallets(mnemonic, newCount);
            setWallets(derived);
            setWalletCountState(newCount);
            saveWalletCount(newCount);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [mnemonic, walletCount, deriveAllWallets]);

    /**
     * Lock the wallet — wipes in-memory mnemonic.
     */
    const lock = useCallback(() => {
        setMnemonic(null);
        setWallets([]);
        setIsUnlocked(false);
        setError(null);
    }, []);

    /**
     * Reset everything — deletes all wallet data.
     */
    const resetWallet = useCallback(() => {
        clearWalletData();
        setMnemonic(null);
        setWallets([]);
        setIsUnlocked(false);
        setWalletCountState(1);
        setError(null);
    }, []);

    const value = {
        isInitialized,
        isUnlocked,
        isLoading,
        error,
        wallets,
        walletCount,
        mnemonic,
        generateNewMnemonic,
        saveNewWallet,
        createWallet,
        importWallet,
        unlock,
        addWallet,
        lock,
        resetWallet,
        setError,
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
}

export default WalletContext;
