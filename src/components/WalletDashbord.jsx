import { useState } from 'react';

export default function WalletDashboard({ tokens = [], nfts = [], isLoading = false }) {
  const [activeTab, setActiveTab] = useState('tokens');

  const tabs = [
    { id: 'tokens', label: 'Tokens' },
    { id: 'nfts', label: 'NFTs' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 h-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-6 w-full" style={{ borderBottom: '1px solid var(--border-color)' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`py-2 px-1 -mb-px font-medium text-sm transition-colors ${activeTab === tab.id
                    ? 'border-b-2 border-current'
                    : ''
                  }`}
                style={{ color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)' }}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tab.id === 'nfts' && nfts.length > 0 && (
                  <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-secondary)' }}>
                    {nfts.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'tokens' && <TokensTab tokens={tokens} isLoading={isLoading} />}
      {activeTab === 'nfts' && <NftsTab nfts={nfts} isLoading={isLoading} />}
    </div>
  );
}

function TokensTab({ tokens, isLoading }) {
  if (isLoading && tokens.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="skeleton w-8 h-8 rounded-full" />
            <div className="flex-1">
              <div className="skeleton w-24 h-4 mb-1" />
              <div className="skeleton w-16 h-3" />
            </div>
            <div className="text-right">
              <div className="skeleton w-20 h-4 mb-1" />
              <div className="skeleton w-14 h-3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No tokens found</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Tokens will appear here once your wallet has a balance</p>
      </div>
    );
  }

  return (
    <div className="w-auto max-w-4xl mx-auto p-2">
      <div className="grid grid-cols-4 gap-4 mb-4 text-sm" style={{ color: 'var(--text-muted)' }}>
        <div>Asset</div>
        <div className="text-right">Price</div>
        <div className="text-right">Balance</div>
        <div className="text-right">Value</div>
      </div>

      <div className="space-y-2 overflow-y-auto h-[calc(100vh-380px)] pr-4">
        {tokens.map((token, index) => (
          <div key={`${token.symbol}-${index}`} className="flex items-center justify-between py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="flex items-center space-x-3 w-1/4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold" style={{ background: 'var(--bg-secondary)' }}>
                {token.logo ? (
                  <img src={token.logo} alt={`${token.symbol} logo`} className="w-8 h-8 rounded-full" />
                ) : (
                  (token.symbol || '?').slice(0, 3)
                )}
              </div>
              <div>
                <div className="font-medium">{token.symbol}</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{token.name}</div>
              </div>
            </div>
            <div className="text-right w-1/4">
              <div className="text-[13px] font-medium">
                ${token.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
            </div>
            <div className="text-right w-1/4 text-[13px] font-medium">
              <div>{token.balance?.toLocaleString('en-US', { maximumFractionDigits: 6 }) || '0'}</div>
            </div>
            <div className="text-right w-1/4 text-[13px] font-medium">
              <div>${(token.usdValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NftsTab({ nfts, isLoading }) {
  if (isLoading && nfts.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="skeleton w-full aspect-square rounded-lg" />
            <div className="skeleton w-3/4 h-4" />
            <div className="skeleton w-1/2 h-3" />
          </div>
        ))}
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No NFTs found</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Your NFT collection will appear here</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {nfts.map((nft, index) => (
        <div
          key={`${nft.contractAddress}-${nft.tokenId}-${index}`}
          className="border-2 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
          style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}
        >
          <div className="aspect-square overflow-hidden relative" style={{ background: 'var(--bg-secondary)' }}>
            {nft.image ? (
              <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" loading="lazy"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <div className="w-full h-full items-center justify-center text-2xl" style={{ display: nft.image ? 'none' : 'flex', background: 'var(--bg-secondary)' }}>🖼️</div>
            <span className="absolute top-2 right-2 text-xs font-bold bg-black/60 text-white px-2 py-0.5 rounded-full">{nft.chain}</span>
          </div>
          <div className="p-3">
            <p className="text-sm font-semibold truncate">{nft.name}</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{nft.collection}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
