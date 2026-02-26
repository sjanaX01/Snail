import { useState } from 'react';
import { useWallet } from '../components/context/WalletContext';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import SnailHeading from '../components/ui/SnailHeading';

export default function Login() {
    const { unlock, isLoading, error, setError } = useWallet();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleUnlock = async (e) => {
        e.preventDefault();
        if (!password.trim()) return;
        try {
            await unlock(password);
        } catch {
            // error set by context
        }
    };

    return (
        <div className="mt-16 w-full max-w-4xl mx-auto p-4">
            <SnailHeading />
            <div
                className="h-auto p-10 w-full border-2 rounded-2xl"
                style={{ borderColor: 'var(--border-strong)' }}
            >
                <div className="flex flex-col items-center justify-center h-full gap-6">
                    <div className="text-center">
                        <div className="font-medium text-2xl mb-2">Welcome Back</div>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Enter your password to unlock your wallet</p>
                    </div>

                    <form onSubmit={handleUnlock} className="w-full max-w-md space-y-4">
                        <div className="relative">
                            <input
                                id="login-password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError(null);
                                }}
                                placeholder="Enter your password"
                                className="w-full h-14 p-4 pr-12 border rounded-md font-medium text-sm"
                                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                                autoFocus
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                                style={{ color: 'var(--text-muted)' }}
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-sm text-red-500">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error === 'Incorrect password' ? 'Wrong password. Try again.' : error}</span>
                            </div>
                        )}

                        <button
                            id="login-submit"
                            type="submit"
                            disabled={isLoading || !password.trim()}
                            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-900 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" />
                                    Unlocking…
                                </>
                            ) : (
                                'Unlock Wallet'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                        Forgot your password?{' '}
                        <a href="/setup" className="font-medium hover:underline" style={{ color: 'var(--text-primary)' }}>
                            Import with seed phrase
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
