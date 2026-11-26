// In-memory OTP store
// { email: { code, expiresAt, full_name, password_hash } }
const otpStore = new Map();

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function generateOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

export function saveOtp(email, code, payload) {
    otpStore.set(email.toLowerCase(), {
        code,
        expiresAt:     Date.now() + OTP_TTL_MS,
        full_name:     payload.full_name,
        password_hash: payload.password_hash
    });
}

export function verifyOtp(email, code) {
    const entry = otpStore.get(email.toLowerCase());

    if (!entry) {
        return { valid: false, reason: 'No verification code found for this email. Please sign up again.' };
    }

    if (Date.now() > entry.expiresAt) {
        otpStore.delete(email.toLowerCase());
        return { valid: false, reason: 'Your verification code has expired. Please sign up again.' };
    }

    if (entry.code !== String(code).trim()) {
        return { valid: false, reason: 'Incorrect verification code.' };
    }

    return { valid: true, payload: entry };
}

export function clearOtp(email) {
    otpStore.delete(email.toLowerCase());
}
