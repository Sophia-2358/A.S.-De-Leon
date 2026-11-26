import express from 'express';
import {
    login,
    registerCustomer,
    verifyOtp,
    getCurrentUser,
    logout
} from '../controllers/authController.js';

const router = express.Router();

router.post('/login',             login);
router.post('/register_customer', registerCustomer);
router.post('/verify_otp',        verifyOtp);
router.get('/me',                 getCurrentUser);
router.post('/logout',            logout);

export default router;
