import pool    from '../db.js';
import bcrypt  from 'bcryptjs';

// ==========================================
// SET PIN
// POST /api/employee/set-pin
// ==========================================
export const setPin = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: 'You are not logged in.' });
        }

        if (req.session.user.role !== 'employee') {
            return res.status(403).json({ success: false, message: 'Employee access only.' });
        }

        const { pin } = req.body;

        if (!pin) {
            return res.status(400).json({ success: false, message: 'PIN is required.' });
        }

        if (!/^\d{4}$/.test(String(pin))) {
            return res.status(400).json({ success: false, message: 'PIN must be exactly 4 digits.' });
        }

        const pin_hash = await bcrypt.hash(String(pin), 12);

        await pool.query(
            `UPDATE users SET pin_hash = ? WHERE id = ? AND role = 'employee'`,
            [pin_hash, req.session.user.id]
        );

        return res.status(200).json({ success: true, message: 'PIN set successfully.' });

    } catch (error) {
        console.error('Set PIN Error:', error);
        return res.status(500).json({ success: false, message: 'Could not set PIN.' });
    }
};

// ==========================================
// VERIFY PIN
// POST /api/employee/verify-pin
// ==========================================
export const verifyPin = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: 'You are not logged in.' });
        }

        if (req.session.user.role !== 'employee') {
            return res.status(403).json({ success: false, message: 'Employee access only.' });
        }

        const { pin } = req.body;

        if (!pin) {
            return res.status(400).json({ success: false, message: 'PIN is required.' });
        }

        const [rows] = await pool.query(
            `SELECT pin_hash FROM users WHERE id = ? AND role = 'employee' LIMIT 1`,
            [req.session.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Employee not found.' });
        }

        const { pin_hash } = rows[0];

        if (!pin_hash) {
            return res.status(400).json({ success: false, message: 'No PIN set yet.', needsSetup: true });
        }

        const matches = await bcrypt.compare(String(pin), pin_hash);

        if (!matches) {
            return res.status(401).json({ success: false, message: 'Incorrect PIN.' });
        }

        // Store PIN verification in session
        req.session.pinVerified = true;
        await new Promise((resolve, reject) => {
            req.session.save(err => err ? reject(err) : resolve());
        });

        return res.status(200).json({ success: true, message: 'PIN verified.' });

    } catch (error) {
        console.error('Verify PIN Error:', error);
        return res.status(500).json({ success: false, message: 'Could not verify PIN.' });
    }
};

// ==========================================
// CHECK PIN STATUS
// GET /api/employee/pin-status
// ==========================================
export const pinStatus = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: 'You are not logged in.' });
        }

        if (req.session.user.role !== 'employee') {
            return res.status(403).json({ success: false, message: 'Employee access only.' });
        }

        const [rows] = await pool.query(
            `SELECT pin_hash FROM users WHERE id = ? AND role = 'employee' LIMIT 1`,
            [req.session.user.id]
        );

        const hasPin       = rows.length > 0 && !!rows[0].pin_hash;
        const pinVerified  = !!req.session.pinVerified;

        return res.status(200).json({
            success:     true,
            hasPin,
            pinVerified
        });

    } catch (error) {
        console.error('PIN Status Error:', error);
        return res.status(500).json({ success: false, message: 'Could not check PIN status.' });
    }
};
