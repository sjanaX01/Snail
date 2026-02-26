import { useState } from 'react';
import { useWallet } from '../components/context/WalletContext';
import { Lock, Trash2, Eye, EyeOff, Copy, Check } from 'lucide-react';
import SnailHeading from '../components/ui/SnailHeading';

export default function Settings() {
  const { lock, resetWallet, mnemonic } = useWallet();
  const [showReset, setShowReset] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showSeed, setShowSeed] = useState(false);
  const [copiedSeed, setCopiedSeed] = useState(false);

  const handleReset = () => {
    if (confirmText === 'DELETE') {
      resetWallet();
      window.location.href = '/setup';
    }
  };

  const copySeedPhrase = async () => {
    if (!mnemonic) return;
    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopiedSeed(true);
      setTimeout(() => setCopiedSeed(false), 2000);
    } catch { /* */ }
  };

  return (
    <div className="mt-16 w-full max-w-4xl mx-auto p-4">
      <SnailHeading />
      <h2 className="font-bold text-xl mb-6">Settings</h2>

      <div className="space-y-4">
        {/* Security */}
        <div className="border-2 rounded-lg p-6 shadow-sm" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Security</h3>

          {/* Recovery Phrase */}
          <div className="rounded-md p-4 mb-4" style={{ background: 'var(--bg-secondary)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">Recovery Phrase</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowSeed(!showSeed)} className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {showSeed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showSeed ? 'Hide' : 'Show'}
                </button>
                {showSeed && (
                  <button onClick={copySeedPhrase} className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {copiedSeed ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    {copiedSeed ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
            </div>
            {showSeed && mnemonic ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                {mnemonic.split(' ').map((word, i) => (
                  <div key={i} className="flex items-center gap-1.5 py-2 px-2.5 rounded-md border text-sm" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                    <span className="text-xs font-mono w-4 text-right" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                    <span className="font-medium">{word}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Click "Show" to reveal your recovery phrase</p>
            )}
          </div>

          {/* Lock Wallet */}
          <button
            id="btn-lock-wallet"
            onClick={lock}
            className="w-full flex items-center gap-3 p-4 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <Lock className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            <div>
              <p className="text-sm font-medium">Lock Wallet</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Lock your wallet and require password to access</p>
            </div>
          </button>
        </div>

        {/* Danger Zone */}
        <div className="border-2 border-red-200 dark:border-red-900 rounded-lg p-6 shadow-sm" style={{ background: 'var(--bg-card)' }}>
          <h3 className="font-semibold text-sm mb-4 text-red-500">⚠️ Danger Zone</h3>

          {!showReset ? (
            <button
              onClick={() => setShowReset(true)}
              className="w-full flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-left hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Delete Wallet</p>
                <p className="text-xs text-red-400 dark:text-red-500">Remove all wallet data from this device</p>
              </div>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-600 dark:text-red-400">
                ⚠️ This will permanently delete your encrypted wallet from this device. Make sure you have your recovery phrase backed up!
              </div>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder='Type "DELETE" to confirm'
                className="w-full h-12 p-3 border border-red-300 dark:border-red-800 rounded-md text-sm"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowReset(false); setConfirmText(''); }}
                  className="flex-1 py-3 text-sm font-medium border-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  disabled={confirmText !== 'DELETE'}
                  className="flex-1 py-3 text-sm font-medium rounded-lg text-white transition-all disabled:opacity-30 bg-red-500 hover:bg-red-600"
                >
                  Delete Everything
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}