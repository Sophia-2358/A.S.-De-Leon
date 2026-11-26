import pool                                    from '../db.js';
import bcrypt                                   from 'bcryptjs';
import { sendOtpEmail }                         from '../utils/mailer.js';
import { generateOtp, saveOtp, verifyOtp as checkOtp, clearOtp } from '../utils/otp.js';

// ==========================================
// LOGIN — single identifier field (Option A)
// ==========================================
export const login = async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please fill in all fields.'
            });
        }

        const id = String(identifier).trim();

        const [users] = await pool.query(
            `SELECT *
             FROM users
             WHERE username = ?
                OR employee_code = ?
                OR email = ?
             LIMIT 5`,
            [id, id, id]
        );

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        let matchedUser = null;

        for (const candidate of users) {
            if (candidate.status !== 'active') continue;
            if (candidate.locked_until && new Date(candidate.locked_until) > new Date()) continue;

            const compatibleHash = candidate.password_hash.replace(/^\$2y\$/, '$2b$');
            const matches        = await bcrypt.compare(password, compatibleHash);

            if (matches) {
                matchedUser = candidate;
                break;
            }
        }

        if (!matchedUser) {
            if (users.length > 0) {
                const first        = users[0];
                const nextAttempts = Number(first.failed_attempts || 0) + 1;

                if (nextAttempts >= 5) {
                    await pool.query(
                        `UPDATE users SET failed_attempts = 0, locked_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?`,
                        [first.id]
                    );
                    return res.status(423).json({
                        success: false,
                        message: 'Too many failed attempts. Your account is locked for 15 minutes.'
                    });
                }

                await pool.query(
                    `UPDATE users SET failed_attempts = ? WHERE id = ?`,
                    [nextAttempts, first.id]
                );
            }

            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        await pool.query(
            `UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?`,
            [matchedUser.id]
        );

        await new Promise((resolve, reject) => {
            req.session.regenerate(err => err ? reject(err) : resolve());
        });

        req.session.user = {
            id:            matchedUser.id,
            role:          matchedUser.role,
            full_name:     matchedUser.full_name,
            username:      matchedUser.username,
            employee_code: matchedUser.employee_code,
            email:         matchedUser.email
        };

        await new Promise((resolve, reject) => {
            req.session.save(err => err ? reject(err) : resolve());
        });

        return res.status(200).json({
            success: true,
            message: 'Login successful!',
            user: {
                id:            matchedUser.id,
                role:          matchedUser.role,
                full_name:     matchedUser.full_name,
                username:      matchedUser.username,
                employee_code: matchedUser.employee_code,
                email:         matchedUser.email
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
    }
};

// ==========================================
// CUSTOMER REGISTRATION — sends OTP, does NOT save to DB yet
// ==========================================
export const registerCustomer = async (req, res) => {
    try {
        const { full_name, email, password } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please complete all required fields.' });
        }

        const cleanName  = full_name.trim().replace(/\s+/g, ' ');
        const cleanEmail = email.trim().toLowerCase();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
        }

        if (password.length < 8 || password.length > 70) {
            return res.status(400).json({ success: false, message: 'Password must be 8 to 70 characters.' });
        }

        const hasNumber  = /[0-9]/;
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

        if (!hasNumber.test(password)) {
            return res.status(400).json({ success: false, message: 'Password must contain at least one number.' });
        }

        if (!hasSpecial.test(password)) {
            return res.status(400).json({ success: false, message: 'Password must contain at least one special character (e.g. !@#$%).' });
        }

        // Check if email already exists
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'This email address is already registered.' });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 12);

        // Generate and save OTP — account is NOT saved yet
        const otp = generateOtp();
        saveOtp(cleanEmail, otp, { full_name: cleanName, password_hash });

        // Send OTP email
        await sendOtpEmail(cleanEmail, otp);

        return res.status(200).json({
            success: true,
            message: 'A verification code has been sent to your email.',
            email:   cleanEmail
        });

    } catch (error) {
        console.error('Register Error:', error);
        return res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
    }
};

// ==========================================
// VERIFY OTP — saves account to DB if correct
// ==========================================
export const verifyOtp = async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ success: false, message: 'Email and verification code are required.' });
        }

        const result = checkOtp(email, code);

        if (!result.valid) {
            return res.status(400).json({ success: false, message: result.reason });
        }

        const { full_name, password_hash } = result.payload;

        // Save account to database
        await pool.query(
            `INSERT INTO users (role, full_name, username, employee_code, position, email, password_hash, status)
             VALUES ('customer', ?, NULL, NULL, NULL, ?, ?, 'active')`,
            [full_name, email.toLowerCase(), password_hash]
        );

        // Clear OTP from store
        clearOtp(email);

        return res.status(201).json({
            success: true,
            message: 'Your account has been verified and created. You can now sign in.'
        });

    } catch (error) {
        console.error('Verify OTP Error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'This email address is already registered.' });
        }
        return res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
    }
};

// ==========================================
// GET CURRENT USER
// ==========================================
export const getCurrentUser = (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ success: false, message: 'You are not logged in.' });
    }
    return res.status(200).json({ success: true, user: req.session.user });
};

// ==========================================
// LOGOUT
// ==========================================
export const logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Could not log out.' });
        }
        res.clearCookie('connect.sid');
        return res.status(200).json({ success: true, message: 'Logged out successfully.' });
    });
};
