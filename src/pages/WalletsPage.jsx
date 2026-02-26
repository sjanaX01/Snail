import { useState, useRef, useEffect } from 'react';
import { useWallet } from '../components/context/WalletContext';
import { Plus, Eye, EyeOff, Copy, Check, ChevronDown } from 'lucide-react';
import SnailHeading from '../components/ui/SnailHeading';
import Button from '../components/ui/Button';

export default function WalletPage() {
  const { wallets, addWallet, isLoading } = useWallet();

  return (
    <div className="mt-16 w-full max-w-4xl mx-auto p-4">
      <SnailHeading />
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-bold text-xl">Wallets</h2>
        <Button text="Add Wallet" onClick={addWallet} disabled={isLoading} />
      </div>

      <div className="space-y-4">
        {wallets.map((wallet, index) => (
          <WalletCard key={index} wallet={wallet} index={index} />
        ))}
      </div>
    </div>
  );
}

function WalletCard({ wallet, index }) {
  const [activeChain, setActiveChain] = useState('ETH');
  const [showPrivate, setShowPrivate] = useState(false);
  const [expanded, setExpanded] = useState(index === 0);
  const [copiedField, setCopiedField] = useState(null);
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);

  // Measure content height whenever expanded content changes
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [expanded, activeChain, showPrivate, copiedField]);

  const TABS = [
    { id: 'ETH', label: 'Ethereum' },
    { id: 'SOL', label: 'Solana' },
    { id: 'BTC', label: 'Bitcoin' },
  ];

  const getKeys = () => {
    switch (activeChain) {
      case 'ETH': return { publicKey: wallet.eth.publicKey, privateKey: wallet.eth.privateKey };
      case 'SOL': return { publicKey: wallet.sol.publicKey, privateKey: wallet.sol.privateKey };
      case 'BTC': return { publicKey: wallet.btc.address, privateKey: null };
      default: return { publicKey: '', privateKey: '' };
    }
  };

  const keys = getKeys();

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch { /* */ }
  };

  return (
    <div
      className="box h-auto min-h-[4rem] w-auto border-2 rounded-lg mb-4 shadow-sm animate-fade-in overflow-hidden"
      style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <h2 className="font-semibold">Wallet {index + 1}</h2>
        <ChevronDown
          className="w-5 h-5"
          style={{
            color: 'var(--text-muted)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
          }}
        />
      </button>

      {/* Expandable content wrapper — smooth height transition */}
      <div
        style={{
          maxHeight: expanded ? `${contentHeight}px` : '0px',
          opacity: expanded ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.35s ease, opacity 0.25s ease',
        }}
      >
        <div ref={contentRef} className="px-6 pb-6" style={{ borderTop: '1px solid var(--border-color)' }}>
          {/* Chain Tabs */}
          <div className="flex gap-2 pt-4 mb-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className="font-medium text-sm px-4 py-2 rounded-md transition-colors"
                style={{
                  background: activeChain === tab.id ? 'var(--bg-secondary)' : 'transparent',
                  color: activeChain === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: `1px solid ${activeChain === tab.id ? 'var(--border-color)' : 'transparent'}`,
                }}
                onClick={() => { setActiveChain(tab.id); setShowPrivate(false); }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Keys Display */}
          <div
            className="w-full h-auto min-h-[7rem] rounded-md flex flex-col md:flex-row py-5 justify-center"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <div className="publickey w-full md:w-1/2 px-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">{activeChain === 'BTC' ? 'Address' : 'Public Key'}</h3>
                <button onClick={() => copyToClipboard(keys.publicKey, 'public')} className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {copiedField === 'public' ? <><Check className="w-3 h-3 text-green-500" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
              <div className="text-[12px] break-all">{keys.publicKey || '—'}</div>
            </div>

            <div className="hidden md:block h-full w-[2px] rounded-lg" style={{ background: 'var(--border-color)' }} />
            <div className="block md:hidden h-[1px] mx-6 my-4 rounded-lg" style={{ background: 'var(--border-color)' }} />

            <div className="privatekey w-full md:w-1/2 px-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Private Key</h3>
                <div className="flex items-center gap-2">
                  {activeChain !== 'BTC' && (
                    <>
                      <button onClick={() => setShowPrivate(!showPrivate)} className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {showPrivate ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showPrivate ? 'Hide' : 'Show'}
                      </button>
                      {showPrivate && (
                        <button onClick={() => copyToClipboard(keys.privateKey, 'private')} className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {copiedField === 'private' ? <><Check className="w-3 h-3 text-green-500" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="text-[12px] break-all">
                {activeChain === 'BTC' ? 'N/A' : showPrivate ? keys.privateKey : '••••••••••••••••••••••••••••••••••••••••••••'}
              </div>
            </div>
          </div>

          {/* Security Warning */}
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-xs text-yellow-700 dark:text-yellow-400">
            ⚠️ Never share your private key with anyone. It gives full access to your funds.
          </div>
        </div>
      </div>
    </div>
  );
}
