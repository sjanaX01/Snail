import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronDown, Send, AlertTriangle, Loader2, ExternalLink, Shield, Check } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import {
    sendSol,
    sendEth,
    isValidSolAddress,
    isValidEthAddress,
    estimateSolFee,
    estimateEthFee,
} from '../../services/transactionService';

const CHAINS = [
    { id: 'ETH', label: 'Ethereum', icon: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
    { id: 'SOL', label: 'Solana', icon: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
];

const STEPS = {
    FORM: 'form',
    CONFIRM: 'confirm',
    SENDING: 'sending',
    SUCCESS: 'success',
    ERROR: 'error',
};

export default function SendModal({ wallet, balances, onClose, onSuccess }) {
    const [step, setStep] = useState(STEPS.FORM);
    const [selectedChain, setSelectedChain] = useState('SOL');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [recipientAddress, setRecipientAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [memo, setMemo] = useState('');
    const [addressError, setAddressError] = useState('');
    const [amountError, setAmountError] = useState('');
    const [estimatedFee, setEstimatedFee] = useState(null);
    const [txResult, setTxResult] = useState(null);
    const [txError, setTxError] = useState('');
    const [isEstimatingFee, setIsEstimatingFee] = useState(false);

    const debounceTimer = useRef(null);

    const chain = CHAINS.find((c) => c.id === selectedChain);

    // Get the max available balance for the selected chain
    const getMaxBalance = useCallback(() => {
        if (selectedChain === 'SOL') return balances?.sol?.native?.balance || 0;
        if (selectedChain === 'ETH') return balances?.eth?.native?.balance || 0;
        return 0;
    }, [selectedChain, balances]);

    const getAddress = useCallback(() => {
        if (selectedChain === 'SOL') return wallet?.sol?.publicKey || '';
        if (selectedChain === 'ETH') return wallet?.eth?.publicKey || '';
        return '';
    }, [selectedChain, wallet]);

    // Validate address on change
    useEffect(() => {
        if (!recipientAddress) {
            setAddressError('');
            return;
        }

        const addr = recipientAddress.trim();

        // Prevent sending to own address
        if (addr === getAddress()) {
            setAddressError('Cannot send to your own address');
            return;
        }

        if (selectedChain === 'SOL' && !isValidSolAddress(addr)) {
            setAddressError('Invalid Solana address');
        } else if (selectedChain === 'ETH' && !isValidEthAddress(addr)) {
            setAddressError('Invalid Ethereum address');
        } else {
            setAddressError('');
        }
    }, [recipientAddress, selectedChain, getAddress]);

    // Validate amount on change
    useEffect(() => {
        if (!amount) {
            setAmountError('');
            return;
        }

        const parsed = parseFloat(amount);
        if (isNaN(parsed) || parsed <= 0) {
            setAmountError('Enter a valid positive amount');
        } else if (parsed > getMaxBalance()) {
            setAmountError(`Exceeds available balance of ${getMaxBalance()} ${selectedChain}`);
        } else if (parsed < 0.000001) {
            setAmountError('Amount too small');
        } else {
            setAmountError('');
        }
    }, [amount, selectedChain, getMaxBalance]);

    // Estimate fees with debounce
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        if (!amount || !recipientAddress || addressError || amountError) {
            setEstimatedFee(null);
            return;
        }

        debounceTimer.current = setTimeout(async () => {
            setIsEstimatingFee(true);
            try {
                if (selectedChain === 'SOL') {
                    const fee = await estimateSolFee();
                    setEstimatedFee({ value: fee, unit: 'SOL' });
                } else if (selectedChain === 'ETH') {
                    const fee = await estimateEthFee(getAddress(), recipientAddress.trim(), amount);
                    setEstimatedFee({ value: parseFloat(fee.totalFeeEth), unit: 'ETH' });
                }
            } catch {
                setEstimatedFee({ value: 0, unit: selectedChain });
            } finally {
                setIsEstimatingFee(false);
            }
        }, 800);

        return () => clearTimeout(debounceTimer.current);
    }, [amount, recipientAddress, selectedChain, addressError, amountError, getAddress]);

    const handleSetMax = () => {
        const max = getMaxBalance();
        // Leave a small buffer for fees
        const fee = estimatedFee?.value || (selectedChain === 'SOL' ? 0.000005 : 0.002);
        const maxAfterFee = Math.max(0, max - fee * 1.5);
        setAmount(maxAfterFee.toFixed(6));
    };

    const canProceed =
        recipientAddress.trim() &&
        amount &&
        !addressError &&
        !amountError &&
        parseFloat(amount) > 0;

    const handleConfirm = () => {
        if (!canProceed) return;
        setStep(STEPS.CONFIRM);
    };

    const handleSend = async () => {
        setStep(STEPS.SENDING);
        setTxError('');

        try {
            let result;

            if (selectedChain === 'SOL') {
                result = await sendSol(
                    wallet.sol.privateKey,
                    recipientAddress.trim(),
                    parseFloat(amount)
                );
                setTxResult({
                    hash: result.signature,
                    explorer: result.explorer,
                    fee: result.fee,
                    chain: 'SOL',
                });
            } else if (selectedChain === 'ETH') {
                result = await sendEth(
                    wallet.eth.privateKey,
                    recipientAddress.trim(),
                    amount
                );
                setTxResult({
                    hash: result.hash,
                    explorer: result.explorer,
                    fee: result.fee,
                    chain: 'ETH',
                });
            }

            setStep(STEPS.SUCCESS);
            if (onSuccess) onSuccess();
        } catch (error) {
            setTxError(error.message || 'Transaction failed');
            setStep(STEPS.ERROR);
        }
    };

    const resetForm = () => {
        setStep(STEPS.FORM);
        setRecipientAddress('');
        setAmount('');
        setMemo('');
        setTxResult(null);
        setTxError('');
        setEstimatedFee(null);
    };

    const truncAddr = (addr) => {
        if (!addr || addr.length < 16) return addr;
        return addr.slice(0, 10) + '...' + addr.slice(-6);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content w-full max-w-md mx-4 p-6 rounded-2xl border-2 dark:border-[#333]"
                style={{ background: 'var(--bg-primary)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <Send className="w-5 h-5" />
                        <h3 className="font-bold text-lg">
                            {step === STEPS.CONFIRM ? 'Confirm Transaction' :
                             step === STEPS.SENDING ? 'Sending...' :
                             step === STEPS.SUCCESS ? 'Transaction Sent' :
                             step === STEPS.ERROR ? 'Transaction Failed' :
                             'Send'}
                        </h3>
                    </div>
                    {step !== STEPS.SENDING && (
                        <button
                            onClick={onClose}
                            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* ========== FORM STEP ========== */}
                {step === STEPS.FORM && (
                    <div className="space-y-4">
                        {/* Chain Selector */}
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                Network
                            </label>
                            <div className="relative">
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="w-full flex items-center justify-between px-4 py-3 border-2 rounded-lg hover:border-gray-400 dark:hover:border-gray-500"
                                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                                >
                                    <div className="flex items-center gap-2">
                                        <img src={chain.icon} alt={chain.label} className="w-5 h-5 rounded-full" />
                                        <span className="font-medium text-sm">{chain.label}</span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {dropdownOpen && (
                                    <div
                                        className="absolute top-full left-0 right-0 mt-1 border-2 rounded-lg overflow-hidden z-10"
                                        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
                                    >
                                        {CHAINS.map((c) => (
                                            <button
                                                key={c.id}
                                                onClick={() => {
                                                    setSelectedChain(c.id);
                                                    setDropdownOpen(false);
                                                    setRecipientAddress('');
                                                    setAmount('');
                                                    setAddressError('');
                                                    setAmountError('');
                                                    setEstimatedFee(null);
                                                }}
                                                className={`w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 ${selectedChain === c.id ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
                                            >
                                                <img src={c.icon} alt={c.label} className="w-5 h-5 rounded-full" />
                                                {c.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recipient Address */}
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                Recipient Address
                            </label>
                            <input
                                type="text"
                                value={recipientAddress}
                                onChange={(e) => setRecipientAddress(e.target.value)}
                                placeholder={selectedChain === 'SOL' ? 'Solana address...' : '0x...'}
                                className="w-full px-4 py-3 border-2 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500/30"
                                style={{
                                    background: 'var(--bg-secondary)',
                                    borderColor: addressError ? '#ef4444' : 'var(--border-color)',
                                    color: 'var(--text-primary)',
                                }}
                                spellCheck={false}
                                autoComplete="off"
                                autoCorrect="off"
                            />
                            {addressError && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> {addressError}
                                </p>
                            )}
                        </div>

                        {/* Amount */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    Amount
                                </label>
                                <button
                                    onClick={handleSetMax}
                                    className="text-xs font-medium text-blue-500 hover:text-blue-600"
                                >
                                    MAX: {getMaxBalance().toFixed(6)} {selectedChain}
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={amount}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (/^\d*\.?\d*$/.test(val)) setAmount(val);
                                    }}
                                    placeholder="0.00"
                                    className="w-full px-4 py-3 pr-16 border-2 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500/30"
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        borderColor: amountError ? '#ef4444' : 'var(--border-color)',
                                        color: 'var(--text-primary)',
                                    }}
                                    autoComplete="off"
                                />
                                <span
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    {selectedChain}
                                </span>
                            </div>
                            {amountError && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> {amountError}
                                </p>
                            )}
                        </div>

                        {/* Estimated Fee */}
                        {(estimatedFee || isEstimatingFee) && (
                            <div
                                className="flex items-center justify-between px-4 py-2.5 rounded-lg text-xs"
                                style={{ background: 'var(--bg-secondary)' }}
                            >
                                <span style={{ color: 'var(--text-secondary)' }}>Estimated Fee</span>
                                {isEstimatingFee ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <span className="font-medium">
                                        ~{estimatedFee.value.toFixed(6)} {estimatedFee.unit}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Send Button */}
                        <button
                            onClick={handleConfirm}
                            disabled={!canProceed}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                                background: canProceed ? 'var(--text-primary)' : 'var(--bg-secondary)',
                                color: canProceed ? 'var(--bg-primary)' : 'var(--text-muted)',
                            }}
                        >
                            <Shield className="w-4 h-4" />
                            Review Transaction
                        </button>
                    </div>
                )}

                {/* ========== CONFIRM STEP ========== */}
                {step === STEPS.CONFIRM && (
                    <div className="space-y-4">
                        <div
                            className="p-4 rounded-lg border space-y-3"
                            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                        >
                            <div className="flex justify-between text-sm">
                                <span style={{ color: 'var(--text-secondary)' }}>Network</span>
                                <div className="flex items-center gap-1.5">
                                    <img src={chain.icon} alt={chain.label} className="w-4 h-4 rounded-full" />
                                    <span className="font-medium">{chain.label}</span>
                                </div>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span style={{ color: 'var(--text-secondary)' }}>From</span>
                                <span className="font-mono text-xs">{truncAddr(getAddress())}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span style={{ color: 'var(--text-secondary)' }}>To</span>
                                <span className="font-mono text-xs">{truncAddr(recipientAddress)}</span>
                            </div>
                            <div className="border-t my-2" style={{ borderColor: 'var(--border-color)' }} />
                            <div className="flex justify-between text-sm">
                                <span style={{ color: 'var(--text-secondary)' }}>Amount</span>
                                <span className="font-bold">{amount} {selectedChain}</span>
                            </div>
                            {estimatedFee && (
                                <div className="flex justify-between text-sm">
                                    <span style={{ color: 'var(--text-secondary)' }}>Est. Fee</span>
                                    <span className="text-xs">~{estimatedFee.value.toFixed(6)} {estimatedFee.unit}</span>
                                </div>
                            )}
                        </div>

                        {/* Warning */}
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                Please verify the recipient address carefully. Blockchain transactions are <strong>irreversible</strong>.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep(STEPS.FORM)}
                                className="flex-1 px-4 py-3 rounded-lg text-sm font-medium border-2"
                                style={{ borderColor: 'var(--border-color)' }}
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSend}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                            >
                                <Send className="w-4 h-4" />
                                Confirm & Send
                            </button>
                        </div>
                    </div>
                )}

                {/* ========== SENDING STEP ========== */}
                {step === STEPS.SENDING && (
                    <div className="flex flex-col items-center py-8 space-y-4">
                        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                        <p className="font-medium">Processing Transaction...</p>
                        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                            Waiting for network confirmation. Do not close this window.
                        </p>
                    </div>
                )}

                {/* ========== SUCCESS STEP ========== */}
                {step === STEPS.SUCCESS && txResult && (
                    <div className="flex flex-col items-center py-6 space-y-4">
                        <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <Check className="w-7 h-7 text-green-600" />
                        </div>
                        <p className="font-bold text-lg">Transaction Sent!</p>
                        <div
                            className="w-full p-4 rounded-lg border text-xs space-y-2"
                            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                        >
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--text-secondary)' }}>Amount</span>
                                <span className="font-medium">{amount} {selectedChain}</span>
                            </div>
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--text-secondary)' }}>To</span>
                                <span className="font-mono">{truncAddr(recipientAddress)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--text-secondary)' }}>TX Hash</span>
                                <span className="font-mono">{truncAddr(txResult.hash)}</span>
                            </div>
                        </div>

                        <a
                            href={txResult.explorer}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 font-medium"
                        >
                            <ExternalLink className="w-4 h-4" />
                            View on Explorer
                        </a>

                        <button
                            onClick={onClose}
                            className="w-full px-4 py-3 rounded-lg text-sm font-medium border-2"
                            style={{ borderColor: 'var(--border-color)' }}
                        >
                            Done
                        </button>
                    </div>
                )}

                {/* ========== ERROR STEP ========== */}
                {step === STEPS.ERROR && (
                    <div className="flex flex-col items-center py-6 space-y-4">
                        <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <AlertTriangle className="w-7 h-7 text-red-600" />
                        </div>
                        <p className="font-bold text-lg">Transaction Failed</p>
                        <p className="text-sm text-center text-red-500 px-4">{txError}</p>

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-3 rounded-lg text-sm font-medium border-2"
                                style={{ borderColor: 'var(--border-color)' }}
                            >
                                Close
                            </button>
                            <button
                                onClick={resetForm}
                                className="flex-1 px-4 py-3 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
