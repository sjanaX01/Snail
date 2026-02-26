import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Copy, Check, Send, Download } from 'lucide-react';
import { useWallet } from '../components/context/WalletContext';
import { getEthBalance, getSolBalance, getBtcBalance, getEthNfts, getSolNfts } from '../services/balanceService';
import WalletDashboard from '../components/WalletDashbord';
import SnailHeading from '../components/ui/SnailHeading';
import ReceiveModal from '../components/ui/ReceiveModal';

const CHAIN_ICONS = {
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
};

export default function Home() {
  const { wallets } = useWallet();
  const [activeWalletIndex, setActiveWalletIndex] = useState(0);
  const [balances, setBalances] = useState({ eth: null, sol: null, btc: null });
  const [nfts, setNfts] = useState([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(null);
  const [showReceive, setShowReceive] = useState(false);

  const wallet = wallets[activeWalletIndex];

  const fetchBalances = useCallback(async () => {
    if (!wallet) return;
    setIsLoadingBalances(true);
    try {
      const [ethData, solData, btcData, ethNftData, solNftData] = await Promise.allSettled([
        getEthBalance(wallet.eth.publicKey),
        getSolBalance(wallet.sol.publicKey),
        getBtcBalance(wallet.btc.address),
        getEthNfts(wallet.eth.publicKey),
        getSolNfts(wallet.sol.publicKey),
      ]);

      setBalances({
        eth: ethData.status === 'fulfilled' ? ethData.value : null,
        sol: solData.status === 'fulfilled' ? solData.value : null,
        btc: btcData.status === 'fulfilled' ? btcData.value : null,
      });

      const allNfts = [
        ...(ethNftData.status === 'fulfilled' ? ethNftData.value : []),
        ...(solNftData.status === 'fulfilled' ? solNftData.value : []),
      ];
      setNfts(allNfts);
    } catch (err) {
      console.error('Error fetching balances:', err);
    } finally {
      setIsLoadingBalances(false);
    }
  }, [wallet]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const totalUsd =
    (balances.eth?.totalUsd || 0) +
    (balances.sol?.totalUsd || 0) +
    (balances.btc?.totalUsd || 0);

  const copyAddress = async (addr, label) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedAddr(label);
      setTimeout(() => setCopiedAddr(null), 2000);
    } catch { /* */ }
  };

  const truncateAddr = (addr) => {
    if (!addr || addr.length < 12) return addr || '—';
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  };

  // Consolidate all tokens from all chains
  const allTokens = [];
  if (balances.eth?.native) allTokens.push(balances.eth.native);
  if (balances.sol?.native) allTokens.push(balances.sol.native);
  if (balances.btc?.native) allTokens.push(balances.btc.native);
  if (balances.eth?.tokens) allTokens.push(...balances.eth.tokens);
  if (balances.sol?.tokens) allTokens.push(...balances.sol.tokens);

  return (
    <div>
      <div className="mt-16 w-full max-w-4xl mx-auto p-4">
        <SnailHeading />

        {/* Wallet Selector (if multiple) */}
        {wallets.length > 1 && (
          <div className="mb-4">
            <select
              value={activeWalletIndex}
              onChange={(e) => setActiveWalletIndex(Number(e.target.value))}
              className="px-3 py-2 border rounded-md text-sm"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
            >
              {wallets.map((w, i) => (
                <option key={i} value={i}>{w.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Total Balance */}
        <div className="balance-area mb-9 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            {isLoadingBalances && totalUsd === 0 ? (
              <div className="skeleton w-48 h-10" />
            ) : (
              <div className="ac-balance text-4xl font-bold">
                $ {totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
            <button
              onClick={fetchBalances}
              disabled={isLoadingBalances}
              className="p-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              style={{ borderColor: 'var(--border-color)' }}
              title="Refresh balances"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingBalances ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mb-6">
          <button className="flex items-center space-x-2 px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-900 dark:hover:bg-gray-200">
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
          <button
            onClick={() => setShowReceive(true)}
            className="flex items-center space-x-2 px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-900 dark:hover:bg-gray-200"
          >
            <Download className="w-4 h-4" />
            <span>Receive</span>
          </button>
        </div>

        {/* Chain Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <ChainCard
            symbol="ETH"
            name="Ethereum"
            balance={balances.eth?.native?.balance}
            usdValue={balances.eth?.totalUsd}
            address={wallet?.eth?.publicKey}
            icon={CHAIN_ICONS.ETH}
            isLoading={isLoadingBalances && !balances.eth}
            onCopy={copyAddress}
            copiedAddr={copiedAddr}
            truncateAddr={truncateAddr}
          />
          <ChainCard
            symbol="SOL"
            name="Solana"
            balance={balances.sol?.native?.balance}
            usdValue={balances.sol?.totalUsd}
            address={wallet?.sol?.publicKey}
            icon={CHAIN_ICONS.SOL}
            isLoading={isLoadingBalances && !balances.sol}
            onCopy={copyAddress}
            copiedAddr={copiedAddr}
            truncateAddr={truncateAddr}
          />
          <ChainCard
            symbol="BTC"
            name="Bitcoin"
            balance={balances.btc?.native?.balance}
            usdValue={balances.btc?.totalUsd}
            address={wallet?.btc?.address}
            icon={CHAIN_ICONS.BTC}
            isLoading={isLoadingBalances && !balances.btc}
            onCopy={copyAddress}
            copiedAddr={copiedAddr}
            truncateAddr={truncateAddr}
          />
        </div>
      </div>

      {/* Dashboard Tabs */}
      <WalletDashboard tokens={allTokens} nfts={nfts} isLoading={isLoadingBalances} />

      {/* Receive Modal */}
      {showReceive && (
        <ReceiveModal wallet={wallet} onClose={() => setShowReceive(false)} />
      )}
    </div>
  );
}

function ChainCard({ symbol, name, balance, usdValue, address, icon, isLoading, onCopy, copiedAddr, truncateAddr }) {
  return (
    <div
      className="border-2 rounded-lg p-4 hover:shadow-md transition-shadow"
      style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <img src={icon} alt={symbol} className="w-7 h-7 rounded-full" />
        <span className="text-sm font-semibold">{name}</span>
      </div>

      {isLoading ? (
        <>
          <div className="skeleton w-24 h-5 mb-1" />
          <div className="skeleton w-16 h-4" />
        </>
      ) : (
        <>
          <p className="text-lg font-bold">
            {balance != null ? `${balance} ${symbol}` : `0 ${symbol}`}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            ≈ ${(usdValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </>
      )}

      {address && (
        <div className="mt-3 flex items-center gap-1">
          <span
            className="text-xs font-mono cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            onClick={() => onCopy(address, symbol)}
            title={address}
          >
            {truncateAddr(address)}
          </span>
          <button
            onClick={() => onCopy(address, symbol)}
            className="p-1"
          >
            {copiedAddr === symbol ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
