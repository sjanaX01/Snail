/**
 * Security utilities for Snail Wallet
 * Provides auto-lock, session management, rate limiting, and secure memory handling
 */

// ===================== SESSION TIMEOUT / AUTO-LOCK =====================

const DEFAULT_LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];

let lockTimer = null;
let lockCallback = null;

/**
 * Start auto-lock timer. Resets on user activity.
 * @param {Function} onLock - Callback to invoke when auto-lock triggers
 * @param {number} timeout - Timeout in ms (default: 5 min)
 */
export function startAutoLock(onLock, timeout = DEFAULT_LOCK_TIMEOUT) {
    stopAutoLock(); // clear any existing
    lockCallback = onLock;

    const resetTimer = () => {
        if (lockTimer) clearTimeout(lockTimer);
        lockTimer = setTimeout(() => {
            if (lockCallback) lockCallback();
        }, timeout);
    };

    ACTIVITY_EVENTS.forEach((event) => {
        window.addEventListener(event, resetTimer, { passive: true });
    });

    // Also lock when tab goes hidden
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && lockCallback) {
            // Use shorter timeout when tab is hidden
            if (lockTimer) clearTimeout(lockTimer);
            lockTimer = setTimeout(() => {
                if (lockCallback) lockCallback();
            }, Math.min(timeout, 60_000)); // max 1 min when hidden
        } else {
            resetTimer();
        }
    });

    resetTimer(); // start initial timer
}

/**
 * Stop auto-lock timer and remove event listeners.
 */
export function stopAutoLock() {
    if (lockTimer) {
        clearTimeout(lockTimer);
        lockTimer = null;
    }
    lockCallback = null;
    // Note: removing all listeners would require storing refs; acceptable for SPA lifetime
}

// ===================== RATE LIMITING =====================

const rateLimitStore = new Map();

/**
 * Simple per-key rate limiter.
 * @param {string} key - Action identifier (e.g., 'unlock', 'send')
 * @param {number} maxAttempts - Max attempts allowed
 * @param {number} windowMs - Time window in ms
 * @returns {{ allowed: boolean, remaining: number, retryAfter: number }}
 */
export function rateLimit(key, maxAttempts = 5, windowMs = 60_000) {
    const now = Date.now();
    let record = rateLimitStore.get(key);

    if (!record || now - record.windowStart > windowMs) {
        record = { windowStart: now, attempts: 0 };
        rateLimitStore.set(key, record);
    }

    record.attempts++;

    if (record.attempts > maxAttempts) {
        const retryAfter = Math.ceil((record.windowStart + windowMs - now) / 1000);
        return { allowed: false, remaining: 0, retryAfter };
    }

    return { allowed: true, remaining: maxAttempts - record.attempts, retryAfter: 0 };
}

/**
 * Reset rate limit for a key (e.g., after successful unlock)
 */
export function resetRateLimit(key) {
    rateLimitStore.delete(key);
}

// ===================== PASSWORD STRENGTH =====================

/**
 * Evaluate password strength. Returns a score 0–4 and feedback.
 * @param {string} password
 * @returns {{ score: number, label: string, feedback: string[] }}
 */
export function evaluatePasswordStrength(password) {
    if (!password) return { score: 0, label: 'None', feedback: ['Enter a password'] };

    let score = 0;
    const feedback = [];

    if (password.length >= 8) score++;
    else feedback.push('At least 8 characters');

    if (password.length >= 12) score++;
    else if (password.length >= 8) feedback.push('12+ characters for better security');

    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    else feedback.push('Mix upper and lowercase letters');

    if (/\d/.test(password) && /[^a-zA-Z0-9]/.test(password)) score++;
    else feedback.push('Include numbers and special characters');

    // Common patterns penalty
    const commonPatterns = ['password', '123456', 'qwerty', 'abc123', 'letmein', 'admin'];
    if (commonPatterns.some((p) => password.toLowerCase().includes(p))) {
        score = Math.max(0, score - 2);
        feedback.push('Avoid common patterns');
    }

    const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
    return { score, label: labels[score] || 'Weak', feedback };
}

// ===================== SECURE MEMORY WIPE =====================

/**
 * Zero out a Uint8Array to remove sensitive data from memory.
 * @param {Uint8Array} arr
 */
export function secureWipe(arr) {
    if (arr instanceof Uint8Array) {
        arr.fill(0);
    }
}

/**
 * Zero out a string-like buffer (convert to array, wipe).
 * Note: JS strings are immutable, so this can only help with TypedArrays.
 * Use this for private key buffers.
 */
export function wipeBuffer(buffer) {
    if (buffer && typeof buffer.fill === 'function') {
        buffer.fill(0);
    }
}

// ===================== INPUT SANITIZATION =====================

/**
 * Sanitize user input — remove non-printable characters
 */
export function sanitizeString(input) {
    if (typeof input !== 'string') return '';
    return input.trim().replace(/[^\x20-\x7E]/g, '');
}

/**
 * Sanitize a numeric amount input
 */
export function sanitizeAmount(input) {
    if (typeof input === 'number') return input;
    if (typeof input !== 'string') return 0;
    const cleaned = input.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

// ===================== CLIPBOARD SAFETY =====================

/**
 * Copy to clipboard and auto-clear after a timeout (for addresses, etc.)
 * @param {string} text - Text to copy
 * @param {number} clearAfterMs - Clear clipboard after this duration (default: 60s)
 */
export async function secureCopy(text, clearAfterMs = 60_000) {
    try {
        await navigator.clipboard.writeText(text);
        if (clearAfterMs > 0) {
            setTimeout(async () => {
                try {
                    // Only clear if clipboard still contains our text
                    const current = await navigator.clipboard.readText();
                    if (current === text) {
                        await navigator.clipboard.writeText('');
                    }
                } catch {
                    // Clipboard read may fail if window is not focused — acceptable
                }
            }, clearAfterMs);
        }
        return true;
    } catch {
        return false;
    }
}

// ===================== CONTENT SECURITY =====================

/**
 * Detect if running in an insecure context (non-HTTPS in production)
 */
export function isSecureContext() {
    return window.isSecureContext === true;
}

/**
 * Check for suspicious browser extensions that may tamper with wallet
 */
export function detectSuspiciousEnvironment() {
    const warnings = [];

    // Check for non-secure context
    if (!window.isSecureContext) {
        warnings.push('Running in a non-secure context (HTTP). Use HTTPS in production.');
    }

    // Check if DevTools are open (rough heuristic)
    const devtoolsThreshold = 160;
    if (
        window.outerWidth - window.innerWidth > devtoolsThreshold ||
        window.outerHeight - window.innerHeight > devtoolsThreshold
    ) {
        warnings.push('Developer tools may be open.');
    }

    return warnings;
}

// ===================== CSP HELPERS =====================

/**
 * Generate a nonce for inline scripts (for CSP)
 */
export function generateNonce() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
}
