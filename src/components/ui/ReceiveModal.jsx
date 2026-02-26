import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, ChevronDown } from 'lucide-react';

const CHAINS = [
    { id: 'ETH', label: 'Ethereum', icon: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
    { id: 'SOL', label: 'Solana', icon: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
    { id: 'BTC', label: 'Bitcoin', icon: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
];

export default function ReceiveModal({ wallet, onClose }) {
    const [selectedChain, setSelectedChain] = useState('ETH');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const getAddress = () => {
        switch (selectedChain) {
            case 'ETH': return wallet?.eth?.publicKey || '';
            case 'SOL': return wallet?.sol?.publicKey || '';
            case 'BTC': return wallet?.btc?.address || '';
            default: return '';
        }
    };

    const address = getAddress();
    const chain = CHAINS.find(c => c.id === selectedChain);

    const copyAddress = async () => {
        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* */ }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content w-full max-w-sm mx-4 p-6 rounded-2xl border-2 dark:border-[#333]"
                style={{ background: 'var(--bg-primary)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold text-lg">Receive</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Chain Dropdown */}
                <div className="relative mb-5">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="w-full flex items-center justify-between px-4 py-3 border-2 rounded-lg hover:border-gray-400 dark:hover:border-gray-500"
                        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                    >
                        <div className="flex items-center gap-2">
                            <img src={chain.icon} alt={chain.label} className="w-5 h-5 rounded-full" />
                            <span className="font-medium text-sm">{chain.label}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
                    </button>

                    {dropdownOpen && (
                        <div
                            className="absolute top-full left-0 right-0 mt-1 border-2 rounded-lg overflow-hidden z-10 animate-scale-in"
                            style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
                        >
                            {CHAINS.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => { setSelectedChain(c.id); setDropdownOpen(false); setCopied(false); }}
                                    className={`w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 ${selectedChain === c.id ? 'bg-gray-50 dark:bg-gray-800' : ''
                                        }`}
                                >
                                    <img src={c.icon} alt={c.label} className="w-5 h-5 rounded-full" />
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* QR Code */}
                <div className="flex justify-center mb-5">
                    <div className="p-4 bg-white rounded-xl border">
                        <QRCodeSVG
                            value={address || 'no-address'}
                            size={180}
                            bgColor="#ffffff"
                            fgColor="#000000"
                            level="M"
                        />
                    </div>
                </div>

                {/* Address */}
                <div className="mb-4">
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                        {chain.label} Address
                    </label>
                    <div
                        className="flex items-center gap-2 p-3 rounded-lg border text-xs font-mono break-all"
                        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                    >
                        <span className="flex-1" style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                            {address || 'No address'}
                        </span>
                        <button
                            onClick={copyAddress}
                            className="flex-shrink-0 p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                            {copied ? (
                                <Check className="w-4 h-4 text-green-500" />
                            ) : (
                                <Copy className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                            )}
                        </button>
                    </div>
                </div>

                {/* Info */}
                <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                    Send only <strong>{chain.label}</strong> assets to this address
                </p>
            </div>
        </div>
    );
}
