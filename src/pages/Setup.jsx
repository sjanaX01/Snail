import { useState } from 'react';
import { useWallet } from '../components/context/WalletContext';
import { Eye, EyeOff, Copy, Check, ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import SnailHeading from '../components/ui/SnailHeading';
import CryptoVault from '../components/ui/CryptoVault';
import Button from '../components/ui/Button';

export default function Setup() {
  const { generateNewMnemonic, saveNewWallet, importWallet, isLoading, error, setError } = useWallet();
  const [view, setView] = useState('initial');

  // Create flow state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSet, setPasswordSet] = useState(false);   // Step 1 done
  const [seedWords, setSeedWords] = useState([]);           // Step 2: generated words
  const [copied, setCopied] = useState(false);
  const [seedConfirmed, setSeedConfirmed] = useState(false);

  // Import state
  const [importWords, setImportWords] = useState(Array(12).fill(''));
  const [importPassword, setImportPassword] = useState('');
  const [showImportPassword, setShowImportPassword] = useState(false);

  // ===== CREATE FLOW =====

  const handleSetPassword = (e) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setError(null);
    setPasswordSet(true);
  };

  const handleGenerateSeed = () => {
    const words = generateNewMnemonic();
    setSeedWords(words);
    setSeedConfirmed(false);
    setCopied(false);
  };

  const handleRegenerateSeed = () => {
    const words = generateNewMnemonic();
    setSeedWords(words);
    setSeedConfirmed(false);
    setCopied(false);
  };

  const handleCreateWallet = async () => {
    try {
      await saveNewWallet(seedWords.join(' '), password);
      // This sets isUnlocked = true → router redirects to /home
    } catch { /* error set by context */ }
  };

  const copySeed = async () => {
    try {
      await navigator.clipboard.writeText(seedWords.join(' '));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* */ }
  };

  const resetCreateFlow = () => {
    setView('initial');
    setPassword('');
    setConfirmPassword('');
    setPasswordSet(false);
    setSeedWords([]);
    setSeedConfirmed(false);
    setError(null);
  };

  // ===== IMPORT FLOW =====

  const updateImportWord = (index, value) => {
    const updated = [...importWords];
    const words = value.trim().split(/\s+/);
    if (words.length > 1) {
      for (let i = 0; i < words.length && index + i < updated.length; i++) {
        updated[index + i] = words[i].toLowerCase();
      }
    } else {
      updated[index] = value.toLowerCase().trim();
    }
    setImportWords(updated);
    setError(null);
  };

  const handleImportPaste = (e) => {
    const pasted = e.clipboardData.getData('text');
    const words = pasted.trim().split(/\s+/);
    if (words.length >= 2) {
      e.preventDefault();
      const newWords = Array(12).fill('');
      for (let i = 0; i < Math.min(words.length, 12); i++) {
        newWords[i] = words[i].toLowerCase();
      }
      setImportWords(newWords);
      setError(null);
    }
  };

  const handlePasteButton = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const words = text.trim().split(/\s+/);
      const newWords = Array(12).fill('');
      for (let i = 0; i < Math.min(words.length, 12); i++) {
        newWords[i] = words[i].toLowerCase();
      }
      setImportWords(newWords);
      setError(null);
    } catch { setError('Could not read clipboard'); }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    const phrase = importWords.filter(w => w.trim()).join(' ');
    if (importWords.filter(w => w.trim()).length < 12) {
      setError('Please fill all 12 seed phrase words');
      return;
    }
    if (importPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    try { await importWallet(phrase, importPassword); } catch { /* */ }
  };

  return (
    <div className="mt-16 w-full max-w-5xl mx-auto p-4">
      <SnailHeading />

      {/* ===== INITIAL ===== */}
      {view === 'initial' && (
        <CryptoVault>
          <div className="flex h-full w-full justify-center items-center animate-scale-in">
            <div className="box flex gap-8">
              <div className="animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }}>
                <Button text="Create Wallet" type="button" onClick={() => { setView('create'); setError(null); }} />
              </div>
              <div className="animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}>
                <Button text="Import Wallet" type="button" onClick={() => { setView('import'); setError(null); setImportWords(Array(12).fill('')); }} />
              </div>
            </div>
          </div>
        </CryptoVault>
      )}

      {/* ===== CREATE FLOW ===== */}
      {view === 'create' && (
        <div
          className="h-auto p-8 w-full border-2 rounded-2xl animate-slide-up"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          <button onClick={resetCreateFlow} className="flex items-center gap-1 text-sm mb-6 animate-fade-in" style={{ color: 'var(--text-secondary)', animationDelay: '0.1s', animationFillMode: 'backwards' }}>
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex flex-col md:flex-row gap-8">
            {/* LEFT COLUMN */}
            <div className="md:w-1/2">
              {/* ── Step 1: Password ── */}
              {!passwordSet && (
                <div className="animate-fade-in">
                  <div className="font-medium text-2xl mb-1">Set a Password</div>
                  <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                    This password encrypts your seed phrase on this device.
                  </p>

                  <form onSubmit={handleSetPassword} className="space-y-4">
                    <div className="relative">
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Password</label>
                      <input
                        id="create-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null); }}
                        placeholder="Min. 8 characters"
                        className="w-full h-14 p-4 pr-12 border rounded-md font-medium text-sm"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                        autoFocus
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 bottom-4 p-1" style={{ color: 'var(--text-muted)' }} tabIndex={-1}>
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Confirm Password</label>
                      <input
                        id="create-confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                        placeholder="Re-enter password"
                        className="w-full h-14 p-4 border rounded-md font-medium text-sm"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                      />
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 text-sm text-red-500">
                        <AlertCircle className="w-4 h-4" /> {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="flex items-center justify-center gap-2 px-6 py-4 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-900 dark:hover:bg-gray-200 w-full"
                    >
                      Set Password
                    </button>
                  </form>
                </div>
              )}

              {/* ── Step 2: After password is set ── */}
              {passwordSet && (
                <div>
                  {/* Password confirmed badge */}
                  <div className="flex items-center gap-2 mb-4 p-3 rounded-lg animate-slide-up" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', animationDelay: '0.05s', animationFillMode: 'backwards' }}>
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">Password set</span>
                    <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{'•'.repeat(password.length)}</span>
                  </div>

                  {/* Generate / Regenerate seed button */}
                  {seedWords.length === 0 ? (
                    <div className="animate-slide-up" style={{ animationDelay: '0.15s', animationFillMode: 'backwards' }}>
                      <div className="font-medium text-2xl mb-1">Generate Seed Phrase</div>
                      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                        Click the button below to generate your unique 12-word recovery phrase.
                      </p>
                      <button
                        onClick={handleGenerateSeed}
                        className="flex items-center justify-center gap-2 px-6 py-4 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-900 dark:hover:bg-gray-200 w-full"
                      >
                        Generate Seed Phrase
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }}>
                        <div className="font-medium text-2xl mb-1">Your Seed Phrase</div>
                        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                          Save these words securely. They are the only way to recover your wallet.
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-3 mb-5 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}>
                        <button
                          onClick={copySeed}
                          className="flex items-center space-x-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-900 dark:hover:bg-gray-200 text-sm"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          <span>{copied ? 'Copied!' : 'Copy'}</span>
                        </button>

                        <button
                          onClick={handleRegenerateSeed}
                          className="flex items-center space-x-2 px-4 py-2 border-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                          style={{ borderColor: 'var(--border-color)' }}
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>Regenerate</span>
                        </button>
                      </div>

                      {/* Confirm + Create */}
                      <div className="animate-slide-up" style={{ animationDelay: '0.3s', animationFillMode: 'backwards' }}>
                        <label className="flex items-start gap-3 cursor-pointer mb-4">
                          <input type="checkbox" checked={seedConfirmed} onChange={(e) => setSeedConfirmed(e.target.checked)} className="mt-1 w-4 h-4 rounded accent-black dark:accent-white" />
                          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>I have saved my recovery phrase in a secure location</span>
                        </label>

                        <button
                          onClick={handleCreateWallet}
                          disabled={!seedConfirmed || isLoading}
                          className="flex items-center justify-center gap-2 px-6 py-4 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-900 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed w-full"
                        >
                          {isLoading ? (
                            <><div className="w-5 h-5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" /> Creating Wallet…</>
                          ) : 'Create Wallet'}
                        </button>

                        {error && (
                          <div className="flex items-center gap-2 text-sm text-red-500 mt-3">
                            <AlertCircle className="w-4 h-4" /> {error}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Seed phrase grid */}
            <div className="md:w-1/2">
              {seedWords.length > 0 ? (
                <div className="animate-fade-in">
                  <div className="font-medium text-lg mb-3">Secret Recovery Phrase</div>
                  <div className="grid grid-cols-3 gap-3">
                    {seedWords.map((word, i) => (
                      <div
                        key={`${word}-${i}`}
                        className="h-12 p-2 border rounded-md flex items-center font-semibold text-sm animate-fade-in"
                        style={{
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          borderColor: 'var(--border-color)',
                          animationDelay: `${i * 40}ms`,
                          animationFillMode: 'backwards',
                        }}
                      >
                        <span className="text-xs w-5 text-right mr-2" style={{ color: 'var(--text-muted)' }}>{i + 1}.</span>
                        {word}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                    ⚠️ Never share these words with anyone. They give full access to your wallet.
                  </p>
                </div>
              ) : (
                <div className="h-full min-h-[200px] flex items-center justify-center rounded-xl animate-fade-in" style={{ background: 'var(--bg-secondary)', border: '2px dashed var(--border-color)', animationDelay: '0.2s', animationFillMode: 'backwards' }}>
                  <p className="text-sm text-center px-4" style={{ color: 'var(--text-muted)' }}>
                    {passwordSet ? 'Click "Generate Seed Phrase" to create your recovery words' : 'Set your password first, then generate your seed phrase'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== IMPORT ===== */}
      {view === 'import' && (
        <div className="h-auto p-8 w-full border-2 rounded-2xl animate-slide-up" style={{ borderColor: 'var(--border-strong)' }}>
          <button onClick={() => { setView('initial'); setError(null); }} className="flex items-center gap-1 text-sm mb-6 animate-fade-in" style={{ color: 'var(--text-secondary)', animationDelay: '0.1s', animationFillMode: 'backwards' }}>
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex flex-col md:flex-row gap-8">
            {/* LEFT: 12 Seed Word Boxes */}
            <div className="md:w-1/2">
              <div className="flex items-center justify-between mb-3 animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }}>
                <div className="font-medium text-2xl">Seed Phrase</div>
                <button
                  type="button" onClick={handlePasteButton}
                  className="text-xs font-medium flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                  style={{ color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                >
                  <Copy className="w-3 h-3" /> Paste All
                </button>
              </div>
              <p className="text-sm mb-4 animate-fade-in" style={{ color: 'var(--text-secondary)', animationDelay: '0.15s', animationFillMode: 'backwards' }}>
                Enter your 12-word seed phrase. You can paste all words at once.
              </p>

              <div className="grid grid-cols-3 gap-3">
                {importWords.map((word, i) => (
                  <div key={i} className="relative animate-slide-up" style={{ animationDelay: `${0.15 + i * 0.03}s`, animationFillMode: 'backwards' }}>
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {i + 1}.
                    </span>
                    <input
                      type="text"
                      value={word}
                      onChange={(e) => updateImportWord(i, e.target.value)}
                      onPaste={i === 0 ? handleImportPaste : undefined}
                      placeholder={`word ${i + 1}`}
                      className="w-full h-12 pl-8 pr-2 border rounded-md font-medium text-sm"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        borderColor: word ? 'var(--border-strong)' : 'var(--border-color)',
                      }}
                      autoFocus={i === 0}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: Password */}
            <div className="md:w-1/2 animate-fade-in" style={{ animationDelay: '0.25s', animationFillMode: 'backwards' }}>
              <div className="font-medium text-2xl mb-1">Set Password</div>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Choose a password to encrypt your wallet on this device.
              </p>

              <form onSubmit={handleImport} className="space-y-4">
                <div className="relative">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Password</label>
                  <input
                    id="import-password"
                    type={showImportPassword ? 'text' : 'password'}
                    value={importPassword}
                    onChange={(e) => { setImportPassword(e.target.value); setError(null); }}
                    placeholder="Min. 8 characters"
                    className="w-full h-14 p-4 pr-12 border rounded-md font-medium text-sm"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                  />
                  <button type="button" onClick={() => setShowImportPassword(!showImportPassword)} className="absolute right-3 bottom-4 p-1" style={{ color: 'var(--text-muted)' }} tabIndex={-1}>
                    {showImportPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-500">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}

                <button
                  id="import-submit" type="submit" disabled={isLoading}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-900 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed w-full"
                >
                  {isLoading ? (
                    <><div className="w-5 h-5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" /> Importing…</>
                  ) : 'Import & Encrypt Wallet'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
