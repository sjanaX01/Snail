import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    Keypair,
    clusterApiUrl,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createTransferInstruction,
    createAssociatedTokenAccountInstruction,
    getAccount,
} from '@solana/spl-token';
import { ethers } from 'ethers';

// ===================== VALIDATION =====================

const SOL_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const ETH_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

/**
 * Validate a Solana address
 */
export function isValidSolAddress(address) {
    if (!address || typeof address !== 'string') return false;
    if (!SOL_ADDRESS_REGEX.test(address)) return false;
    try {
        new PublicKey(address);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate an Ethereum address (with checksum support)
 */
export function isValidEthAddress(address) {
    if (!address || typeof address !== 'string') return false;
    if (!ETH_ADDRESS_REGEX.test(address)) return false;
    try {
        ethers.getAddress(address); // checksums
        return true;
    } catch {
        return false;
    }
}

/**
 * Sanitize user input — strip non-printable and dangerous chars
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.trim().replace(/[^\x20-\x7E]/g, '');
}

// ===================== SOL TRANSACTIONS =====================

const solConnection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

/**
 * Estimate SOL transfer fee
 * @returns {Promise<number>} fee in SOL
 */
export async function estimateSolFee() {
    try {
        const { blockhash } = await solConnection.getLatestBlockhash();
        // A typical SOL transfer uses ~5000 lamports fee
        const feeEstimate = await solConnection.getFeeForMessage(
            new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: PublicKey.default,
                    toPubkey: PublicKey.default,
                    lamports: 1,
                })
            ).compileMessage(),
        );
        return (feeEstimate?.value || 5000) / LAMPORTS_PER_SOL;
    } catch {
        return 0.000005; // safe default ~5000 lamports
    }
}

/**
 * Send SOL to another wallet
 * @param {string} privateKeyHex - Sender's private key (hex-encoded 64-byte secret key)
 * @param {string} toAddress - Recipient's public key
 * @param {number} amount - Amount in SOL
 * @returns {Promise<{signature: string, fee: number}>}
 */
export async function sendSol(privateKeyHex, toAddress, amount) {
    // Input validation
    const sanitizedTo = sanitizeInput(toAddress);
    if (!isValidSolAddress(sanitizedTo)) {
        throw new Error('Invalid recipient Solana address');
    }
    if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
        throw new Error('Invalid amount: must be a positive number');
    }
    if (amount < 0.000001) {
        throw new Error('Amount too small (minimum 0.000001 SOL)');
    }

    try {
        // Reconstruct keypair from hex private key
        const secretKey = new Uint8Array(Buffer.from(privateKeyHex, 'hex'));
        const senderKeypair = Keypair.fromSecretKey(secretKey);
        const recipientPubKey = new PublicKey(sanitizedTo);

        // Prevent sending to self
        if (senderKeypair.publicKey.equals(recipientPubKey)) {
            throw new Error('Cannot send to your own address');
        }

        // Check balance
        const balance = await solConnection.getBalance(senderKeypair.publicKey);
        const lamportsToSend = Math.round(amount * LAMPORTS_PER_SOL);
        const estimatedFee = 5000; // lamports

        if (balance < lamportsToSend + estimatedFee) {
            throw new Error(
                `Insufficient balance. Have ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL, ` +
                `need ${amount} SOL + ~${(estimatedFee / LAMPORTS_PER_SOL).toFixed(6)} SOL fee`
            );
        }

        // Build transaction
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: senderKeypair.publicKey,
                toPubkey: recipientPubKey,
                lamports: lamportsToSend,
            })
        );

        const { blockhash, lastValidBlockHeight } = await solConnection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = senderKeypair.publicKey;

        // Sign and send
        const signature = await sendAndConfirmTransaction(
            solConnection,
            transaction,
            [senderKeypair],
            { commitment: 'confirmed', maxRetries: 3 }
        );

        // Wipe secret key from memory
        secretKey.fill(0);

        return {
            signature,
            fee: estimatedFee / LAMPORTS_PER_SOL,
            explorer: `https://explorer.solana.com/tx/${signature}`,
        };
    } catch (error) {
        if (error.message.includes('Insufficient') || error.message.includes('Invalid') || error.message.includes('Cannot send')) {
            throw error;
        }
        console.error('SOL transaction error:', error);
        throw new Error(`Transaction failed: ${error.message}`);
    }
}

/**
 * Send SPL token to another wallet
 * @param {string} privateKeyHex - Sender's private key (hex)
 * @param {string} toAddress - Recipient's public key
 * @param {string} tokenMint - Token mint address
 * @param {number} amount - Amount of tokens (in UI decimals)
 * @param {number} decimals - Token decimals
 * @returns {Promise<{signature: string}>}
 */
export async function sendSplToken(privateKeyHex, toAddress, tokenMint, amount, decimals) {
    const sanitizedTo = sanitizeInput(toAddress);
    const sanitizedMint = sanitizeInput(tokenMint);

    if (!isValidSolAddress(sanitizedTo)) {
        throw new Error('Invalid recipient Solana address');
    }
    if (!isValidSolAddress(sanitizedMint)) {
        throw new Error('Invalid token mint address');
    }
    if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
        throw new Error('Invalid amount');
    }

    try {
        const secretKey = new Uint8Array(Buffer.from(privateKeyHex, 'hex'));
        const senderKeypair = Keypair.fromSecretKey(secretKey);
        const recipientPubKey = new PublicKey(sanitizedTo);
        const mintPubKey = new PublicKey(sanitizedMint);

        // Get sender ATA
        const senderATA = await getAssociatedTokenAddress(mintPubKey, senderKeypair.publicKey);
        const recipientATA = await getAssociatedTokenAddress(mintPubKey, recipientPubKey);

        const transaction = new Transaction();

        // Check if recipient ATA exists; if not, create it
        try {
            await getAccount(solConnection, recipientATA);
        } catch {
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    senderKeypair.publicKey,
                    recipientATA,
                    recipientPubKey,
                    mintPubKey
                )
            );
        }

        // Add transfer instruction
        const rawAmount = BigInt(Math.round(amount * Math.pow(10, decimals)));
        transaction.add(
            createTransferInstruction(
                senderATA,
                recipientATA,
                senderKeypair.publicKey,
                rawAmount
            )
        );

        const { blockhash } = await solConnection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = senderKeypair.publicKey;

        const signature = await sendAndConfirmTransaction(
            solConnection,
            transaction,
            [senderKeypair],
            { commitment: 'confirmed', maxRetries: 3 }
        );

        secretKey.fill(0);

        return {
            signature,
            explorer: `https://explorer.solana.com/tx/${signature}`,
        };
    } catch (error) {
        if (error.message.includes('Invalid') || error.message.includes('Insufficient')) {
            throw error;
        }
        throw new Error(`SPL Token transfer failed: ${error.message}`);
    }
}

// ===================== ETH TRANSACTIONS =====================

const ETH_RPC_URL = 'https://eth-mainnet.g.alchemy.com/v2/VzR6_MduUElR5YcR7PN94LWmJjVwZvNR';

/**
 * Estimate ETH transfer gas fee
 * @param {string} from - Sender address
 * @param {string} to - Recipient address
 * @param {string} amount - Amount in ETH
 * @returns {Promise<{gasPrice: string, gasLimit: string, totalFeeEth: string}>}
 */
export async function estimateEthFee(from, to, amount) {
    try {
        const provider = new ethers.JsonRpcProvider(ETH_RPC_URL);
        const feeData = await provider.getFeeData();
        const gasLimit = await provider.estimateGas({
            from,
            to: to || ethers.ZeroAddress,
            value: ethers.parseEther(amount || '0.001'),
        });
        const totalFeeWei = feeData.gasPrice * gasLimit;
        return {
            gasPrice: ethers.formatUnits(feeData.gasPrice, 'gwei'),
            gasLimit: gasLimit.toString(),
            totalFeeEth: ethers.formatEther(totalFeeWei),
        };
    } catch {
        return { gasPrice: '0', gasLimit: '21000', totalFeeEth: '0.0005' };
    }
}

/**
 * Send ETH to another wallet
 * @param {string} privateKey - Sender's private key (hex with 0x prefix)
 * @param {string} toAddress - Recipient's address
 * @param {string} amount - Amount in ETH (as string for precision)
 * @returns {Promise<{hash: string, fee: string}>}
 */
export async function sendEth(privateKey, toAddress, amount) {
    const sanitizedTo = sanitizeInput(toAddress);
    if (!isValidEthAddress(sanitizedTo)) {
        throw new Error('Invalid recipient Ethereum address');
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !isFinite(parsedAmount)) {
        throw new Error('Invalid amount: must be a positive number');
    }
    if (parsedAmount < 0.000001) {
        throw new Error('Amount too small (minimum 0.000001 ETH)');
    }

    try {
        const provider = new ethers.JsonRpcProvider(ETH_RPC_URL);
        const wallet = new ethers.Wallet(privateKey, provider);

        // Prevent sending to self
        if (wallet.address.toLowerCase() === sanitizedTo.toLowerCase()) {
            throw new Error('Cannot send to your own address');
        }

        // Check balance
        const balance = await provider.getBalance(wallet.address);
        const amountWei = ethers.parseEther(amount);
        const feeData = await provider.getFeeData();
        const estimatedGas = await provider.estimateGas({
            from: wallet.address,
            to: sanitizedTo,
            value: amountWei,
        });
        const estimatedFee = feeData.gasPrice * estimatedGas;

        if (balance < amountWei + estimatedFee) {
            throw new Error(
                `Insufficient balance. Have ${ethers.formatEther(balance)} ETH, ` +
                `need ${amount} ETH + ~${ethers.formatEther(estimatedFee)} ETH gas`
            );
        }

        // Send transaction
        const tx = await wallet.sendTransaction({
            to: ethers.getAddress(sanitizedTo), // checksum
            value: amountWei,
            gasLimit: estimatedGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            maxFeePerGas: feeData.maxFeePerGas,
        });

        // Wait for 1 confirmation
        const receipt = await tx.wait(1);

        return {
            hash: receipt.hash,
            fee: ethers.formatEther(receipt.gasUsed * receipt.gasPrice),
            explorer: `https://etherscan.io/tx/${receipt.hash}`,
        };
    } catch (error) {
        if (error.message.includes('Insufficient') || error.message.includes('Invalid') || error.message.includes('Cannot send')) {
            throw error;
        }
        console.error('ETH transaction error:', error);
        throw new Error(`Transaction failed: ${error.message}`);
    }
}

/**
 * Send ERC-20 token
 * @param {string} privateKey - Sender's private key
 * @param {string} toAddress - Recipient address
 * @param {string} tokenContract - Token contract address
 * @param {string} amount - Amount in token units (string)
 * @param {number} decimals - Token decimals
 * @returns {Promise<{hash: string}>}
 */
export async function sendErc20Token(privateKey, toAddress, tokenContract, amount, decimals = 18) {
    const sanitizedTo = sanitizeInput(toAddress);
    const sanitizedContract = sanitizeInput(tokenContract);

    if (!isValidEthAddress(sanitizedTo)) {
        throw new Error('Invalid recipient Ethereum address');
    }
    if (!isValidEthAddress(sanitizedContract)) {
        throw new Error('Invalid token contract address');
    }

    try {
        const provider = new ethers.JsonRpcProvider(ETH_RPC_URL);
        const wallet = new ethers.Wallet(privateKey, provider);

        const erc20Abi = [
            'function transfer(address to, uint256 amount) returns (bool)',
            'function balanceOf(address owner) view returns (uint256)',
        ];

        const contract = new ethers.Contract(sanitizedContract, erc20Abi, wallet);
        const rawAmount = ethers.parseUnits(amount, decimals);

        // Check token balance
        const tokenBalance = await contract.balanceOf(wallet.address);
        if (tokenBalance < rawAmount) {
            throw new Error('Insufficient token balance');
        }

        const tx = await contract.transfer(ethers.getAddress(sanitizedTo), rawAmount);
        const receipt = await tx.wait(1);

        return {
            hash: receipt.hash,
            explorer: `https://etherscan.io/tx/${receipt.hash}`,
        };
    } catch (error) {
        if (error.message.includes('Insufficient') || error.message.includes('Invalid')) {
            throw error;
        }
        throw new Error(`ERC-20 transfer failed: ${error.message}`);
    }
}
