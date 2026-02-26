import { Alchemy, Network } from 'alchemy-sdk';
import { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

const ALCHEMY_API_KEY = 'VzR6_MduUElR5YcR7PN94LWmJjVwZvNR';


const alchemyConfig = {
    apiKey: ALCHEMY_API_KEY,
    network: Network.ETH_MAINNET,
};

export async function getEthBalance(address) {
    try {
        const alchemy = new Alchemy(alchemyConfig);

        // Native ETH balance
        const nativeBalanceWei = await alchemy.core.getBalance(address);
        const nativeBalance = parseFloat(nativeBalanceWei.toString()) / 1e18;

        // ERC-20 token balances
        const tokenBalances = await alchemy.core.getTokenBalances(address);
        const nonZero = tokenBalances.tokenBalances.filter(
            (t) => parseInt(t.tokenBalance) > 0
        );

        const tokens = await Promise.all(
            nonZero.slice(0, 20).map(async (token) => {
                try {
                    const metadata = await alchemy.core.getTokenMetadata(token.contractAddress);
                    let price = null;
                    try {
                        const priceData = await alchemy.prices.getTokenPriceByAddress([
                            { network: 'eth-mainnet', address: token.contractAddress },
                        ]);
                        price = priceData.data[0]?.prices[0]?.value || null;
                    } catch { /* price not available */ }

                    const balance = parseFloat(
                        (parseInt(token.tokenBalance) / Math.pow(10, metadata.decimals || 18)).toFixed(6)
                    );

                    return {
                        name: metadata.name || 'Unknown',
                        symbol: metadata.symbol || '???',
                        balance,
                        price: price ? parseFloat(price) : 0,
                        logo: metadata.logo || null,
                        usdValue: price ? balance * parseFloat(price) : 0,
                    };
                } catch {
                    return null;
                }
            })
        );

        // Get ETH price
        let ethPrice = 0;
        try {
            const priceResp = await fetch(
                'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
            );
            const priceData = await priceResp.json();
            ethPrice = priceData.ethereum?.usd || 0;
        } catch { /* fallback: no price */ }

        return {
            native: {
                symbol: 'ETH',
                name: 'Ethereum',
                balance: parseFloat(nativeBalance.toFixed(6)),
                price: ethPrice,
                usdValue: parseFloat((nativeBalance * ethPrice).toFixed(2)),
                logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
            },
            tokens: tokens.filter(Boolean),
            totalUsd: parseFloat(
                (
                    nativeBalance * ethPrice +
                    tokens.filter(Boolean).reduce((sum, t) => sum + (t.usdValue || 0), 0)
                ).toFixed(2)
            ),
        };
    } catch (error) {
        console.error('Error fetching ETH balance:', error);
        return { native: { symbol: 'ETH', name: 'Ethereum', balance: 0, price: 0, usdValue: 0, logo: null }, tokens: [], totalUsd: 0 };
    }
}

/**
 * Fetch ETH NFTs for an address via Alchemy.
 */
export async function getEthNfts(address) {
    try {
        const alchemy = new Alchemy(alchemyConfig);
        const nftsResponse = await alchemy.nft.getNftsForOwner(address, { pageSize: 50 });
        return nftsResponse.ownedNfts.map((nft) => ({
            name: nft.name || nft.title || 'Unnamed NFT',
            collection: nft.contract?.name || 'Unknown Collection',
            image: nft.image?.cachedUrl || nft.image?.originalUrl || nft.image?.pngUrl || null,
            tokenId: nft.tokenId,
            contractAddress: nft.contract?.address,
            chain: 'ETH',
        }));
    } catch (error) {
        console.error('Error fetching ETH NFTs:', error);
        return [];
    }
}

// ========== SOLANA ==========

const solConnection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

/**
 * Fetch SOL native balance + SPL tokens for an address.
 */
export async function getSolBalance(address) {
    try {
        const pubKey = new PublicKey(address);
        const lamports = await solConnection.getBalance(pubKey);
        const solBalance = lamports / LAMPORTS_PER_SOL;

        // Get SOL price
        let solPrice = 0;
        try {
            const priceResp = await fetch(
                'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
            );
            const priceData = await priceResp.json();
            solPrice = priceData.solana?.usd || 0;
        } catch { /* fallback */ }

        // SPL tokens
        let tokens = [];
        try {
            const tokenAccounts = await solConnection.getParsedTokenAccountsByOwner(pubKey, {
                programId: TOKEN_PROGRAM_ID,
            });

            tokens = tokenAccounts.value
                .map((acc) => {
                    const info = acc.account.data.parsed.info;
                    const amount = info.tokenAmount;
                    if (amount.uiAmount > 0 && amount.decimals > 0) {
                        return {
                            name: info.mint.slice(0, 8) + '...',
                            symbol: 'SPL',
                            balance: amount.uiAmount,
                            mint: info.mint,
                            price: 0,
                            usdValue: 0,
                            logo: null,
                        };
                    }
                    return null;
                })
                .filter(Boolean);
        } catch { /* no SPL tokens */ }

        return {
            native: {
                symbol: 'SOL',
                name: 'Solana',
                balance: parseFloat(solBalance.toFixed(6)),
                price: solPrice,
                usdValue: parseFloat((solBalance * solPrice).toFixed(2)),
                logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
            },
            tokens,
            totalUsd: parseFloat(
                (solBalance * solPrice + tokens.reduce((sum, t) => sum + (t.usdValue || 0), 0)).toFixed(2)
            ),
        };
    } catch (error) {
        console.error('Error fetching SOL balance:', error);
        return { native: { symbol: 'SOL', name: 'Solana', balance: 0, price: 0, usdValue: 0, logo: null }, tokens: [], totalUsd: 0 };
    }
}

/**
 * Fetch Solana NFTs (tokens with decimals=0 and amount=1).
 */
export async function getSolNfts(address) {
    try {
        const pubKey = new PublicKey(address);
        const tokenAccounts = await solConnection.getParsedTokenAccountsByOwner(pubKey, {
            programId: TOKEN_PROGRAM_ID,
        });

        const nfts = [];
        for (const acc of tokenAccounts.value) {
            const info = acc.account.data.parsed.info;
            const amount = info.tokenAmount;
            if (amount.decimals === 0 && amount.uiAmount === 1) {
                nfts.push({
                    name: `SOL NFT #${info.mint.slice(0, 8)}`,
                    collection: 'Solana NFT',
                    image: null, // Would need Metaplex metadata fetch for real images
                    tokenId: info.mint,
                    contractAddress: info.mint,
                    chain: 'SOL',
                });
            }
        }
        return nfts;
    } catch (error) {
        console.error('Error fetching SOL NFTs:', error);
        return [];
    }
}

// ========== BITCOIN ==========

/**
 * Fetch BTC balance for an address using Blockstream API.
 */
export async function getBtcBalance(address) {
    try {
        if (!address || address.startsWith('0x')) {
            // Not a valid BTC address
            return { native: { symbol: 'BTC', name: 'Bitcoin', balance: 0, price: 0, usdValue: 0, logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' }, totalUsd: 0 };
        }

        const resp = await fetch(`https://blockstream.info/api/address/${address}`);
        const data = await resp.json();

        const funded = data.chain_stats?.funded_txo_sum || 0;
        const spent = data.chain_stats?.spent_txo_sum || 0;
        const btcBalance = (funded - spent) / 1e8;

        // BTC price
        let btcPrice = 0;
        try {
            const priceResp = await fetch(
                'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
            );
            const priceData = await priceResp.json();
            btcPrice = priceData.bitcoin?.usd || 0;
        } catch { /* fallback */ }

        return {
            native: {
                symbol: 'BTC',
                name: 'Bitcoin',
                balance: parseFloat(btcBalance.toFixed(8)),
                price: btcPrice,
                usdValue: parseFloat((btcBalance * btcPrice).toFixed(2)),
                logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
            },
            totalUsd: parseFloat((btcBalance * btcPrice).toFixed(2)),
        };
    } catch (error) {
        console.error('Error fetching BTC balance:', error);
        return {
            native: { symbol: 'BTC', name: 'Bitcoin', balance: 0, price: 0, usdValue: 0, logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
            totalUsd: 0
        };
    }
}
