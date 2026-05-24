const express = require('express');
const router = express.Router();

// Saare functions Controller se import kar liye
const { signup, login, verifyEmail, forgotPassword, verifyOtp, resetPassword } = require('../controllers/authController');

// 🚀 Signup, Login, aur Email Verification
router.post('/signup', signup);
router.post('/login', login);
router.get('/verify-email/:token', verifyEmail); 

// 🚀 Forgot Password Flow
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

// YAHAN DHYAN DE: Ye line sabse zaroori hai, isike miss hone se tera error aaya tha!
module.exports = router;